# Norte IA

Assistente de IA premium para o Brasil, com Google Gemini, Supabase e Mercado Pago.

## Instalação

1. Instale Node.js 20+.
2. Execute `cd ia-pro-brasil` e `npm install`.
3. Copie `.env.example` para `.env.local` e preencha as variáveis.
4. Execute `supabase/schema.sql` no SQL Editor do Supabase.
5. Rode `npm run dev` e abra `http://localhost:3000`.

## Configuração

A chave Gemini fica somente no servidor em `GEMINI_API_KEY`. O Supabase fornece autenticação, perfis, histórico e RLS. A service role nunca deve ir para o navegador. No Mercado Pago, configure o webhook em `/api/webhooks/mercado-pago` e use um segredo HMAC próprio. Teste primeiro com credenciais de teste.

## Verificações e deploy

```bash
npm run lint
npm run typecheck
npm run build
```

Para publicar, importe o repositório na Vercel, configure as mesmas variáveis de ambiente, atualize `NEXT_PUBLIC_APP_URL` e registre a URL final do webhook no Mercado Pago. Hospedagem é o serviço que mantém o site disponível na internet; a Vercel realiza esse trabalho para este projeto.
