import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export function browserSupabase() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }
export async function serverSupabase() { const store=await cookies(); return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies:{ getAll:()=>store.getAll(), setAll(values){ try { values.forEach(({name,value,options})=>store.set(name,value,options)); } catch {} } } }); }
