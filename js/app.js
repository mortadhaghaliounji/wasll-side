document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const defaultState = () => ({
    lang: 'fr',
    title: 'De quel côté êtes-vous ?',
    subtitle: 'Which Side Are You On?',
    rows: [],
    nextId: 1,
    boxCount: 5,
    showNumbers: true,
    showBrand: true,
    colors: { accent: '#d01020', bg: '#fafaf8', ink: '#0c0c0c' }
  });

  let state = defaultState();
  let history = [];
  let rendering = false;

  const translations = {
    fr: {
      builder: 'Which side are you on?', language: 'Langue', content: 'Contenu', title: 'Titre', subtitle: 'Sous-titre',
      questions: 'Questions', addRow: 'Ajouter une question', appearance: 'Apparence', boxes: 'Choix par question',
      numbers: 'Afficher les numéros', numbersHint: 'Afficher 1, 2, 3… dans les cases', branding: 'Marque WASLL',
      brandingHint: 'Afficher le watermark sur l’image', accent: 'Accent', background: 'Fond', ink: 'Texte', clear: 'Effacer',
      export: 'Exporter PNG', emptyTitle: 'Aucune question', emptyText: 'Créez votre première question pour commencer.',
      left: 'Côté gauche', right: 'Côté droit', upload: 'Ajouter une image', remove: 'Supprimer', up: 'Monter', down: 'Descendre',
      helpText: 'Ajoutez une question, puis personnalisez chaque côté. Rien n’est prérempli.', settings: 'Réglages', undo: 'Annuler',
      clearConfirm: 'Effacer toutes les questions ?', exportEmpty: 'Ajoutez au moins une question avant d’exporter.', exportError: 'Impossible de générer l’image.'
    },
    en: {
      builder: 'Which side are you on?', language: 'Language', content: 'Content', title: 'Title', subtitle: 'Subtitle',
      questions: 'Questions', addRow: 'Add a question', appearance: 'Appearance', boxes: 'Choices per question',
      numbers: 'Show choice numbers', numbersHint: 'Show 1, 2, 3… in the boxes', branding: 'WASLL branding',
      brandingHint: 'Show the watermark on the image', accent: 'Accent', background: 'Background', ink: 'Text', clear: 'Clear',
      export: 'Export PNG', emptyTitle: 'No questions yet', emptyText: 'Create your first question to get started.',
      left: 'Left side', right: 'Right side', upload: 'Add an image', remove: 'Delete', up: 'Move up', down: 'Move down',
      helpText: 'Add a question, then customize each side. Nothing is pre-filled.', settings: 'Settings', undo: 'Undo',
      clearConfirm: 'Clear all questions?', exportEmpty: 'Add at least one question before exporting.', exportError: 'Could not generate the image.'
    }
  };

  const titleInput = $('title-input');
  const subtitleInput = $('subtitle-input');
  const posterTitle = $('poster-title');
  const posterSubtitle = $('poster-subtitle');
  const rowsEl = $('rows');
  const empty = $('empty-state');

  function t(key) { return translations[state.lang][key] || key; }
  function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

  function snapshot() {
    return deepClone(state);
  }

  function pushHistory(snapshotToStore = snapshot()) {
    const previous = history.at(-1);
    if (previous && JSON.stringify(previous) === JSON.stringify(snapshotToStore)) return;
    history.push(deepClone(snapshotToStore));
    if (history.length > 50) history.shift();
    updateUndoButton();
  }

  function prepareInputHistory(input) {
    if (input.dataset.historyPushed === 'true') return;
    pushHistory();
    input.dataset.historyPushed = 'true';
  }

  function releaseInputHistory(input) {
    delete input.dataset.historyPushed;
  }

  function restore(previous) {
    state = deepClone(previous);
    titleInput.value = state.title;
    subtitleInput.value = state.subtitle;
    root.style.setProperty('--red', state.colors.accent);
    root.style.setProperty('--black', state.colors.ink);
    root.style.setProperty('--white', state.colors.bg);
    $('accent-input').value = state.colors.accent;
    $('bg-input').value = state.colors.bg;
    $('ink-input').value = state.colors.ink;
    $('accent-value').textContent = state.colors.accent.toUpperCase();
    $('bg-value').textContent = state.colors.bg.toUpperCase();
    $('ink-value').textContent = state.colors.ink.toUpperCase();
    $('show-numbers').checked = state.showNumbers;
    $('show-brand').checked = state.showBrand;
    syncChoiceCountButtons();
    $('watermark').style.display = state.showBrand ? '' : 'none';
    applyLanguage();
  }

  function undo() {
    const previous = history.pop();
    if (!previous) return;
    restore(previous);
    updateUndoButton();
  }

  function updateUndoButton() {
    const button = $('undo-btn');
    button.disabled = history.length === 0;
    button.title = t('undo');
    button.setAttribute('aria-label', t('undo'));
  }

  function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('#language-switch .language-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === state.lang);
    });
    titleInput.placeholder = state.lang === 'fr' ? 'Votre titre…' : 'Your title…';
    subtitleInput.placeholder = state.lang === 'fr' ? 'Votre sous-titre…' : 'Your subtitle…';
    $('mobile-settings').title = t('settings');
    $('mobile-settings').setAttribute('aria-label', t('settings'));
    $('clear-all').title = t('clear');
    updateUndoButton();
    syncHeadings();
    renderRows();
  }

  function syncHeadings() {
    posterTitle.textContent = state.title.trim() || (state.lang === 'fr' ? 'De quel côté êtes-vous ?' : 'Which side are you on?');
    posterSubtitle.textContent = state.subtitle.trim();
  }

  [titleInput, subtitleInput].forEach(input => {
    input.addEventListener('focus', () => prepareInputHistory(input));
    input.addEventListener('input', () => {
      if (input === titleInput) state.title = titleInput.value;
      else state.subtitle = subtitleInput.value;
      syncHeadings();
    });
    input.addEventListener('blur', () => releaseInputHistory(input));
  });

  document.querySelectorAll('#language-switch .language-btn').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.lang === state.lang) return;
    pushHistory();
    const oldLang = state.lang;
    const frDefaults = ['De quel côté êtes-vous ?', 'Which Side Are You On?'];
    const enDefaults = ['Which side are you on?', 'Which Side Are You On?'];
    const nextDefaults = btn.dataset.lang === 'fr' ? frDefaults : enDefaults;
    const oldDefaults = oldLang === 'fr' ? frDefaults : enDefaults;
    if (oldDefaults.includes(titleInput.value)) state.title = nextDefaults[0];
    if (oldDefaults.includes(subtitleInput.value)) state.subtitle = nextDefaults[1];
    state.lang = btn.dataset.lang;
    titleInput.value = state.title;
    subtitleInput.value = state.subtitle;
    applyLanguage();
  }));

  function addRow() {
    pushHistory();
    state.rows.push({ id: state.nextId++, left: '', right: '', leftDetail: '', rightDetail: '', leftImage: null, rightImage: null });
    renderRows();
    setTimeout(() => document.querySelector(`#row-${state.rows.at(-1).id} input[data-field="left"]`)?.focus(), 0);
  }

  function moveRow(id, dir) {
    const i = state.rows.findIndex(r => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= state.rows.length) return;
    pushHistory();
    [state.rows[i], state.rows[j]] = [state.rows[j], state.rows[i]];
    renderRows();
  }

  function deleteRow(id) {
    if (!state.rows.some(r => r.id === id)) return;
    pushHistory();
    state.rows = state.rows.filter(r => r.id !== id);
    renderRows();
  }

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeAttr(v) { return escapeHtml(v).replace(/\n/g, ' '); }

  function questionMarkup(row, index) {
    const boxes = Array.from({ length: state.boxCount }, (_, i) => `<div class="choice-box">${state.showNumbers ? i + 1 : ''}</div>`).join('');
    return `
      <div class="side left">
        ${row.leftImage ? `<img class="side-image" src="${escapeAttr(row.leftImage)}" alt="">` : `<div class="side-placeholder"><i class="bi bi-image" aria-hidden="true"></i></div>`}
        <div class="side-text"><div class="side-label">${escapeHtml(row.left) || `<span class="placeholder-text">${escapeHtml(t('left'))}</span>`}</div><div class="side-detail">${escapeHtml(row.leftDetail)}</div></div>
      </div>
      <div class="boxes">${boxes}</div>
      <div class="side right">
        ${row.rightImage ? `<img class="side-image" src="${escapeAttr(row.rightImage)}" alt="">` : `<div class="side-placeholder"><i class="bi bi-image" aria-hidden="true"></i></div>`}
        <div class="side-text"><div class="side-label">${escapeHtml(row.right) || `<span class="placeholder-text">${escapeHtml(t('right'))}</span>`}</div><div class="side-detail">${escapeHtml(row.rightDetail)}</div></div>
      </div>
      <div class="row-editor" aria-label="${escapeAttr(`${t('left')} / ${t('right')}`)}">
        <div class="edit-group">
          <input type="text" data-field="left" value="${escapeAttr(row.left)}" placeholder="${escapeAttr(t('left'))}" aria-label="${escapeAttr(t('left'))}">
          <input type="text" data-field="leftDetail" value="${escapeAttr(row.leftDetail)}" placeholder="${escapeAttr(state.lang === 'fr' ? 'Sous-texte (facultatif)' : 'Optional detail')}" aria-label="${escapeAttr(state.lang === 'fr' ? 'Sous-texte gauche' : 'Left detail')}">
          <label class="upload-btn" title="${escapeAttr(t('upload'))}" aria-label="${escapeAttr(t('upload'))}"><i class="bi bi-image" aria-hidden="true"></i><input type="file" data-image="left" accept="image/*"></label>
        </div>
        <div class="edit-group">
          <input type="text" data-field="right" value="${escapeAttr(row.right)}" placeholder="${escapeAttr(t('right'))}" aria-label="${escapeAttr(t('right'))}">
          <input type="text" data-field="rightDetail" value="${escapeAttr(row.rightDetail)}" placeholder="${escapeAttr(state.lang === 'fr' ? 'Sous-texte (facultatif)' : 'Optional detail')}" aria-label="${escapeAttr(state.lang === 'en' ? 'Right detail' : 'Sous-texte droit')}">
          <label class="upload-btn" title="${escapeAttr(t('upload'))}" aria-label="${escapeAttr(t('upload'))}"><i class="bi bi-image" aria-hidden="true"></i><input type="file" data-image="right" accept="image/*"></label>
        </div>
      </div>
      <div class="row-controls" aria-label="Question ${index + 1}">
        <button class="mini-btn" data-action="up" type="button" title="${escapeAttr(t('up'))}" aria-label="${escapeAttr(t('up'))}"><i class="bi bi-chevron-up" aria-hidden="true"></i></button>
        <button class="mini-btn" data-action="down" type="button" title="${escapeAttr(t('down'))}" aria-label="${escapeAttr(t('down'))}"><i class="bi bi-chevron-down" aria-hidden="true"></i></button>
        <button class="mini-btn delete" data-action="delete" type="button" title="${escapeAttr(t('remove'))}" aria-label="${escapeAttr(t('remove'))}"><i class="bi bi-trash3" aria-hidden="true"></i></button>
      </div>
      ${index < state.rows.length - 1 ? '<div class="row-divider"></div>' : ''}`;
  }

  function renderRows() {
    if (rendering) return;
    rendering = true;
    rowsEl.innerHTML = '';
    $('row-count').textContent = state.rows.length;
    empty.classList.toggle('empty-state-hidden', state.rows.length > 0);

    state.rows.forEach((row, index) => {
      const el = document.createElement('article');
      el.className = 'side-row';
      el.id = `row-${row.id}`;
      el.innerHTML = questionMarkup(row, index);
      rowsEl.appendChild(el);

      el.querySelectorAll('input[type="text"]').forEach(input => {
        input.addEventListener('focus', () => prepareInputHistory(input));
        input.addEventListener('input', e => {
          row[e.target.dataset.field] = e.target.value;
          renderPreviewOnly(row, el);
        });
        input.addEventListener('blur', () => releaseInputHistory(input));
      });
      el.querySelectorAll('input[type="file"]').forEach(input => input.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          e.target.value = '';
          return;
        }
        pushHistory();
        const reader = new FileReader();
        reader.onload = ev => {
          row[`${e.target.dataset.image}Image`] = ev.target.result;
          renderRows();
        };
        reader.readAsDataURL(file);
      }));
      el.querySelector('[data-action="up"]').addEventListener('click', () => moveRow(row.id, -1));
      el.querySelector('[data-action="down"]').addEventListener('click', () => moveRow(row.id, 1));
      el.querySelector('[data-action="delete"]').addEventListener('click', () => deleteRow(row.id));
    });
    rendering = false;
  }

  function renderPreviewOnly(row, el) {
    const leftLabel = el.querySelector('.side.left .side-label');
    const rightLabel = el.querySelector('.side.right .side-label');
    const leftDetail = el.querySelector('.side.left .side-detail');
    const rightDetail = el.querySelector('.side.right .side-detail');
    leftLabel.innerHTML = escapeHtml(row.left) || `<span class="placeholder-text">${escapeHtml(t('left'))}</span>`;
    rightLabel.innerHTML = escapeHtml(row.right) || `<span class="placeholder-text">${escapeHtml(t('right'))}</span>`;
    leftDetail.textContent = row.leftDetail;
    rightDetail.textContent = row.rightDetail;
  }

  $('add-row').addEventListener('click', addRow);
  $('empty-add').addEventListener('click', addRow);
  $('undo-btn').addEventListener('click', undo);

  function syncChoiceCountButtons() {
    document.querySelectorAll('#box-count-wrap button').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.count) === state.boxCount));
  }

  document.querySelectorAll('#box-count-wrap button').forEach(btn => btn.addEventListener('click', () => {
    const count = Number(btn.dataset.count);
    if (count === state.boxCount) return;
    pushHistory();
    state.boxCount = count;
    syncChoiceCountButtons();
    renderRows();
  }));

  ['show-numbers', 'show-brand'].forEach(id => $(id).addEventListener('change', e => {
    pushHistory();
    if (id === 'show-numbers') {
      state.showNumbers = e.target.checked;
      renderRows();
    } else {
      state.showBrand = e.target.checked;
      $('watermark').style.display = state.showBrand ? '' : 'none';
    }
  }));

  function bindColor(id, cssVar, output, stateKey) {
    const input = $(id);
    input.addEventListener('focus', () => prepareInputHistory(input));
    input.addEventListener('input', e => {
      root.style.setProperty(cssVar, e.target.value);
      $(output).textContent = e.target.value.toUpperCase();
      state.colors[stateKey] = e.target.value;
    });
    input.addEventListener('blur', () => releaseInputHistory(input));
  }
  bindColor('accent-input', '--red', 'accent-value', 'accent');
  bindColor('bg-input', '--white', 'bg-value', 'bg');
  bindColor('ink-input', '--black', 'ink-value', 'ink');

  const appearanceToggle = $('appearance-toggle');
  const appearancePanel = $('appearance-panel');
  appearanceToggle.addEventListener('click', () => {
    const open = appearanceToggle.getAttribute('aria-expanded') === 'true';
    appearanceToggle.setAttribute('aria-expanded', String(!open));
    appearancePanel.hidden = open;
  });

  $('clear-all').addEventListener('click', () => {
    if (!state.rows.length) return;
    if (!confirm(t('clearConfirm'))) return;
    pushHistory();
    state.rows = [];
    renderRows();
  });

  function openMobile() {
    $('sidebar').classList.add('mobile-open');
    $('mobile-overlay').classList.add('open');
  }
  function closeMobile() {
    $('sidebar').classList.remove('mobile-open');
    $('mobile-overlay').classList.remove('open');
  }
  $('mobile-settings').addEventListener('click', openMobile);
  $('sidebar-close').addEventListener('click', closeMobile);
  $('mobile-overlay').addEventListener('click', closeMobile);

  async function exportPng() {
    if (!state.rows.length) {
      alert(t('exportEmpty'));
      return;
    }
    const poster = $('poster');
    const clone = poster.cloneNode(true);
    clone.querySelectorAll('.row-editor,.row-controls').forEach(e => e.remove());
    const css = Array.from(document.styleSheets).map(s => {
      try { return Array.from(s.cssRules).map(r => r.cssText).join('\n'); } catch { return ''; }
    }).join('\n');
    const width = poster.offsetWidth;
    const height = poster.offsetHeight;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${css}</style>${clone.outerHTML}</div></foreignObject></svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `wasll-side-${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert(t('exportError'));
    };
    img.src = url;
  }

  $('toolbar-export').addEventListener('click', exportPng);

  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  $('accent-input').value = state.colors.accent;
  $('bg-input').value = state.colors.bg;
  $('ink-input').value = state.colors.ink;
  $('accent-value').textContent = state.colors.accent.toUpperCase();
  $('bg-value').textContent = state.colors.bg.toUpperCase();
  $('ink-value').textContent = state.colors.ink.toUpperCase();
  syncChoiceCountButtons();
  $('watermark').style.display = state.showBrand ? '' : 'none';
  applyLanguage();
});
