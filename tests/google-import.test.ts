import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {importContact} from '../src/lib/google/contact.ts';
test('imports single-name contact without inventing a surname',()=>{const data=importContact({resourceName:'people/test',names:[{displayName:'Nicole'}],phoneNumbers:[{value:'123'}]});assert.equal(data?.first_name,'Nicole');assert.equal(data?.last_name,'');});
test('skips nameless and deleted contacts',()=>{assert.equal(importContact({resourceName:'people/test'}),null);assert.equal(importContact({resourceName:'people/test',names:[{givenName:'Ana'}],metadata:{deleted:true}}),null);});
test('only copies allowed personal contact fields',()=>{assert.deepEqual(importContact({resourceName:'people/test',names:[{givenName:' Ana ',familyName:'Pérez'}],emailAddresses:[{value:'ana@example.cl'}]}),{first_name:'Ana',last_name:'Pérez',email:'ana@example.cl',phone:null});});
