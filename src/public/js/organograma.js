// Organograma interativo.
// Renderiza a árvore vinda de /api/organograma com expansão/recolhimento.

let orgRoot = null; // raiz da árvore
const expanded = new Set(); // ids com filhos visíveis
const highlighted = new Set(); // ids destacados pela busca
const porId = new Map(); // id -> nó (com referência ao pai em _pai)

const canvas = document.getElementById('org-canvas');

const SEM_GESTOR = ['VACANTE', 'NÃO INFORMADO', 'NÃO ADICIONADO'];

function esc(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function iniciais(nome) {
  const partes = (nome || '?').trim().split(/\s+/);
  const primeira = partes[0]?.[0] || '?';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

function avatarHtml(node, classe) {
  if (!node.fotoVisivel) return '';
  const conteudo = node.foto
    ? `<img src="${esc(node.foto)}" alt="Foto de ${esc(node.gestor || node.nome)}">`
    : esc(iniciais(node.gestor || node.nome));
  return `<div class="${classe}">${conteudo}</div>`;
}

function gestorHtml(node) {
  if (!node.gestor) return '';
  const vacante = SEM_GESTOR.includes(node.gestor.toUpperCase());
  return `<div class="gestor${vacante ? ' vacante' : ''}">${esc(node.gestor)}</div>`;
}

function cardHtml(node) {
  const temFilhos = node.children.length > 0;
  const aberto = expanded.has(node.id);
  const toggle = temFilhos
    ? `<button class="btn-toggle" data-toggle="${node.id}">
        ${aberto ? '▾ recolher' : `▸ ${node.children.length} subordinado(s)`}
      </button>`
    : '';

  const destaque = highlighted.has(node.id) ? ' highlight' : '';
  return `
    <div class="org-card${node.fotoVisivel ? ' has-avatar' : ''}${destaque}" data-card="${node.id}">
      ${avatarHtml(node, 'org-avatar')}
      <div class="setor">${esc(node.nome)}</div>
      ${node.sigla ? `<span class="sigla">${esc(node.sigla)}</span>` : ''}
      ${gestorHtml(node)}
      ${toggle}
    </div>`;
}

function nodeHtml(node) {
  const filhos =
    node.children.length && expanded.has(node.id)
      ? `<ul>${node.children.map(nodeHtml).join('')}</ul>`
      : '';
  return `<li>${cardHtml(node)}${filhos}</li>`;
}

function renderTree() {
  canvas.innerHTML = `<ul class="tree">${nodeHtml(orgRoot)}</ul>`;
}

// ---------- Modo lista (acordeão multinível) ----------
const listContainer = document.getElementById('org-list');
// no celular a lista é o modo inicial; no desktop, a árvore
let modo = window.innerWidth < 768 ? 'list' : 'tree';

function listNodeHtml(node) {
  const temFilhos = node.children.length > 0;
  const aberto = expanded.has(node.id) ? ' open' : '';
  const destaque = highlighted.has(node.id) ? ' highlight' : '';
  const detalhes = [
    node.sigla ? `<span class="sigla-inline">${esc(node.sigla)}</span>` : '',
    node.gestor ? esc(node.gestor) : '',
  ]
    .filter(Boolean)
    .join(' — ');

  return `
    <details data-details="${node.id}"${aberto} ${temFilhos ? '' : 'class="leaf"'}>
      <summary class="${destaque}" data-summary="${node.id}">
        <span class="caret">▶</span>
        ${avatarHtml(node, 'mini-avatar')}
        <div class="info">
          <div class="setor">${esc(node.nome)}</div>
          ${detalhes ? `<div class="detalhe">${detalhes}</div>` : ''}
        </div>
      </summary>
      ${temFilhos ? node.children.map(listNodeHtml).join('') : ''}
    </details>`;
}

function renderList() {
  listContainer.innerHTML = listNodeHtml(orgRoot);
}

// mantém o estado de expansão sincronizado com o acordeão
document.getElementById('org-list').addEventListener('toggle', (event) => {
  const id = Number(event.target.dataset.details);
  if (!id) return;
  if (event.target.open) {
    expanded.add(id);
  } else {
    expanded.delete(id);
  }
}, true);

function setModo(novo) {
  modo = novo;
  document.getElementById('mode-tree').classList.toggle('active', modo === 'tree');
  document.getElementById('mode-list').classList.toggle('active', modo === 'list');
  viewport.style.display = modo === 'tree' ? 'block' : 'none';
  listContainer.style.display = modo === 'list' ? 'block' : 'none';
  render();
  if (modo === 'tree') centerTree();
}

document.getElementById('mode-tree').onclick = () => setModo('tree');
document.getElementById('mode-list').onclick = () => setModo('list');

// render() decide o modo de visualização
function render() {
  if (!orgRoot) return;
  if (modo === 'tree') {
    renderTree();
  } else {
    renderList();
  }
}

// centraliza um card específico no viewport
function centerOnNode(id) {
  const el = canvas.querySelector(`[data-card="${id}"]`);
  if (!el) return;
  const canvasRect = canvas.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const cx = (elRect.left - canvasRect.left + elRect.width / 2) / scale;
  const cy = (elRect.top - canvasRect.top + elRect.height / 2) / scale;
  panX = viewport.clientWidth / 2 - cx * scale;
  panY = viewport.clientHeight / 3 - cy * scale;
  applyTransform();
}

function toggleNode(id) {
  if (expanded.has(id)) {
    expanded.delete(id);
  } else {
    expanded.add(id);
  }
  render();
}

canvas.addEventListener('click', (event) => {
  const toggle = event.target.closest('[data-toggle]');
  if (toggle) {
    toggleNode(Number(toggle.dataset.toggle));
  }
});

// ---------- Barra de ferramentas e busca ----------
const toolbar = document.getElementById('org-toolbar');

toolbar.innerHTML = `
  <button class="btn-sm" id="mode-tree">🌳 Árvore</button>
  <button class="btn-sm" id="mode-list">📋 Lista</button>
  <button class="btn-sm" id="expand-all">Expandir tudo</button>
  <button class="btn-sm" id="collapse-all">Recolher tudo</button>
  <span class="spacer"></span>
  <div class="org-search">
    <input type="search" id="org-search-input"
      placeholder="Buscar setor, sigla ou gestor...">
    <span id="search-count" class="muted" style="font-size:0.8rem"></span>
  </div>
`;

function indexar(node, pai) {
  node._pai = pai;
  porId.set(node.id, node);
  node.children.forEach((filho) => indexar(filho, node));
}

function expandirTudo() {
  porId.forEach((n) => {
    if (n.children.length) expanded.add(n.id);
  });
  render();
}

function recolherTudo() {
  expanded.clear();
  expanded.add(orgRoot.id);
  render();
}

document.getElementById('expand-all').onclick = expandirTudo;
document.getElementById('collapse-all').onclick = recolherTudo;

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function buscar(termo) {
  highlighted.clear();
  const busca = normalizar(termo.trim());
  const contador = document.getElementById('search-count');

  if (!busca) {
    contador.textContent = '';
    render();
    return;
  }

  porId.forEach((n) => {
    const alvo = normalizar(`${n.nome} ${n.sigla || ''} ${n.gestor || ''}`);
    if (alvo.includes(busca)) highlighted.add(n.id);
  });

  // abre o caminho até cada resultado
  highlighted.forEach((id) => {
    let atual = porId.get(id)?._pai;
    while (atual) {
      expanded.add(atual.id);
      atual = atual._pai;
    }
  });

  contador.textContent = `${highlighted.size} resultado(s)`;
  render();

  const primeiro = highlighted.values().next().value;
  if (primeiro === undefined) return;
  if (modo === 'tree') {
    centerOnNode(primeiro);
  } else {
    listContainer
      .querySelector(`[data-summary="${primeiro}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

let buscaTimer = null;
document.getElementById('org-search-input').addEventListener('input', (e) => {
  clearTimeout(buscaTimer);
  buscaTimer = setTimeout(() => buscar(e.target.value), 250);
});

// ---------- Zoom e panorâmica ----------
const viewport = document.getElementById('org-viewport');
const zoomControls = document.getElementById('zoom-controls');

let scale = 1;
let panX = 0;
let panY = 0;

function applyTransform() {
  canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

function setScale(novo, anchorX, anchorY) {
  const limitado = Math.min(2.5, Math.max(0.2, novo));
  // mantém o ponto sob o cursor fixo durante o zoom
  panX = anchorX - ((anchorX - panX) * limitado) / scale;
  panY = anchorY - ((anchorY - panY) * limitado) / scale;
  scale = limitado;
  applyTransform();
}

function centerTree() {
  scale = 1;
  panX = Math.max(20, (viewport.clientWidth - canvas.offsetWidth) / 2);
  panY = 20;
  applyTransform();
}

viewport.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const fator = event.deltaY < 0 ? 1.12 : 0.89;
    setScale(scale * fator, event.clientX - rect.left, event.clientY - rect.top);
  },
  { passive: false }
);

// Pan com arrastar (mouse/toque) e pinça com dois dedos
const ponteiros = new Map();
let distanciaPinca = 0;
let arrastou = false;

viewport.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button')) return;
  ponteiros.set(event.pointerId, { x: event.clientX, y: event.clientY });
  arrastou = false;
  viewport.setPointerCapture(event.pointerId);
  viewport.classList.add('panning');
});

viewport.addEventListener('pointermove', (event) => {
  const atual = ponteiros.get(event.pointerId);
  if (!atual) return;

  if (ponteiros.size === 2) {
    // pinça: distância entre os dois dedos controla o zoom
    ponteiros.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const [a, b] = [...ponteiros.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (distanciaPinca > 0) {
      const rect = viewport.getBoundingClientRect();
      const cx = (a.x + b.x) / 2 - rect.left;
      const cy = (a.y + b.y) / 2 - rect.top;
      setScale((scale * dist) / distanciaPinca, cx, cy);
    }
    distanciaPinca = dist;
    return;
  }

  const dx = event.clientX - atual.x;
  const dy = event.clientY - atual.y;
  if (Math.abs(dx) + Math.abs(dy) > 3) arrastou = true;
  panX += dx;
  panY += dy;
  ponteiros.set(event.pointerId, { x: event.clientX, y: event.clientY });
  applyTransform();
});

function soltarPonteiro(event) {
  ponteiros.delete(event.pointerId);
  if (ponteiros.size < 2) distanciaPinca = 0;
  if (ponteiros.size === 0) viewport.classList.remove('panning');
}

viewport.addEventListener('pointerup', soltarPonteiro);
viewport.addEventListener('pointercancel', soltarPonteiro);

// após arrastar, evita que o "soltar" conte como clique num botão
viewport.addEventListener(
  'click',
  (event) => {
    if (arrastou) {
      event.stopPropagation();
      event.preventDefault();
      arrastou = false;
    }
  },
  true
);

zoomControls.innerHTML = `
  <button class="btn-sm" id="zoom-in" title="Aproximar">+</button>
  <button class="btn-sm" id="zoom-out" title="Afastar">−</button>
  <button class="btn-sm" id="zoom-reset" title="Centralizar">⌂</button>
`;

document.getElementById('zoom-in').onclick = () =>
  setScale(scale * 1.2, viewport.clientWidth / 2, viewport.clientHeight / 2);
document.getElementById('zoom-out').onclick = () =>
  setScale(scale / 1.2, viewport.clientWidth / 2, viewport.clientHeight / 2);
document.getElementById('zoom-reset').onclick = centerTree;

async function carregarOrganograma() {
  const res = await apiFetch('/api/organograma');
  if (!res || !res.ok) {
    canvas.innerHTML = '<p style="padding:20px">Erro ao carregar o organograma.</p>';
    return;
  }

  orgRoot = await res.json();
  indexar(orgRoot, null);
  // Padrão: só a raiz expandida (primeiro nível visível, resto recolhido)
  expanded.clear();
  expanded.add(orgRoot.id);
  setModo(modo);
}

carregarOrganograma();
