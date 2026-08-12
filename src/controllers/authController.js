const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Mesma mensagem para e-mail inexistente e senha errada,
  // para não revelar quais e-mails estão cadastrados
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

// GET /api/auth/me — dados do usuário logado (exige token)
async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  res.json(user);
}

// POST /api/auth/register — cria usuário (somente ADMIN)
async function register(req, res) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Informe nome, e-mail e senha.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      role: role === 'ADMIN' ? 'ADMIN' : 'AGENT',
    },
    select: { id: true, name: true, email: true, role: true },
  });

  res.status(201).json(user);
}

module.exports = { login, me, register };
