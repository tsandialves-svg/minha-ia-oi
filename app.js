// ---------- ESTADO ----------
let token = localStorage.getItem("token");
let usuario = JSON.parse(localStorage.getItem("usuario") || "null");
let historicoConversa = [];

// ---------- ELEMENTOS ----------
const telaAuth = document.getElementById("tela-auth");
const appPrincipal = document.getElementById("app-principal");
const areaUsuario = document.getElementById("area-usuario");

// ---------- INICIALIZAÇÃO ----------
function iniciar() {
  if (token && usuario) {
    mostrarApp();
  } else {
    mostrarAuth();
  }
}

function mostrarAuth() {
  telaAuth.classList.remove("escondido");
  appPrincipal.classList.add("escondido");
  areaUsuario.innerHTML = "";
}

function mostrarApp() {
  telaAuth.classList.add("escondido");
  appPrincipal.classList.remove("escondido");
  areaUsuario.innerHTML = `
    <span>Olá, ${usuario.nome} · <strong>${nomePlano(usuario.plano)}</strong></span>
    <button onclick="sair()">Sair</button>
  `;
  carregarHistorico();
}

function nomePlano(plano) {
  if (plano === "mensal") return "Pro Mensal";
  if (plano === "anual") return "Pro Anual";
  return "Gratuito";
}

// ---------- ABAS DE LOGIN/CADASTRO ----------
document.querySelectorAll(".aba").forEach((aba) => {
  aba.addEventListener("click", () => {
    document.querySelectorAll(".aba").forEach((a) => a.classList.remove("ativa"));
    aba.classList.add("ativa");
    const alvo = aba.dataset.aba;
    document.getElementById("form-login").classList.toggle("escondido", alvo !== "login");
    document.getElementById("form-cadastro").classList.toggle("escondido", alvo !== "cadastro");
  });
});

// ---------- LOGIN ----------
document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const senha = document.getElementById("login-senha").value;
  const erroEl = document.getElementById("login-erro");
  erroEl.textContent = "";

  try {
    const resp = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados.erro);

    salvarSessao(dados.token, dados.usuario);
    mostrarApp();
  } catch (erro) {
    erroEl.textContent = erro.message || "Erro ao entrar.";
  }
});

// ---------- CADASTRO ----------
document.getElementById("form-cadastro").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = document.getElementById("cad-nome").value;
  const email = document.getElementById("cad-email").value;
  const senha = document.getElementById("cad-senha").value;
  const erroEl = document.getElementById("cadastro-erro");
  erroEl.textContent = "";

  try {
    const resp = await fetch("/api/auth/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha }),
    });
    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados.erro);

    salvarSessao(dados.token, dados.usuario);
    mostrarApp();
  } catch (erro) {
    erroEl.textContent = erro.message || "Erro ao criar conta.";
  }
});

function salvarSessao(t, u) {
  token = t;
  usuario = u;
  localStorage.setItem("token", t);
  localStorage.setItem("usuario", JSON.stringify(u));
}

function sair() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  token = null;
  usuario = null;
  historicoConversa = [];
  document.getElementById("janela-chat").innerHTML = "";
  mostrarAuth();
}

// ---------- NAVEGAÇÃO ENTRE TELAS DO APP ----------
document.querySelectorAll(".menu-item").forEach((item) => {
  item.addEventListener("click", () => mostrarTela(item.dataset.tela));
});

function mostrarTela(nome) {
  document.querySelectorAll(".menu-item").forEach((i) =>
    i.classList.toggle("ativo", i.dataset.tela === nome)
  );
  document.querySelectorAll(".tela").forEach((t) => t.classList.add("escondido"));
  document.getElementById(`tela-${nome}`).classList.remove("escondido");
}

// ---------- CHAT ----------
const janelaChat = document.getElementById("janela-chat");
const formChat = document.getElementById("form-chat");
const inputMensagem = document.getElementById("input-mensagem");
const avisoLimite = document.getElementById("aviso-limite");

async function carregarHistorico() {
  try {
    const resp = await fetch("/api/chat/historico", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dados = await resp.json();
    janelaChat.innerHTML = "";
    historicoConversa = [];
    (dados.mensagens || []).forEach((m) => {
      adicionarBolha(m.papel === "user" ? "usuario" : "ia", m.conteudo);
      historicoConversa.push({ papel: m.papel, conteudo: m.conteudo });
    });
  } catch (e) {
    console.error("Erro ao carregar histórico:", e);
  }
}

formChat.addEventListener("submit", async (e) => {
  e.preventDefault();
  const texto = inputMensagem.value.trim();
  if (!texto) return;

  adicionarBolha("usuario", texto);
  inputMensagem.value = "";
  avisoLimite.classList.add("escondido");

  const bolhaCarregando = adicionarBolha("ia", "Pensando...");

  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mensagem: texto, historico: historicoConversa }),
    });
    const dados = await resp.json();

    if (!resp.ok) {
      bolhaCarregando.remove();
      if (dados.limite_atingido) {
        avisoLimite.classList.remove("escondido");
      } else {
        adicionarBolha("ia", dados.erro || "Ocorreu um erro.");
      }
      return;
    }

    bolhaCarregando.textContent = dados.resposta;
    historicoConversa.push({ papel: "user", conteudo: texto });
    historicoConversa.push({ papel: "model", conteudo: dados.resposta });
  } catch (erro) {
    bolhaCarregando.textContent = "Erro de conexão. Tente novamente.";
  }
});

function adicionarBolha(tipo, texto) {
  const div = document.createElement("div");
  div.className = `bolha ${tipo}`;
  div.textContent = texto;
  janelaChat.appendChild(div);
  janelaChat.scrollTop = janelaChat.scrollHeight;
  return div;
}

// ---------- PAGAMENTO ----------
async function assinar(tipoPlano) {
  try {
    const resp = await fetch("/api/pagamento/criar-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tipo_plano: tipoPlano }),
    });
    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados.erro);

    // Redireciona o usuário para a página de pagamento do Mercado Pago
    window.location.href = dados.link_pagamento;
  } catch (erro) {
    alert(erro.message || "Erro ao iniciar pagamento.");
  }
}

iniciar();
