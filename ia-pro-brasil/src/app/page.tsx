import Link from 'next/link';

const capabilities = [
  { number: '01', title: 'Pense junto', copy: 'Transforme uma ideia solta em um plano claro, passo a passo.' },
  { number: '02', title: 'Escreva melhor', copy: 'Rascunhe, revise e encontre o tom certo para cada conversa.' },
  { number: '03', title: 'Aprenda no seu ritmo', copy: 'Entenda assuntos complexos com explicações que fazem sentido para você.' },
];

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-header">
        <Link href="/" className="brand-mark">astra auruda<span>.</span></Link>
        <nav className="landing-nav" aria-label="Navegação principal">
          <a href="#como-ajuda">Como ajuda</a>
          <Link href="/precos">Planos</Link>
        </nav>
        <div className="landing-actions">
          <Link href="/login" className="header-login">Entrar</Link>
          <Link href="/cadastro" className="header-cta">Começar grátis <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> UMA NOVA FORMA DE PENSAR JUNTO</p>
          <h1>Ideias boas<br />merecem <em>ir mais<br className="hero-mobile-break" /> longe.</em></h1>
          <p className="hero-description">Uma IA que conversa em português, acompanha seu raciocínio e ajuda você a sair da dúvida para a próxima ideia.</p>
          <div className="hero-actions">
            <Link href="/cadastro" className="primary-cta">Experimente grátis <span aria-hidden="true">↗</span></Link>
            <Link href="/precos" className="secondary-cta">Conheça os planos</Link>
          </div>
          <p className="hero-note">Comece sem pagar · Cancele quando quiser</p>
        </div>

        <div className="hero-art" aria-label="Exemplo de conversa com a Astra Auruda">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit-core"><span>a.</span></div>
          <div className="chat-preview">
            <div className="preview-top"><span className="preview-dot" /><span>Uma conversa com Astra Auruda</span><span className="preview-menu">···</span></div>
            <div className="preview-question">Quero tirar uma ideia do papel, mas não sei por onde começar.</div>
            <div className="preview-answer">
              <span className="preview-avatar">a.</span>
              <p>Vamos começar pelo que você já sabe. Qual é a ideia — e o que faria você sentir que deu o primeiro passo?</p>
            </div>
            <div className="preview-input">Continue a conversa <span>↑</span></div>
          </div>
          <div className="art-caption">Uma conversa de cada vez.<br />Um passo de cada vez.</div>
        </div>
      </section>

      <section className="trust-strip">
        <p>Feita para conversas de verdade</p>
        <div><span>PT</span> Português do Brasil</div>
        <div><span>↗</span> Suas conversas, no seu espaço</div>
        <div><span>✳</span> Comece gratuitamente</div>
      </section>

      <section className="capabilities-section" id="como-ajuda">
        <div className="section-heading">
          <p className="eyebrow">MENOS TELA EM BRANCO. MAIS CAMINHO.</p>
          <h2>Uma boa conversa<br />muda o <em>começo.</em></h2>
          <p>Não precisa chegar com a pergunta perfeita. A gente começa de onde você está.</p>
        </div>
        <div className="capability-list">
          {capabilities.map((capability) => (
            <article key={capability.number} className="capability">
              <span className="capability-number">{capability.number}</span>
              <div><h3>{capability.title}</h3><p>{capability.copy}</p></div>
              <span className="capability-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="closing-section">
        <div>
          <p className="eyebrow">O PRÓXIMO PASSO É SEU</p>
          <h2>Comece com<br />uma pergunta.</h2>
        </div>
        <Link href="/cadastro" className="closing-cta">Conheça a Astra Auruda <span aria-hidden="true">↗</span></Link>
      </section>

      <footer className="landing-footer">
        <Link href="/" className="brand-mark">astra auruda<span>.</span></Link>
        <p>Uma ideia de cada vez.</p>
        <div><Link href="/precos">Planos</Link><Link href="/login">Entrar</Link></div>
        <span>© 2026 Astra Auruda</span>
      </footer>
    </main>
  );
}
