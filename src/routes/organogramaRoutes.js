const { Router } = require('express');
const { tree, update } = require('../controllers/organogramaController');
const { authRequired, adminOnly } = require('../middlewares/auth');

const router = Router();

router.get('/', authRequired, tree);
router.put('/:id', authRequired, adminOnly, update);

module.exports = router;
