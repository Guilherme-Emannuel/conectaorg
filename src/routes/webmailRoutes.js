const { Router } = require('express');
const { stats, accounts } = require('../controllers/webmailController');
const { authRequired, adminOnly } = require('../middlewares/auth');

const router = Router();

router.get('/stats', authRequired, adminOnly, stats);
router.get('/accounts', authRequired, adminOnly, accounts);

module.exports = router;
