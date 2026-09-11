const { configurado, estatisticas, listarContas } = require('../lib/emailsDb');
const prisma = require('../lib/prisma');

// GET /api/webmail/stats — total, ativados e desativados (somente ADMIN)
async function stats(req, res) {
  if (!configurado()) {
    return res.status(503).json({
      error: 'Conexão do webmail não configurada. Preencha DB_EMAILS_* no arquivo .env.',
    });
  }

  try {
    const dados = await estatisticas();
    res.json(dados);
  } catch (err) {
    console.error('Erro ao consultar estatísticas do webmail:', err.message);
    res.status(502).json({
      error: 'Não foi possível consultar o banco de e-mails. Verifique a conexão no .env.',
    });
  }
}

// GET /api/webmail/accounts?q=...&page=N — lista de contas (somente ADMIN)
async function accounts(req, res) {
  if (!configurado()) {
    return res.status(503).json({
      error: 'Conexão do webmail não configurada. Preencha DB_EMAILS_* no arquivo .env.',
    });
  }

  try {
    const termo = String(req.query.q || '').trim();

    // o nome do responsável só existe no banco local — resolve aqui quais
    // contas batem por ele antes de pedir a lista (que é do banco externo)
    const usernamesResponsavel = termo
      ? (
          await prisma.webmailResponsavel.findMany({
            where: { atual: true, nome: { contains: termo } },
            select: { username: true },
          })
        ).map((r) => r.username)
      : [];

    const resultado = await listarContas({
      q: termo,
      page: req.query.page || 1,
      status: req.query.status || '',
      setoriais: req.query.setoriais === '1',
      nuncaAcessado: req.query.nuncaAcessado === '1',
      acessoInicio: req.query.acessoInicio || '',
      acessoFim: req.query.acessoFim || '',
      ultimosDias: req.query.ultimosDias || 0,
      maisDeDias: req.query.maisDeDias || 0,
      usernamesResponsavel,
    });

    // cruza com o responsável atual (banco local, somente aqui) pelo
    // username — nada é lido/alterado no banco de e-mails além do já feito
    const usernames = resultado.rows.map((r) => r.username);
    const responsaveis = usernames.length
      ? await prisma.webmailResponsavel.findMany({
          where: { username: { in: usernames }, atual: true },
        })
      : [];
    const porUsername = new Map(responsaveis.map((r) => [r.username, r]));
    resultado.rows.forEach((r) => {
      const resp = porUsername.get(r.username);
      r.responsavel = resp ? { nome: resp.nome, matricula: resp.matricula } : null;
    });

    res.json(resultado);
  } catch (err) {
    console.error('Erro ao listar contas de webmail:', err.message);
    res.status(502).json({
      error: 'Não foi possível consultar o banco de e-mails. Verifique a conexão no .env.',
    });
  }
}

module.exports = { stats, accounts };
