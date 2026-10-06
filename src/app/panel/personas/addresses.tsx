'use client';
import { useState } from 'react';
import type { GoogleAddress } from '@/lib/google/details';
const fields: [keyof GoogleAddress,string][]=[['formattedValue','Dirección completa (texto)'],['streetAddress','Calle y número'],['extendedAddress','Complemento'],['poBox','Casilla postal'],['city','Ciudad / localidad'],['region','Región'],['postalCode','Código postal'],['country','País'],['countryCode','Código de país']];
export function Addresses({addresses,linked}:{addresses:GoogleAddress[]|null;linked:boolean}){
  const [items,setItems]=useState<GoogleAddress[]>(addresses||[]);
  if(addresses===null&&linked)return <fieldset><legend>Direcciones de Google</legend><p>Sincroniza con Google para cargar las direcciones antes de editarlas.</p></fieldset>;
  const update=(index:number,key:keyof GoogleAddress,value:string)=>setItems(items.map((item,i)=>i!==index?item:{...item,[key]:value,...(key==='type'?{formattedType:undefined}:{}),...((key==='streetAddress'||key==='poBox')&&item[key]?{formattedValue:undefined}:{})}));
  return <fieldset><legend>Direcciones y etiquetas</legend><p>Edita las direcciones para organizar las visitas sindicales. Guarda y sincroniza para enviar los cambios a Google. Se conserva la etiqueta de cada dirección.</p>
    <input type="hidden" name="google_addresses" value={JSON.stringify(items)}/>
    <datalist id="google-address-types"><option value="work">Trabajo</option><option value="home">Personal</option><option value="other">Otra</option></datalist>
    {items.map((address,index)=><article className="address-item" key={index}><h3>{address.formattedType||address.type||`Dirección ${index+1}`}</h3><div className="form-grid">
      <label>Etiqueta original<input list="google-address-types" value={address.type||''} onChange={e=>update(index,'type',e.target.value)} maxLength={100}/></label>
      {fields.map(([key,label])=><label key={key}>{label}<input value={String(address[key]||'')} onChange={e=>update(index,key,e.target.value)} maxLength={key==='countryCode'?2:2000}/></label>)}
    </div><button type="button" className="button secondary" onClick={()=>setItems(items.filter((_,i)=>i!==index))}>Quitar dirección</button></article>)}
    {!items.length&&<p>No hay direcciones registradas.</p>}
    <button type="button" className="button secondary" onClick={()=>setItems([...items,{type:'work'}])}>Agregar dirección</button>
  </fieldset>;
}
