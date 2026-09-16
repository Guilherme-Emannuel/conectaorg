const { Router } = require('express');
const { listar, detalhe, historico, stats } = require('../controllers/externalUsersController');
const { authRequired, adminOnly } = require('../middlewares/auth');

const router = Router();

// somente leitura e somente ADMIN
router.get('/', authRequired, adminOnly, listar);
// rotas literais ANTES da rota com :matricula, senão "stats" seria
// interpretado como uma matrícula
router.get('/stats', authRequired, adminOnly, stats);
router.get('/historico/:cpf', authRequired, adminOnly, historico);
router.get('/:matricula', authRequired, adminOnly, detalhe);

module.exports = router;
