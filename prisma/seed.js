// Seed: cria o usuário administrador inicial.
// As credenciais vêm do .env (ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD).
// Sem essas variáveis, usa valores hipotéticos de desenvolvimento.
require('dotenv').config();

const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

async function main() {
  const name = process.env.ADMIN_NAME || 'Administrador';
  const email = process.env.ADMIN_EMAIL || 'admin@conectaorg.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log(`Admin já existe (${email}), nada a fazer.`);
    return;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: 'ADMIN',
    },
  });

  console.log(`Admin criado: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
