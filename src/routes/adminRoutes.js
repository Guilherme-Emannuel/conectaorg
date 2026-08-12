const { Router } = require('express');
const { overview, users } = require('../controllers/adminController');
const { authRequired, adminOnly } = require('../middlewares/auth');

const router = Router();

// Todas as rotas de administração exigem token de ADMIN
router.use(authRequired, adminOnly);

router.get('/overview', overview);
router.get('/users', users);

module.exports = router;
