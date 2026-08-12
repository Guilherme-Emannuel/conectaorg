const express = require('express');
const path = require('path');

const app = express();

// Middlewares globais
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'public')));

// Rota de saúde — útil pra monitoramento e pro n8n futuramente
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = app;
