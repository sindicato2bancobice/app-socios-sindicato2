import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureStatusGroups, syncStatusLabels, statusLabels } from '../src/lib/google/labels.ts';
const groups={active_member:'contactGroups/active',adherent:'contactGroups/adherent',inactive_member:'contactGroups/inactive'};
test('reuses paginated user groups and creates only missing status labels',async()=>{
  const writes:unknown[]=[];let reads=0;
  const result=await ensureStatusGroups(async<T>(path:string,method?:string,body?:unknown)=>{
    if(method==='POST'){writes.push(body);return {resourceName:groups.inactive_member} as T;}
    reads++;if(reads===1)return {contactGroups:[{resourceName:groups.active_member,name:statusLabels.active_member,groupType:'USER_CONTACT_GROUP'}],nextPageToken:'next'} as T;
    assert.match(path,/pageToken=next/);return {contactGroups:[{resourceName:groups.adherent,name:statusLabels.adherent,groupType:'USER_CONTACT_GROUP'}]} as T;
  });
  assert.deepEqual(result,groups);assert.equal(writes.length,1);assert.deepEqual(writes[0],{contactGroup:{name:statusLabels.inactive_member},readGroupFields:'name,groupType'});
});
test('changes to inactive by adding first and removing only old union labels',async()=>{
  const calls:{path:string;body:unknown}[]=[];
  await syncStatusLabels(groups,[{resourceName:'people/1',status:'inactive_member',groups:[groups.active_member,groups.adherent,'contactGroups/family']}],async<T>(path:string,method?:string,body?:unknown)=>{assert.equal(method,'POST');calls.push({path,body});return {} as T;});
  assert.deepEqual(calls,[{path:`${groups.inactive_member}/members:modify`,body:{resourceNamesToAdd:['people/1']}},{path:`${groups.active_member}/members:modify`,body:{resourceNamesToRemove:['people/1']}},{path:`${groups.adherent}/members:modify`,body:{resourceNamesToRemove:['people/1']}}]);
});
test('unchanged correct labels make no mutation requests',async()=>{
  await syncStatusLabels(groups,[{resourceName:'people/1',status:'active_member',groups:[groups.active_member,'contactGroups/family']}],async<T>()=>{assert.fail('unexpected write');return {} as T;});
});
test('Google partial add failure stops before removing old labels',async()=>{
  let count=0;
  await assert.rejects(syncStatusLabels(groups,[{resourceName:'people/missing',status:'adherent',groups:[groups.active_member]}],async<T>()=>{count++;return {notFoundResourceNames:['people/missing']} as T;}),/etiquetas/);
  assert.equal(count,1);
});
test('never silently accepts failure to remove the last group',async()=>{
  await assert.rejects(syncStatusLabels(groups,[{resourceName:'people/1',status:'adherent',groups:[groups.adherent,groups.active_member]}],async<T>()=>({canNotRemoveLastContactGroupResourceNames:['people/1']} as T)),/etiquetas/);
});
test('304 contacts are assigned using one batch, and requests never exceed 1000',async()=>{
  for(const size of [304,1001]){
    const counts:number[]=[];
    await syncStatusLabels(groups,Array.from({length:size},(_,i)=>({resourceName:`people/${i}`,status:'active_member' as const,groups:[]})),async<T>(_path:string,_method?:string,body?:unknown)=>{counts.push((body as {resourceNamesToAdd:string[]}).resourceNamesToAdd.length);return {} as T;});
    assert.deepEqual(counts,size===304?[304]:[1000,1]);
  }
});
test('switching any status removes the other managed labels',async()=>{
  for(const status of Object.keys(groups) as (keyof typeof groups)[]){
    const calls:unknown[]=[];
    await syncStatusLabels(groups,[{resourceName:'people/1',status,groups:Object.values(groups)}],async<T>(path:string)=>{calls.push(path);return {} as T;});
    assert.deepEqual(calls,Object.values(groups).filter(g=>g!==groups[status]).map(g=>`${g}/members:modify`));
  }
});
