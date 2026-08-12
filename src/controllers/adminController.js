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

module.exports = { overview, users };
