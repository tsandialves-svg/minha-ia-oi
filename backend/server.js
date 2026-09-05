require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const pagamentoRoutes = require("./routes/pagamento");

const app = express();

app.use(cors());
app.use(express.json());

// Serve os arquivos do frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "..", "frontend", "public")));

// Rotas da API
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/pagamento", pagamentoRoutes);

app.get("/api/saude", (req, res) => {
  res.json({ status: "ok" });
});

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});
