const fileInput = document.getElementById('file-picker');
const sidebar = document.getElementById('sidebar');
const thumbsEl = document.getElementById('thumbs');
const viewerImg = document.getElementById('viewer-img');
const viewerWrap = document.getElementById('viewer-wrap');

let files=[], currentIndex=-1, dragSrcIndex=null;
let scale=1, translate={x:0,y:0}, isPanning=false, lastPan={x:0,y:0};
let hoverTimeout=null;

// Sidebar hover auto-show
function showSidebar(){ sidebar.classList.add('visible'); }
function hideSidebar(){ sidebar.classList.remove('visible'); }

document.addEventListener('mousemove', e=>{
  if(e.clientX <= 20) showSidebar();
});

sidebar.addEventListener('mouseenter', ()=>{ showSidebar(); if(hoverTimeout) clearTimeout(hoverTimeout); });
sidebar.addEventListener('mouseleave', ()=>{ hoverTimeout=setTimeout(()=>hideSidebar(),500); });

// Load images
fileInput.addEventListener('change', e=>{
  const selected = Array.from(e.target.files).filter(f=>f.type.startsWith('image/'));
  if(selected.length===0) return;
  files = selected.map(f=>({name:f.name,url:URL.createObjectURL(f)}));
  renderThumbnails();
  openImage(0);
  showSidebar(); // make sidebar visible
});

// Render sidebar thumbnails
function renderThumbnails(){
  thumbsEl.innerHTML='';
  files.forEach((f, idx)=>{
    const el=document.createElement('div');
    el.className='thumb';
    el.draggable=true;
    el.dataset.index=idx;
    el.innerHTML=`<img src="${f.url}"><div class="name">${f.name}</div>`;
    if(idx===currentIndex) el.classList.add('selected');

    // Click to open
    el.addEventListener('click', ()=>openImage(idx));

    // Drag & drop
    el.addEventListener('dragstart', e=>{ dragSrcIndex=idx; el.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
    el.addEventListener('dragend', ()=>{ dragSrcIndex=null; el.classList.remove('dragging'); });
    el.addEventListener('dragover', e=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; });
    el.addEventListener('drop', e=>{
      e.preventDefault();
      if(dragSrcIndex===null||dragSrcIndex===idx) return;
      const item=files.splice(dragSrcIndex,1)[0]; files.splice(idx,0,item);
      renderThumbnails();
      if(currentIndex===dragSrcIndex) currentIndex=idx;
      else if(dragSrcIndex<currentIndex && idx>=currentIndex) currentIndex--;
      else if(dragSrcIndex>currentIndex && idx<=currentIndex) currentIndex++;
      openImage(currentIndex);
    });

    thumbsEl.appendChild(el);
  });
}

// Open image in main viewer
function openImage(idx){
  if(idx<0||idx>=files.length) return;
  currentIndex=idx;
  viewerImg.src=files[idx].url;
  resetTransform();
  document.querySelectorAll('.thumb').forEach(t=>t.classList.remove('selected'));
  const thumbEl = thumbsEl.querySelector(`.thumb[data-index="${idx}"]`);
  if(thumbEl) thumbEl.classList.add('selected');
  if(thumbEl) thumbEl.scrollIntoView({block:'nearest'});
}

// Keyboard navigation
document.addEventListener('keydown', e=>{
  if(files.length===0) return;
  if(e.key==='ArrowRight') openImage((currentIndex+1)%files.length);
  else if(e.key==='ArrowLeft') openImage((currentIndex-1+files.length)%files.length);
});

// Zoom at mouse pointer (constrained)
viewerWrap.addEventListener('wheel', e=>{
  if(!viewerImg.src) return;
  e.preventDefault();
  const rect=viewerImg.getBoundingClientRect();
  const px=Math.max(0, Math.min(e.clientX-rect.left, rect.width));
  const py=Math.max(0, Math.min(e.clientY-rect.top, rect.height));
  viewerImg.style.transformOrigin=`${(px/rect.width)*100}% ${(py/rect.height)*100}%`;
  scale = Math.max(0.5, Math.min(2, scale*(1 - e.deltaY*0.0015)));
  updateTransform();
},{passive:false});

// Pan with constraints
viewerImg.addEventListener('pointerdown', e=>{ 
  if(!viewerImg.src) return; 
  isPanning=true; 
  lastPan={x:e.clientX,y:e.clientY}; 
  viewerImg.setPointerCapture(e.pointerId); 
  viewerImg.style.cursor='grabbing'; 
});
viewerImg.addEventListener('pointermove', e=>{ 
  if(!isPanning) return; 
  translate.x+=e.clientX-lastPan.x; translate.y+=e.clientY-lastPan.y; 
  lastPan={x:e.clientX,y:e.clientY}; 
  // Constrain panning
  const limitX = Math.max(0,(viewerImg.width*scale-0.9*viewerWrap.clientWidth)/2);
  const limitY = Math.max(0,(viewerImg.height*scale-0.9*viewerWrap.clientHeight)/2);
  translate.x = Math.min(limitX, Math.max(-limitX, translate.x));
  translate.y = Math.min(limitY, Math.max(-limitY, translate.y));
  updateTransform(); 
});
viewerImg.addEventListener('pointerup', e=>{ isPanning=false; viewerImg.releasePointerCapture(e.pointerId); viewerImg.style.cursor='grab'; });
viewerImg.addEventListener('pointercancel', ()=>{ isPanning=false; viewerImg.style.cursor='grab'; });

// Update transform
function updateTransform(){ viewerImg.style.transform=`translate(${translate.x}px,${translate.y}px) scale(${scale})`; }
function resetTransform(){ scale=1; translate={x:0,y:0}; viewerImg.style.transformOrigin='50% 50%'; updateTransform(); }
