const { configurado, estatisticas, listarContas } = require('../lib/emailsDb');

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
    const resultado = await listarContas({
      q: req.query.q || '',
      page: req.query.page || 1,
      status: req.query.status || '',
      setoriais: req.query.setoriais === '1',
      nuncaAcessado: req.query.nuncaAcessado === '1',
      acessoInicio: req.query.acessoInicio || '',
      acessoFim: req.query.acessoFim || '',
      ultimosDias: req.query.ultimosDias || 0,
      maisDeDias: req.query.maisDeDias || 0,
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
