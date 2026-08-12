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

module.exports = { overview };
