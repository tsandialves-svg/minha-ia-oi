// Banco de dados simples em arquivo (SQLite).
// Não precisa instalar nenhum banco separado — tudo fica em um arquivo "dados.db".
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "dados.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    plano TEXT DEFAULT 'gratis',        -- 'gratis', 'mensal', 'anual'
    plano_expira_em TEXT,               -- data ISO de quando o plano acaba
    criado_em TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pagamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    tipo_plano TEXT NOT NULL,           -- 'mensal' ou 'anual'
    valor REAL NOT NULL,
    status TEXT DEFAULT 'pendente',     -- 'pendente', 'aprovado', 'rejeitado'
    mp_payment_id TEXT,
    criado_em TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );

  CREATE TABLE IF NOT EXISTS mensagens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    papel TEXT NOT NULL,                -- 'user' ou 'model'
    conteudo TEXT NOT NULL,
    criado_em TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );
`);

module.exports = db;
