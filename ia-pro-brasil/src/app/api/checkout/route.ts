import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/supabase';
import { createPreapproval } from '@/lib/mercado-pago';
import { planInput } from '@/lib/validation';
export async function POST(request:Request){const supabase=await serverSupabase();const {data:{user}}=await supabase.auth.getUser();if(!user?.email)return NextResponse.json({error:'Não autorizado'},{status:401});const parsed=planInput.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:'Plano inválido'},{status:400});try{const subscription=await createPreapproval(parsed.data.plan,user.email);await supabase.from('subscriptions').insert({user_id:user.id,external_id:String(subscription.id),plan:parsed.data.plan,status:subscription.status||'pending'});return NextResponse.json({initPoint:subscription.init_point});}catch{return NextResponse.json({error:'Não foi possível iniciar o pagamento.'},{status:502})}}
