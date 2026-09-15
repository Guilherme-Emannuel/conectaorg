const rateLimit = require('express-rate-limit');

// Limita tentativas de login por IP — dificulta força bruta de senha.
// Não conta requisições bem-sucedidas, só as que falham/erram a senha.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' },
});

module.exports = { loginLimiter };
