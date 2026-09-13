document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const DB_NAME = 'wasll-side-db';
  const DB_VERSION = 1;
  const DB_STORE = 'state';
  const DB_KEY = 'current';
  const STORAGE_KEY = 'wasll-side-state';

  const defaultState = () => ({
    lang:'fr',title:'De quel côté êtes-vous ?',subtitle:'Which Side Are You On?',rows:[],nextId:1,
    boxCount:5,showNumbers:true,showBrand:true,layout:'auto',density:'normal',
    colors:{accent:'#d01020',bg:'#fafaf8',ink:'#0c0c0c'}
  });

  let state=defaultState(), history=[], activeImage=null, saveTimer=null, dbPromise=null;
  const copy={
    fr:{builder:'Which side are you on?',content:'Contenu',title:'Titre',subtitle:'Sous-titre',questions:'Questions',addRow:'Ajouter une question',appearance:'Apparence',layout:'Disposition',auto:'Auto',density:'Densité',compact:'Compacte',normal:'Normale',boxes:'Choix par question',numbers:'Afficher les numéros',numbersHint:'Afficher 1, 2, 3… dans les cases',branding:'Marque WASLL',brandingHint:'Afficher le watermark sur l’image',accent:'Accent',background:'Fond',ink:'Texte',clear:'Effacer',export:'Exporter PNG',emptyTitle:'Aucune question',emptyText:'Créez votre première question pour commencer.',left:'Côté gauche',right:'Côté droit',upload:'Ajouter une image',remove:'Supprimer',up:'Monter',down:'Descendre',editOnCanvas:'Cliquez directement sur le visuel pour le modifier.',helpText:'Cliquez sur un côté ou une image pour le personnaliser.',undo:'Annuler',exportEmpty:'Ajoutez au moins une question avant d’exporter.',exportError:'Impossible de générer l’image.',saved:'Sauvegardé'},
    en:{builder:'Which side are you on?',content:'Content',title:'Title',subtitle:'Subtitle',questions:'Questions',addRow:'Add a question',appearance:'Appearance',layout:'Layout',auto:'Auto',density:'Density',compact:'Compact',normal:'Normal',boxes:'Choices per question',numbers:'Show choice numbers',numbersHint:'Show 1, 2, 3… in the boxes',branding:'WASLL branding',brandingHint:'Show the watermark on the image',accent:'Accent',background:'Background',ink:'Text',clear:'Clear',export:'Export PNG',emptyTitle:'No questions yet',emptyText:'Create your first question to get started.',left:'Left side',right:'Right side',upload:'Add an image',remove:'Delete',up:'Move up',down:'Move down',editOnCanvas:'Click directly on the visual to edit it.',helpText:'Click a side or an image to customize it.',undo:'Undo',exportEmpty:'Add at least one question before exporting.',exportError:'Could not generate the image.',saved:'Saved'}
  };

  const titleInput=$('title-input'),subtitleInput=$('subtitle-input'),posterTitle=$('poster-title'),posterSubtitle=$('poster-subtitle'),rowsEl=$('rows'),empty=$('empty-state');
  function t(k){return copy[state.lang][k]||k}
  function clone(v){return JSON.parse(JSON.stringify(v))}
  function snapshot(){return clone(state)}
  function normalizeState(raw){
    const base=defaultState();
    if(!raw||typeof raw!=='object') return base;
    const merged={...base,...raw,colors:{...base.colors,...(raw.colors||{})}};
    merged.rows=Array.isArray(raw.rows)?raw.rows.map(r=>({id:Number(r.id),left:String(r.left||''),right:String(r.right||''),leftDetail:String(r.leftDetail||''),rightDetail:String(r.rightDetail||''),leftImage:r.leftImage||null,rightImage:r.rightImage||null})).filter(r=>Number.isFinite(r.id)):[];
    merged.nextId=Math.max(Number(raw.nextId)||1,0,...merged.rows.map(r=>r.id+1));
    merged.boxCount=Math.min(7,Math.max(3,Number(raw.boxCount)||5));
    merged.lang=raw.lang==='en'?'en':'fr';
    merged.layout=['auto','1','2','3'].includes(String(raw.layout))?String(raw.layout):'auto';
    merged.density=raw.density==='compact'?'compact':'normal';
    merged.showNumbers=raw.showNumbers!==false; merged.showBrand=raw.showBrand!==false;
    return merged;
  }

  function openDb(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE)};
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error||new Error('IndexedDB unavailable'));
    });
    return dbPromise;
  }
  async function saveState(){
    const payload=snapshot();
    try{
      const db=await openDb();
      await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(payload,DB_KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('Save failed'))});
    }catch(e){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(payload))}catch(_){} }
  }
  function saveSoon(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{saveState();},180);
  }
  async function loadState(){
    try{
      const db=await openDb();
      const saved=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const req=tx.objectStore(DB_STORE).get(DB_KEY);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
      if(saved){state=normalizeState(saved);return true}
    }catch(e){}
    try{const saved=localStorage.getItem(STORAGE_KEY);if(saved){state=normalizeState(JSON.parse(saved));return true}}catch(e){}
    return false;
  }

  function pushHistory(){const s=snapshot(),last=history.at(-1);if(last&&JSON.stringify(last)===JSON.stringify(s))return;history.push(s);if(history.length>50)history.shift();updateUndo()}
  function updateUndo(){const b=$('undo-btn');b.disabled=!history.length;b.title=t('undo');b.setAttribute('aria-label',t('undo'))}
  function columns(){if(state.layout!=='auto')return Number(state.layout);return state.rows.length>18?3:state.rows.length>8?2:1}
  function syncLayout(){
    const cols=columns(),perCol=Math.max(1,Math.ceil(state.rows.length/cols));
    root.style.setProperty('--question-cols',cols);root.style.setProperty('--rows-per-col',perCol);root.dataset.density=state.density;root.dataset.cols=String(cols);
    document.querySelectorAll('#layout-wrap button').forEach(b=>b.classList.toggle('active',b.dataset.layout===state.layout));
    document.querySelectorAll('#density-wrap button').forEach(b=>b.classList.toggle('active',b.dataset.density===state.density));
  }
  function syncChrome(){
    titleInput.value=state.title;subtitleInput.value=state.subtitle;root.style.setProperty('--red',state.colors.accent);root.style.setProperty('--black',state.colors.ink);root.style.setProperty('--white',state.colors.bg);
    $('accent-input').value=state.colors.accent;$('bg-input').value=state.colors.bg;$('ink-input').value=state.colors.ink;
    $('accent-value').textContent=state.colors.accent.toUpperCase();$('bg-value').textContent=state.colors.bg.toUpperCase();$('ink-value').textContent=state.colors.ink.toUpperCase();
    $('show-numbers').checked=state.showNumbers;$('show-brand').checked=state.showBrand;$('watermark').style.display=state.showBrand?'':'none';syncChoiceButtons();syncLayout();
  }
  function applyLanguage(){document.querySelectorAll('[data-i18n]').forEach(e=>e.textContent=t(e.dataset.i18n));document.querySelectorAll('#language-switch .language-btn').forEach(b=>b.classList.toggle('active',b.dataset.lang===state.lang));titleInput.placeholder=state.lang==='fr'?'Votre titre…':'Your title…';subtitleInput.placeholder=state.lang==='fr'?'Votre sous-titre…':'Your subtitle…';syncHeadings();renderRows();updateUndo()}
  function syncHeadings(){posterTitle.textContent=state.title.trim()||(state.lang==='fr'?'De quel côté êtes-vous ?':'Which side are you on?');posterSubtitle.textContent=state.subtitle.trim()}
  function editHeading(key){const el=key==='title'?posterTitle:posterSubtitle;if(el.dataset.editing==='1')return;const old=state[key];pushHistory();el.dataset.editing='1';el.contentEditable='true';el.focus();const sel=getSelection(),range=document.createRange();range.selectNodeContents(el);range.collapse(false);sel.removeAllRanges();sel.addRange(range);const finish=()=>{if(el.dataset.editing!=='1')return;delete el.dataset.editing;delete el.contentEditable;state[key]=el.textContent.trim();syncChrome();syncHeadings();saveSoon()};el.addEventListener('blur',finish,{once:true});el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();el.blur()}else if(e.key==='Escape'){e.preventDefault();el.textContent=old;el.blur()}})}
  posterTitle.addEventListener('click',()=>editHeading('title'));posterSubtitle.addEventListener('click',()=>editHeading('subtitle'));
  [titleInput,subtitleInput].forEach(input=>{input.addEventListener('focus',()=>{if(!input.dataset.history){pushHistory();input.dataset.history='1'}});input.addEventListener('input',()=>{if(input===titleInput)state.title=input.value;else state.subtitle=input.value;syncHeadings();saveSoon()});input.addEventListener('blur',()=>delete input.dataset.history)});
  document.querySelectorAll('#language-switch .language-btn').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.lang===state.lang)return;pushHistory();const old=state.lang,oldTitle=old==='fr'?'De quel côté êtes-vous ?':'Which Side Are You On?';if(state.title===oldTitle)state.title=btn.dataset.lang==='fr'?'De quel côté êtes-vous ?':'Which side are you on?';state.lang=btn.dataset.lang;syncChrome();applyLanguage();saveSoon()}));
  function addRow(){pushHistory();const id=state.nextId++;state.rows.push({id,left:'',right:'',leftDetail:'',rightDetail:'',leftImage:null,rightImage:null});renderRows();saveSoon();setTimeout(()=>focusSide(id,'left'),0)}
  function moveRow(id,dir){const i=state.rows.findIndex(r=>r.id===id),j=i+dir;if(i<0||j<0||j>=state.rows.length)return;pushHistory();[state.rows[i],state.rows[j]]=[state.rows[j],state.rows[i]];renderRows();saveSoon()}
  function deleteRow(id){if(!state.rows.some(r=>r.id===id))return;pushHistory();state.rows=state.rows.filter(r=>r.id!==id);renderRows();saveSoon()}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function rowMarkup(row,index){const boxes=Array.from({length:state.boxCount},(_,i)=>`<div class="choice-box">${state.showNumbers?i+1:''}</div>`).join('');return `<div class="side left" data-side="left" data-row="${row.id}"><div class="image-wrap" data-image-side="left" data-row="${row.id}" title="${esc(t('upload'))}">${row.leftImage?`<img class="side-image" src="${esc(row.leftImage)}" alt="">`:`<div class="side-placeholder"><i class="bi bi-image"></i></div>`}</div><div class="side-text"><div class="side-label editable" data-field="left" data-row="${row.id}" contenteditable="true" spellcheck="false">${esc(row.left)||`<span class="placeholder-text">${esc(t('left'))}</span>`}</div><div class="side-detail editable" data-field="leftDetail" data-row="${row.id}" contenteditable="true" spellcheck="false">${esc(row.leftDetail)||''}</div></div></div><div class="boxes">${boxes}</div><div class="side right" data-side="right" data-row="${row.id}"><div class="image-wrap" data-image-side="right" data-row="${row.id}" title="${esc(t('upload'))}">${row.rightImage?`<img class="side-image" src="${esc(row.rightImage)}" alt="">`:`<div class="side-placeholder"><i class="bi bi-image"></i></div>`}</div><div class="side-text"><div class="side-label editable" data-field="right" data-row="${row.id}" contenteditable="true" spellcheck="false">${esc(row.right)||`<span class="placeholder-text">${esc(t('right'))}</span>`}</div><div class="side-detail editable" data-field="rightDetail" data-row="${row.id}" contenteditable="true" spellcheck="false">${esc(row.rightDetail)||''}</div></div></div><div class="row-controls"><button class="mini-btn" data-action="up" type="button" title="${esc(t('up'))}"><i class="bi bi-chevron-up"></i></button><button class="mini-btn" data-action="down" type="button" title="${esc(t('down'))}"><i class="bi bi-chevron-down"></i></button><button class="mini-btn delete" data-action="delete" type="button" title="${esc(t('remove'))}"><i class="bi bi-trash3"></i></button></div>${index<state.rows.length-1?'<div class="row-divider"></div>':''}`}
  function renderRows(){rowsEl.innerHTML='';$('row-count').textContent=state.rows.length;empty.classList.toggle('empty-state-hidden',state.rows.length>0);syncLayout();state.rows.forEach((row,index)=>{const el=document.createElement('article');el.className='side-row';el.id=`row-${row.id}`;el.innerHTML=rowMarkup(row,index);rowsEl.appendChild(el);bindRow(el,row)})}
  function bindRow(el,row){el.querySelectorAll('.editable').forEach(node=>{node.addEventListener('focus',()=>{if(!node.dataset.history){pushHistory();node.dataset.history='1'}});node.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();node.blur()}else if(e.key==='Escape'){e.preventDefault();node.textContent=row[node.dataset.field]||'';node.blur()}});node.addEventListener('blur',()=>{const field=node.dataset.field;row[field]=node.textContent.trim();node.removeAttribute('data-history');renderPreview(row,el);saveSoon()})});el.querySelectorAll('.image-wrap').forEach(w=>w.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();activeImage={row,side:w.dataset.imageSide};$('image-picker').click()}));el.querySelector('[data-action="up"]').addEventListener('click',()=>moveRow(row.id,-1));el.querySelector('[data-action="down"]').addEventListener('click',()=>moveRow(row.id,1));el.querySelector('[data-action="delete"]').addEventListener('click',()=>deleteRow(row.id))}
  function renderPreview(row,el){const update=side=>{const label=el.querySelector(`.side.${side} .side-label`),detail=el.querySelector(`.side.${side} .side-detail`);label.innerHTML=esc(row[side])||`<span class="placeholder-text">${esc(t(side))}</span>`;detail.textContent=row[`${side}Detail`]||''};update('left');update('right')}
  function focusSide(id,side){const el=document.querySelector(`#row-${id} .side.${side} .side-label`);if(el){el.focus();const r=document.createRange();r.selectNodeContents(el);r.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(r)}}
  function syncChoiceButtons(){document.querySelectorAll('#box-count-wrap button').forEach(b=>b.classList.toggle('active',Number(b.dataset.count)===state.boxCount))}
  document.querySelectorAll('#layout-wrap button').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.layout;if(v===state.layout)return;pushHistory();state.layout=v;renderRows();saveSoon()}));
  document.querySelectorAll('#density-wrap button').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.density;if(v===state.density)return;pushHistory();state.density=v;renderRows();saveSoon()}));
  document.querySelectorAll('#box-count-wrap button').forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.count);if(n===state.boxCount)return;pushHistory();state.boxCount=n;renderRows();saveSoon()}));
  ['show-numbers','show-brand'].forEach(id=>$(id).addEventListener('change',e=>{pushHistory();if(id==='show-numbers')state.showNumbers=e.target.checked;else{state.showBrand=e.target.checked;$('watermark').style.display=state.showBrand?'':'none'}renderRows();saveSoon()}));
  [['accent-input','accent'],['bg-input','bg'],['ink-input','ink']].forEach(([id,key])=>{const input=$(id);input.addEventListener('focus',()=>{if(!input.dataset.history){pushHistory();input.dataset.history='1'}});input.addEventListener('input',e=>{state.colors[key]=e.target.value;root.style.setProperty(key==='accent'?'--red':key==='bg'?'--white':'--black',e.target.value);$(`${id.replace('-input','')}-value`).textContent=e.target.value.toUpperCase();saveSoon()});input.addEventListener('blur',()=>delete input.dataset.history)});
  $('appearance-toggle').addEventListener('click',()=>{const b=$('appearance-toggle'),p=$('appearance-panel'),open=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!open));p.hidden=open});
  $('add-row').addEventListener('click',addRow);$('empty-add').addEventListener('click',addRow);
  $('undo-btn').addEventListener('click',()=>{const previous=history.pop();if(!previous)return;state=normalizeState(previous);syncChrome();applyLanguage();saveSoon()});
  $('clear-all').addEventListener('click',()=>{if(!state.rows.length)return;if(confirm(t('clearConfirm')||'Clear all questions?')){pushHistory();state.rows=[];renderRows();saveSoon()}});
  $('mobile-settings').addEventListener('click',()=>{$('sidebar').classList.add('mobile-open');$('mobile-overlay').classList.add('open')});$('mobile-overlay').addEventListener('click',closeMobile);$('sidebar-close').addEventListener('click',closeMobile);function closeMobile(){$('sidebar').classList.remove('mobile-open');$('mobile-overlay').classList.remove('open')}

  const picker=document.createElement('input');picker.type='file';picker.id='image-picker';picker.accept='image/*';picker.hidden=true;document.body.appendChild(picker);
  picker.addEventListener('change',()=>{const file=picker.files?.[0];if(!file||!activeImage)return;if(file.size>5*1024*1024){showStatus(state.lang==='fr'?'Image trop lourde (5 Mo max)':'Image too large (5 MB max)');picker.value='';activeImage=null;return}pushHistory();const reader=new FileReader();reader.onload=e=>{activeImage.row[`${activeImage.side}Image`]=e.target.result;picker.value='';activeImage=null;renderRows();saveSoon()};reader.readAsDataURL(file)});

  function waitForImages(container){const imgs=[...container.querySelectorAll('img')];return Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(r=>{img.addEventListener('load',r,{once:true});img.addEventListener('error',r,{once:true})})));}
  async function exportPng(){
    if(!state.rows.length){showStatus(t('exportEmpty'));return}
    const btn=$('toolbar-export');btn.disabled=true;
    const active=document.activeElement;if(active&&active.blur)active.blur();
    const poster=$('poster'); const previous={className:poster.className,style:poster.getAttribute('style')};
    try{
      if(typeof window.html2canvas!=='function')throw new Error('html2canvas not loaded');
      document.body.classList.add('exporting');
      syncLayout();
      poster.classList.add('export-poster');
      poster.style.width='900px';
      poster.style.minWidth='900px';
      poster.style.maxWidth='900px';
      poster.style.height='auto';
      poster.style.overflow='visible';
      poster.style.boxSizing='border-box';
      await waitForImages(poster);
      if(document.fonts?.ready) await document.fonts.ready;
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const width=poster.scrollWidth||900;
      const height=poster.scrollHeight;
      const canvas=await window.html2canvas(poster,{scale:3,width,height,windowWidth:Math.max(window.innerWidth,width),windowHeight:Math.max(window.innerHeight,height),useCORS:true,allowTaint:false,backgroundColor:null,logging:false,removeContainer:true,scrollX:0,scrollY:0,ignoreElements:el=>el.classList?.contains('row-controls')});
      const a=document.createElement('a');a.download=`wasll-side-${Date.now()}.png`;a.href=canvas.toDataURL('image/png');document.body.appendChild(a);a.click();a.remove();showStatus(t('export'));
    }catch(err){console.error(err);showStatus(t('exportError'))}
    finally{document.body.classList.remove('exporting');poster.className=previous.className;if(previous.style===null)poster.removeAttribute('style');else poster.setAttribute('style',previous.style);btn.disabled=false}
  }
  $('toolbar-export').addEventListener('click',exportPng);
  function showStatus(text){let s=$('export-status');if(!s){s=document.createElement('div');s.id='export-status';s.className='export-status';document.body.appendChild(s)}s.textContent=text;s.classList.add('show');clearTimeout(showStatus.timer);showStatus.timer=setTimeout(()=>s.classList.remove('show'),1800)}

  (async()=>{await loadState();syncChrome();applyLanguage();saveSoon()})();
});
