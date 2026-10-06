import type { Person } from './server';
type BatchResponse={responses?:{requestedResourceName:string;person?:Person;status?:{code?:number}}[]};
export async function readLinkedContacts(resources:string[],read:(path:string)=>Promise<BatchResponse>){
  const contacts=new Map<string,Person>();
  const unique=[...new Set(resources)];
  // Keep URLs small while replacing hundreds of individual reads.
  for(let offset=0;offset<unique.length;offset+=50){
    const query=new URLSearchParams({personFields:'names,emailAddresses,phoneNumbers,metadata,memberships,externalIds',sources:'READ_SOURCE_TYPE_CONTACT'});
    for(const resource of unique.slice(offset,offset+50))query.append('resourceNames',resource);
    const result=await read(`people:batchGet?${query}`);
    const returned=new Set((result.responses||[]).map(e=>e.requestedResourceName));
    if(unique.slice(offset,offset+50).some(resource=>!returned.has(resource)))throw new Error('Google devolvió un lote incompleto. No se eliminó ninguna ficha.');
    for(const entry of result.responses||[]){
      if(entry.status?.code && entry.status.code!==5)throw new Error('Google no pudo consultar un contacto. Los cambios pendientes se conservan; vuelve a sincronizar.');
      if(entry.status?.code===5)contacts.set(entry.requestedResourceName,{resourceName:entry.requestedResourceName,metadata:{deleted:true}});
      else if(entry.person)contacts.set(entry.requestedResourceName,entry.person);
      else throw new Error('Google devolvió un contacto sin datos. No se eliminó ninguna ficha.');
    }
  }
  return contacts;
}
