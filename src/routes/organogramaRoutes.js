const { Router } = require('express');
const {
  tree,
  update,
  create,
  remove,
  gestores,
  updateGestorDoc,
  vincularGestorMatricula,
} = require('../controllers/organogramaController');
const { authRequired, adminOnly } = require('../middlewares/auth');

const router = Router();

router.get('/', authRequired, tree);
router.post('/', authRequired, adminOnly, create);
// rotas de histórico de gestores ANTES de /:id (senão "gestores" vira um id)
router.put('/gestores/:histId', authRequired, adminOnly, updateGestorDoc);
router.put('/gestores/:histId/matricula', authRequired, adminOnly, vincularGestorMatricula);
router.get('/:id/gestores', authRequired, adminOnly, gestores);
router.put('/:id', authRequired, adminOnly, update);
router.delete('/:id', authRequired, adminOnly, remove);

module.exports = router;
