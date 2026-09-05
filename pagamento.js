const express = require("express");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");
const db = require("../db");
const { exigirLogin } = require("../middleware/auth");

const router = express.Router();

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

const PLANOS = {
  mensal: { valor: 100, titulo: "Plano Pro Mensal", dias: 30 },
  anual: { valor: 1000, titulo: "Plano Pro Anual", dias: 365 },
};

// Cria um link de pagamento (checkout) do Mercado Pago
router.post("/criar-checkout", exigirLogin, async (req, res) => {
  const { tipo_plano } = req.body; // 'mensal' ou 'anual'
  const plano = PLANOS[tipo_plano];

  if (!plano) {
    return res.status(400).json({ erro: "Plano inválido. Use 'mensal' ou 'anual'." });
  }

  try {
    const preference = new Preference(client);

    const resultado = await preference.create({
      body: {
        items: [
          {
            title: plano.titulo,
            quantity: 1,
            unit_price: plano.valor,
            currency_id: "BRL",
          },
        ],
        back_urls: {
          success: `${process.env.PUBLIC_URL}/pagamento-sucesso.html`,
          failure: `${process.env.PUBLIC_URL}/pagamento-falha.html`,
          pending: `${process.env.PUBLIC_URL}/pagamento-pendente.html`,
        },
        auto_return: "approved",
        external_reference: JSON.stringify({
          usuario_id: req.usuario.id,
          tipo_plano,
        }),
        notification_url: `${process.env.PUBLIC_URL}/api/pagamento/webhook`,
      },
    });

    // Registra o pagamento como pendente no nosso banco
    db.prepare(
      "INSERT INTO pagamentos (usuario_id, tipo_plano, valor, status) VALUES (?, ?, ?, 'pendente')"
    ).run(req.usuario.id, tipo_plano, plano.valor);

    res.json({ link_pagamento: resultado.init_point });
  } catch (erro) {
    console.error("Erro ao criar checkout:", erro.message);
    res.status(500).json({ erro: "Não foi possível iniciar o pagamento. Tente novamente." });
  }
});

// Webhook: o Mercado Pago chama esta URL automaticamente quando o pagamento muda de status
router.post("/webhook", async (req, res) => {
  try {
    const paymentId = req.query["data.id"] || req.body?.data?.id;
    if (!paymentId) {
      return res.sendStatus(200); // Confirma recebimento mesmo sem dado útil
    }

    const payment = new Payment(client);
    const info = await payment.get({ id: paymentId });

    if (info.status === "approved") {
      const referencia = JSON.parse(info.external_reference || "{}");
      const { usuario_id, tipo_plano } = referencia;
      const plano = PLANOS[tipo_plano];

      if (usuario_id && plano) {
        const expiraEm = new Date();
        expiraEm.setDate(expiraEm.getDate() + plano.dias);

        db.prepare(
          "UPDATE usuarios SET plano = ?, plano_expira_em = ? WHERE id = ?"
        ).run(tipo_plano, expiraEm.toISOString(), usuario_id);

        db.prepare(
          "UPDATE pagamentos SET status = 'aprovado', mp_payment_id = ? WHERE usuario_id = ? AND tipo_plano = ? AND status = 'pendente'"
        ).run(String(paymentId), usuario_id, tipo_plano);
      }
    }

    res.sendStatus(200);
  } catch (erro) {
    console.error("Erro no webhook do Mercado Pago:", erro.message);
    res.sendStatus(200); // Sempre responder 200 para o Mercado Pago não reenviar em loop
  }
});

// Verifica o status do plano do usuário logado
router.get("/meu-plano", exigirLogin, (req, res) => {
  const usuario = db.prepare("SELECT plano, plano_expira_em FROM usuarios WHERE id = ?").get(req.usuario.id);
  res.json(usuario);
});

module.exports = router;
