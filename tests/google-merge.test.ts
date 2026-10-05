import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { mergeContact, normalizeEmail } from '../src/lib/google/merge.ts';
const base={first_name:'Ana',last_name:'Pérez',email:'ana@example.cl',phone:'123'};
test('merge independent edits in both directions',()=>{const result=mergeContact(base,{...base,phone:'456'},{...base,email:'nuevo@example.cl'});assert.deepEqual(result.conflicts,[]);assert.equal(result.result.phone,'456');assert.equal(result.result.email,'nuevo@example.cl');});
test('detect concurrent changes to same field',()=>{assert.deepEqual(mergeContact(base,{...base,phone:'456'},{...base,phone:'789'}).conflicts,['phone']);});
test('same concurrent edit is safe',()=>{assert.deepEqual(mergeContact(base,{...base,phone:'456'},{...base,phone:'456'}).conflicts,[]);});
test('deletion of optional value propagates',()=>{assert.equal(mergeContact(base,base,{...base,phone:null}).result.phone,null);});
test('required names cannot be erased',()=>{assert.ok(mergeContact(base,base,{...base,last_name:''}).conflicts.includes('name_required'));});
test('email identity is case insensitive',()=>assert.equal(normalizeEmail(' ANA@EXAMPLE.CL '),'ana@example.cl'));

test('Google phone edit is imported when app equals baseline',()=>{const previous={...base,phone:'999999999'};const remote={...previous,phone:'999999967'};const merged=mergeContact(previous,previous,remote);assert.deepEqual(merged.conflicts,[]);assert.equal(merged.result.phone,'999999967');});
