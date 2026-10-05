import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { accountEmail, configured, requireGoogleAdmin } from '@/lib/google/server';
export async function GET() {
  await requireGoogleAdmin(); if(!configured()) return NextResponse.redirect(new URL('/panel/google?status=configuration',process.env.GOOGLE_REDIRECT_URI || 'https://app-socios-sindicato2.vercel.app'));
  const state=randomBytes(32).toString('hex'); const jar=await cookies();
  jar.set('google_oauth_state',state,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:600,path:'/api/google'});
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID!,redirect_uri:process.env.GOOGLE_REDIRECT_URI!,response_type:'code',scope:'openid email https://www.googleapis.com/auth/contacts',state,access_type:'offline',prompt:'consent',login_hint:accountEmail}).toString();
  return NextResponse.redirect(url);
}
