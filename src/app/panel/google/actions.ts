'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireGoogleAdmin } from '@/lib/google/server';
import { syncContacts } from '@/lib/google/sync';
export async function synchronize() { await requireGoogleAdmin();let status='success';try{await syncContacts();}catch{status='error';}revalidatePath('/panel/google');revalidatePath('/panel/personas');redirect(`/panel/google?status=${status}`); }

export async function importAllContacts(){await requireGoogleAdmin();const {importGoogleContacts}=await import('@/lib/google/import');let message:string;try{const r=await importGoogleContacts();message=`Importados: ${r.imported}. Vinculados: ${r.linked}. Ya existentes: ${r.skipped}. Pendientes de otro lote: ${r.remaining}. ${r.issues.slice(0,10).join('; ')}${r.issues.length>10?' Hay más contactos que requieren revisión.':''}`;}catch{message='La importación no terminó. Las fichas ya importadas se conservan; puedes reintentar sin duplicarlas.';}revalidatePath('/panel');revalidatePath('/panel/personas');revalidatePath('/panel/google');redirect(`/panel/google?import=${encodeURIComponent(message)}`);}
