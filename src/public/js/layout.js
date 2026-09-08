// Layout compartilhado: monta o menu lateral e a barra superior.
// Uso: incluir depois de auth.js e chamar initLayout('id-da-pagina').

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Início', href: '/dashboard.html', icon: '🏠' },
  { id: 'organograma', label: 'Organograma', href: '/organograma.html', icon: '🏛️' },
  { id: 'atendimentos', label: 'Atendimentos', href: '#', icon: '💬', disabled: true },
  {
    id: 'usuarios',
    label: 'Usuários',
    icon: '👥',
    adminOnly: true,
    // item com submenu flutuante: não navega direto, abre o flyout ao lado
    children: [
      { id: 'usuarios-completos', label: 'Usuários Dados Completos', href: '/usuarios.html' },
      { id: 'usuarios-webmails', label: 'Webmails', href: '/webmails.html' },
    ],
  },
  { id: 'admin', label: 'Administração', href: '/admin.html', icon: '⚙️', adminOnly: true },
];

// Notificação flutuante (toast). Uso: mostrarToast('"X" foi atualizado com sucesso')
function mostrarToast(mensagem, tipo = 'sucesso') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);

  // some sozinha depois de alguns segundos
  setTimeout(() => {
    toast.classList.add('saindo');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3500);
}

function getCachedUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || {};
  } catch {
    return {};
  }
}

// acha o item (ou o filho) cujo id bate com a página atual — usado pro
// título da topbar e pra saber se um item pai deve ficar destacado
function encontrarPagina(activePage) {
  for (const item of MENU_ITEMS) {
    if (item.id === activePage) return item;
    const filho = item.children?.find((c) => c.id === activePage);
    if (filho) return filho;
  }
  return null;
}

function itemEstaAtivo(item, activePage) {
  if (item.id === activePage) return true;
  return Boolean(item.children?.some((c) => c.id === activePage));
}

function initLayout(activePage) {
  const user = getCachedUser();

  const items = MENU_ITEMS.filter(
    (item) => !item.adminOnly || user.role === 'ADMIN'
  );

  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-brand">Conecta<em>Org</em></div>
    <nav class="sidebar-nav">
      ${items
        .map((item) => {
          const active = itemEstaAtivo(item, activePage) ? ' active' : '';
          const disabled = item.disabled ? ' disabled' : '';
          const badge = item.disabled ? '<span class="badge">em breve</span>' : '';

          if (item.children) {
            return `
              <div class="nav-item-wrap">
                <button type="button" class="nav-item${active}" data-flyout="${item.id}">
                  <span class="nav-icon">${item.icon}</span>${item.label}
                  <span class="nav-caret">▸</span>
                </button>
                <div class="nav-flyout" id="flyout-${item.id}">
                  ${item.children
                    .map(
                      (filho) =>
                        `<a class="nav-flyout-item${filho.id === activePage ? ' active' : ''}" href="${filho.href}">${filho.label}</a>`
                    )
                    .join('')}
                </div>
              </div>`;
          }

          return `<a class="nav-item${active}${disabled}" href="${item.href}">
            <span class="nav-icon">${item.icon}</span>${item.label}${badge}
          </a>`;
        })
        .join('')}
    </nav>
  `;

  // abre/fecha o flyout ao clicar no item pai; fecha ao clicar fora dele
  document.querySelectorAll('[data-flyout]').forEach((botao) => {
    botao.addEventListener('click', (event) => {
      event.stopPropagation();
      const flyout = document.getElementById(`flyout-${botao.dataset.flyout}`);
      const vaiAbrir = !flyout.classList.contains('open');
      document.querySelectorAll('.nav-flyout.open').forEach((f) => f.classList.remove('open'));
      if (vaiAbrir) flyout.classList.add('open');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.nav-flyout.open').forEach((f) => f.classList.remove('open'));
  });

  document.getElementById('topbar').innerHTML = `
    <span class="page-title">${encontrarPagina(activePage)?.label || ''}</span>
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
