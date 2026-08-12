// Se já estiver logado, vai direto pro dashboard
if (localStorage.getItem('token')) {
  window.location.href = '/dashboard.html';
}

const form = document.getElementById('login-form');
const errorBox = document.getElementById('error');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.classList.remove('visible');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Entrando...';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Falha no login.');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = '/dashboard.html';
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.add('visible');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';
  }
});
