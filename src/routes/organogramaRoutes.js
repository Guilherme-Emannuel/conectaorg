const { Router } = require('express');
const { tree, update, create, remove } = require('../controllers/organogramaController');
const { authRequired, adminOnly } = require('../middlewares/auth');

const router = Router();

router.get('/', authRequired, tree);
router.post('/', authRequired, adminOnly, create);
router.put('/:id', authRequired, adminOnly, update);
router.delete('/:id', authRequired, adminOnly, remove);

module.exports = router;
