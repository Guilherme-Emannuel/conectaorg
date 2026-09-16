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
    demissao: columns.find((c) => lower(c).includes('demissao')),
    admissao: columns.find((c) => lower(c).includes('admissao') && !lower(c).includes('nomeacao')),
  };
}

// Ordem que define o "contrato atual" de uma pessoa: sem data de
// demissão (ainda ativo) vem primeiro; entre os encerrados, o mais
// recente primeiro. É a MESMA ordem usada tanto pra escolher o registro
// atual quanto pra listar o histórico do mais novo pro mais antigo.
function ordenacaoEstadoAtual(id) {
  const partes = [];
  if (id.demissao) {
    partes.push(mysql.format("(?? IS NULL OR ?? = '') DESC", [id.demissao, id.demissao]));
    partes.push(mysql.format('?? DESC', [id.demissao]));
  }
  if (id.admissao) {
    partes.push(mysql.format('?? DESC', [id.admissao]));
  }
  return partes.length ? partes.join(', ') : '1';
}

// Chave de agrupamento "uma pessoa" — CPF é o vínculo mais confiável
// entre os vários contratos/matrículas da mesma pessoa. Sem CPF (linha
// incompleta), cada matrícula vira seu próprio grupo, pra não misturar
// pessoas diferentes por engano.
function chaveAgrupamento(id) {
  return mysql.format("COALESCE(NULLIF(??, ''), CONCAT('sem-cpf-', ??))", [
    id.cpf,
    id.matricula || id.cpf,
  ]);
}

// Busca paginada: WHERE com LIKE em todas as colunas exibidas (parametrizado)
// e COUNT(*) com o mesmo filtro para o total real.
// Quando há coluna de CPF configurada, agrupa por pessoa e mostra só o
// estado ATUAL (contrato sem demissão, ou o de demissão mais recente) —
// os demais contratos ficam disponíveis por buscarHistoricoPorCpf().
async function consultarUsuariosExternos({ q = '', page = 1, status = '' } = {}) {
  const tabela = process.env.EXT_DB_TABLE;
  const colunas = colunasConfiguradas();
  const id = identificarColunas(colunas);

  const termo = String(q).trim().slice(0, 100);
  const paginaAtual = Math.max(1, Number(page) || 1);
  const offset = (paginaAtual - 1) * PAGE_SIZE;

  // condições SEM a palavra WHERE (compostas com AND onde precisar) — os
  // parâmetros de cada uma entram em params na mesma ordem em que a
  // condição aparece na string final
  const condicoesLista = [];
  const paramsWhere = [];
  if (termo && colunas.length) {
    const likes = colunas.map(() => '?? LIKE ?').join(' OR ');
    condicoesLista.push(`(${likes})`);
    colunas.forEach((col) => paramsWhere.push(col, `%${termo}%`));
  }
  if (status === 'ativo' && id.demissao) {
    condicoesLista.push(mysql.format("(?? IS NULL OR ?? = '')", [id.demissao, id.demissao]));
  } else if (status === 'exonerado' && id.demissao) {
    condicoesLista.push(mysql.format("(?? IS NOT NULL AND ?? <> '')", [id.demissao, id.demissao]));
  }
  const condBusca = condicoesLista.join(' AND ');
  const where = condBusca ? ` WHERE ${condBusca}` : ''; // usado quando é o único filtro da consulta

  const selectCols = colunas.length ? mysql.format('??', [colunas]) : '*';

  let sqlDados;
  let sqlTotal;

  if (colunas.length && id.cpf) {
    const grupo = chaveAgrupamento(id);
    const ordemAtual = ordenacaoEstadoAtual(id);
    const subconsulta = mysql.format(
      `SELECT ${selectCols},
         ROW_NUMBER() OVER (PARTITION BY ${grupo} ORDER BY ${ordemAtual}) AS __rn,
         COUNT(*) OVER (PARTITION BY ${grupo}) AS __totalContratos
       FROM ??`,
      [tabela]
    );

    const filtroAtual = condBusca ? ` AND ${condBusca}` : '';
    sqlDados = mysql.format(
      `SELECT ${selectCols}, __atual.__totalContratos FROM (${subconsulta}) __atual
       WHERE __atual.__rn = 1${filtroAtual}
       ORDER BY ??
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      [...paramsWhere, colunas[0]]
    );
    sqlTotal = mysql.format(
      `SELECT COUNT(*) AS total FROM (${subconsulta}) __atual WHERE __atual.__rn = 1${filtroAtual}`,
      paramsWhere
    );
  } else {
    // sem coluna de CPF configurada: não dá pra agrupar com segurança —
    // mantém o comportamento antigo (uma linha por registro)
    const ordem = colunas.length ? mysql.format(' ORDER BY ??', [colunas[0]]) : '';
    sqlDados = mysql.format(
      `SELECT ${selectCols} FROM ??${where}${ordem} LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      [tabela, ...paramsWhere]
    );
    sqlTotal = mysql.format(`SELECT COUNT(*) AS total FROM ??${where}`, [
      tabela,
      ...paramsWhere,
    ]);
  }

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

// Todos os OUTROS contratos de uma pessoa (mesmo CPF), do mais recente
// ao mais antigo — o "atual" já aparece na listagem principal, então
// vem excluído daqui. Somente leitura, mesma tabela/conexão de sempre.
async function buscarHistoricoPorCpf(cpf) {
  const tabela = process.env.EXT_DB_TABLE;
  const colunas = colunasConfiguradas();
  const id = identificarColunas(colunas);
  if (!colunas.length || !id.cpf) return [];

  const ordemAtual = ordenacaoEstadoAtual(id);
  const sql = mysql.format(`SELECT ?? FROM ?? WHERE ?? = ? ORDER BY ${ordemAtual}`, [
    colunas,
    tabela,
    id.cpf,
    cpf,
  ]);
  const [rows] = await getPool().query(sql);
  return rows.slice(1); // o primeiro é o contrato atual, já exibido na linha principal
}

// Estatísticas da tela de Usuários: total de pessoas (já deduplicado por
// vínculo único) e quantas estão ativas (sem data de encerramento) ou
// exoneradas — usado pelos cards de filtro grandes, tipo os do Webmail.
// Sem coluna de CPF ou de encerramento configurada, não dá pra calcular
// com segurança: retorna null e a tela esconde os cards.
async function estatisticasUsuariosExternos() {
  const tabela = process.env.EXT_DB_TABLE;
  const colunas = colunasConfiguradas();
  const id = identificarColunas(colunas);
  if (!colunas.length || !id.cpf || !id.demissao) return null;

  const grupo = chaveAgrupamento(id);
  const ordemAtual = ordenacaoEstadoAtual(id);
  const subconsulta = mysql.format(
    `SELECT ??, ROW_NUMBER() OVER (PARTITION BY ${grupo} ORDER BY ${ordemAtual}) AS __rn FROM ??`,
    [id.demissao, tabela]
  );

  const sql = mysql.format(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN (?? IS NULL OR ?? = '') THEN 1 ELSE 0 END) AS ativos
     FROM (${subconsulta}) __t
     WHERE __t.__rn = 1`,
    [id.demissao, id.demissao]
  );

  const [[{ total, ativos }]] = await getPool().query(sql);
  const totalNum = Number(total);
  const ativosNum = Number(ativos) || 0;
  return { total: totalNum, ativos: ativosNum, exonerados: totalNum - ativosNum };
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
  buscarHistoricoPorCpf,
  estatisticasUsuariosExternos,
};
