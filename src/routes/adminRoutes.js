const { Router } = require('express');
const { overview, users, updateUser, deleteUser } = require('../controllers/adminController');
const { authRequired, adminOnly } = require('../middlewares/auth');

const router = Router();

// Todas as rotas de administração exigem token de ADMIN
router.use(authRequired, adminOnly);

router.get('/overview', overview);
router.get('/users', users);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
