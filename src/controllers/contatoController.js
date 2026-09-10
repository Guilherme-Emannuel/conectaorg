// Telefones de contato mantidos SOMENTE no banco local do ConectaOrg.
// NUNCA lê, escreve ou altera nada nos bancos externos (RH, e-mail) —
// esses continuam somente leitura via API, como sempre.
const prisma = require('../lib/prisma');

// GET /api/contatos/:matricula/telefones — histórico local (somente ADMIN)
async function listarTelefones(req, res) {
  const matricula = req.params.matricula;

  const lista = await prisma.contatoTelefone.findMany({
    where: { matricula },
    orderBy: [{ atual: 'desc' }, { criadoEm: 'desc' }],
  });

  res.json(lista);
}

// PUT /api/contatos/:matricula/telefone — salva um número atualizado
// (somente ADMIN). Cria um novo registro e marca o anterior como não-atual;
// nada é sobrescrito, o histórico completo fica preservado.
async function salvarTelefone(req, res) {
  const matricula = req.params.matricula;
  const { telefone } = req.body;

  if (!telefone || !telefone.trim()) {
    return res.status(400).json({ error: 'Informe o número de telefone.' });
  }

  await prisma.contatoTelefone.updateMany({
    where: { matricula, atual: true },
    data: { atual: false },
  });

  const novo = await prisma.contatoTelefone.create({
    data: { matricula, telefone: telefone.trim(), atual: true },
  });

  res.status(201).json(novo);
}

module.exports = { listarTelefones, salvarTelefone };
