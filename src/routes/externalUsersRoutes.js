const { Router } = require('express');
const { listar, detalhe, historico } = require('../controllers/externalUsersController');
const { authRequired, adminOnly } = require('../middlewares/auth');

const router = Router();

// somente leitura e somente ADMIN
router.get('/', authRequired, adminOnly, listar);
router.get('/historico/:cpf', authRequired, adminOnly, historico);
router.get('/:matricula', authRequired, adminOnly, detalhe);

module.exports = router;
