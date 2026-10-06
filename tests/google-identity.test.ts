import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseNewContact, linkedIdentity, identityType } from '../src/lib/google/identity.ts';
const member={id:'member1',first_name:'Petronila',last_name:'Test',email:'shared@example.invalid',phone:null};
const other={resourceName:'people/other',names:[{givenName:'Otra',familyName:'Persona'}],emailAddresses:[{value:member.email}]};
test('shared email with linked or multiple other people does not block creating a new contact',()=>{
  assert.equal(chooseNewContact(member,[other,{...other,resourceName:'people/other2'}],new Set(['people/other'])).kind,'create');
});
test('creation retry recovers the contact by its app identifier rather than shared email',()=>{
  const own={...other,resourceName:'people/own',externalIds:[{type:identityType,value:member.id}]};
  assert.deepEqual(chooseNewContact(member,[other,own],new Set()),{kind:'existing',person:own});
});
test('new person without email can still create a marked Google contact',()=>{
  assert.equal(chooseNewContact({...member,email:null},[other],new Set()).kind,'create');
});
test('unique identical unlinked contact is reused, but another member link is never stolen',()=>{
  const own={...other,names:[{givenName:'Petronila',familyName:'Test'}]};
  assert.equal(chooseNewContact(member,[own],new Set()).kind,'existing');
  assert.equal(chooseNewContact(member,[own],new Set([own.resourceName])).kind,'create');
});
test('duplicate app identifiers require review',()=>{
  const own={...other,externalIds:[{type:identityType,value:member.id}]};
  assert.equal(chooseNewContact(member,[own,{...own,resourceName:'people/second'}],new Set()).kind,'conflict');
});
test('missing batch entry alone is never proof for local deletion',()=>{
  assert.equal(linkedIdentity('people/old',undefined,[]).kind,'unavailable');
});
test('confirmed NOT_FOUND retires an obsolete Google link',()=>{
  assert.equal(linkedIdentity('people/old',{resourceName:'people/old',metadata:{deleted:true}},[]).kind,'removed');
});
test('contradictory directory visibility defers a removal',()=>{
  assert.equal(linkedIdentity('people/old',{resourceName:'people/old',metadata:{deleted:true}},[{resourceName:'people/old'}]).kind,'unavailable');
});
test('redirected resource preserves the canonical survivor identity',()=>{
  assert.deepEqual(linkedIdentity('people/old',{resourceName:'people/survivor'},[]),{kind:'present',person:{resourceName:'people/survivor'}});
});
