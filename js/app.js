document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  let lang = 'fr';
  let rows = [];
  let nextId = 1;

  const translations = {
    fr: { builder:'Which side are you on ?', language:'Langue', content:'Contenu', title:'Titre', subtitle:'Sous-titre', rows:'Questions', addRow:'Ajouter une question', appearance:'Apparence', accent:'Accent', background:'Fond', ink:'Texte', boxes:'Choix par ligne', numbers:'Afficher les numéros', branding:'Afficher la marque WASLL', help:'Comment ça marche', helpText:'Ajoutez des lignes puis personnalisez chaque côté avec un texte et une image. Tout commence vide volontairement : Wasll ne fournit aucun contenu.', clear:'Effacer', export:'Exporter PNG', emptyTitle:'Votre canevas est vide', emptyText:'Ajoutez votre première question depuis le panneau.', left:'Côté gauche', right:'Côté droit', upload:'Ajouter une image', remove:'Supprimer', up:'Monter', down:'Descendre' },
    en: { builder:'Which side are you on?', language:'Language', content:'Content', title:'Title', subtitle:'Subtitle', rows:'Questions', addRow:'Add a question', appearance:'Appearance', accent:'Accent', background:'Background', ink:'Text', boxes:'Choices per row', numbers:'Show choice numbers', branding:'Show WASLL branding', help:'How it works', helpText:'Add rows, then customize each side with text and an image. Everything starts empty on purpose: Wasll supplies no content.', clear:'Clear', export:'Export PNG', emptyTitle:'Your canvas is empty', emptyText:'Add your first question from the panel.', left:'Left side', right:'Right side', upload:'Add an image', remove:'Delete', up:'Move up', down:'Move down' }
  };

  const titleInput = $('title-input');
  const subtitleInput = $('subtitle-input');
  const posterTitle = $('poster-title');
  const posterSubtitle = $('poster-subtitle');
  const rowsEl = $('rows');
  const empty = $('empty-state');

  function t(key){ return translations[lang][key] || key; }
  function applyLanguage(){
    document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
    document.querySelectorAll('#language-switch .seg').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    renderRows();
  }

  document.querySelectorAll('#language-switch .seg').forEach(btn => btn.addEventListener('click', () => {
    const old = lang;
    lang = btn.dataset.lang;
    const defaults = old === 'fr' ? ['De quel côté êtes-vous ?', 'Which Side Are You On?'] : ['Which side are you on?', 'Which Side Are You On?'];
    const next = lang === 'fr' ? ['De quel côté êtes-vous ?', 'Which Side Are You On?'] : ['Which side are you on?', 'Which Side Are You On?'];
    if (defaults.includes(titleInput.value)) titleInput.value = next[0];
    if (defaults.includes(subtitleInput.value)) subtitleInput.value = next[1];
    syncHeadings(); applyLanguage();
  }));

  function syncHeadings(){
    posterTitle.textContent = titleInput.value.trim() || (lang === 'fr' ? 'De quel côté êtes-vous ?' : 'Which side are you on?');
    posterSubtitle.textContent = subtitleInput.value.trim();
  }
  titleInput.addEventListener('input', syncHeadings);
  subtitleInput.addEventListener('input', syncHeadings);

  function addRow(){
    rows.push({ id: nextId++, left:'', right:'', leftDetail:'', rightDetail:'', leftImage:null, rightImage:null });
    renderRows();
    setTimeout(() => document.querySelector(`#row-${rows.at(-1).id} input[data-field="left"]`)?.focus(), 0);
  }
  $('add-row').addEventListener('click', addRow);

  function moveRow(id, dir){
    const i = rows.findIndex(r => r.id === id); if(i < 0) return;
    const j = i + dir; if(j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]]; renderRows();
  }
  function deleteRow(id){ rows = rows.filter(r => r.id !== id); renderRows(); }

  function renderRows(){
    rowsEl.innerHTML = '';
    $('row-count').textContent = rows.length;
    empty.classList.toggle('empty-state-hidden', rows.length > 0);
    rows.forEach((row, index) => {
      const el = document.createElement('article');
      el.className = 'side-row'; el.id = `row-${row.id}`;
      const boxCount = Number($('box-count').value);
      const numbers = $('show-numbers').checked;
      const boxes = Array.from({length: boxCount}, (_,i) => `<div class="choice-box">${numbers ? i+1 : ''}</div>`).join('');
      el.innerHTML = `
        <div class="side left">
          ${row.leftImage ? `<img class="side-image" src="${row.leftImage}" alt="">` : `<div class="side-placeholder">＋</div>`}
          <div class="side-text"><div class="side-label">${escapeHtml(row.left) || `<span style="color:#aaa">${escapeHtml(t('left'))}</span>`}</div><div class="side-detail">${escapeHtml(row.leftDetail)}</div></div>
        </div>
        <div class="boxes">${boxes}</div>
        <div class="side right">
          ${row.rightImage ? `<img class="side-image" src="${row.rightImage}" alt="">` : `<div class="side-placeholder">＋</div>`}
          <div class="side-text"><div class="side-label">${escapeHtml(row.right) || `<span style="color:#aaa">${escapeHtml(t('right'))}</span>`}</div><div class="side-detail">${escapeHtml(row.rightDetail)}</div></div>
        </div>
        <div class="row-editor">
          <div class="edit-group"><input type="text" data-field="left" value="${escapeAttr(row.left)}" placeholder="${escapeAttr(t('left'))}"><input type="text" data-field="leftDetail" value="${escapeAttr(row.leftDetail)}" placeholder="Detail"><label class="upload-btn" title="${escapeAttr(t('upload'))}">＋<input type="file" data-image="left" accept="image/*"></label></div>
          <div class="edit-group"><input type="text" data-field="right" value="${escapeAttr(row.right)}" placeholder="${escapeAttr(t('right'))}"><input type="text" data-field="rightDetail" value="${escapeAttr(row.rightDetail)}" placeholder="Detail"><label class="upload-btn" title="${escapeAttr(t('upload'))}">＋<input type="file" data-image="right" accept="image/*"></label></div>
        </div>
        <div class="row-controls"><button class="mini-btn" data-action="up" title="${escapeAttr(t('up'))}">↑</button><button class="mini-btn" data-action="down" title="${escapeAttr(t('down'))}">↓</button><button class="mini-btn" data-action="delete" title="${escapeAttr(t('remove'))}">×</button></div>
        ${index < rows.length - 1 ? '<div class="row-divider"></div>' : ''}`;
      rowsEl.appendChild(el);

      el.querySelectorAll('input[type="text"]').forEach(input => input.addEventListener('input', e => {
        row[e.target.dataset.field] = e.target.value;
        renderPreviewOnly(row, el);
      }));
      el.querySelectorAll('input[type="file"]').forEach(input => input.addEventListener('change', e => {
        const file = e.target.files?.[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = ev => { row[`${e.target.dataset.image}Image`] = ev.target.result; renderRows(); };
        reader.readAsDataURL(file);
      }));
      el.querySelector('[data-action="up"]').addEventListener('click', () => moveRow(row.id, -1));
      el.querySelector('[data-action="down"]').addEventListener('click', () => moveRow(row.id, 1));
      el.querySelector('[data-action="delete"]').addEventListener('click', () => deleteRow(row.id));
    });
  }

  function renderPreviewOnly(row, el){
    const leftLabel = el.querySelector('.side.left .side-label');
    const rightLabel = el.querySelector('.side.right .side-label');
    const leftDetail = el.querySelector('.side.left .side-detail');
    const rightDetail = el.querySelector('.side.right .side-detail');
    leftLabel.innerHTML = escapeHtml(row.left) || `<span style="color:#aaa">${escapeHtml(t('left'))}</span>`;
    rightLabel.innerHTML = escapeHtml(row.right) || `<span style="color:#aaa">${escapeHtml(t('right'))}</span>`;
    leftDetail.textContent = row.leftDetail; rightDetail.textContent = row.rightDetail;
  }

  function escapeHtml(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(v){ return escapeHtml(v).replace(/\n/g,' '); }

  function bindColor(id, cssVar, output){
    $(id).addEventListener('input', e => { root.style.setProperty(cssVar, e.target.value); $(output).textContent = e.target.value.toUpperCase(); });
  }
  bindColor('accent-input','--red','accent-value');
  bindColor('bg-input','--white','bg-value');
  bindColor('ink-input','--black','ink-value');
  $('box-count').addEventListener('change', renderRows);
  $('show-numbers').addEventListener('change', renderRows);
  $('show-brand').addEventListener('change', () => $('watermark').style.display = $('show-brand').checked ? '' : 'none');

  $('clear-all').addEventListener('click', () => {
    if(!rows.length || confirm(lang === 'fr' ? 'Effacer toutes les questions ?' : 'Clear all questions?')) { rows = []; renderRows(); }
  });

  function openMobile(){ $('sidebar').classList.add('mobile-open'); $('mobile-overlay').classList.add('open'); }
  function closeMobile(){ $('sidebar').classList.remove('mobile-open'); $('mobile-overlay').classList.remove('open'); }
  $('mobile-settings').addEventListener('click', openMobile); $('mobile-overlay').addEventListener('click', closeMobile);

  async function exportPng(){
    if(!rows.length){ alert(lang === 'fr' ? 'Ajoutez au moins une question avant d’exporter.' : 'Add at least one question before exporting.'); return; }
    const poster = $('poster');
    const clone = poster.cloneNode(true);
    clone.querySelectorAll('.row-editor,.row-controls').forEach(e => e.remove());
    const css = Array.from(document.styleSheets).map(s => { try{return Array.from(s.cssRules).map(r=>r.cssText).join('\n')}catch{return ''} }).join('\n');
    const width = poster.offsetWidth, height = poster.offsetHeight;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${css}</style>${clone.outerHTML}</div></foreignObject></svg>`;
    const blob = new Blob([svg], {type:'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = width*2; canvas.height = height*2;
      const ctx = canvas.getContext('2d'); ctx.scale(2,2); ctx.drawImage(img,0,0);
      URL.revokeObjectURL(url);
      const a=document.createElement('a'); a.download=`wasll-side-${Date.now()}.png`; a.href=canvas.toDataURL('image/png'); a.click();
    };
    img.onerror = () => { URL.revokeObjectURL(url); alert(lang === 'fr' ? 'Impossible de générer l’image.' : 'Could not generate the image.'); };
    img.src = url;
  }
  $('export-btn').addEventListener('click', exportPng); $('toolbar-export').addEventListener('click', exportPng);

  syncHeadings(); applyLanguage();
});
