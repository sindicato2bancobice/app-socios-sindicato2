import {test} from 'node:test';
import assert from 'node:assert/strict';
import {orderedEmails,writableEmails,mergeEmails,parseEmails,sameEmails} from '../src/lib/google/details.ts';
const work={value:'ana@work.invalid',type:'work',formattedType:'Trabajo',metadata:{primary:true}};
const home={value:'ana@home.invalid',type:'home',formattedType:'Personal'};
test('primary metadata determines order without dropping secondary labels',()=>{
  assert.deepEqual(orderedEmails([home,work]),[work,home]);
});
test('legacy ficha migration preserves every remote secondary email',()=>{
  assert.deepEqual(mergeEmails(undefined,null,[work,home],work.value),{result:[work,home],conflict:false});
  assert.deepEqual(mergeEmails(undefined,null,[work,home],'changed@work.invalid').result,[{...work,value:'changed@work.invalid'},home]);
});
test('editing or deleting a secondary email propagates the complete local list',()=>{
  const edited=[work,{...home,value:'new@home.invalid'}];
  assert.deepEqual(mergeEmails([work,home],edited,[work,home],work.value),{result:edited,conflict:false});
  assert.deepEqual(mergeEmails([work,home],[work],[work,home],work.value).result,[work]);
});
test('adding a custom labelled email preserves all existing entries',()=>{
  const edited=[work,home,{value:'ana@custom.invalid',type:'Sucursal Ñuñoa'}];
  assert.deepEqual(mergeEmails([work,home],edited,[work,home],work.value).result,edited);
});
test('remote email label edits are imported if the app list is unchanged',()=>{
  const remote=[work,{...home,type:'Personal antiguo'}];
  assert.deepEqual(mergeEmails([work,home],[work,home],remote,work.value).result,remote);
});
test('concurrent app and Google changes block replacement rather than discard edits',()=>{
  assert.equal(mergeEmails([work,home],[work],[work,{...home,value:'remote@home.invalid'}],work.value).conflict,true);
});
test('removing every email sends an empty list',()=>{
  assert.deepEqual(mergeEmails([work,home],[],[work,home],null),{result:[],conflict:false});
});
test('uninitialized rich data does not overwrite extra emails from an existing Google contact',()=>{
  assert.equal(mergeEmails(undefined,[work],[work,home],work.value).conflict,true);
});
test('ordering and output-only metadata changes are not conflicts',()=>{
  assert.equal(sameEmails([work,home],[{...home,formattedType:'Home'}, {...work,metadata:{primary:false}}]),true);
});
test('Google payload retains email values, raw labels and names, stripping output-only fields',()=>{
  assert.deepEqual(writableEmails([{...work,displayName:'Ana'}]),[{value:work.value,type:'work',displayName:'Ana'}]);
});
test('email form validates addresses and labels and ignores client-provided metadata',()=>{
  assert.deepEqual(parseEmails(JSON.stringify([{...work,metadata:{primary:true}}])),[{value:work.value,type:'work'}]);
  assert.throws(()=>parseEmails(JSON.stringify([{value:'bad'}])));
  assert.throws(()=>parseEmails(JSON.stringify([{value:work.value,type:42}])));
  assert.throws(()=>parseEmails('{}'));
  assert.deepEqual(parseEmails('[]'),[]);
});
