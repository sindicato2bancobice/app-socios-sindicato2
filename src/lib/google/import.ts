import 'server-only';
import { randomUUID } from 'node:crypto';
import { accessToken, adminClient, people, personFields, type Person } from './server';
import { importContact } from './contact';
export async function importGoogleContacts(){
  const db=adminClient();const owner=randomUUID();const {data:lock,error:lockError}=await db.rpc('google_sync_acquire',{owner});if(lockError)throw lockError;if(!lock)throw new Error('Ya hay una operación de Google en curso');
  let imported=0,linked=0,skipped=0,remaining=0;const issues:string[]=[];
  try{
    const token=await accessToken();let pageToken:string|undefined;const contacts:Person[]=[];
    do{const params=new URLSearchParams({personFields,pageSize:'1000',sources:'READ_SOURCE_TYPE_CONTACT'});if(pageToken)params.set('pageToken',pageToken);const page=await people<{connections?:Person[];nextPageToken?:string}>(token,`people/me/connections?${params}`);contacts.push(...page.connections||[]);pageToken=page.nextPageToken;}while(pageToken);
    const {data:links,error:linksError}=await db.from('google_contact_links').select('resource_name');if(linksError)throw linksError;const existing=new Set((links||[]).map(l=>l.resource_name));
    let processed=0;
    for(const person of contacts){if(existing.has(person.resourceName)){skipped++;continue;}
      const contact=importContact(person);if(!contact){issues.push('Contacto sin nombre: no importado');continue;}
      if(processed>=25){remaining++;continue;}
      const {data:result,error}=await db.rpc('google_import_contact',{resource:person.resourceName,contact,contact_etag:person.etag||null});if(error)throw error;
      if(result==='imported'){imported++;processed++;}else if(result==='linked'){linked++;processed++;}else if(result==='conflict')issues.push(`${contact.first_name} ${contact.last_name}: posible duplicado; revisar la ficha existente`);else skipped++;
    }
    return {imported,linked,skipped,remaining,issues};
  }finally{await db.rpc('google_sync_release',{owner});}
}
