// Seed: cria o usuário administrador inicial.
// Credenciais HIPOTÉTICAS de desenvolvimento — troque a senha
// no primeiro acesso em produção.
require('dotenv').config();

const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

async function main() {
  const email = 'admin@conectaorg.com';

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log(`Admin já existe (${email}), nada a fazer.`);
    return;
  }

  await prisma.user.create({
    data: {
      name: 'Administrador',
      email,
      password: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
    },
  });

  console.log(`Admin criado: ${email} / senha: admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
