const express = require("express");
const fetch = require("node-fetch");
const db = require("../db");
const { exigirLogin } = require("../middleware/auth");

const router = express.Router();

const LIMITE_MENSAGENS_GRATIS_POR_DIA = 10;

function planoAtivo(usuario) {
  if (usuario.plano === "gratis") return true;
  if (!usuario.plano_expira_em) return false;
  return new Date(usuario.plano_expira_em) > new Date();
}

router.post("/", exigirLogin, async (req, res) => {
  const { mensagem, historico } = req.body;
  if (!mensagem || !mensagem.trim()) {
    return res.status(400).json({ erro: "Envie uma mensagem." });
  }

  const usuario = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(req.usuario.id);

  // Se o plano pago expirou, tratamos como gratuito
  const ehPago = usuario.plano !== "gratis" && planoAtivo(usuario);

  // Limite diário para usuários do plano gratuito
  if (!ehPago) {
    const hoje = new Date().toISOString().slice(0, 10);
    const contagem = db
      .prepare(
        `SELECT COUNT(*) AS total FROM mensagens
         WHERE usuario_id = ? AND papel = 'user' AND date(criado_em) = ?`
      )
      .get(usuario.id, hoje);

    if (contagem.total >= LIMITE_MENSAGENS_GRATIS_POR_DIA) {
      return res.status(403).json({
        erro: `Você atingiu o limite de ${LIMITE_MENSAGENS_GRATIS_POR_DIA} mensagens gratuitas hoje. Assine o plano Pro para uso ilimitado.`,
        limite_atingido: true,
      });
    }
  }

  try {
    const resposta = await chamarGemini(mensagem, historico || []);

    // Salva as mensagens no histórico do usuário
    db.prepare(
      "INSERT INTO mensagens (usuario_id, papel, conteudo) VALUES (?, 'user', ?)"
    ).run(usuario.id, mensagem);
    db.prepare(
      "INSERT INTO mensagens (usuario_id, papel, conteudo) VALUES (?, 'model', ?)"
    ).run(usuario.id, resposta);

    res.json({ resposta });
  } catch (erro) {
    console.error("Erro ao chamar o Gemini:", erro.message);
    res.status(500).json({ erro: "Erro ao gerar resposta da IA. Tente novamente." });
  }
});

// Busca o histórico de conversa do usuário logado
router.get("/historico", exigirLogin, (req, res) => {
  const mensagens = db
    .prepare("SELECT papel, conteudo, criado_em FROM mensagens WHERE usuario_id = ? ORDER BY id ASC")
    .all(req.usuario.id);
  res.json({ mensagens });
});

async function chamarGemini(mensagem, historico) {
  const modelo = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  // Monta o histórico no formato que a API do Gemini espera
  const contents = [
    ...historico.map((m) => ({
      role: m.papel === "user" ? "user" : "model",
      parts: [{ text: m.conteudo }],
    })),
    { role: "user", parts: [{ text: mensagem }] },
  ];

  const resposta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });

  if (!resposta.ok) {
    const erroTexto = await resposta.text();
    throw new Error(`Gemini API retornou erro: ${resposta.status} - ${erroTexto}`);
  }

  const dados = await resposta.json();
  const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!texto) {
    throw new Error("Resposta do Gemini veio vazia.");
  }

  return texto;
}

module.exports = router;
