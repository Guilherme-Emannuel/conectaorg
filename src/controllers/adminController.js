const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

// GET /api/admin/overview — visão geral do sistema (somente ADMIN)
async function overview(req, res) {
  const [totalUsers, totalAdmins] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'ADMIN' } }),
  ]);

  res.json({
    totalUsers,
    totalAdmins,
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  });
}

// GET /api/admin/users — lista todos os usuários do sistema (somente ADMIN)
// Nunca retorna o hash da senha.
async function users(req, res) {
  const lista = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  res.json(lista);
}

// PUT /api/admin/users/:id — edita um usuário (somente ADMIN)
async function updateUser(req, res) {
  const id = Number(req.params.id);
  const { name, email, role, password } = req.body;

  if (!name || !name.trim() || !email || !email.trim()) {
    return res.status(400).json({ error: 'Informe nome e e-mail.' });
  }

  const alvo = await prisma.user.findUnique({ where: { id } });
  if (!alvo) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  const novoRole = role === 'ADMIN' ? 'ADMIN' : 'AGENT';

  // protege contra perda de acesso administrativo
  if (alvo.role === 'ADMIN' && novoRole !== 'ADMIN') {
    if (id === req.userId) {
      return res
        .status(400)
        .json({ error: 'Você não pode remover seu próprio acesso de administrador.' });
    }
    const totalAdmins = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (totalAdmins <= 1) {
      return res
        .status(400)
        .json({ error: 'O sistema precisa de pelo menos um administrador.' });
    }
  }

  const emailEmUso = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (emailEmUso && emailEmUso.id !== id) {
    return res.status(409).json({ error: 'Este e-mail já está em uso por outro usuário.' });
  }

  const data = {
    name: name.trim(),
    email: email.trim(),
    role: novoRole,
  };

  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }
    data.password = await bcrypt.hash(password, 10);
  }

  const usuario = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.json(usuario);
}

// DELETE /api/admin/users/:id — exclui um usuário (somente ADMIN)
async function deleteUser(req, res) {
  const id = Number(req.params.id);

  if (id === req.userId) {
    return res.status(400).json({ error: 'Você não pode excluir a sua própria conta.' });
  }

  const alvo = await prisma.user.findUnique({ where: { id } });
  if (!alvo) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
}

module.exports = { overview, users, updateUser, deleteUser };
