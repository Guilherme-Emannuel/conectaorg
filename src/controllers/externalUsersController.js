const { configurado, consultarUsuariosExternos } = require('../lib/externalDb');

// GET /api/external-users?q=...&page=N — banco externo, somente leitura (ADMIN)
async function listar(req, res) {
  if (!configurado()) {
    return res.status(503).json({
      error:
        'Conexão externa não configurada. Preencha as variáveis EXT_DB_* no arquivo .env.',
    });
  }

  try {
    const resultado = await consultarUsuariosExternos({
      q: req.query.q || '',
      page: req.query.page || 1,
    });
    const columns = resultado.rows.length ? Object.keys(resultado.rows[0]) : [];
    res.json({ columns, ...resultado });
  } catch (err) {
    console.error('Erro na consulta externa:', err.message);
    res.status(502).json({
      error: 'Não foi possível consultar o banco externo. Verifique a conexão no .env.',
    });
  }
}

module.exports = { listar };
