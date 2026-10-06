import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processDeletions } from '../src/lib/google/deletions.ts';
test('deletions are sequential and durable completion follows remote success',async()=>{
  const calls:string[]=[];
  await processDeletions(['people/a','people/b'],async r=>{calls.push(`remove ${r}`);},async r=>{calls.push(`complete ${r}`);});
  assert.deepEqual(calls,['remove people/a','complete people/a','remove people/b','complete people/b']);
});
test('a Google failure leaves deletion pending and stops the batch',async()=>{
  let completed=0;let removed=0;
  await assert.rejects(processDeletions(['people/a','people/b'],async()=>{removed++;throw new Error('quota');},async()=>{completed++;}));
  assert.equal(completed,0);assert.equal(removed,1);
});
test('a completion failure propagates so the deletion can retry',async()=>{
  await assert.rejects(processDeletions(['people/a'],async()=>{},async()=>{throw new Error('database');}),/database/);
});
