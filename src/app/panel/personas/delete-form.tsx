'use client';
import { useState } from 'react';
import { deleteMember } from './edit-actions';
import { PendingButton } from '../google/pending-button';
export function DeleteForm({id,stamp,name}:{id:string;stamp:string;name:string}){
  const [confirm,setConfirm]=useState(false);
  return <section className="card member-form"><h2>Eliminar contacto</h2><p>Se eliminará la ficha de {name} y sus solicitudes de actualización. Si está vinculada a Google, su contacto se eliminará en la próxima sincronización. Para conservar su historial, puedes cambiar el estado a Inactivo.</p>{confirm?<form action={deleteMember}><input type="hidden" name="id" value={id}/><input type="hidden" name="updated_at" value={stamp}/><input type="hidden" name="confirmed" value="yes"/><p>¿Confirmas la eliminación de {name}?</p><div className="form-actions"><button type="button" className="button secondary" onClick={()=>setConfirm(false)}>Cancelar</button><PendingButton label="Confirmar eliminación" pendingLabel="Eliminando…"/></div></form>:<button type="button" className="button secondary" onClick={()=>setConfirm(true)}>Eliminar contacto</button>}</section>;
}
