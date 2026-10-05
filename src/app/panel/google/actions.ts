'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireGoogleAdmin } from '@/lib/google/server';
import { syncContacts } from '@/lib/google/sync';
export async function synchronize() { await requireGoogleAdmin();let status='success';try{await syncContacts();}catch{status='error';}revalidatePath('/panel/google');revalidatePath('/panel/personas');redirect(`/panel/google?status=${status}`); }
