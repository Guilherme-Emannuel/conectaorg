// Organograma interativo.
// Renderiza a árvore vinda de /api/organograma com expansão/recolhimento.

let orgRoot = null; // raiz da árvore
const expanded = new Set(); // ids com filhos visíveis
const highlighted = new Set(); // ids destacados pela busca
const porId = new Map(); // id -> nó (com referência ao pai em _pai)

const canvas = document.getElementById('org-canvas');

const SEM_GESTOR = ['VACANTE', 'NÃO INFORMADO', 'NÃO ADICIONADO'];

const usuarioLogado = (() => {
  try {
    return JSON.parse(localStorage.getItem('user')) || {};
  } catch {
    return {};
  }
})();
const isAdmin = usuarioLogado.role === 'ADMIN';

function editBtnHtml(id) {
  return isAdmin
    ? `<button class="btn-edit" data-edit="${id}" title="Editar setor">✏️</button>`
    : '';
}

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
      ${editBtnHtml(node.id)}
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
        ${editBtnHtml(node.id)}
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
  const edit = event.target.closest('[data-edit]');
  if (edit) {
    abrirModalEdicao(Number(edit.dataset.edit));
    return;
  }
  const toggle = event.target.closest('[data-toggle]');
  if (toggle) {
    toggleNode(Number(toggle.dataset.toggle));
  }
});

// ---------- Modal de edição (somente ADMIN) ----------
const overlay = document.getElementById('modal-overlay');
let fotoEditada; // undefined = não mexeu; null = removeu; string = nova foto

// monta as opções de um seletor de setores, com recuo por nível.
// excluir: setor cuja subárvore não deve aparecer (evita ciclos na edição)
function opcoesSetores(excluir, selecionadoId) {
  const opcoes = [];
  const montar = (atual, nivel) => {
    if (excluir && atual.id === excluir.id) return; // pula a subárvore excluída
    const recuo = ' '.repeat(nivel * 3);
    const rotulo = `${recuo}${atual.nome}${atual.sigla ? ` (${atual.sigla})` : ''}`;
    const selecionado = atual.id === selecionadoId ? ' selected' : '';
    opcoes.push(`<option value="${atual.id}"${selecionado}>${esc(rotulo)}</option>`);
    atual.children.forEach((filho) => montar(filho, nivel + 1));
  };
  montar(orgRoot, 0);
  return opcoes.join('');
}

