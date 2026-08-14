const { configurado, consultarUsuariosExternos } = require('../lib/externalDb');

// GET /api/external-users — dados do banco externo, somente leitura (ADMIN)
async function listar(req, res) {
  if (!configurado()) {
    return res.status(503).json({
      error:
        'Conexão externa não configurada. Preencha as variáveis EXT_DB_* no arquivo .env.',
    });
  }

  try {
    const rows = await consultarUsuariosExternos();
    const columns = rows.length ? Object.keys(rows[0]) : [];
    res.json({ columns, rows, total: rows.length });
  } catch (err) {
    console.error('Erro na consulta externa:', err.message);
    res.status(502).json({
      error: 'Não foi possível consultar o banco externo. Verifique a conexão no .env.',
    });
  }
}

module.exports = { listar };
