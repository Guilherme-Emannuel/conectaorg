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
  const { nome, sigla, gestor, foto, fotoVisivel, parentId } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'O nome do setor é obrigatório.' });
  }

  const existe = await prisma.orgUnit.findUnique({ where: { id } });
  if (!existe) {
    return res.status(404).json({ error: 'Unidade não encontrada.' });
  }

  // Mudança de setor superior (reposicionamento na árvore)
  let novoParentId = existe.parentId;
  let novaOrdem = existe.ordem;

  if (parentId !== undefined && Number(parentId) !== existe.parentId) {
    const destinoId = Number(parentId);

    if (existe.parentId === null) {
      return res.status(400).json({ error: 'O topo do organograma não pode ser movido.' });
    }
    if (destinoId === id) {
      return res.status(400).json({ error: 'Um setor não pode ficar abaixo de si mesmo.' });
    }

    const destino = await prisma.orgUnit.findUnique({ where: { id: destinoId } });
    if (!destino) {
      return res.status(400).json({ error: 'Setor superior não encontrado.' });
    }

    // impede ciclos: o destino não pode ser subordinado do setor movido
    let atual = destino;
    while (atual.parentId !== null) {
      if (atual.parentId === id) {
        return res
          .status(400)
          .json({ error: 'Não é possível mover um setor para dentro de um subordinado dele.' });
      }
      atual = await prisma.orgUnit.findUnique({ where: { id: atual.parentId } });
    }

    novoParentId = destinoId;
    novaOrdem = await prisma.orgUnit.count({ where: { parentId: destinoId } });
  }

  const unidade = await prisma.orgUnit.update({
    where: { id },
    data: {
      nome: nome.trim(),
      sigla: sigla?.trim() || null,
      gestor: gestor?.trim() || null,
      foto: foto !== undefined ? foto || null : existe.foto,
      fotoVisivel: typeof fotoVisivel === 'boolean' ? fotoVisivel : existe.fotoVisivel,
      parentId: novoParentId,
      ordem: novaOrdem,
    },
  });

  res.json(unidade);
}

// DELETE /api/organograma/:id — apaga a unidade e todos os subordinados (somente ADMIN)
async function remove(req, res) {
  const id = Number(req.params.id);

  const existe = await prisma.orgUnit.findUnique({ where: { id } });
  if (!existe) {
    return res.status(404).json({ error: 'Unidade não encontrada.' });
  }
  if (existe.parentId === null) {
    return res.status(400).json({ error: 'O topo do organograma não pode ser apagado.' });
  }

  const antes = await prisma.orgUnit.count();
  // o banco apaga os subordinados em cascata (onDelete: Cascade)
  await prisma.orgUnit.delete({ where: { id } });
  const depois = await prisma.orgUnit.count();

  res.json({ removidas: antes - depois });
}

module.exports = { tree, update, remove };