function abrirModalEdicao(id) {
  const node = porId.get(id);
  if (!node || !isAdmin) return;

  fotoEditada = undefined;

  overlay.innerHTML = `
    <div class="modal">
      <h3>Editar setor</h3>

      <div class="field">
        <label for="edit-nome">Nome do setor</label>
        <input id="edit-nome" value="${esc(node.nome)}">
      </div>
      <div class="field">
        <label for="edit-sigla">Sigla</label>
        <input id="edit-sigla" value="${esc(node.sigla || '')}">
      </div>
      <div class="field">
        <label for="edit-gestor">Nome do gestor</label>
        <input id="edit-gestor" value="${esc(node.gestor || '')}">
      </div>

      ${
        node._pai
          ? `<div class="field">
              <label for="edit-parent">Setor superior</label>
              <select id="edit-parent">${opcoesSetores(node, node._pai.id)}</select>
            </div>`
          : ''
      }

      <div class="switch-row">
        <span>Exibir foto do gestor (bolinha no card)</span>
        <label class="switch">
          <input type="checkbox" id="edit-foto-visivel" ${node.fotoVisivel ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>

      <div class="foto-preview">
        <div class="org-avatar" id="edit-avatar-preview"></div>
        <div>
          <input type="file" id="edit-foto" accept="image/*" style="display:none">
          <button type="button" class="btn-sm" id="edit-foto-btn">Enviar foto</button>
          <button type="button" class="btn-sm" id="edit-foto-remover">Remover</button>
        </div>
      </div>

      <div class="actions">
        ${
          node._pai
            ? '<button type="button" class="btn-danger-outline" id="edit-apagar">Apagar setor</button>'
            : ''
        }
        <span class="spacer"></span>
        <button type="button" class="btn-secondary" id="edit-cancelar">Cancelar</button>
        <button type="button" class="btn-primary" id="edit-salvar">Salvar</button>
      </div>

      <div class="confirm-box" id="confirm-apagar" style="display:none">
        <p id="confirm-texto"></p>
        <div class="actions">
          <button type="button" class="btn-secondary" id="confirm-nao">Cancelar</button>
          <button type="button" class="btn-danger" id="confirm-sim">Sim, apagar</button>
        </div>
      </div>
    </div>`;

  const atualizarPreview = () => {
    const foto = fotoEditada === undefined ? node.foto : fotoEditada;
    document.getElementById('edit-avatar-preview').innerHTML = foto
      ? `<img src="${esc(foto)}" alt="Foto do gestor">`
      : esc(iniciais(document.getElementById('edit-gestor').value || node.nome));
  };
  atualizarPreview();

  document.getElementById('edit-gestor').addEventListener('input', atualizarPreview);
  document.getElementById('edit-foto-btn').onclick = () =>
    document.getElementById('edit-foto').click();

  // redimensiona a imagem para 128px antes de salvar (fica leve no banco)
  document.getElementById('edit-foto').addEventListener('change', (event) => {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const lado = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(
        img,
        (img.width - lado) / 2,
        (img.height - lado) / 2,
        lado,
        lado,
        0,
        0,
        128,
        128
      );
      fotoEditada = c.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
      atualizarPreview();
    };
    img.src = URL.createObjectURL(arquivo);
  });

  document.getElementById('edit-foto-remover').onclick = () => {
    fotoEditada = null;
    atualizarPreview();
  };

  document.getElementById('edit-cancelar').onclick = fecharModal;

  // ---- apagar setor (com confirmação) ----
  const btnApagar = document.getElementById('edit-apagar');
  if (btnApagar) {
    const contarSubtree = (n) =>
      1 + n.children.reduce((soma, filho) => soma + contarSubtree(filho), 0);

    btnApagar.onclick = () => {
      const subordinados = contarSubtree(node) - 1;
      document.getElementById('confirm-texto').textContent =
        `Tem certeza que deseja apagar "${node.nome}"?` +
        (subordinados > 0
          ? ` Isso também apagará ${subordinados} setor(es) subordinado(s).`
          : '') +
        ' Essa ação não pode ser desfeita.';
      document.getElementById('confirm-apagar').style.display = 'block';
      btnApagar.disabled = true;
    };

    document.getElementById('confirm-nao').onclick = () => {
      document.getElementById('confirm-apagar').style.display = 'none';
      btnApagar.disabled = false;
    };

    document.getElementById('confirm-sim').onclick = async () => {
      const res = await apiFetch(`/api/organograma/${id}`, { method: 'DELETE' });
      if (!res || !res.ok) {
        const erro = res ? (await res.json()).error : 'Erro ao apagar.';
        alert(erro || 'Erro ao apagar.');
        return;
      }

      // remove a subárvore dos índices locais
      const removerDosIndices = (n) => {
        porId.delete(n.id);
        expanded.delete(n.id);
        highlighted.delete(n.id);
        n.children.forEach(removerDosIndices);
      };
      removerDosIndices(node);
      node._pai.children = node._pai.children.filter((f) => f !== node);

      fecharModal();
      render();
      mostrarToast(`"${node.nome}" foi apagado com sucesso`);
    };
  }

  document.getElementById('edit-salvar').onclick = async () => {
    const payload = {
      nome: document.getElementById('edit-nome').value,
      sigla: document.getElementById('edit-sigla').value,
      gestor: document.getElementById('edit-gestor').value,
      fotoVisivel: document.getElementById('edit-foto-visivel').checked,
    };
    if (fotoEditada !== undefined) payload.foto = fotoEditada;

    const seletorPai = document.getElementById('edit-parent');
    if (seletorPai) payload.parentId = Number(seletorPai.value);

    const res = await apiFetch(`/api/organograma/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (!res || !res.ok) {
      const erro = res ? (await res.json()).error : 'Erro ao salvar.';
      alert(erro || 'Erro ao salvar.');
      return;
    }

    const salvo = await res.json();
    Object.assign(node, {
      nome: salvo.nome,
      sigla: salvo.sigla,
      gestor: salvo.gestor,
      foto: salvo.foto,
      fotoVisivel: salvo.fotoVisivel,
    });

    // se o setor superior mudou, move o nó na árvore local
    if (node._pai && salvo.parentId !== node._pai.id) {
      const novoPai = porId.get(salvo.parentId);
      if (novoPai) {
        node._pai.children = node._pai.children.filter((f) => f !== node);
        novoPai.children.push(node);
        node._pai = novoPai;
        expanded.add(novoPai.id); // mostra o setor no novo lugar
      }
    }

    fecharModal();
    render();
    if (modo === 'tree') centerOnNode(node.id);
    mostrarToast(`"${salvo.nome}" foi atualizado com sucesso`);
  };

  overlay.classList.add('open');
}

function fecharModal() {
  overlay.classList.remove('open');
  overlay.innerHTML = '';
}

overlay.addEventListener('click', (event) => {
  if (event.target === overlay) fecharModal();
});

// no modo lista, o lápis não deve abrir/fechar o acordeão
listContainer.addEventListener('click', (event) => {
  const edit = event.target.closest('[data-edit]');
  if (edit) {
    event.preventDefault();
    event.stopPropagation();
    abrirModalEdicao(Number(edit.dataset.edit));
  }
});

// ---------- Barra de ferramentas e busca ----------
const toolbar = document.getElementById('org-toolbar');

toolbar.innerHTML = `
  <button class="btn-sm" id="mode-tree">🌳 Árvore</button>
  <button class="btn-sm" id="mode-list">📋 Lista</button>
  <button class="btn-sm" id="expand-all">Expandir tudo</button>
  <button class="btn-sm" id="collapse-all">Recolher tudo</button>
  ${isAdmin ? '<button class="btn-sm" id="btn-nova-unidade">➕ Criar nova unidade</button>' : ''}
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
document.getElementById('mode-tree').onclick = () => setModo('tree');
document.getElementById('mode-list').onclick = () => setModo('list');
const btnNovaUnidade = document.getElementById('btn-nova-unidade');
if (btnNovaUnidade) btnNovaUnidade.onclick = () => abrirModalCriacao();

// ---------- Modal de criação de unidade (somente ADMIN) ----------
function abrirModalCriacao() {
  if (!isAdmin || !orgRoot) return;

  overlay.innerHTML = `
    <div class="modal">
      <h3>Criar nova unidade</h3>

      <div class="field">
        <label for="novo-nome">Nome do setor</label>
        <input id="novo-nome" placeholder="Ex.: Coordenação de Projetos">
      </div>
      <div class="field">
        <label for="novo-sigla">Sigla</label>
        <input id="novo-sigla" placeholder="Ex.: CPROJ">
      </div>
      <div class="field">
        <label for="novo-gestor">Nome do gestor</label>
        <input id="novo-gestor" placeholder="Deixe vazio se ainda não houver">
      </div>
      <div class="field">
        <label for="novo-parent">Setor superior</label>
        <select id="novo-parent">${opcoesSetores(null, orgRoot.id)}</select>
      </div>

      <div class="switch-row">
        <span>Exibir foto do gestor (bolinha no card)</span>
        <label class="switch">
          <input type="checkbox" id="novo-foto-visivel" checked>
          <span class="slider"></span>
        </label>
      </div>

      <div class="actions">
        <button type="button" class="btn-secondary" id="novo-cancelar">Cancelar</button>
        <button type="button" class="btn-primary" id="novo-salvar">Criar unidade</button>
      </div>
    </div>`;

  document.getElementById('novo-cancelar').onclick = fecharModal;

  document.getElementById('novo-salvar').onclick = async () => {
    const res = await apiFetch('/api/organograma', {
      method: 'POST',
      body: JSON.stringify({
        nome: document.getElementById('novo-nome').value,
        sigla: document.getElementById('novo-sigla').value,
        gestor: document.getElementById('novo-gestor').value,
        parentId: Number(document.getElementById('novo-parent').value),
        fotoVisivel: document.getElementById('novo-foto-visivel').checked,
      }),
    });

    if (!res || !res.ok) {
      const erro = res ? (await res.json()).error : 'Erro ao criar.';
      alert(erro || 'Erro ao criar.');
      return;
    }

    // insere a nova unidade na árvore local, sob o pai escolhido
    const criada = await res.json();
    criada.children = [];
    const pai = porId.get(criada.parentId);
    criada._pai = pai;
    pai.children.push(criada);
    porId.set(criada.id, criada);
    expanded.add(pai.id);

    fecharModal();
    render();
    if (modo === 'tree') centerOnNode(criada.id);
    mostrarToast(`"${criada.nome}" foi criado com sucesso`);
  };

  overlay.classList.add('open');
}

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
    // busca limpa: volta ao padrão (tudo recolhido, só a raiz aberta)
    contador.textContent = '';
    expanded.clear();
    expanded.add(orgRoot.id);
    render();
    return;
  }

  porId.forEach((n) => {
    const alvo = normalizar(`${n.nome} ${n.sigla || ''} ${n.gestor || ''}`);
    if (alvo.includes(busca)) highlighted.add(n.id);
  });

  // fecha tudo e abre SOMENTE o caminho até cada resultado
  expanded.clear();
  expanded.add(orgRoot.id);
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

// volta ao zoom normal e centraliza no card do topo (GAB/Prefeito)
function centerTree() {
  scale = 1;
  applyTransform();
  if (orgRoot && canvas.querySelector(`[data-card="${orgRoot.id}"]`)) {
    centerOnNode(orgRoot.id);
  } else {
    panX = 20;
    panY = 20;
    applyTransform();
  }
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
