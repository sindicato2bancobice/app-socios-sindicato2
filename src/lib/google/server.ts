import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/auth';
export const accountEmail = 'directiva@sindicato2bancobice.cl';
export function configured() { return ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REDIRECT_URI','GOOGLE_TOKEN_ENCRYPTION_KEY','SUPABASE_SERVICE_ROLE_KEY'].every(key => Boolean(process.env[key])); }
export function adminClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }); }
export async function requireGoogleAdmin() { const user = await requireUser(); if (!user.profile?.active || user.profile.role !== 'administrator') throw new Error('Solo un administrador activo puede gestionar Google Contacts'); return user; }
function encryptionKey() { const key = Buffer.from(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || '', 'base64'); if(key.length !== 32) throw new Error('La clave de cifrado debe contener 32 bytes'); return key; }
export function encrypt(value: string) { const iv=randomBytes(12); const cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv); return Buffer.concat([iv,cipher.update(value,'utf8'),cipher.final(),cipher.getAuthTag()]).toString('base64'); }
export function decrypt(value: string) { const data=Buffer.from(value,'base64'); const cipher=createDecipheriv('aes-256-gcm',encryptionKey(),data.subarray(0,12)); cipher.setAuthTag(data.subarray(-16)); return Buffer.concat([cipher.update(data.subarray(12,-16)),cipher.final()]).toString('utf8'); }
export async function accessToken() {
  const db=adminClient(); const {data,error}=await db.from('google_connection').select('refresh_token').eq('id',true).single();
  if(error || !data) throw new Error('Conecta la cuenta de Google antes de sincronizar');
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID!,client_secret:process.env.GOOGLE_CLIENT_SECRET!,refresh_token:decrypt(data.refresh_token),grant_type:'refresh_token'}),cache:'no-store'});
  const token=await response.json(); if(!response.ok || !token.access_token) throw new Error('Google requiere volver a conectar la cuenta'); return String(token.access_token);
}
export type Person = {resourceName:string;etag?:string;metadata?:{deleted?:boolean;sources?:{type:string;id:string;etag?:string}[]};names?:{givenName?:string;familyName?:string;displayName?:string}[];emailAddresses?:{value:string;type?:string}[];phoneNumbers?:{value:string;type?:string}[]};
export const personFields='names,emailAddresses,phoneNumbers,metadata';
export async function people<T>(token:string,path:string,method='GET',body?:unknown):Promise<T> {
  const response=await fetch(`https://people.googleapis.com/v1/${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw new Error(`Google Contacts: error ${response.status}. Vuelve a sincronizar; no se sobrescribieron cambios en conflicto.`);
  return response.json();
}
