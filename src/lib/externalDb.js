// Conexão SOMENTE LEITURA com um banco de dados externo.
// Toda a identificação (host, banco, tabela, colunas) vem do .env,
// que é ignorado pelo git — nada disso aparece no repositório.
//
// Segurança:
//  - este módulo executa apenas SELECT (listagem e contagem), com
//    identificadores escapados (??) e valores parametrizados (?);
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
      // datas chegam como texto puro ("2004-12-01"), sem conversão de fuso
      // que poderia até deslocar o dia — o dado exibido é o dado gravado
      dateStrings: true,
    });
  }
  return pool;
}

const PAGE_SIZE = 50;

function colunasConfiguradas() {
  return (process.env.EXT_DB_COLUMNS || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

// mapa coluna -> rótulo de exibição (EXT_DB_LABELS, posicional às colunas)
function mapaRotulos() {
  const colunas = colunasConfiguradas();
  const rotulos = (process.env.EXT_DB_LABELS || '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);

  const mapa = {};
  colunas.forEach((col, i) => {
    mapa[col] = rotulos[i] || col;
  });
  return mapa;
}

// Busca paginada: WHERE com LIKE em todas as colunas exibidas (parametrizado)
// e COUNT(*) com o mesmo filtro para o total real.
async function consultarUsuariosExternos({ q = '', page = 1 } = {}) {
  const tabela = process.env.EXT_DB_TABLE;
  const colunas = colunasConfiguradas();

  const termo = String(q).trim().slice(0, 100);
  const paginaAtual = Math.max(1, Number(page) || 1);
  const offset = (paginaAtual - 1) * PAGE_SIZE;

  let where = '';
  const paramsWhere = [];
  if (termo && colunas.length) {
    const likes = colunas.map(() => '?? LIKE ?').join(' OR ');
    where = ` WHERE (${likes})`;
    colunas.forEach((col) => paramsWhere.push(col, `%${termo}%`));
  }

  const selectCols = colunas.length ? mysql.format('??', [colunas]) : '*';
  const ordem = colunas.length ? mysql.format(' ORDER BY ??', [colunas[0]]) : '';

  const sqlDados = mysql.format(
    `SELECT ${selectCols} FROM ??${where}${ordem} LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    [tabela, ...paramsWhere]
  );
  const sqlTotal = mysql.format(`SELECT COUNT(*) AS total FROM ??${where}`, [
    tabela,
    ...paramsWhere,
  ]);

  const p = getPool();
  const [[rows], [[{ total }]]] = await Promise.all([
    p.query(sqlDados),
    p.query(sqlTotal),
  ]);

  return {
    rows,
    total,
    page: paginaAtual,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

// Identifica, entre as colunas configuradas no .env (nomes variam de
// instalação pra instalação), quais representam matrícula/nome/cpf/divisão/
// subdivisão/unidade — por substring, já que não há nomes fixos garantidos.
function identificarColunas(columns) {
  const lower = (c) => c.toLowerCase();
  return {
    matricula: columns.find((c) => lower(c).includes('matricula')),
    nome: columns.find((c) => lower(c) === 'nome'),
    cpf: columns.find((c) => lower(c).includes('cpf')),
    telefone: columns.find(
      (c) => lower(c).includes('celular') || lower(c).includes('telefone') || lower(c).includes('fone')
    ),
    divisao: columns.find((c) => lower(c).includes('divisao') && !lower(c).includes('subdivisao')),
    subdivisao: columns.find((c) => lower(c).includes('subdivisao')),
    unidade: columns.find((c) => lower(c).includes('unidade')),
  };
}

// Busca uma única pessoa pela matrícula (todas as colunas configuradas).
// Somente leitura — mesma tabela/conexão de consultarUsuariosExternos.
async function buscarPessoaPorMatricula(matricula) {
  const tabela = process.env.EXT_DB_TABLE;
  const colunas = colunasConfiguradas();
  if (!colunas.length) return null;

  const { matricula: colMatricula } = identificarColunas(colunas);
  if (!colMatricula) return null;

  const sql = mysql.format('SELECT ?? FROM ?? WHERE ?? = ? LIMIT 1', [
    colunas,
    tabela,
    colMatricula,
    matricula,
  ]);
  const [rows] = await getPool().query(sql);
  return rows[0] || null;
}

module.exports = {
  configurado,
  consultarUsuariosExternos,
  mapaRotulos,
  colunasConfiguradas,
  identificarColunas,
  buscarPessoaPorMatricula,
};
