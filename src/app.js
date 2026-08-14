const express = require('express');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const organogramaRoutes = require('./routes/organogramaRoutes');
const externalUsersRoutes = require('./routes/externalUsersRoutes');

const app = express();

// Middlewares globais (limite maior por causa das fotos do organograma)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'public')));

// Rota de saúde — útil pra monitoramento e pro n8n futuramente
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/organograma', organogramaRoutes);
app.use('/api/external-users', externalUsersRoutes);

module.exports = app;
