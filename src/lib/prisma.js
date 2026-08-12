const { PrismaClient } = require('@prisma/client');

// Instância única do Prisma compartilhada por toda a aplicação
const prisma = new PrismaClient();

module.exports = prisma;
