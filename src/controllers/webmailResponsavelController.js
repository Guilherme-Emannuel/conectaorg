// Responsável (pessoa) vinculado a uma conta de webmail setorial.
// O vínculo é mantido SOMENTE no banco local do ConectaOrg — NUNCA lê,
// escreve ou altera nada nos bancos externos (RH, e-mail), que continuam
// somente leitura via API, como sempre.
const prisma = require('../lib/prisma');
const {
  configurado,
  consultarUsuariosExternos,
  colunasConfiguradas,
  identificarColunas,
  buscarPessoaPorMatricula,
} = require('../lib/externalDb');

// GET /api/webmail/responsavel/buscar-pessoas?q=&page=N — pessoas do banco
// de RH (somente leitura) pra escolher quem vincular. Só os campos usados
// na janelinha de busca (nome, cpf, divisão, subdivisão, unidade).
async function buscarPessoas(req, res) {
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
    const id = identificarColunas(colunasConfiguradas());

    if (!id.matricula || !id.nome) {
      return res.status(503).json({
        error: 'Não foi possível identificar as colunas de matrícula/nome no banco externo.',
      });
    }

    const rows = resultado.rows.map((linha) => ({
      matricula: linha[id.matricula],
      nome: linha[id.nome],
      cpf: id.cpf ? linha[id.cpf] : null,
      telefone: id.telefone ? linha[id.telefone] : null,
      divisaoNome: id.divisao ? linha[id.divisao] : null,
      subdivisaoNome: id.subdivisao ? linha[id.subdivisao] : null,
      unidadeNome: id.unidade ? linha[id.unidade] : null,
    }));

    res.json({ ...resultado, rows });
  } catch (err) {
    console.error('Erro ao buscar pessoas para vínculo de responsável:', err.message);
    res.status(502).json({
      error: 'Não foi possível consultar o banco externo. Verifique a conexão no .env.',
    });
  }
}

// GET /api/webmail/responsavel/:username — histórico completo (atual +
// anteriores), do mais recente pro mais antigo
async function historico(req, res) {
  const username = req.params.username;

  const lista = await prisma.webmailResponsavel.findMany({
    where: { username },
    orderBy: [{ atual: 'desc' }, { vinculadoEm: 'desc' }],
  });

  res.json(lista);
}

// POST /api/webmail/responsavel/:username — vincula uma pessoa (por
// matrícula) como responsável atual. Marca o vínculo anterior (se houver)
// como não-atual; nada é sobrescrito, o histórico completo fica preservado.
async function vincular(req, res) {
  const username = req.params.username;
  const matricula = String(req.body.matricula || '').trim();

  if (!matricula) {
    return res.status(400).json({ error: 'Informe a pessoa a vincular.' });
  }

  if (!configurado()) {
    return res.status(503).json({
      error:
        'Conexão externa não configurada. Preencha as variáveis EXT_DB_* no arquivo .env.',
    });
  }

  const pessoa = await buscarPessoaPorMatricula(matricula);
  if (!pessoa) {
    return res.status(404).json({ error: 'Pessoa não encontrada no banco de RH.' });
  }

  const id = identificarColunas(Object.keys(pessoa));
  if (!id.nome) {
    return res.status(503).json({
      error: 'Não foi possível identificar a coluna de nome no banco externo.',
    });
  }

  await prisma.webmailResponsavel.updateMany({
    where: { username, atual: true },
    data: { atual: false },
  });

  const novo = await prisma.webmailResponsavel.create({
    data: {
      username,
      matricula,
      nome: pessoa[id.nome],
      cpf: id.cpf ? pessoa[id.cpf] : null,
      divisaoNome: id.divisao ? pessoa[id.divisao] : null,
      subdivisaoNome: id.subdivisao ? pessoa[id.subdivisao] : null,
      unidadeNome: id.unidade ? pessoa[id.unidade] : null,
      atual: true,
    },
  });

  res.status(201).json(novo);
}

module.exports = { buscarPessoas, historico, vincular };
