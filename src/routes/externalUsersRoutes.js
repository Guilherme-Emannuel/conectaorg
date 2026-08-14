const { Router } = require('express');
const { listar } = require('../controllers/externalUsersController');
const { authRequired, adminOnly } = require('../middlewares/auth');

const router = Router();

// somente leitura e somente ADMIN
router.get('/', authRequired, adminOnly, listar);

module.exports = router;
