'use server';
import { parseAddresses } from '@/lib/google/addresses';
import { parseEmails } from '@/lib/google/details';
import { requireUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
export async function updateMember(form:FormData){
  const {supabase,profile}=await requireUser();if(!profile?.active||!['administrator','director'].includes(profile.role))throw new Error('No autorizado');
  const id=String(form.get('id')||'');const stamp=String(form.get('updated_at')||'');const value=(key:string)=>String(form.get(key)||'').trim();
  const fail=(message:string)=>redirect(`/panel/personas/${encodeURIComponent(id)}?error=${encodeURIComponent(message)}`);
  const status=value('status');if(!['active_member','adherent','inactive_member'].includes(status)||!value('first_name'))fail('Revisa el nombre y el estado');
  const updates:Record<string,unknown>={status,first_name:value('first_name'),last_name:value('last_name')};
  for(const key of ['rut','email','phone','birth_date','branch','department','job_title','bank_joined_at','union_joined_at'])updates[key]=value(key)||null;
  if(typeof updates.rut==='string')updates.rut=updates.rut.toUpperCase();
  if(form.has('google_emails')){
    try{const emails=parseEmails(value('google_emails'));updates.google_emails=emails;updates.email=emails[0]?.value||null;}catch{fail('Revisa los correos y sus etiquetas.');}
  }
  if(form.has('google_addresses')){try{updates.google_addresses=parseAddresses(value('google_addresses'));}catch{fail('Revisa los datos de las direcciones.');}}
  const {data,error}=await supabase.from('members').update(updates).eq('id',id).eq('updated_at',stamp).select('id');if(error)fail('No fue posible guardar. Revisa los datos ingresados.');if(!data?.length)fail('La ficha cambió mientras la editabas. Recarga y revisa antes de guardar.');
  revalidatePath('/panel');revalidatePath('/panel/personas');revalidatePath(`/panel/personas/${id}`);redirect(`/panel/personas/${id}?saved=1`);
}

export async function deleteMember(form:FormData){
  const {profile,userId}=await requireUser();
  if(!profile?.active||!['administrator','director'].includes(profile.role))throw new Error('No autorizado');
  const id=String(form.get('id')||'');
  if(form.get('confirmed')!=='yes')throw new Error('Confirma la eliminación');
  const {adminClient}=await import('@/lib/google/server');
  const {randomUUID}=await import('node:crypto');
  const db=adminClient();const owner=randomUUID();let message='';
  const {data:locked,error:lockError}=await db.rpc('google_sync_acquire',{owner});
  if(lockError||!locked)message='Hay una operación en curso. Espera y vuelve a intentar.';
  else try{
    const {data,error}=await db.rpc('delete_member_contact',{member:id,stamp:String(form.get('updated_at')||''),actor:userId,lock_owner:owner});
    if(error)message='No fue posible eliminar la ficha. Intenta nuevamente.';
    else if(!data)message='La ficha cambió. Recarga y revisa antes de eliminar.';
  }finally{await db.rpc('google_sync_release',{owner});}
  if(message)redirect(`/panel/personas/${encodeURIComponent(id)}?error=${encodeURIComponent(message)}`);
  revalidatePath('/panel');revalidatePath('/panel/personas');revalidatePath('/panel/google');redirect('/panel/personas?deleted=1');
}
