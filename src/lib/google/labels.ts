export const statusLabels={
  active_member:'Sindicato 2 · Socio activo',
  adherent:'Sindicato 2 · Adherente',
  inactive_member:'Sindicato 2 · Inactivo',
} as const;
export type MemberStatus=keyof typeof statusLabels;
export type ContactGroup={resourceName:string;name?:string;groupType?:string;metadata?:{deleted?:boolean}};
type Request=<T>(path:string,method?:string,body?:unknown)=>Promise<T>;
export async function ensureStatusGroups(request:Request):Promise<Record<MemberStatus,string>>{
  const groups:ContactGroup[]=[];let pageToken:string|undefined;
  do{
    const query=new URLSearchParams({pageSize:'1000',groupFields:'name,groupType,metadata'});if(pageToken)query.set('pageToken',pageToken);
    const page=await request<{contactGroups?:ContactGroup[];nextPageToken?:string}>(`contactGroups?${query}`);
    groups.push(...page.contactGroups||[]);pageToken=page.nextPageToken;
  }while(pageToken);
  const result={} as Record<MemberStatus,string>;
  for(const status of Object.keys(statusLabels) as MemberStatus[]){
    const name=statusLabels[status];
    const group=groups.find(g=>g.name===name&&g.groupType==='USER_CONTACT_GROUP'&&!g.metadata?.deleted)
      || await request<ContactGroup>('contactGroups','POST',{contactGroup:{name},readGroupFields:'name,groupType'});
    if(!group.resourceName)throw new Error('Google no devolvió la etiqueta de estado');
    result[status]=group.resourceName;
  }
  return result;
}
export type LabelContact={resourceName:string;status:MemberStatus;groups:string[]};
export async function syncStatusLabels(groups:Record<MemberStatus,string>,contacts:LabelContact[],request:Request){
  const additions=new Map<string,Set<string>>();const removals=new Map<string,Set<string>>();
  for(const contact of contacts){
    const desired=groups[contact.status];if(!desired)throw new Error('Estado sindical no válido');
    if(!contact.groups.includes(desired)){const set=additions.get(desired)||new Set();set.add(contact.resourceName);additions.set(desired,set);}
    for(const group of Object.values(groups))if(group!==desired&&contact.groups.includes(group)){
      const set=removals.get(group)||new Set();set.add(contact.resourceName);removals.set(group,set);
    }
  }
  async function apply(changes:Map<string,Set<string>>,field:string){
    for(const [group,set] of changes){const resources=[...set];for(let offset=0;offset<resources.length;offset+=1000){
      const result=await request<{notFoundResourceNames?:string[];canNotRemoveLastContactGroupResourceNames?:string[]}>(`${group}/members:modify`,'POST',{[field]:resources.slice(offset,offset+1000)});
      if(result?.notFoundResourceNames?.length||result?.canNotRemoveLastContactGroupResourceNames?.length)throw new Error('Google no pudo actualizar todas las etiquetas de estado. Vuelve a sincronizar.');
    }}
  }
  // Add the replacement first, so removing an old label never removes the last group.
  await apply(additions,'resourceNamesToAdd');await apply(removals,'resourceNamesToRemove');
}
