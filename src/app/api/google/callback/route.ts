import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { accountEmail, adminClient, encrypt, requireGoogleAdmin } from '@/lib/google/server';
export async function GET(request:NextRequest) {
  await requireGoogleAdmin(); const jar=await cookies(); const expected=jar.get('google_oauth_state')?.value; jar.delete('google_oauth_state');
  const received=request.nextUrl.searchParams.get('state'); const code=request.nextUrl.searchParams.get('code');
  const target=new URL('/panel/google',process.env.GOOGLE_REDIRECT_URI!);
  if(!expected || !received || expected.length!==received.length || !timingSafeEqual(Buffer.from(expected),Buffer.from(received)) || !code) { target.searchParams.set('status','authorization_failed');return NextResponse.redirect(target); }
  try {
    const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({code,client_id:process.env.GOOGLE_CLIENT_ID!,client_secret:process.env.GOOGLE_CLIENT_SECRET!,redirect_uri:process.env.GOOGLE_REDIRECT_URI!,grant_type:'authorization_code'}),cache:'no-store'});
    const token=await response.json(); if(!response.ok || !token.refresh_token || !String(token.scope).split(' ').includes('https://www.googleapis.com/auth/contacts')) throw new Error('Consentimiento incompleto');
    const userResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${token.access_token}`},cache:'no-store'}); const user=await userResponse.json();
    if(!userResponse.ok || user.email_verified!==true || String(user.email).toLowerCase()!==accountEmail) throw new Error('Cuenta incorrecta');
    const db=adminClient(); const {error}=await db.from('google_connection').upsert({id:true,connected_email:accountEmail,refresh_token:encrypt(token.refresh_token)}); if(error) throw error;
    const {error:stateError}=await db.from('google_sync_state').upsert({id:true,connected_email:accountEmail,last_status:'connected',last_error:null}); if(stateError)throw stateError;
    target.searchParams.set('status','connected');
  } catch { target.searchParams.set('status','authorization_failed'); }
  return NextResponse.redirect(target);
}
