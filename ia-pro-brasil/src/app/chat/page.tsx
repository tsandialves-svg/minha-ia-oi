import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/supabase';
import ChatShell from '@/components/chat-shell';
export default async function Chat(){const supabase=await serverSupabase();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');return <ChatShell email={user.email||'usuário'}/>}
