import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLinkedContacts } from '../src/lib/google/batch.ts';
import { googleRequest } from '../src/lib/google/request.ts';
test('304 linked contacts use seven direct batch reads',async()=>{
  let calls=0;
  const resources=Array.from({length:304},(_,i)=>`people/c${i}`);
  const result=await readLinkedContacts(resources,async path=>{
    calls++;const query=new URLSearchParams(path.split('?')[1]);
    assert.equal(query.get('sources'),'READ_SOURCE_TYPE_CONTACT');
    assert.ok(query.getAll('resourceNames').length<=50);
    return {responses:query.getAll('resourceNames').map(name=>({requestedResourceName:name,person:{resourceName:name}}))};
  });assert.equal(calls,7);assert.equal(result.size,304);
});
test('batch failure aborts rather than treating an error as deletion',async()=>{
  await assert.rejects(readLinkedContacts(['people/c1'],async()=>({responses:[{requestedResourceName:'people/c1',status:{code:8}}]})));
});
test('429 respects short Retry-After and then succeeds',async()=>{
  let calls=0;const delays:number[]=[];
  const result=await googleRequest<{ok:boolean}>('https://example.invalid',{},async()=>++calls===1?new Response('',{status:429,headers:{'Retry-After':'2'}}):Response.json({ok:true}),async ms=>{delays.push(ms);});
  assert.equal(result.ok,true);assert.deepEqual(delays,[2000]);
});
test('persistent quota error stops after three calls',async()=>{
  let calls=0;
  await assert.rejects(googleRequest('https://example.invalid',{},async()=>{calls++;return new Response('',{status:429});},async()=>{}),/429/);
  assert.equal(calls,3);
});
test('long Retry-After stops immediately',async()=>{
  await assert.rejects(googleRequest('https://example.invalid',{},async()=>new Response('',{status:429,headers:{'Retry-After':'60'}}),async()=>{assert.fail('must not wait');}),/429/);
});
test('uncertain create failure is never automatically retried',async()=>{
  let calls=0;await assert.rejects(googleRequest('https://example.invalid',{method:'POST'},async()=>{calls++;throw new Error('network');},async()=>{}));assert.equal(calls,1);
});
test('Google deletion accepts an empty success response',async()=>{
  assert.equal(await googleRequest('https://example.invalid',{method:'DELETE'},async()=>new Response(null,{status:204})),undefined);
});
test('already absent Google contact is a safe deletion retry',async()=>{
  assert.equal(await googleRequest('https://example.invalid',{method:'DELETE'},async()=>new Response('',{status:404})),undefined);
  await assert.rejects(googleRequest('https://example.invalid',{},async()=>new Response('',{status:404})),/404/);
});
