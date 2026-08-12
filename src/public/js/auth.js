// Guarda de autenticação: incluir em toda página protegida.
// Sem token válido, volta pra tela de login.
const token = localStorage.getItem('token');

if (!token) {
  window.location.href = '/login.html';
}

// Helper pra chamar a API já com o token; desloga se ele expirou
async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    logout();
    return;
  }

  return response;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}
