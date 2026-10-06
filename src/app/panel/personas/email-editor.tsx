'use client';
import { useState } from 'react';
import type { GoogleEmail } from '@/lib/google/details';
export function EmailEditor({emails,legacyEmail,linked}:{emails:GoogleEmail[]|null;legacyEmail:string|null;linked:boolean}){
  const [items,setItems]=useState<GoogleEmail[]>(emails|| (legacyEmail?[{value:legacyEmail,type:'work'}]:[]));
  if(emails===null&&linked)return <fieldset><legend>Correos de Google</legend><p>Sincroniza con Google para cargar todos los correos y sus etiquetas.</p><label>Correo principal<input name="email" type="email" defaultValue={legacyEmail||''}/></label></fieldset>;
  const update=(index:number,key:'value'|'type'|'displayName',value:string)=>setItems(items.map((item,i)=>i===index?{...item,[key]:value,...(key==='type'?{formattedType:undefined}:{})}:item));
  return <fieldset><legend>Correos y etiquetas</legend><p>Se conservan los correos y sus etiquetas de Google. Guarda y sincroniza para enviar los cambios a Google.</p>
    <input type="hidden" name="google_emails" value={JSON.stringify(items)}/>
    <datalist id="google-email-types"><option value="work">Trabajo</option><option value="home">Personal</option><option value="other">Otro</option></datalist>
    {items.map((item,index)=><div className="email-row" key={index}>
      <label>{index===0?'Correo principal':`Correo ${index+1}`}<input type="email" required value={item.value} onChange={e=>update(index,'value',e.target.value)} maxLength={320}/></label>
      <label>Etiqueta{item.formattedType&&<small>{item.formattedType}</small>}<input list="google-email-types" value={item.type||''} onChange={e=>update(index,'type',e.target.value)} maxLength={100} placeholder="work, home o etiqueta personalizada"/></label>
      <label>Nombre asociado<input value={item.displayName||''} onChange={e=>update(index,'displayName',e.target.value)} maxLength={200}/></label>
      <div className="email-row-actions"><button type="button" className="button secondary" onClick={()=>setItems(items.filter((_,i)=>i!==index))}>Quitar correo</button></div>
    </div>)}
    {!items.length&&<p>No hay correos registrados.</p>}
    <button type="button" className="button secondary" onClick={()=>setItems([...items,{value:'',type:'work'}])}>Agregar correo</button>
  </fieldset>;
}
