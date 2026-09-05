const jwt = require("jsonwebtoken");

// Verifica se o usuário está logado (tem um token válido)
function exigirLogin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Você precisa estar logado." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = dados; // { id, email, nome }
    next();
  } catch (e) {
    return res.status(401).json({ erro: "Sessão inválida ou expirada. Faça login novamente." });
  }
}

module.exports = { exigirLogin };
