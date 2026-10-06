import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { EmailEditor } from '../email-editor';
import { Addresses } from '../addresses';
import { DeleteForm } from '../delete-form';
import { updateMember } from '../edit-actions';
export default async function EditPerson({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string;saved?:string}>}){
  const {id}=await params;const {error,saved}=await searchParams;const {supabase,profile}=await requireUser();if(!profile?.active||!['administrator','director'].includes(profile.role))redirect('/panel/personas');
  const {data:person,error:loadError}=await supabase.from('members').select('*').eq('id',id).maybeSingle();if(loadError)throw new Error('No fue posible cargar la ficha');if(!person)notFound();
  const inputs=[['first_name','Nombre','text'],['last_name','Apellidos','text'],['rut','RUT','text'],['phone','Teléfono','tel'],['birth_date','Fecha de nacimiento','date'],['branch','Sucursal','text'],['department','Área o gerencia','text'],['job_title','Cargo','text'],['bank_joined_at','Ingreso al banco','date'],['union_joined_at','Ingreso al sindicato','date']];
  return <><div className="page-heading"><div><Link href="/panel/personas">Volver a Personas</Link><h1>Editar persona</h1></div></div>{error&&<p className="error-banner">{error}</p>}{saved&&<p className="success-banner">Ficha guardada. Los cambios se enviarán a Google en la sincronización diaria o al pulsar Sincronizar ahora.</p>}<form action={updateMember} className="card member-form"><input type="hidden" name="id" value={id}/><input type="hidden" name="updated_at" value={person.updated_at}/><div className="form-grid">{inputs.map(([name,label,type])=><label key={name}>{label}<input name={name} type={type} defaultValue={person[name]||''} required={name==='first_name'}/></label>)}<label>Estado<select name="status" defaultValue={person.status}><option value="active_member">Socio activo</option><option value="adherent">Adherente</option><option value="inactive_member">Inactivo</option></select></label></div><EmailEditor key={person.updated_at} emails={person.google_emails} legacyEmail={person.email} linked={Boolean(person.google_resource_name)}/><button className="button">Guardar cambios</button></form><Addresses addresses={person.google_addresses}/><DeleteForm id={id} stamp={person.updated_at} name={`${person.first_name} ${person.last_name}`}/></>;
}
