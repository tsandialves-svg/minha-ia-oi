# Astra Auruda

Assistente de IA em português do Brasil, com conversas contextualizadas, histórico privado e respostas geradas pelo Google Gemini.

## O que já funciona

- Página inicial responsiva e fluxo de cadastro/login com Supabase Auth.
- Chat com sugestões para começar, conversas em várias mensagens e histórico por usuário.
- Respostas transmitidas em tempo real e opção de estilo direto, equilibrado ou detalhado.
- Contexto das últimas 20 mensagens completas em cada conversa.
- Franquia gratuita de 10 respostas por mês, contabilizada no servidor.
- Histórico e dados protegidos por políticas de Row Level Security (RLS).

## Instalação

1. Instale Node.js 20+.
2. Dentro de `ia-pro-brasil`, execute `npm install`.
3. Copie `.env.example` para `.env.local` e configure `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. O modelo padrão é `gemini-2.5-pro`; ajuste `GEMINI_MODEL` para qualquer modelo disponível na sua conta e compatível com geração em streaming. Consulte os [modelos e preços do Gemini](https://ai.google.dev/gemini-api/docs/models) antes de publicar, pois disponibilidade e custo dependem da conta.
4. Execute `supabase/schema.sql` no SQL Editor do seu projeto Supabase.
5. Rode `npm run dev` e abra `http://localhost:3000`.

A chave do Gemini deve existir somente no servidor. Nunca use uma chave `SUPABASE_SERVICE_ROLE_KEY` no navegador.

## Planos e pagamentos

A interface apresenta opções Essencial e Pro. O checkout do Mercado Pago inicia uma assinatura, mas a ativação automática do plano e a reconciliação de pagamentos ainda precisam de um webhook implementado e validado antes de usar pagamentos em produção. Não publique o checkout como fluxo de assinatura concluído sem essa etapa.

## Verificações e deploy

```bash
npm run lint
npm run typecheck
npm run build
```

Para publicar, configure as variáveis de ambiente no provedor de hospedagem e valide autenticação, RLS e chamadas ao Gemini em um projeto Supabase de teste antes de abrir o acesso.
