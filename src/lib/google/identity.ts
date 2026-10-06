import type { Person } from './server';
import { normalizeEmail, sameContact, type ContactData } from './merge.ts';
export const identityType='app-socios-sindicato2';
export function chooseNewContact(member:ContactData & {id:string},contacts:Person[],used:Set<string>):{kind:'create'}|{kind:'existing';person:Person}|{kind:'conflict'}{
  const identified=contacts.filter(p=>p.externalIds?.some(id=>id.type===identityType&&id.value===member.id));
  if(identified.length>1)return {kind:'conflict'};
  if(identified.length===1)return used.has(identified[0].resourceName)?{kind:'conflict'}:{kind:'existing',person:identified[0]};
  const email=normalizeEmail(member.email);
  const exact=contacts.filter(p=>!used.has(p.resourceName)&&email&&p.emailAddresses?.some(e=>normalizeEmail(e.value)===email)&&sameContact(member,{first_name:p.names?.[0]?.givenName||'',last_name:p.names?.[0]?.familyName||'',email:p.emailAddresses?.[0]?.value||null,phone:p.phoneNumbers?.[0]?.value||null}));
  if(exact.length>1)return {kind:'conflict'};
  if(exact.length===1)return {kind:'existing',person:exact[0]};
  // Shared email addresses alone do not identify a person; create a separately marked contact.
  return {kind:'create'};
}
export function linkedIdentity(resource:string,person:Person|undefined,listing:Person[]):{kind:'unavailable'}|{kind:'removed'}|{kind:'present';person:Person}{
  if(!person)return {kind:'unavailable'};
  if(person.metadata?.deleted){
    // A stale full list contradicting a direct NOT_FOUND requires a retry, not deletion.
    return listing.some(p=>p.resourceName===resource)?{kind:'unavailable'}:{kind:'removed'};
  }
  return {kind:'present',person};
}
