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

// TTL do cache em memória (nomes e estatísticas): protege o servidor de
// e-mail de ser consultado repetidamente — nunca escreve nada nele.
const CACHE_MS = 5 * 60 * 1000;

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
      // datas como texto puro, sem conversão de fuso (mesmo motivo do
      // banco de RH: evita deslocar o dia exibido)
      dateStrings: true,
    });
  }
  return pool;
}

// GET dos 3 números da aba Webmails — total, ativados e desativados. Cacheado.
let cacheStats = null;
let cacheStatsEm = 0;

async function estatisticas() {
  const agora = Date.now();
  if (cacheStats && agora - cacheStatsEm < CACHE_MS) return cacheStats;

  const [[{ total, ativos, semNome, nuncaAcessado }]] = await getPool().query(`
    SELECT
      COUNT(*) AS total,
      SUM(active = 1) AS ativos,
      SUM(name IS NULL OR name = '') AS semNome,
      SUM(last_login_date IS NULL) AS nuncaAcessado
    FROM mailbox
  `);
  const totalNum = Number(total);
  const ativosNum = Number(ativos) || 0;

  cacheStats = {
    total: totalNum,
    ativos: ativosNum,
    inativos: totalNum - ativosNum,
    semNome: Number(semNome) || 0,
    nuncaAcessado: Number(nuncaAcessado) || 0,
  };
  cacheStatsEm = agora;
  return cacheStats;
}

function normalizarNome(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// cache do mapa nome -> e-mail: evita reconsultar a cada página carregada.
let cacheMapa = null;
let cacheEm = 0;
let cachePromise = null;

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

const PAGE_SIZE = 50;

// AAAA-MM-DD, exatamente — evita passar algo malformado pra query
const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

// Lista paginada das contas de e-mail (aba Webmails). Só as colunas
// necessárias para exibição — NUNCA seleciona password/token/totp_secret.
// status: 'ativo' | 'inativo' | '' (todos) — filtro dos cards clicáveis.
// semNome / nuncaAcessado: filtros extras (cards do "+").
// acessoInicio / acessoFim: quando as duas vêm preenchidas, filtram por
// período de último acesso em vez de "nunca acessado".
// ultimosDias: faixa rápida (30/60/90/180) — mostra quem ACESSOU nos
// últimos N dias (de hoje até N dias atrás). Quem nunca acessou fica de
// fora, já que não há acesso nenhum para cair nesse período.
// maisDeDias: o complemento — quem JÁ acessou alguma vez, mas não nos
// últimos N dias (último acesso foi há N dias ou mais). Fecha a conta com
// nuncaAcessado + ultimosDias: juntos cobrem 100% das contas, sem sobrepor.
async function listarContas({
  q = '',
  page = 1,
  status = '',
  semNome = false,
  nuncaAcessado = false,
  acessoInicio = '',
  acessoFim = '',
  ultimosDias = 0,
  maisDeDias = 0,
} = {}) {
  const termo = String(q).trim().slice(0, 100);
  const paginaAtual = Math.max(1, Number(page) || 1);
  const offset = (paginaAtual - 1) * PAGE_SIZE;

  const condicoes = [];
  const params = [];
  if (termo) {
    condicoes.push('(m.username LIKE ? OR m.name LIKE ?)');
    params.push(`%${termo}%`, `%${termo}%`);
  }
  if (status === 'ativo') {
    condicoes.push('m.active = 1');
  } else if (status === 'inativo') {
    condicoes.push('m.active = 0');
  }
  if (semNome) {
    condicoes.push("(m.name IS NULL OR m.name = '')");
  }
  const dias = Number(ultimosDias);
  if (DATA_VALIDA.test(acessoInicio) && DATA_VALIDA.test(acessoFim)) {
    condicoes.push('m.last_login_date BETWEEN ? AND ?');
    params.push(`${acessoInicio} 00:00:00`, `${acessoFim} 23:59:59`);
  } else if (dias > 0) {
    // "acessados nos últimos N dias": de (hoje - N dias) até agora.
    // Quem nunca acessou (last_login_date NULL) não entra aqui.
    const corte = new Date();
    corte.setUTCDate(corte.getUTCDate() - dias);
    condicoes.push('m.last_login_date BETWEEN ? AND NOW()');
    params.push(`${corte.toISOString().slice(0, 10)} 00:00:00`);
  } else if (Number(maisDeDias) > 0) {
    // complemento de "ultimosDias": já acessou, mas não nos últimos N dias
    const corte = new Date();
    corte.setUTCDate(corte.getUTCDate() - Number(maisDeDias));
    condicoes.push('m.last_login_date IS NOT NULL AND m.last_login_date < ?');
    params.push(`${corte.toISOString().slice(0, 10)} 00:00:00`);
  } else if (nuncaAcessado) {
    condicoes.push('m.last_login_date IS NULL');
  }
  const where = condicoes.length ? ` WHERE ${condicoes.join(' AND ')}` : '';

  const sqlDados = `
    SELECT
      m.username,
      m.name,
      m.active,
      m.last_login_date,
      m.quota AS quota_limite,
      m.created,
      m.modified,
      COALESCE(q2.bytes, 0) AS quota_usado
    FROM mailbox m
    LEFT JOIN quota2 q2 ON q2.username = m.username
    ${where}
    ORDER BY m.name
    LIMIT ${PAGE_SIZE} OFFSET ${offset}`;

  const sqlTotal = `SELECT COUNT(*) AS total FROM mailbox m${where}`;

  const p = getPool();
  const [[rows], [[{ total }]]] = await Promise.all([
    p.query(sqlDados, params),
    p.query(sqlTotal, params),
  ]);

  return {
    rows,
    total,
    page: paginaAtual,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

module.exports = { configurado, estatisticas, buscarPorNome, listarContas };
