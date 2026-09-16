const { Router } = require('express');
const { listar, detalhe, historico, stats } = require('../controllers/externalUsersController');
// busca de pessoas já usada pelo responsável do webmail — reaproveitada
// aqui também pra vincular gestores a alguém do RH
const { buscarPessoas } = require('../controllers/webmailResponsavelController');
const { authRequired, adminOnly } = require('../middlewares/auth');

const router = Router();

// somente leitura e somente ADMIN
router.get('/', authRequired, adminOnly, listar);
// rotas literais ANTES da rota com :matricula, senão elas seriam
// interpretadas como uma matrícula
router.get('/stats', authRequired, adminOnly, stats);
router.get('/buscar-pessoas', authRequired, adminOnly, buscarPessoas);
router.get('/historico/:cpf', authRequired, adminOnly, historico);
router.get('/:matricula', authRequired, adminOnly, detalhe);

module.exports = router;
