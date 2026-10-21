import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/supabase';
import { allowed } from '@/lib/rate-limit';
import { chatInput } from '@/lib/validation';

const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
const responseStyleInstructions = {
  concise: 'Seja direto: responda em poucas frases e use listas apenas quando ajudarem.',
  balanced: 'Equilibre clareza e detalhe; organize a resposta em etapas quando isso facilitar a execução.',
  detailed: 'Explique o raciocínio e os passos com profundidade útil, incluindo exemplos quando forem relevantes.',
} as const;

export async function GET(request: Request) {
  const supabase = await serverSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Faça login para acessar suas conversas.' }, { status: 401 });
  }

  const conversationId = new URL(request.url).searchParams.get('conversationId');

  if (conversationId) {
    const conversation = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (conversation.error || !conversation.data) {
      return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id,role,content,created_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Não foi possível carregar as mensagens.' }, { status: 500 });
    }

    return NextResponse.json({ messages: messages ?? [] });
  }

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id,title,updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'Não foi possível carregar o histórico.' }, { status: 500 });
  }

  return NextResponse.json({ conversations: conversations ?? [] });
}

export async function POST(request: Request) {
  const supabase = await serverSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Faça login para conversar.' }, { status: 401 });
  }

  if (!allowed(user.id)) {
    return NextResponse.json({ error: 'Muitas mensagens em pouco tempo. Aguarde um instante.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Envie uma mensagem válida.' }, { status: 400 });
  }

  const parsed = chatInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Não foi possível verificar sua conta.' }, { status: 500 });
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count: monthlyUsage, error: usageCountError } = await supabase
    .from('usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', monthStart);

  if (usageCountError) {
    return NextResponse.json({ error: 'Não foi possível verificar seu limite de mensagens.' }, { status: 500 });
  }

  if (profile.plan === 'free' && (monthlyUsage ?? 0) >= 10) {
    return NextResponse.json({ error: 'Você atingiu o limite gratuito. Conheça os planos Pro.' }, { status: 402 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'O serviço de IA ainda não está configurado.' }, { status: 503 });
  }

  try {
    let conversationId = parsed.data.conversationId;

    if (conversationId) {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (error || !conversation) {
        return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });
      }
    }

    let previousMessages: { role: string; content: string }[] = [];

    if (conversationId) {
      const { data, error } = await supabase
        .from('messages')
        .select('role,content')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        return NextResponse.json({ error: 'Não foi possível recuperar o contexto da conversa.' }, { status: 500 });
      }
      previousMessages = data ?? [];
    }

    const history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    let pendingUserMessage: { role: 'user'; parts: { text: string }[] } | undefined;

    for (const message of previousMessages.reverse()) {
      if (message.role === 'user') {
        pendingUserMessage = { role: 'user', parts: [{ text: message.content }] };
      } else if (message.role === 'assistant' && pendingUserMessage) {
        history.push(pendingUserMessage, { role: 'model', parts: [{ text: message.content }] });
        pendingUserMessage = undefined;
      }
    }

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: modelName,
      systemInstruction: `Você é Astra Auruda, uma assistente de IA útil, clara e confiável. Responda em português do Brasil por padrão. Adapte a resposta ao pedido, faça perguntas breves quando faltar contexto essencial, nunca invente fontes ou fatos e deixe explícitas incertezas importantes. ${responseStyleInstructions[parsed.data.responseStyle]}`,
    });
    const chat = model.startChat({ history });
    const generation = await chat.sendMessageStream(parsed.data.message);

    if (!conversationId) {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: parsed.data.message.slice(0, 60) })
        .select('id')
        .single();

      if (error || !conversation) {
        return NextResponse.json({ error: 'Não foi possível criar a conversa.' }, { status: 500 });
      }
      conversationId = conversation.id;
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'Não foi possível iniciar a conversa.' }, { status: 500 });
    }
    const activeConversationId = conversationId;

    const { error: saveUserError } = await supabase.from('messages').insert({
      conversation_id: activeConversationId,
      user_id: user.id,
      role: 'user',
      content: parsed.data.message,
    });

    if (saveUserError) {
      return NextResponse.json({ error: 'Não foi possível salvar sua mensagem.' }, { status: 500 });
    }

    const encoder = new TextEncoder();
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: Record<string, string>) => {
          if (cancelled) return;
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          } catch {
            cancelled = true;
          }
        };
        let reply = '';

        send({ type: 'start', conversationId: activeConversationId });

        try {
          for await (const chunk of generation.stream) {
            if (cancelled) return;
            const text = chunk.text();
            if (!text) continue;
            reply += text;
            send({ type: 'chunk', text });
          }

          if (cancelled) return;

          if (!reply.trim()) {
            send({ type: 'error', message: 'A IA não retornou uma resposta. Tente novamente.' });
            return;
          }

          const { error: saveAssistantError } = await supabase.from('messages').insert({
            conversation_id: activeConversationId,
            user_id: user.id,
            role: 'assistant',
            content: reply,
          });
          if (saveAssistantError) {
            send({ type: 'error', message: 'A resposta foi gerada, mas não foi possível salvar a conversa.' });
            return;
          }

          const { error: usageError } = await supabase.from('usage').insert({ user_id: user.id });
          if (usageError) {
            send({ type: 'error', message: 'A resposta foi gerada, mas não foi possível atualizar seu uso.' });
            return;
          }

          const { error: conversationUpdateError } = await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', activeConversationId)
            .eq('user_id', user.id);
          if (conversationUpdateError) {
            send({ type: 'error', message: 'A resposta foi gerada, mas não foi possível atualizar o histórico.' });
            return;
          }

          send({ type: 'done' });
        } catch (error) {
          console.error('[api/chat] Streaming response failed.', error);
          send({ type: 'error', message: 'A resposta foi interrompida. Tente novamente.' });
        } finally {
          if (!cancelled) controller.close();
        }
      },
      cancel() {
        cancelled = true;
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[api/chat] Conversation request failed.', error);
    return NextResponse.json({ error: 'O assistente está temporariamente indisponível. Tente novamente.' }, { status: 502 });
  }
}
