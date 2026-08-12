// Organograma interativo.
// Renderiza a árvore vinda de /api/organograma com expansão/recolhimento.

let orgRoot = null; // raiz da árvore
const expanded = new Set(); // ids com filhos visíveis

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

  return `
    <div class="org-card${node.fotoVisivel ? ' has-avatar' : ''}" data-card="${node.id}">
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

function toggleNode(id) {
  if (expanded.has(id)) {
    expanded.delete(id);
  } else {
    expanded.add(id);
  }
  renderTree();
}

canvas.addEventListener('click', (event) => {
  const toggle = event.target.closest('[data-toggle]');
  if (toggle) {
    toggleNode(Number(toggle.dataset.toggle));
  }
});

async function carregarOrganograma() {
  const res = await apiFetch('/api/organograma');
  if (!res || !res.ok) {
    canvas.innerHTML = '<p style="padding:20px">Erro ao carregar o organograma.</p>';
    return;
  }

  orgRoot = await res.json();
  // Padrão: só a raiz expandida (primeiro nível visível, resto recolhido)
  expanded.clear();
  expanded.add(orgRoot.id);
  renderTree();
}

carregarOrganograma();
