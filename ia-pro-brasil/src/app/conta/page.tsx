import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverSupabase } from '@/lib/supabase';

export default async function Account() {
  const supabase = await serverSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile, error: profileError }, { count: monthlyUsage, error: usageError }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
    supabase
      .from('usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        1,
      )).toISOString()),
  ]);

  if (profileError || !profile) throw new Error('Não foi possível carregar o perfil da sua conta.');
  if (usageError) throw new Error('Não foi possível carregar o uso da sua conta.');

  const plan = profile?.plan === 'free' ? 'Essencial' : profile?.plan === 'yearly' ? 'Pro Anual' : 'Pro Mensal';

  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand-mark">astra auruda<span>.</span></Link>
        <Link href="/chat" className="text-sm font-bold">Voltar para conversa →</Link>
      </header>
      <section className="container max-w-3xl py-20">
        <p className="section-kicker">Minha conta</p>
        <h1 className="mt-5 font-display text-6xl">Seu espaço.</h1>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl bg-ink p-7 text-mist">
            <p className="text-sm text-mist/60">Plano atual</p>
            <p className="mt-3 font-display text-4xl">{plan}</p>
            <p className="mt-8 text-sm">
              {monthlyUsage ?? 0}{profile?.plan === 'free' ? ' / 10' : ''} mensagens usadas neste mês
            </p>
          </div>
          <div className="rounded-2xl border border-ink/15 p-7">
            <p className="text-sm text-ink/60">E-mail</p>
            <p className="mt-3 break-all font-bold">{user.email}</p>
            <p className="mt-8 text-sm text-ink/60">Status e renovação ficam disponíveis após conectar o Mercado Pago.</p>
          </div>
        </div>
        <div className="mt-8 rounded-2xl border border-ink/15 p-7">
          <h2 className="font-display text-2xl">Quer mais espaço?</h2>
          <p className="mt-3 text-ink/60">Conheça os planos Pro e continue seu ritmo sem se preocupar com o limite gratuito.</p>
          <Link href="/precos" className="button button-dark button-large mt-6">Ver planos ↗</Link>
        </div>
      </section>
    </main>
  );
}
