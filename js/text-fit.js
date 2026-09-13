/* Keep side text on one line without letting it disappear. */
(function(){
  const MIN_LABEL=8;
  const MIN_DETAIL=6;

  function fitNode(node){
    if(!node) return;
    const text=node.textContent.trim();
    if(!text) return;

    const base=Number(node.dataset.baseFontSize)||parseFloat(getComputedStyle(node).fontSize)||10;
    const min=node.classList.contains('side-detail')?MIN_DETAIL:MIN_LABEL;

    node.style.fontSize=base+'px';
    node.style.whiteSpace='nowrap';
    node.style.overflow='hidden';
    node.style.textOverflow='ellipsis';
    node.style.wordBreak='normal';
    node.style.overflowWrap='normal';
    node.style.hyphens='none';

    let size=base;
    let guard=50;
    while(node.scrollWidth>node.clientWidth+0.5 && size>min && guard--){
      size=Math.max(min,size-0.25);
      node.style.fontSize=size+'px';
    }

    if(node.scrollWidth>node.clientWidth+0.5){
      node.style.textOverflow='ellipsis';
      node.title=text;
    } else {
      node.style.textOverflow='clip';
      node.removeAttribute('title');
    }
  }

  function fitAll(){
    document.querySelectorAll('#rows .side-label, #rows .side-detail').forEach(node=>{
      if(!node.dataset.baseFontSize) node.dataset.baseFontSize=getComputedStyle(node).fontSize;
      fitNode(node);
    });
  }

  function observe(){
    const rows=document.getElementById('rows');
    if(!rows) return;

    let raf=0;
    const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(fitAll)};

    const mo=new MutationObserver(schedule);
    mo.observe(rows,{childList:true,subtree:true,characterData:true});

    if(window.ResizeObserver){
      const ro=new ResizeObserver(schedule);
      ro.observe(rows);
      window.addEventListener('resize',schedule);
    } else {
      window.addEventListener('resize',schedule);
    }

    window.addEventListener('load',schedule,{once:true});
    schedule();
    setTimeout(schedule,250);
    setTimeout(schedule,800);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',observe);
  else observe();
})();
