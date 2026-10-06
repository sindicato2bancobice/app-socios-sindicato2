import 'server-only';
import { randomUUID } from 'node:crypto';
import { accessToken, adminClient, people, personFields, type Person } from './server';
import { ensureStatusGroups, syncStatusLabels, type MemberStatus } from './labels';
import { processDeletions } from './deletions';
import { readLinkedContacts } from './batch';
import { fields, mergeContact, normalizeEmail, sameContact, type ContactData } from './merge';
type Member=ContactData & {id:string;status:MemberStatus;updated_at:string;google_resource_name:string|null};
function contact(person:Person):ContactData {return {first_name:person.names?.[0]?.givenName || '',last_name:person.names?.[0]?.familyName || '',email:person.emailAddresses?.[0]?.value || null,phone:person.phoneNumbers?.[0]?.value || null};}
function payload(data:ContactData) { return {names:[{givenName:data.first_name,familyName:data.last_name}],emailAddresses:data.email?[{value:data.email,type:'work'}]:[],phoneNumbers:data.phone?[{value:data.phone,type:'mobile'}]:[]}; }
export async function syncContacts() {
  const db=adminClient(); const owner=randomUUID();
  const {data:locked,error:lockError}=await db.rpc('google_sync_acquire',{owner}); if(lockError)throw lockError;if(!locked)throw new Error('Ya hay una sincronización en curso');
  const conflicts:string[]=[];let synced=0;
  try {
    const token=await accessToken();
    const {data:deletions,error:deleteError}=await db.from('google_contact_deletions').select('resource_name,completed_at');if(deleteError)throw deleteError;
    const excluded=new Set((deletions||[]).map(d=>d.resource_name));
    await processDeletions((deletions||[]).filter(d=>!d.completed_at).map(d=>d.resource_name),
      resource=>people(token,`${resource}:deleteContact`,'DELETE'),
      async resource=>{const {error}=await db.from('google_contact_deletions').update({completed_at:new Date().toISOString()}).eq('resource_name',resource);if(error)throw error;});
    // Full paginated reads also recover deleted contacts and expired incremental tokens.
    const all:Person[]=[];let pageToken:string|undefined;
    do {const query=new URLSearchParams({personFields,pageSize:'1000',sources:'READ_SOURCE_TYPE_CONTACT'});if(pageToken)query.set('pageToken',pageToken);
      const page=await people<{connections?:Person[];nextPageToken?:string}>(token,`people/me/connections?${query}`);all.push(...(page.connections||[]).filter(p=>!excluded.has(p.resourceName)));pageToken=page.nextPageToken;
    }while(pageToken);
    const {data:members,error}=await db.from('members').select('id,status,first_name,last_name,email,phone,updated_at,google_resource_name');if(error)throw error;
    const {data:links,error:linkError}=await db.from('google_contact_links').select('*');if(linkError)throw linkError;
    const byResource=await readLinkedContacts((links||[]).map(l=>l.resource_name),(path)=>people(token,path));const used=new Set((links||[]).map(l=>l.resource_name));
    const labelCandidates=new Map<string,Person>();
    for(const member of (members||[]) as Member[]) {
      const link=links?.find(l=>l.member_id===member.id);let remote:Person|undefined;
      if(link) {
        // Read the linked contact directly; directory listings may lag behind edits.
        remote=byResource.get(link.resource_name);
        if(!remote){conflicts.push(`${member.first_name} ${member.last_name}: contacto no disponible en Google; ficha conservada`);continue;}
        if(remote.metadata?.deleted){conflicts.push(`${member.first_name} ${member.last_name}: contacto eliminado en Google; ficha conservada`);continue;}
      }
      else {
        const email=normalizeEmail(member.email);if(!email){conflicts.push(`${member.first_name} ${member.last_name}: agrega un correo para evitar duplicados`);continue;}
        if(members!.filter(m=>normalizeEmail(m.email)===email).length>1){conflicts.push(`${member.first_name}: correo duplicado en la app`);continue;}
        const matches=all.filter(p=>p.emailAddresses?.some(e=>normalizeEmail(e.value)===email));
        if(matches.length>1 || (matches.length===1 && used.has(matches[0].resourceName))){conflicts.push(`${member.first_name}: coincidencias ambiguas en Google`);continue;}
        remote=matches[0];
        if(remote && !sameContact(member,contact(remote))){conflicts.push(`${member.first_name} ${member.last_name}: los datos iniciales difieren; iguala nombre, correo y teléfono antes de vincular`);continue;}
        if(!remote) {
          remote=await people<Person>(token,`people:createContact?personFields=${personFields}`,'POST',payload(member));
          // Persist identity immediately; a retry searches by email if this write fails.
          const {error:saveError}=await db.from('google_contact_links').insert({member_id:member.id,resource_name:remote.resourceName,snapshot:Object.fromEntries(fields.map(k=>[k,member[k]]))});if(saveError)throw saveError;
          all.push(remote);byResource.set(remote.resourceName,remote);
        }
        used.add(remote.resourceName);
      }
      if(link)labelCandidates.set(member.id,remote);
      const current=contact(remote);const base=(link?.snapshot || Object.fromEntries(fields.map(k=>[k,member[k]]))) as ContactData;
      const merge=mergeContact(base,member,current);if(merge.conflicts.length){conflicts.push(`${member.first_name} ${member.last_name}: conflicto en ${merge.conflicts.join(', ')}`);continue;}
      if(!sameContact(member,base) && !sameContact(merge.result,current)) {
        const mask:string[]=[]; const body:Record<string,unknown>={metadata:remote.metadata,etag:remote.etag};
        // Preserve secondary emails/phones and fields outside the synchronization contract.
        if(merge.result.first_name!==current.first_name || merge.result.last_name!==current.last_name){mask.push('names');body.names=payload(merge.result).names;}
        if(merge.result.email!==current.email){mask.push('emailAddresses');body.emailAddresses=[...payload(merge.result).emailAddresses,...(remote.emailAddresses||[]).slice(1)];}
        if(merge.result.phone!==current.phone){mask.push('phoneNumbers');body.phoneNumbers=[...payload(merge.result).phoneNumbers,...(remote.phoneNumbers||[]).slice(1)];}
        remote=await people<Person>(token,`${remote.resourceName}:updateContact?updatePersonFields=${mask.join(',')}&personFields=${personFields}`,'PATCH',body);
      }
      const {data:updated,error:updateError}=await db.from('members').update({...merge.result,google_resource_name:remote.resourceName,google_etag:remote.etag,google_updated_at:new Date().toISOString()}).eq('id',member.id).eq('updated_at',member.updated_at).select('id');if(updateError)throw updateError;
      if(!updated?.length){conflicts.push(`${member.first_name}: la ficha cambió durante la sincronización; vuelve a sincronizar`);continue;}
      const {error:saveError}=await db.from('google_contact_links').upsert({member_id:member.id,resource_name:remote.resourceName,snapshot:merge.result});if(saveError)throw saveError;labelCandidates.set(member.id,remote);synced++;
    }
    // Refresh authoritative app states after data sync, including status edits made during the run.
    const {data:currentMembers,error:statusError}=await db.from('members').select('id,status');if(statusError)throw statusError;
    const labelContacts=(currentMembers||[]).flatMap(member=>{
      const person=labelCandidates.get(member.id);return person?[{resourceName:person.resourceName,status:member.status as MemberStatus,groups:(person.memberships||[]).flatMap(m=>m.contactGroupMembership?[m.contactGroupMembership.contactGroupResourceName]:[])}]:[];
    });
    if(labelContacts.length){
      const request=<T>(path:string,method?:string,body?:unknown)=>people<T>(token,path,method,body);
      await syncStatusLabels(await ensureStatusGroups(request),labelContacts,request);
    }
    const {error:stateError}=await db.from('google_sync_state').upsert({id:true,last_synced_at:new Date().toISOString(),last_status:conflicts.length?'conflicts':'success',last_error:conflicts.length?conflicts.join('\n'):null});if(stateError)throw stateError;
    return {synced,conflicts};
  }catch(error){await db.from('google_sync_state').upsert({id:true,last_status:'error',last_error:error instanceof Error?error.message:'Error de sincronización'});throw error;}
  finally {await db.rpc('google_sync_release',{owner});}
}
