const { configurado, estatisticas } = require('../lib/emailsDb');

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

module.exports = { stats };
