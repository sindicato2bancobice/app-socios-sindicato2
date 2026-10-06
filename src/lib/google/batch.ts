import type { Person } from './server';
type BatchResponse={responses?:{requestedResourceName:string;person?:Person;status?:{code?:number}}[]};
export async function readLinkedContacts(resources:string[],read:(path:string)=>Promise<BatchResponse>){
  const contacts=new Map<string,Person>();
  const unique=[...new Set(resources)];
  // Keep URLs small while replacing hundreds of individual reads.
  for(let offset=0;offset<unique.length;offset+=50){
    const query=new URLSearchParams({personFields:'names,emailAddresses,phoneNumbers,metadata,memberships',sources:'READ_SOURCE_TYPE_CONTACT'});
    for(const resource of unique.slice(offset,offset+50))query.append('resourceNames',resource);
    const result=await read(`people:batchGet?${query}`);
    for(const entry of result.responses||[]){
      if(entry.status?.code && entry.status.code!==5)throw new Error('Google no pudo consultar un contacto. Los cambios pendientes se conservan; vuelve a sincronizar.');
      if(entry.person)contacts.set(entry.requestedResourceName,entry.person);
    }
  }
  return contacts;
}
