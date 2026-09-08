// Conexão SOMENTE LEITURA com o banco de e-mails (PostfixAdmin / postfixdb).
// Usado para estatísticas de contas de e-mail e para cruzar, por nome, o
// webmail institucional de cada pessoa na tela de Usuários. Identificação
// do servidor vem do .env (DB_EMAILS_*), nunca do repositório.
//
// Segurança:
//  - somente SELECT/COUNT — nenhum INSERT/UPDATE/DELETE existe aqui;
//  - recomenda-se um usuário de banco com privilégio apenas de SELECT.
const mysql = require('mysql2/promise');

let pool = null;

function configurado() {
  return Boolean(
    process.env.DB_EMAILS_HOST &&
      process.env.DB_EMAILS_DATABASE &&
      process.env.DB_EMAILS_USERNAME
  );
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_EMAILS_HOST,
      port: Number(process.env.DB_EMAILS_PORT || 3306),
      database: process.env.DB_EMAILS_DATABASE,
      user: process.env.DB_EMAILS_USERNAME,
      password: process.env.DB_EMAILS_PASSWORD || '',
      waitForConnections: true,
      connectionLimit: 3,
      connectTimeout: 8000,
    });
  }
  return pool;
}

// GET dos 3 números da aba Webmails — total, ativados e desativados
async function estatisticas() {
  const [[{ total, ativos }]] = await getPool().query(
    'SELECT COUNT(*) AS total, SUM(active = 1) AS ativos FROM mailbox'
  );
  const totalNum = Number(total);
  const ativosNum = Number(ativos) || 0;
  return { total: totalNum, ativos: ativosNum, inativos: totalNum - ativosNum };
}

function normalizarNome(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// cache em memória (5 min): evita reconsultar a cada página carregada.
// Não escreve nada no banco de e-mails, só reduz o número de SELECTs.
let cacheMapa = null;
let cacheEm = 0;
let cachePromise = null;
const CACHE_MS = 5 * 60 * 1000;

async function mapaPorNome() {
  const agora = Date.now();
  if (cacheMapa && agora - cacheEm < CACHE_MS) return cacheMapa;
  if (cachePromise) return cachePromise; // já tem uma consulta em andamento

  cachePromise = (async () => {
    const [linhas] = await getPool().query(
      "SELECT username, name, active FROM mailbox WHERE name IS NOT NULL AND name <> ''"
    );

    const mapa = new Map();
    const ambiguos = new Set();
    for (const linha of linhas) {
      const chave = normalizarNome(linha.name);
      if (!chave) continue;
      if (mapa.has(chave)) {
        ambiguos.add(chave); // mais de uma conta com o mesmo nome — não arriscar
      } else {
        mapa.set(chave, { username: linha.username, active: !!linha.active });
      }
    }
    ambiguos.forEach((chave) => mapa.delete(chave));

    cacheMapa = mapa;
    cacheEm = Date.now();
    cachePromise = null;
    return mapa;
  })();

  return cachePromise;
}

// Busca o webmail de uma pessoa pelo nome completo (comparação normalizada,
// sem acentos/caixa). Retorna null se não achar ou se o nome for ambíguo.
async function buscarPorNome(nome) {
  const mapa = await mapaPorNome();
  return mapa.get(normalizarNome(nome)) || null;
}

module.exports = { configurado, estatisticas, buscarPorNome };
