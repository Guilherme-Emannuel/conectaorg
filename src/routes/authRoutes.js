const { Router } = require('express');
const { login, me, register } = require('../controllers/authController');
const { authRequired, adminOnly } = require('../middlewares/auth');
const { loginLimiter } = require('../middlewares/rateLimit');

const router = Router();

router.post('/login', loginLimiter, login);
router.get('/me', authRequired, me);
router.post('/register', authRequired, adminOnly, register);

module.exports = router;
