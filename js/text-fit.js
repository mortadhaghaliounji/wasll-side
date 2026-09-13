/* Keep every side label/detail on one line and shrink it to fit its available width. */
(function(){
  const MIN_LABEL=7;
  const MIN_DETAIL=5.5;

  function fitNode(node){
    if(!node || !node.textContent.trim()) return;
    const base=Number(node.dataset.baseFontSize)||parseFloat(getComputedStyle(node).fontSize)||10;
    const min=node.classList.contains('side-detail')?MIN_DETAIL:MIN_LABEL;
    node.style.fontSize=base+'px';
    let size=base;
    let guard=40;
    while(node.scrollWidth>node.clientWidth+0.5 && size>min && guard--){
      size=Math.max(min,size-0.35);
      node.style.fontSize=size+'px';
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
    const mo=new MutationObserver(()=>requestAnimationFrame(fitAll));
    mo.observe(rows,{childList:true,subtree:true,characterData:true});
    if(window.ResizeObserver){
      const ro=new ResizeObserver(()=>requestAnimationFrame(fitAll));
      ro.observe(rows);
    } else {
      window.addEventListener('resize',()=>requestAnimationFrame(fitAll));
    }
    window.addEventListener('load',fitAll,{once:true});
    requestAnimationFrame(fitAll);
    setTimeout(fitAll,250);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',observe);
  else observe();
})();
