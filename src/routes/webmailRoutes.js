const { Router } = require('express');
const { stats } = require('../controllers/webmailController');
const { authRequired, adminOnly } = require('../middlewares/auth');

const router = Router();

router.get('/stats', authRequired, adminOnly, stats);

module.exports = router;
