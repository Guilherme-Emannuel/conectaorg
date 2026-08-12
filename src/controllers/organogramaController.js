const prisma = require('../lib/prisma');

// GET /api/organograma — árvore completa montada em memória
async function tree(req, res) {
  const unidades = await prisma.orgUnit.findMany({
    orderBy: [{ parentId: 'asc' }, { ordem: 'asc' }, { id: 'asc' }],
  });

  const porId = new Map();
  unidades.forEach((u) => porId.set(u.id, { ...u, children: [] }));

  let raiz = null;
  porId.forEach((u) => {
    if (u.parentId === null) {
      raiz = u;
    } else {
      porId.get(u.parentId)?.children.push(u);
    }
  });

  res.json(raiz);
}

// PUT /api/organograma/:id — edita uma unidade (somente ADMIN)
async function update(req, res) {
  const id = Number(req.params.id);
  const { nome, sigla, gestor, foto, fotoVisivel } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'O nome do setor é obrigatório.' });
  }

  const existe = await prisma.orgUnit.findUnique({ where: { id } });
  if (!existe) {
    return res.status(404).json({ error: 'Unidade não encontrada.' });
  }

  const unidade = await prisma.orgUnit.update({
    where: { id },
    data: {
      nome: nome.trim(),
      sigla: sigla?.trim() || null,
      gestor: gestor?.trim() || null,
      foto: foto !== undefined ? foto || null : existe.foto,
      fotoVisivel: typeof fotoVisivel === 'boolean' ? fotoVisivel : existe.fotoVisivel,
    },
  });

  res.json(unidade);
}

module.exports = { tree, update };
