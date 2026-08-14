// Conexão SOMENTE LEITURA com um banco de dados externo.
// Toda a identificação (host, banco, tabela, colunas) vem do .env,
// que é ignorado pelo git — nada disso aparece no repositório.
//
// Segurança:
//  - este módulo só expõe consultarUsuariosExternos(), que executa um único
//    SELECT com identificadores escapados e LIMIT fixo;
//  - nenhum UPDATE/DELETE/INSERT existe aqui;
//  - recomenda-se que o usuário do banco tenha apenas o privilégio SELECT.
const mysql = require('mysql2/promise');

let pool = null;

function configurado() {
  return Boolean(
    process.env.EXT_DB_HOST &&
      process.env.EXT_DB_NAME &&
      process.env.EXT_DB_USER &&
      process.env.EXT_DB_TABLE
  );
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.EXT_DB_HOST,
      port: Number(process.env.EXT_DB_PORT || 3306),
      database: process.env.EXT_DB_NAME,
      user: process.env.EXT_DB_USER,
      password: process.env.EXT_DB_PASSWORD || '',
      waitForConnections: true,
      connectionLimit: 3,
      connectTimeout: 8000,
    });
  }
  return pool;
}

const LIMITE = 500;

async function consultarUsuariosExternos() {
  const tabela = process.env.EXT_DB_TABLE;

  // colunas do .env (separadas por vírgula) ou todas
  const colunasEnv = (process.env.EXT_DB_COLUMNS || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  // identificadores escapados com ?? — impossível injetar outro comando
  const sql = colunasEnv.length
    ? mysql.format(`SELECT ?? FROM ?? LIMIT ${LIMITE}`, [colunasEnv, tabela])
    : mysql.format(`SELECT * FROM ?? LIMIT ${LIMITE}`, [tabela]);

  const [rows] = await getPool().query(sql);
  return rows;
}

module.exports = { configurado, consultarUsuariosExternos };
