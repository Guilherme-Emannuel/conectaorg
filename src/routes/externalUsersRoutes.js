const { Router } = require('express');
const { listar, detalhe } = require('../controllers/externalUsersController');
const { authRequired, adminOnly } = require('../middlewares/auth');

const router = Router();

// somente leitura e somente ADMIN
router.get('/', authRequired, adminOnly, listar);
router.get('/:matricula', authRequired, adminOnly, detalhe);

module.exports = router;
