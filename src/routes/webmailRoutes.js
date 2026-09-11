const { Router } = require('express');
const { stats, accounts } = require('../controllers/webmailController');
const {
  buscarPessoas,
  historico,
  vincular,
} = require('../controllers/webmailResponsavelController');
const { authRequired, adminOnly } = require('../middlewares/auth');

const router = Router();

router.get('/stats', authRequired, adminOnly, stats);
router.get('/accounts', authRequired, adminOnly, accounts);

// rota literal ANTES da rota com :username, senão "buscar-pessoas" seria
// interpretado como um username
router.get('/responsavel/buscar-pessoas', authRequired, adminOnly, buscarPessoas);
router.get('/responsavel/:username', authRequired, adminOnly, historico);
router.post('/responsavel/:username', authRequired, adminOnly, vincular);

module.exports = router;
