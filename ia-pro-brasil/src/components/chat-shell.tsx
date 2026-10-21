'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Message = { id?: string; role: 'user' | 'assistant'; content: string };
type Conversation = { id: string; title: string; updated_at: string };
type ResponseStyle = 'concise' | 'balanced' | 'detailed';

const suggestions = [
  { title: 'Escreva melhor', prompt: 'Revise este texto para deixá-lo mais claro e natural: ' },
  { title: 'Aprenda algo novo', prompt: 'Explique de forma simples como funciona: ' },
  { title: 'Organize minhas ideias', prompt: 'Me ajude a montar um plano para: ' },
  { title: 'Crie comigo', prompt: 'Vamos criar uma ideia para: ' },
];

export default function ChatShell({ email }: { email: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [value, setValue] = useState('');
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('balanced');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selectionRequest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/chat')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível carregar o histórico.');
        if (!cancelled) setConversations(data.conversations);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico.');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  function newConversation() {
    if (busy) return;
    selectionRequest.current += 1;
    setConversationId(undefined);
    setMessages([]);
    setError('');
    setValue('');
    setHistoryOpen(false);
    inputRef.current?.focus();
  }

  async function openConversation(conversation: Conversation) {
    if (busy) return;
    const requestId = ++selectionRequest.current;
    setError('');
    try {
      const response = await fetch(`/api/chat?conversationId=${encodeURIComponent(conversation.id)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível abrir a conversa.');
      if (requestId !== selectionRequest.current) return;
      setConversationId(conversation.id);
      setMessages(data.messages);
      setHistoryOpen(false);
    } catch (cause) {
      if (requestId === selectionRequest.current) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a conversa.');
      }
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = value.trim();
    if (!text || busy) return;

    selectionRequest.current += 1;
    setValue('');
    setError('');
    setMessages((items) => [...items, { role: 'user', content: text }]);
    setBusy(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          responseStyle,
          ...(conversationId ? { conversationId } : {}),
        }),
      });
      if (!response.ok) {
        const data: { error?: string } = await response.json();
        throw new Error(data.error || 'Não foi possível enviar sua mensagem.');
      }

      if (!response.body) throw new Error('Não foi possível iniciar a resposta da IA.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedDone = false;

      const handleEvent = (line: string) => {
        if (!line.trim()) return;
        const event: unknown = JSON.parse(line);
        if (!event || typeof event !== 'object' || !('type' in event) || typeof event.type !== 'string') {
          throw new Error('A IA enviou uma resposta em formato inválido.');
        }

        if (event.type === 'start' && 'conversationId' in event && typeof event.conversationId === 'string') {
          const id = event.conversationId;
          setConversationId(id);
          setConversations((items) => {
            const existing = items.find((item) => item.id === id);
            const updated = existing
              ? { ...existing, updated_at: new Date().toISOString() }
              : { id, title: text.slice(0, 60), updated_at: new Date().toISOString() };
            return [updated, ...items.filter((item) => item.id !== id)].slice(0, 50);
          });
          setMessages((items) => [...items, { role: 'assistant', content: '' }]);
        } else if (event.type === 'chunk' && 'text' in event && typeof event.text === 'string') {
          setMessages((items) => {
            const lastMessage = items[items.length - 1];
            if (lastMessage?.role !== 'assistant') return items;
            return [...items.slice(0, -1), { ...lastMessage, content: lastMessage.content + event.text }];
          });
        } else if (event.type === 'error' && 'message' in event && typeof event.message === 'string') {
          throw new Error(event.message);
        } else if (event.type === 'done') {
          receivedDone = true;
        }
      };

      while (true) {
        const { done, value: chunk } = await reader.read();
        buffer += decoder.decode(chunk, { stream: !done });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) handleEvent(line);
        if (done) break;
      }
      if (buffer.trim()) handleEvent(buffer);
      if (!receivedDone) throw new Error('A resposta foi interrompida. Tente novamente.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tivemos uma instabilidade. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <main className="chat-layout">
      <aside className="chat-sidebar">
        <Link href="/" className="brand-mark">astra auruda<span>.</span></Link>
        <button type="button" onClick={newConversation} className="new-chat-button" disabled={busy}>
          <span aria-hidden="true">＋</span> Nova conversa
        </button>

        <div className="conversation-list">
          <p className="sidebar-label">Recentes</p>
          {conversations.length === 0 ? (
            <p className="sidebar-empty">Suas conversas aparecerão aqui.</p>
          ) : conversations.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              onClick={() => openConversation(conversation)}
              className={`conversation-link ${conversation.id === conversationId ? 'is-active' : ''}`}
              title={conversation.title}
            >
              <span aria-hidden="true">◷</span>
              <span>{conversation.title}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-account">
          <div className="account-avatar" aria-hidden="true">{email[0]?.toUpperCase() || 'N'}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{email}</p>
            <Link href="/conta" className="account-link">Minha conta</Link>
          </div>
          <Link href="/precos" aria-label="Conheça os planos" className="upgrade-link">Pro ↗</Link>
        </div>
      </aside>

      <section className="chat-main">
        <header className="chat-topbar">
          <div className="mobile-brand"><Link href="/" className="brand-mark">astra auruda<span>.</span></Link></div>
          <div className="model-indicator"><span className="status-dot" /> Astra Auruda</div>
          <div className="mobile-actions">
            <button type="button" onClick={newConversation} className="mobile-new-chat" aria-label="Nova conversa" disabled={busy}>＋</button>
            <button type="button" onClick={() => setHistoryOpen((open) => !open)} className="mobile-account" aria-expanded={historyOpen}>Histórico</button>
          </div>
        </header>
        {historyOpen && (
          <div className="mobile-history-panel">
            <p className="sidebar-label">Conversas recentes</p>
            {conversations.length === 0 ? (
              <p className="sidebar-empty">Suas conversas aparecerão aqui.</p>
            ) : conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                onClick={() => openConversation(conversation)}
                className={`conversation-link ${conversation.id === conversationId ? 'is-active' : ''}`}
                title={conversation.title}
              >
                <span aria-hidden="true">◷</span><span>{conversation.title}</span>
              </button>
            ))}
            <Link href="/conta" className="mobile-profile-link">Minha conta →</Link>
          </div>
        )}

        <div className="chat-content">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-spark" aria-hidden="true">✳</div>
              <p className="section-kicker">Seu espaço para pensar</p>
              <h1>O que vamos<br /><em>destravar</em> hoje?</h1>
              <p className="welcome-copy">Ideias, trabalho, estudos ou aquela dúvida que não sai da cabeça. Comece por onde quiser.</p>
              <div className="suggestion-grid">
                {suggestions.map((suggestion) => (
                  <button key={suggestion.title} type="button" onClick={() => { setValue(suggestion.prompt); inputRef.current?.focus(); }}>
                    <span>{suggestion.title}</span><span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message, index) => (
                <article key={message.id ?? `${message.role}-${index}`} className={`message-row ${message.role}`}>
                  {message.role === 'assistant' && <div className="assistant-avatar" aria-hidden="true">a.</div>}
                  <div className={`message-bubble ${message.role}`}>
                    {message.role === 'assistant' && <p className="message-author">Astra Auruda</p>}
                    <p className="message-text">{message.content}</p>
                  </div>
                </article>
              ))}
              {busy && (
                <div className="message-row assistant">
                  <div className="assistant-avatar" aria-hidden="true">a.</div>
                  <div className="thinking-indicator"><span /><span /><span /><span className="sr-only">Astra Auruda está pensando</span></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {error && <p role="alert" className="chat-error">{error}</p>}

          <div className="composer-wrap">
            <form onSubmit={send} className="composer">
              <textarea
                ref={inputRef}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={6000}
                aria-label="Sua mensagem"
                placeholder="Pergunte qualquer coisa..."
                disabled={busy}
              />
              <div className="composer-tools">
                <label htmlFor="response-style">Estilo da resposta</label>
                <select
                  id="response-style"
                  value={responseStyle}
                  onChange={(event) => {
                    const style = event.target.value;
                    if (style === 'concise' || style === 'balanced' || style === 'detailed') {
                      setResponseStyle(style);
                    }
                  }}
                  disabled={busy}
                >
                  <option value="concise">Direta</option>
                  <option value="balanced">Equilibrada</option>
                  <option value="detailed">Detalhada</option>
                </select>
              </div>
              <div className="composer-footer">
                <span className="composer-hint">A IA pode cometer erros. Confira informações importantes.</span>
                <button type="submit" disabled={busy || !value.trim()} aria-label="Enviar mensagem">
                  {busy ? <span className="send-spinner" /> : <span aria-hidden="true">↑</span>}
                </button>
              </div>
            </form>
            <p className="keyboard-hint">Enter para enviar · Shift + Enter para nova linha</p>
          </div>
        </div>
      </section>
    </main>
  );
}
