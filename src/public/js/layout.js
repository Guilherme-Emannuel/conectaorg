// Layout compartilhado: monta o menu lateral e a barra superior.
// Uso: incluir depois de auth.js e chamar initLayout('id-da-pagina').

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Início', href: '/dashboard.html', icon: '🏠' },
  { id: 'organograma', label: 'Organograma', href: '/organograma.html', icon: '🏛️' },
  { id: 'atendimentos', label: 'Atendimentos', href: '#', icon: '💬', disabled: true },
  { id: 'usuarios', label: 'Usuários', href: '#', icon: '👥', disabled: true },
  { id: 'admin', label: 'Administração', href: '/admin.html', icon: '⚙️', adminOnly: true },
];

function getCachedUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || {};
  } catch {
    return {};
  }
}

function initLayout(activePage) {
  const user = getCachedUser();

  const items = MENU_ITEMS.filter(
    (item) => !item.adminOnly || user.role === 'ADMIN'
  );

  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-brand">ConectaOrg</div>
    <nav class="sidebar-nav">
      ${items
        .map((item) => {
          const active = item.id === activePage ? ' active' : '';
          const disabled = item.disabled ? ' disabled' : '';
          const badge = item.disabled ? '<span class="badge">em breve</span>' : '';
          return `<a class="nav-item${active}${disabled}" href="${item.href}">
            <span class="nav-icon">${item.icon}</span>${item.label}${badge}
          </a>`;
        })
        .join('')}
    </nav>
  `;

  document.getElementById('topbar').innerHTML = `
    <span class="page-title">${
      MENU_ITEMS.find((i) => i.id === activePage)?.label || ''
    }</span>
    <div class="user-area">
      <span id="user-name">${user.name || ''}${user.role ? ` (${user.role})` : ''}</span>
      <button class="btn-logout" onclick="logout()">Sair</button>
    </div>
  `;

  // Revalida o usuário na API (papel pode ter mudado ou token expirado)
  apiFetch('/api/auth/me')
    .then((res) => res && res.json())
    .then((freshUser) => {
      if (freshUser) {
        localStorage.setItem('user', JSON.stringify(freshUser));
        document.getElementById('user-name').textContent =
          `${freshUser.name} (${freshUser.role})`;
      }
    });
}
