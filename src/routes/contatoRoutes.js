const { Router } = require('express');
const { listarTelefones, salvarTelefone } = require('../controllers/contatoController');
const { authRequired, adminOnly } = require('../middlewares/auth');

const router = Router();

router.get('/:matricula/telefones', authRequired, adminOnly, listarTelefones);
router.put('/:matricula/telefone', authRequired, adminOnly, salvarTelefone);

module.exports = router;
