import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeAddresses,sameAddresses,writableAddresses,parseAddresses,matchesAddress,addressText} from '../src/lib/google/addresses.ts';
const work={type:'work',formattedType:'Trabajo',streetAddress:'Huérfanos 1234',city:'Santiago',region:'Metropolitana'};
const home={type:'home',streetAddress:'Irarrázaval 555',city:'Ñuñoa'};
test('edits and removals send the complete address list without dropping other addresses',()=>{
  const local=[{...work,streetAddress:'Huérfanos 5678'},home];
  assert.deepEqual(mergeAddresses([work,home],local,[work,home]),{result:local,conflict:false});
  assert.deepEqual(mergeAddresses([work,home],[work],[work,home]).result,[work]);
  assert.deepEqual(mergeAddresses([work,home],[],[work,home]).result,[]);
});
test('Google address edits are imported when the local list is unchanged',()=>{
  const remote=[work,{...home,extendedAddress:'Oficina 12'}];
  assert.deepEqual(mergeAddresses([work,home],[work,home],remote).result,remote);
});
test('simultaneous different edits require review',()=>{
  assert.equal(mergeAddresses([work],[{...work,city:'Valparaíso'}],[{...work,city:'Concepción'}]).conflict,true);
});
test('old uninitialized addresses are loaded but unknown baseline cannot overwrite Google',()=>{
  assert.deepEqual(mergeAddresses(undefined,null,[work]),{result:[work],conflict:false});
  assert.equal(mergeAddresses(undefined,[home],[work]).conflict,true);
});
test('output-only metadata and ordering do not cause address conflicts',()=>{
  assert.equal(sameAddresses([work,home],[home,{...work,formattedType:'Work',metadata:{primary:true}}]),true);
  assert.deepEqual(writableAddresses([work]),[{type:'work',streetAddress:'Huérfanos 1234',city:'Santiago',region:'Metropolitana'}]);
});
test('formatted-only addresses can also be edited',()=>{
  const base=[{type:'custom',formattedValue:'Dirección original'}],local=[{type:'custom',formattedValue:'Dirección nueva'}];
  assert.deepEqual(mergeAddresses(base,local,base).result,local);
  assert.equal(sameAddresses([{...work,formattedValue:'old'}],[{...work,formattedValue:'new'}]),false);
});
test('form accepts structured or free-text addresses, custom labels and empty lists',()=>{
  assert.deepEqual(parseAddresses(JSON.stringify([{...work,countryCode:'cl'}])),[{type:'work',streetAddress:'Huérfanos 1234',city:'Santiago',region:'Metropolitana',countryCode:'CL'}]);
  assert.deepEqual(parseAddresses('[]'),[]);assert.throws(()=>parseAddresses('[{"type":"work"}]'));
  assert.throws(()=>parseAddresses('[{"streetAddress":42}]'));assert.throws(()=>parseAddresses('[{"city":"Santiago","countryCode":"Chile"}]'));
});
test('visit filter combines street, number and locality in the same address and ignores accents',()=>{
  assert.equal(matchesAddress([work,home],'huerfanos 1234 santiago'),true);
  assert.equal(matchesAddress([work,home],'huerfanos ñuñoa'),false);
  assert.equal(matchesAddress([work,home],'irrarrazaval'),false);
  assert.equal(matchesAddress([work,home],'irarrazaval 555'),true);
  assert.equal(matchesAddress(null,'Santiago'),false);assert.equal(matchesAddress(null,''),true);
});
test('directory address text shows edited structured fields rather than stale formatted text',()=>{
  assert.match(addressText({...work,formattedValue:'Texto anterior'}),/Huérfanos 1234/);
  assert.equal(addressText({formattedValue:'Texto completo'}),'Texto completo');
});
