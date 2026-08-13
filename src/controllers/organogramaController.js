const prisma = require('../lib/prisma');

// nomes que não representam um gestor real
const SEM_GESTOR = ['VACANTE', 'NÃO INFORMADO', 'NÃO ADICIONADO'];

function gestorValido(nome) {
  return nome && nome.trim() && !SEM_GESTOR.includes(nome.trim().toUpperCase());
}

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

  // registra a troca de gestor no histórico
  const gestorNovo = gestor?.trim() || '';
  if (gestorNovo !== (existe.gestor || '')) {
    await prisma.gestorHistory.updateMany({
      where: { orgUnitId: id, atual: true },
      data: { atual: false },
    });
    if (gestorValido(gestorNovo)) {
      await prisma.gestorHistory.create({
        data: { orgUnitId: id, nome: gestorNovo, atual: true },
      });
    }
  }

  res.json(unidade);
}

// GET /api/organograma/:id/gestores — histórico de gestores (somente ADMIN)
async function gestores(req, res) {
  const id = Number(req.params.id);

  const unidade = await prisma.orgUnit.findUnique({ where: { id } });
  if (!unidade) {
    return res.status(404).json({ error: 'Unidade não encontrada.' });
  }

  // primeira consulta: registra o gestor atual como início do histórico
  const total = await prisma.gestorHistory.count({ where: { orgUnitId: id } });
  if (total === 0 && gestorValido(unidade.gestor)) {
    await prisma.gestorHistory.create({
      data: {
        orgUnitId: id,
        nome: unidade.gestor.trim(),
        atual: true,
        inicio: unidade.createdAt,
      },
    });
  }

  const lista = await prisma.gestorHistory.findMany({
    where: { orgUnitId: id },
    orderBy: [{ atual: 'desc' }, { inicio: 'desc' }],
  });

  res.json({ unidade: { id: unidade.id, nome: unidade.nome }, gestores: lista });
}

// PUT /api/organograma/gestores/:histId — documento do gestor (somente ADMIN)
async function updateGestorDoc(req, res) {
  const histId = Number(req.params.histId);
  const { docTipo, docNumero, docUrl } = req.body;

  const existe = await prisma.gestorHistory.findUnique({ where: { id: histId } });
  if (!existe) {
    return res.status(404).json({ error: 'Registro de gestor não encontrado.' });
  }

  if (docTipo && !['CI', 'OFICIO'].includes(docTipo)) {
    return res.status(400).json({ error: 'Tipo de documento deve ser C.I ou Ofício.' });
  }

  const registro = await prisma.gestorHistory.update({
    where: { id: histId },
    data: {
      docTipo: docTipo || null,
      docNumero: docNumero?.trim() || null,
      docUrl: docUrl?.trim() || null,
    },
  });

  res.json(registro);
}

// POST /api/organograma — cria uma nova unidade (somente ADMIN)
async function create(req, res) {
  const { nome, sigla, gestor, parentId, fotoVisivel } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'O nome do setor é obrigatório.' });
  }

  const paiId = Number(parentId);
  if (!paiId) {
    return res.status(400).json({ error: 'Escolha o setor superior.' });
  }

  const pai = await prisma.orgUnit.findUnique({ where: { id: paiId } });
  if (!pai) {
    return res.status(400).json({ error: 'Setor superior não encontrado.' });
  }

  const unidade = await prisma.orgUnit.create({
    data: {
      nome: nome.trim(),
      sigla: sigla?.trim() || null,
      gestor: gestor?.trim() || null,
      fotoVisivel: typeof fotoVisivel === 'boolean' ? fotoVisivel : true,
      parentId: paiId,
      ordem: await prisma.orgUnit.count({ where: { parentId: paiId } }),
    },
  });

  res.status(201).json(unidade);
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

module.exports = { tree, update, create, remove, gestores, updateGestorDoc };
