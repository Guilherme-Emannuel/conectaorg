const {
  configurado,
  consultarUsuariosExternos,
  mapaRotulos,
  buscarPessoaPorMatricula,
} = require('../lib/externalDb');
const emailsDb = require('../lib/emailsDb');

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
    const rotulos = mapaRotulos();
    const labels = columns.map((c) => rotulos[c] || c);

    // cruza com o banco de e-mails pelo NOME (leitura apenas; nada é
    // alterado em nenhum dos dois bancos)
    if (emailsDb.configurado()) {
      const colunaNome = columns.find((c) => c.toLowerCase() === 'nome');
      if (colunaNome) {
        await Promise.all(
          resultado.rows.map(async (linha) => {
            const encontrado = await emailsDb.buscarPorNome(linha[colunaNome]);
            linha.__webmail = encontrado ? encontrado.username : null;
          })
        );
      }
    }

    res.json({ columns, labels, ...resultado });
  } catch (err) {
    console.error('Erro na consulta externa:', err.message);
    res.status(502).json({
      error: 'Não foi possível consultar o banco externo. Verifique a conexão no .env.',
    });
  }
}

// GET /api/external-users/:matricula — dados completos de UMA pessoa
// (usado pela janelinha "mais informações" do responsável do webmail)
async function detalhe(req, res) {
  if (!configurado()) {
    return res.status(503).json({
      error:
        'Conexão externa não configurada. Preencha as variáveis EXT_DB_* no arquivo .env.',
    });
  }

  try {
    const linha = await buscarPessoaPorMatricula(req.params.matricula);
    if (!linha) {
      return res.status(404).json({ error: 'Pessoa não encontrada.' });
    }
    const columns = Object.keys(linha);
    const rotulos = mapaRotulos();
    const labels = columns.map((c) => rotulos[c] || c);
    res.json({ columns, labels, linha });
  } catch (err) {
    console.error('Erro ao consultar pessoa externa:', err.message);
    res.status(502).json({
      error: 'Não foi possível consultar o banco externo. Verifique a conexão no .env.',
    });
  }
}

module.exports = { listar, detalhe };
