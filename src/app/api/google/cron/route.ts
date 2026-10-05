import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { syncContacts } from '@/lib/google/sync';
export const maxDuration=60;
export async function GET(request:NextRequest){const expected=process.env.CRON_SECRET?`Bearer ${process.env.CRON_SECRET}`:'';const received=request.headers.get('authorization')||'';if(!expected || expected.length!==received.length || !timingSafeEqual(Buffer.from(expected),Buffer.from(received)))return NextResponse.json({error:'No autorizado'},{status:401});try{return NextResponse.json(await syncContacts());}catch{return NextResponse.json({error:'Consulta el estado de sincronización en la app'},{status:500});}}
