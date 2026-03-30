(function(){
function hydrateRemarks(data){
 var remarks=data._remarks||[];
 var out={};
 Object.keys(data).forEach(function(key){
 if(key==='_remarks')return;
 var ds=JSON.parse(JSON.stringify(data[key]));
 ds.boats.forEach(function(boat){
 boat.days.forEach(function(day){
 if(typeof day.r==='number') day.r=remarks[day.r]||'';
 });
 });
 out[key]=ds;
 });
 return out;
}

async function loadFleetData(){
 var res=await fetch('fleet_data.json');
 if(!res.ok) throw new Error('Fleet data load failed: '+res.status);
 var raw=await res.json();
 D=hydrateRemarks(raw);
 window.D=D;
}

let D = {};
const MO = ['Aug_2025','Sep_2025','Oct_2025','Nov_2025','Dec_2025','Jan_2026','Feb_2026','Mar_2026'];
const ML = {Aug_2025:'Aug25',Sep_2025:'Sep25',Oct_2025:'Oct25',Nov_2025:'Nov25',Dec_2025:'Dec25',Jan_2026:'Jan26',Feb_2026:'Feb26',Mar_2026:'Mar26'};
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MJS = {Aug:7,Sep:8,Oct:9,Nov:10,Dec:11,Jan:0,Feb:1,Mar:2};
const SL = {A:'Available',M:'Machinery Issues',S:'Structural Damage',P:'Propeller Damage',W:'Payment Delays',N:'No Data'};
const SBG = {A:'#92D050',M:'#FF0000',S:'#4472C4',P:'#FF66FF',W:'#ED7D31',N:'#e8eaee'};
const SFG = {A:'#2d5a1a',M:'#fff',S:'#fff',P:'#333',W:'#fff',N:'#9ba3b8'};
const SLOTS = ['00-06','06-12','12-18','18-24'];
let fleet='SCB', mk='Mar_2026', selDay=19, emode=false;

const EDITS = {};
function dow(m,y,d){ return new Date(y, MJS[m], d).getDay(); }
function getDS(){
 if(fleet==='ALL') return [D['SCB_'+mk], D['SGS_'+mk]].filter(Boolean);
 return [D[fleet+'_'+mk]].filter(Boolean);
}
function getInfo(dsKey, sr, day, slot){
 const ek = dsKey+'|'+sr+'|'+day+'|'+slot;
 if(EDITS[ek]) return EDITS[ek];
 const ds = D[dsKey]; if(!ds) return {s:'N',r:''};
 const boat = ds.boats.find(b=>b.sr===sr); if(!boat) return {s:'N',r:''};
 const d = boat.days.find(x=>x.d===day) || {s:'N',r:''};
 return {s:d.s, r:d.r||''};
}

function renderKPI(){
 const ds = getDS();
 const boats = ds.flatMap(d=>d.boats.map(b=>({...b,_k:d.fleet+'_'+mk})));
 let av=0,ma=0,st=0,pr=0,pa=0, tot=boats.length;
 boats.forEach(b=>{
 const sts = [0,1,2,3].map(si=>getInfo(b._k,b.sr,selDay,si).s);
 const cnt={}; sts.forEach(s=>cnt[s]=(cnt[s]||0)+1);
 const dom = Object.keys(cnt).sort((a,b2)=>cnt[b2]-cnt[a])[0];
 if(dom==='A') av++;
 else if(dom==='M') ma++;
 else if(dom==='S') st++;
 else if(dom==='P') pr++;
 else if(dom==='W') pa++;
 else if(dom==='Y'){}
 });
 const pct = tot>0?Math.round(av/tot*100):0;
 document.getElementById('kpis').innerHTML=`
 <div class="kpi kg"><div class="kpi-n">${av}</div><div class="kpi-l">Operational</div><div class="kpi-s">${pct}% available</div></div>
 <div class="kpi kr"><div class="kpi-n">${tot-av}</div><div class="kpi-l">Boats Down</div><div class="kpi-s">${tot} total</div></div>
 <div class="kpi kr"><div class="kpi-n">${ma}</div><div class="kpi-l">Machinery</div><div class="kpi-s">Engine / mech</div></div>
 <div class="kpi ko"><div class="kpi-n">${st+pr}</div><div class="kpi-l">Structural/Prop</div><div class="kpi-s">Hull, propeller</div></div>
 <div class="kpi kb"><div class="kpi-n">${pa}</div><div class="kpi-l">Payment Delay</div><div class="kpi-s">Awaiting</div></div>
 `;
}

function renderTable(){
 const ds = getDS(); if(!ds.length) return;
 const days=ds[0].days, month=ds[0].month, year=ds[0].year;
 document.getElementById('mtitle').textContent = ML[mk]||mk;
 document.getElementById('mmeta').textContent = '— '+days+' days';
 document.getElementById('dayind').textContent = 'Day '+selDay;
 let h='<thead><tr>';
 h+=`<th class="thlabels" colspan="3"></th>`;
 for(let d=1;d<=days;d++){
 const sc = d===selDay?' sc':'';
 h+=`<th class="thday${sc}" onclick="setDay(${d})"><div><div class="thdow">${DOW[dow(month,year,d)][0]}</div><div>${d}</div></div></th>`;
 }
 h+=`<th class="thsum">Avail%</th><th class="thsum">Days↓</th></tr></thead><tbody>`;
 ds.forEach((dataset,di)=>{
 const dsKey = dataset.fleet+'_'+mk;
 if(fleet==='ALL'){
 const bg = dataset.fleet==='SCB'?'#2e5548':'#2a3a7a';
 const lbl = dataset.fleet==='SCB'?'SEACABBIE':'SG SHIPPING';
 h+=`<tr class="fsep"><td colspan="${days+5}" style="background:${bg}">${lbl} — ${dataset.boats.length} VESSELS</td></tr>`;
 }
 dataset.boats.forEach(boat=>{
 let avd=0,dnd=0;
 for(let d=1;d<=days;d++){
 const sts=[0,1,2,3].map(si=>getInfo(dsKey,boat.sr,d,si).s);
 const cnt={}; sts.forEach(s=>cnt[s]=(cnt[s]||0)+1);
 const dom=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
 if(dom==='A') avd++; else if(dom!=='N') dnd++;
 }
 const recorded=avd+dnd;
 const pct=recorded>0?Math.round(avd/recorded*100):0;
 const pc=pct>=90?'#2a8040':pct>=70?'#7a5a10':pct>=50?'#b04010':'#8b1c1c';
 SLOTS.forEach((slot,si)=>{
 h+='<tr>';
 if(si===0){
 h+=`<td class="tdsr" rowspan="4">${boat.sr}</td>`;
 h+=`<td class="tdname" rowspan="4">${boat.name}</td>`;
 }
 h+=`<td class="tdslot">${slot}</td>`;
 for(let d=1;d<=days;d++){
 const inf = getInfo(dsKey,boat.sr,d,si);
 const s=inf.s, r=(inf.r||'').replace(/"/g,'&quot;');
 const sc = d===selDay?' sc':'';
 const ed = EDITS[dsKey+'|'+boat.sr+'|'+d+'|'+si]?' edited':'';
 // encode all metadata as data-* attributes
 h+=`<td class="cell s${s}${sc}${ed}"
 data-k="${dsKey}" data-sr="${boat.sr}" data-d="${d}" data-si="${si}"
 data-boat="${boat.name}" data-m="${month}" data-y="${year}"
 data-s="${s}" data-r="${r}"
 onmouseenter="cellEnter(event,this)" onmouseleave="cellLeave(this)"
 onmousedown="cellDown(event,this)"><span class="fh" onmousedown="handleDown(event,this.parentElement)"></span></td>`;
 }
 if(si===0){
 h+=`<td class="tdpct" rowspan="4" style="color:${pc}">${pct}%</td>`;
 h+=`<td class="tddown" rowspan="4">${dnd>0?'<span style="color:#c0392b;font-weight:600">'+dnd+'</span>':'—'}</td>`;
 }
 h+='</tr>';
 });
 h+=`<tr class="bdiv"><td colspan="${days+5}"></td></tr>`;
 });
 });
 h+='</tbody>';
 document.getElementById('tbl').innerHTML=h;
 // scroll selected col into view
 setTimeout(()=>{
 const el=document.querySelector('.thday.sc');
 if(el) el.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
 },80);
}
// ── CELL EVENTS (drag-to-paint + click) ──────────────
let isDragging=false, dragStatus=null, dragReason='';
let activePaintStatus=null, activePaintReason='';
let pkTarget=null, pkStatus=null;
let dragAnchorEl=null;
let pendingDragEl=null, pendingDragEvent=null;
let pendingStartX=0, pendingStartY=0;
const DRAG_THRESHOLD=4; // px of movement before drag starts
// Store original status of every cell before drag starts so we can restore
// cells that leave the selection rectangle
const origStatus={}; // key -> {s,r}
// Fast lookup: cellKey -> DOM element, built once per drag session
let cellIndex=null; // Map<key, element>
function buildCellIndex(){
 cellIndex=new Map();
 document.querySelectorAll('td.cell').forEach(el=>{
 const k=el.dataset.k+'|'+el.dataset.sr+'|'+el.dataset.d+'|'+el.dataset.si;
 cellIndex.set(k,el);
 });
}
function cellEnter(e,el){
 if(isDragging){ expandRect(el); return; }
 if(!emode) return;
 showTip(e,el);
}
function cellLeave(el){
 if(isDragging) return;
 hideTip();
}
function handleDown(e,el){
 // Fill handle clicked — grab this cell's colour+reason and start rect drag immediately
 e.preventDefault();
 e.stopPropagation();
 if(!emode) return;
 hideTip();
 const ek=el.dataset.k+'|'+el.dataset.sr+'|'+el.dataset.d+'|'+el.dataset.si;
 const saved=EDITS[ek];
 const s = saved ? saved.s : el.getAttribute('data-s');
 const r = saved ? saved.r : (el.getAttribute('data-r')||'');
 setActivePaint(s, r);
 startRectDrag(el);
 document.addEventListener('mousemove',onDragMove,{passive:true});
 document.addEventListener('mouseup',endDrag);
}
function cellDown(e,el){
 e.preventDefault();
 if(!emode){ setDay(parseInt(el.dataset.d)); return; }
 hideTip();
 pendingDragEl=el;
 pendingDragEvent=e;
 pendingStartX=e.clientX;
 pendingStartY=e.clientY;
 document.addEventListener('mousemove',onMaybeStartDrag,{passive:true});
 document.addEventListener('mouseup',onPendingCancel);
}
function onMaybeStartDrag(e){
 if(!pendingDragEl) return;
 const dx=e.clientX-pendingStartX, dy=e.clientY-pendingStartY;
 if(Math.abs(dx)<DRAG_THRESHOLD && Math.abs(dy)<DRAG_THRESHOLD) return; // not moved enough yet
 document.removeEventListener('mousemove',onMaybeStartDrag);
 document.removeEventListener('mouseup',onPendingCancel);
 const el=pendingDragEl;
 pendingDragEl=null; pendingDragEvent=null;
 // If no active paint brush, load the cell's own colour so drag paints with it
 if(!activePaintStatus){
 const ek=el.dataset.k+'|'+el.dataset.sr+'|'+el.dataset.d+'|'+el.dataset.si;
 const saved=EDITS[ek];
 const s = saved ? saved.s : el.getAttribute('data-s');
 const r = saved ? saved.r : (el.getAttribute('data-r')||'');
 setActivePaint(s||'A', r);
 }
 startRectDrag(el);
 document.addEventListener('mousemove',onDragMove,{passive:true});
 document.addEventListener('mouseup',endDrag);
}
function onPendingCancel(e){
 document.removeEventListener('mousemove',onMaybeStartDrag);
 document.removeEventListener('mouseup',onPendingCancel);
 if(pendingDragEl){
 const el=pendingDragEl, ev=pendingDragEvent;
 pendingDragEl=null; pendingDragEvent=null;
 // Plain click — open picker
 openPicker(ev,el);
 }
}
// Build ordered boat list from DOM once per drag session
let boatOrderCache=null;
function getBoatOrder(){
 if(boatOrderCache) return boatOrderCache;
 const seen=new Set(), order=[];
 document.querySelectorAll('td.cell').forEach(el=>{
 const k=el.dataset.k+'|'+el.dataset.sr;
 if(!seen.has(k)){ seen.add(k); order.push({dsKey:el.dataset.k, sr:parseInt(el.dataset.sr)}); }
 });
 boatOrderCache=order;
 return order;
}
function startRectDrag(anchorEl){
 isDragging=true;
 dragStatus=activePaintStatus;
 dragReason=activePaintReason;
 dragAnchorEl=anchorEl;
 boatOrderCache=null;
 // Build fast cell index and snapshot originals in one pass
 buildCellIndex();
 cellIndex.forEach((el,k)=>{
 const saved=EDITS[k];
 origStatus[k]={ s: saved?saved.s:el.getAttribute('data-s'), r: saved?saved.r:(el.getAttribute('data-r')||'') };
 });
 document.getElementById('module-fleet').classList.add('painting');
 closePicker();
 expandRect(anchorEl);
}
// Current set of visually-painted cells in the live rectangle
let liveRect=new Set(); // set of element keys currently painted
function onDragMove(e){
 if(!isDragging) return;
 let el=document.elementFromPoint(e.clientX,e.clientY);
 while(el && !el.classList.contains('cell')) el=el.parentElement;
 if(el && el.classList.contains('cell')) expandRect(el);
}
const SC=['sA','sM','sS','sP','sW','sN'];
function expandRect(curEl){
 if(!dragAnchorEl||!cellIndex) return;
 const bo=getBoatOrder();
 const aDay=parseInt(dragAnchorEl.dataset.d), cDay=parseInt(curEl.dataset.d);
 const aSi=parseInt(dragAnchorEl.dataset.si), cSi=parseInt(curEl.dataset.si);
 const aDsKey=dragAnchorEl.dataset.k, aSr=parseInt(dragAnchorEl.dataset.sr);
 const cDsKey=curEl.dataset.k, cSr=parseInt(curEl.dataset.sr);
 const minDay=Math.min(aDay,cDay), maxDay=Math.max(aDay,cDay);
 const aBoatIdx=bo.findIndex(b=>b.dsKey===aDsKey&&b.sr===aSr);
 const cBoatIdx=bo.findIndex(b=>b.dsKey===cDsKey&&b.sr===cSr);
 if(aBoatIdx<0||cBoatIdx<0||!bo.length) return;
 const minBI=Math.min(aBoatIdx,cBoatIdx), maxBI=Math.max(aBoatIdx,cBoatIdx);
 const samBoat=(aBoatIdx===cBoatIdx);
 const minSi=samBoat?Math.min(aSi,cSi):0;
 const maxSi=samBoat?Math.max(aSi,cSi):3;
 // Build new rect key set
 const newRect=new Set();
 for(let bi=minBI;bi<=maxBI;bi++){
 const boat=bo[bi];
 const siMin=(bi===minBI&&bi===maxBI)?minSi:0;
 const siMax=(bi===minBI&&bi===maxBI)?maxSi:3;
 for(let d=minDay;d<=maxDay;d++){
 for(let si=siMin;si<=siMax;si++){
 newRect.add(boat.dsKey+'|'+boat.sr+'|'+d+'|'+si);
 }
 }
 }
 // Restore cells that LEFT the rect — use index, no querySelectorAll
 liveRect.forEach(k=>{
 if(!newRect.has(k)){
 const el=cellIndex.get(k);
 if(el){
 el.classList.remove('drag-hi');
 el.style.opacity='';
 const orig=origStatus[k];
 if(orig){ SC.forEach(c=>el.classList.remove(c)); el.classList.add('s'+orig.s); }
 }
 }
 });
 // Paint cells entering the rect — use index
 newRect.forEach(k=>{
 if(!liveRect.has(k)){
 const el=cellIndex.get(k);
 if(el){
 SC.forEach(c=>el.classList.remove(c));
 el.classList.add('drag-hi','s'+dragStatus);
 el.style.opacity='0.75';
 }
 }
 });
 liveRect=newRect;
 document.getElementById('pb-count').textContent=liveRect.size+' cells selected';
}
function endDrag(){
 if(!isDragging) return;
 isDragging=false;
 dragAnchorEl=null;
 boatOrderCache=null;
 document.getElementById('module-fleet').classList.remove('painting');
 document.removeEventListener('mousemove',onDragMove);
 document.removeEventListener('mouseup',endDrag);
 // Commit every cell in liveRect with FULL colour + reason
 let n=0;
 document.querySelectorAll('td.cell.drag-hi').forEach(el=>{
 el.classList.remove('drag-hi');
 el.style.opacity='';
 el.style.boxShadow='';
 el.style.filter='';
 // Apply colour class permanently
 ['sA','sM','sS','sP','sW','sN'].forEach(c=>el.classList.remove(c));
 el.classList.add('s'+dragStatus);
 el.classList.add('edited');
 // Save to EDITS and update data attributes
 el.dataset.s=dragStatus;
 el.dataset.r=dragReason;
 const ek=el.dataset.k+'|'+el.dataset.sr+'|'+el.dataset.d+'|'+el.dataset.si;
 EDITS[ek]={s:dragStatus, r:dragReason};
 n++;
 });
 liveRect=new Set();
 // Clear origStatus cache
 Object.keys(origStatus).forEach(k=>delete origStatus[k]);
 if(n>0){
 renderKPI();
 document.getElementById('btn-save').style.display='block';
 document.title='* Fleet Availability Board';
 document.getElementById('pb-count').textContent='\u2713 '+n+' cells painted';
 setTimeout(()=>{ if(!activePaintStatus) document.getElementById('pb-count').textContent=''; },2500);
 // Live refresh analytics if overlay is open
 const ov=document.getElementById('analytics-overlay');
 if(ov&&ov.classList.contains('open')) renderAnalytics();
 }
}
// ── PAINT BRUSH HELPERS ───────────────────────────────
function applyStatusToCell(el,s,r){
 ['sA','sM','sS','sP','sW','sN'].forEach(c=>el.classList.remove(c));
 el.classList.add('s'+s);
 el.dataset.s=s;
 el.dataset.r=r;
 el.style.boxShadow='';
 el.style.filter='';
}
function commitCell(el,s,r){
 applyStatusToCell(el,s,r);
 el.classList.add('edited');
 EDITS[el.dataset.k+'|'+el.dataset.sr+'|'+el.dataset.d+'|'+el.dataset.si]={s,r};
 // Live refresh analytics if overlay is open
 const ov=document.getElementById('analytics-overlay');
 if(ov&&ov.classList.contains('open')) renderAnalytics();
}
function setActivePaint(s,r){
 activePaintStatus=s;
 activePaintReason=r||'';
 const col=SBG[s]||'#888';
 document.getElementById('pb-count').innerHTML=
 '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+col+';margin-right:5px;vertical-align:middle"></span>'+
 (SL[s]||s)+' active';
 document.getElementById('btn-edit').classList.add('edit-on');
 if(!emode) toggleEdit();
}
function clearActivePaint(){
 activePaintStatus=null;
 activePaintReason='';
 document.getElementById('pb-count').textContent='';
}
// ── SIDE PANEL ────────────────────────────────────────
function openPicker(e,el){
 pkTarget=el;
 // Read latest saved state from EDITS, fallback to data attributes
 const ek=el.dataset.k+'|'+el.dataset.sr+'|'+el.dataset.d+'|'+el.dataset.si;
 const saved=EDITS[ek];
 pkStatus=saved?saved.s:el.dataset.s;
 const reason=saved?saved.r:(el.dataset.r||'');
 const slot=SLOTS[el.dataset.si];
 document.getElementById('sp-boat').textContent=el.dataset.boat;
 document.getElementById('sp-meta').textContent='Day '+el.dataset.d+' \u00b7 '+el.dataset.m+' \u00b7 '+slot+'h';
 document.getElementById('sp-reason').value=reason;
 document.getElementById('sp-idle').style.display='none';
 document.getElementById('sp-options').style.display='block';
 document.getElementById('sp-footer').style.display='flex';
 ['A','M','S','P','W','N'].forEach(s=>{const el=document.getElementById('sp'+s);if(el)el.classList.toggle('active',s===pkStatus)});
 document.getElementById('side-panel').classList.add('open');
 document.body.classList.add('panel-open');
}
function pickStatus(s){
 pkStatus=s;
 ['A','M','S','P','W','N'].forEach(x=>{const el=document.getElementById('sp'+x);if(el)el.classList.toggle('active',x===s)});
 if(pkTarget){
 const r=document.getElementById('sp-reason').value.trim();
 applyStatusToCell(pkTarget,s,r);
 }
 // Keep active paint brush in sync so drag uses the same colour
 activePaintStatus=s;
 activePaintReason=(document.getElementById('sp-reason')?document.getElementById('sp-reason').value.trim():'');
}
function applyEdit(){
 if(!pkTarget) return;
 const reason=document.getElementById('sp-reason').value.trim();
 commitCell(pkTarget,pkStatus,reason);
 document.getElementById('btn-save').style.display='block';
 document.title='* Fleet Availability Board';
 renderKPI();
 const btn=document.querySelector('.sp-apply');
 btn.textContent='\u2713 Done!'; btn.style.background='#1a6e4a';
 setTimeout(()=>{ btn.textContent='\u2713 Apply colour'; btn.style.background=''; },800);
 // Keep panel open but go back to idle — user clicks next cell
 pkTarget=null;
 document.getElementById('sp-idle').style.display='block';
 document.getElementById('sp-options').style.display='none';
 document.getElementById('sp-footer').style.display='none';
 document.getElementById('sp-boat').textContent='\u2014';
 document.getElementById('sp-meta').textContent='Click another cell to edit';
}
function closePicker(){
 document.getElementById('side-panel').classList.remove('open');
 document.body.classList.remove('panel-open');
 pkTarget=null; pkStatus=null;
 document.getElementById('sp-idle').style.display='block';
 document.getElementById('sp-options').style.display='none';
 document.getElementById('sp-footer').style.display='none';
}
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){ closePicker(); clearActivePaint(); closeMonthPicker(); }
 if(e.key==='Enter'&&pkTarget){ e.preventDefault(); applyEdit(); }
});
document.addEventListener('click',e=>{
 const p=document.getElementById('month-picker');
 const t=document.getElementById('mtitle');
 if(p&&t&&!t.contains(e.target)&&!p.contains(e.target)) closeMonthPicker();
});
function loadAsBrush(){
 if(!pkStatus) return;
 const s=pkStatus;
 const r=document.getElementById('sp-reason').value.trim();
 closePicker();
 setActivePaint(s,r);
}
// ── EDIT MODE ─────────────────────────────────────────
function toggleEdit(){
 emode=!emode;
 // Target #module-fleet when embedded in dashboard, fallback to body for standalone
 const root=document.getElementById('module-fleet')||document.body;
 root.classList.toggle('emode',emode);
 root.classList.remove('painting');
 const btn=document.getElementById('btn-edit');
 btn.classList.toggle('edit-on',emode);
 btn.textContent=emode?'✕ Exit Edit Mode':'✎ Edit Mode';
 const chip=document.getElementById('edit-chip'); if(chip) chip.classList.toggle('on',emode);
 if(!emode){ closePicker(); clearActivePaint(); }
}
// ── SAVE / EXPORT ─────────────────────────────────────
function saveAll(){
 // Commit edits into D (day-level, using slot 1 as canonical for summary)
 Object.entries(EDITS).forEach(([ek,{s,r}])=>{
 const [dsKey,srStr,dayStr,slotStr]=ek.split('|');
 const ds=D[dsKey]; if(!ds) return;
 const boat=ds.boats.find(b=>b.sr===parseInt(srStr)); if(!boat) return;
 let day=boat.days.find(d=>d.d===parseInt(dayStr));
 if(!day){ day={d:parseInt(dayStr),s:'N',r:''}; boat.days.push(day); }
 if(parseInt(slotStr)===1){ day.s=s; day.r=r; }
 });
 document.querySelectorAll('.cell.edited').forEach(el=>el.classList.remove('edited'));
 document.getElementById('btn-save').style.display='none';
 document.title='Fleet Availability Board';
 const b=document.getElementById('btn-save');
 b.style.display='block'; b.textContent='✓ Saved!'; b.style.color='#5bc4a8';
 if(typeof driveSave==='function') driveSave();
 setTimeout(()=>{ b.style.display='none'; b.textContent='✓ Save changes'; b.style.color=''; },2000);
 // Refresh analytics if overlay is open
 const ov=document.getElementById('analytics-overlay');
 if(ov && ov.classList.contains('open')) renderAnalytics();
}
function exportJSON(){
 const blob=new Blob([JSON.stringify(D,null,2)],{type:'application/json'});
 const a=document.createElement('a');
 a.href=URL.createObjectURL(blob);
 a.download='fleet_'+new Date().toISOString().slice(0,10)+'.json';
 a.click();
}
// ── TOOLTIP ───────────────────────────────────────────
function showTip(e,el){
 const s=el.dataset.s, r=el.dataset.r||'', slot=SLOTS[el.dataset.si];
 const d=el.dataset.d, m=el.dataset.m, y=el.dataset.y;
 document.getElementById('tt-b').textContent=el.dataset.boat;
 document.getElementById('tt-d').textContent=DOW[dow(m,parseInt(y),parseInt(d))]+', '+d+' '+m+' '+y+' · '+slot+'h';
 document.getElementById('tt-s').textContent=SL[s]||s;
 document.getElementById('tt-s').style.cssText='background:'+SBG[s]+';color:'+SFG[s];
 document.getElementById('tt-r').textContent=(r&&r!==SL[s])?r:'';
 document.getElementById('tt-h').style.display=emode?'block':'none';
 const t=document.getElementById('tip'); t.style.display='block'; positionTip(e);
}
function positionTip(e){
 const t=document.getElementById('tip');
 let x=e.clientX+14,y=e.clientY+14;
 if(x+300>window.innerWidth) x=e.clientX-304;
 if(y+120>window.innerHeight) y=e.clientY-124;
 t.style.left=x+'px'; t.style.top=y+'px';
}
document.addEventListener('mousemove',e=>{ if(document.getElementById('tip').style.display==='block') positionTip(e); });
function hideTip(){ document.getElementById('tip').style.display='none'; }
// ── NAV ───────────────────────────────────────────────
function setDay(d){ selDay=d; renderKPI(); renderTable(); }
function shiftDay(dir){ const days=getDS()[0]?.days||31; selDay=Math.max(1,Math.min(days,selDay+dir)); setDay(selDay); }
function jumpToday(){
 const n=new Date(), m=n.toLocaleString('en',{month:'short'}), y=n.getFullYear(), nmk=m+'_'+y;
 const f=fleet==='ALL'?'SCB':fleet;
 if(D[f+'_'+nmk]){ mk=nmk; selDay=n.getDate(); document.getElementById('msel').value=nmk; render(); }
}
function setFleet(f){
 fleet=f;
 document.getElementById('btn-scb').className='ln-btn'+(f==='SCB'?' active-scb':'');
 document.getElementById('btn-sgs').className='ln-btn'+(f==='SGS'?' active-sgs':'');
 document.getElementById('btn-all').className='ln-btn'+(f==='ALL'?' active-all':'');
 render();
}
function onMonthChange(v){ mk=v; selDay=1; closeMonthPicker(); render(); }
function buildDD(){
 document.getElementById('msel').innerHTML=MO.map(m=>
 `<option value="${m}" ${m===mk?'selected':''}>${ML[m]||m}</option>`).join('');
 // Also update inline month picker
 const picker=document.getElementById('month-picker');
 if(picker){
 picker.innerHTML=MO.map(m=>{
 const _p=m.split('_'); const lbl=_p[0].slice(0,3)+(_p[1]||'').slice(2);
 return `<div onclick="onMonthChange('${m}')" style="padding:7px 14px;font-size:12px;cursor:pointer;color:${m===mk?'#5bc4a8':'#c5cde8'};font-weight:${m===mk?'700':'400'};white-space:nowrap" onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background=''"> ${lbl}</div>`;
 }).join('');
 }
}
function toggleMonthPicker(){
 const p=document.getElementById('month-picker'); if(!p) return;
 const open=p.style.display==='none';
 p.style.display=open?'block':'none';
 const arr=document.getElementById('mtitle-arrow');
 if(arr) arr.style.transform=open?'rotate(180deg)':'';
}
function closeMonthPicker(){
 const p=document.getElementById('month-picker'); if(p) p.style.display='none';
 const arr=document.getElementById('mtitle-arrow'); if(arr) arr.style.transform='';
}
function render(){ buildDD(); renderKPI(); renderTable(); }


// ── ANALYTICS ──────────────────────────────────────────────────────────────
let anFleet = null;
let anMK = null;
function openAnalytics(fl){
 anFleet = fl;
 anMK = mk; // default to current month
 document.getElementById('an-title').textContent = (fl==='SCB'?'SeaCabbie':'SG Shipping') + ' — Fleet Analytics';
 const chip = document.getElementById('an-fleet-chip');
 chip.textContent = fl==='SCB'?'SeaCabbie':'SG Shipping';
 chip.className = 'an-fleet' + (fl==='SGS'?' sgs':'');
 document.getElementById('analytics-overlay').classList.add('open');
 renderAnalytics();
}
function closeAnalytics(){
 document.getElementById('analytics-overlay').classList.remove('open');
 // destroy chart instances
 if(window._anCharts){ window._anCharts.forEach(ch=>ch.destroy()); window._anCharts=[]; }
}
function renderAnalytics(){
 if(window._anCharts){ window._anCharts.forEach(ch=>ch.destroy()); }
 window._anCharts = [];
 const months = MO.filter(m=>{
 const key = anFleet+'_'+m.replace('_',' ').split(' ')[0]+'_'+m.split('_')[1];
 // keys like SCB_Aug_2025
 return Object.keys(D).some(k=>k.startsWith(anFleet+'_') && k.includes(m.replace('_2025','_2025').replace('_2026','_2026')));
 });
 // Build per-month breakdown data for ALL months for this fleet
 const monthData = {}; // mk -> {boats:[{name,avail,M,S,P,W,D,total}], totals:{M,S,P,W,D,avail,total}}
 MO.forEach(m=>{
 const dsKey = anFleet+'_'+m;
 const ds = D[dsKey];
 if(!ds) return;
 const boats = ds.boats.map(b=>{
 const cnt={A:0,M:0,S:0,P:0,W:0,N:0};
 b.days.forEach(d=>{
 // Overlay live EDITS (slot 1 = canonical) on top of saved D data
 const ekAny=[0,1,2,3].map(si=>dsKey+'|'+b.sr+'|'+d.d+'|'+si).find(k=>EDITS[k]);
 const s=(ekAny&&EDITS[ekAny]?EDITS[ekAny].s:d.s)||'N';
 cnt[s]=(cnt[s]||0)+1;
 });
 const total = cnt.A+cnt.M+cnt.S+cnt.P+cnt.W; // exclude N
 return {name:b.name, avail:cnt.A, M:cnt.M, S:cnt.S, P:cnt.P, W:cnt.W, total};
 });
 const tot={A:0,M:0,S:0,P:0,W:0};
 boats.forEach(b=>{tot.A+=b.avail;tot.M+=b.M;tot.S+=b.S;tot.P+=b.P;tot.W+=b.W;});
 const grandDown=tot.M+tot.S+tot.P+tot.W;
 monthData[m]={boats, totals:tot, grandDown, grandTotal:tot.A+grandDown};
 });
 // All-time combined
 let allM=0,allS=0,allP=0,allW=0,allA=0;
 Object.values(monthData).forEach(md=>{
 allM+=md.totals.M; allS+=md.totals.S; allP+=md.totals.P;
 allW+=md.totals.W; allA+=md.totals.A;
 });
 const allDown=allM+allS+allP+allW;
 const allTotal=allA+allDown;
 const overallAvailPct=allTotal>0?Math.round(100*allA/allTotal):0;
 // Per-month avail%
 const monthAvailPct = MO.map(m=>{
 const md=monthData[m]; if(!md||md.grandTotal===0) return null;
 const _mp=m.split('_'); return {m: _mp[0].slice(0,3)+(_mp[1]||'').slice(2), pct: Math.round(100*md.totals.A/md.grandTotal)};
 }).filter(Boolean);
 // Best/worst boats across all months
 const boatStats={};
 Object.values(monthData).forEach(md=>{
 md.boats.forEach(b=>{
 if(!boatStats[b.name]) boatStats[b.name]={a:0,tot:0,M:0,S:0,P:0,W:0};
 boatStats[b.name].a+=b.avail; boatStats[b.name].tot+=b.total;
 boatStats[b.name].M+=b.M; boatStats[b.name].S+=b.S;
 boatStats[b.name].P+=b.P; boatStats[b.name].W+=b.W;
 });
 });
 const boatList = Object.entries(boatStats)
 .filter(([,v])=>v.tot>0) // insights only for boats with actual data
 .map(([n,v])=>({name:n, pct:Math.round(100*v.a/v.tot), ...v}))
 .sort((a,b)=>b.pct-a.pct);
 // Separately track boats that appear in the fleet but have zero data across all months
 const noDataBoats = Object.entries(boatStats).filter(([,v])=>v.tot===0).map(([n])=>n);
 if(noDataBoats.length) insights.push(`No data recorded for: <strong style="color:#5a6278">${noDataBoats.join(', ')}</strong> — cells may not have been filled in yet`);
 const bestBoat = boatList[0];
 const worstBoat = boatList[boatList.length-1];
 const mostM = [...boatList].sort((a,b)=>b.M-a.M)[0];
 // Generate insights
 const insights=[];
 insights.push(`Overall fleet availability across all months: <strong style="color:#92D050">${overallAvailPct}%</strong>`);
 if(bestBoat) insights.push(`Best performing boat: <strong style="color:#5bc4a8">${bestBoat.name}</strong> at ${bestBoat.pct}% availability`);
 if(worstBoat && worstBoat.pct < 80) insights.push(`Most challenged boat: <strong style="color:#FF5555">${worstBoat.name}</strong> — only ${worstBoat.pct}% availability across the period`);
 if(mostM) insights.push(`Highest machinery downtime: <strong style="color:#FF8888">${mostM.name}</strong> (${mostM.M} days affected by engine/mechanical issues)`);
 const topCat = [
 {k:'M',v:allM,label:'Machinery issues'},
 {k:'S',v:allS,label:'Structural damage'},
 {k:'P',v:allP,label:'Propeller damage'},
 {k:'W',v:allW,label:'Payment delays'},
 ].sort((a,b)=>b.v-a.v)[0];
 if(topCat&&topCat.v>0) insights.push(`Dominant downtime cause: <strong style="color:#FFB84D">${topCat.label}</strong> — ${topCat.v} incident-days (${allDown>0?Math.round(100*topCat.v/allDown):0}% of all downtime)`);
 // Month trend
 const lastTwo = monthAvailPct.slice(-2);
 if(lastTwo.length===2){
 const diff = lastTwo[1].pct - lastTwo[0].pct;
 if(diff>0) insights.push(`Availability improving: up ${diff}pp from ${lastTwo[0].m} → ${lastTwo[1].m}`);
 else if(diff<0) insights.push(`Availability declining: down ${Math.abs(diff)}pp from ${lastTwo[0].m} → ${lastTwo[1].m} — requires attention`);
 }
 // Selected month for boat bars
 const selMD = monthData[anMK]||Object.values(monthData)[0];
 const selML = anMK ? anMK.split('_')[0].slice(0,3)+(anMK.split('_')[1]||'').slice(2) : '';
 // HTML
 const isScb = anFleet==='SCB';
 const accentCol = isScb?'#5bc4a8':'#a0b0ff';
 const accentBg = isScb?'rgba(91,196,168,.18)':'rgba(100,130,240,.18)';
 document.getElementById('an-body').innerHTML = `
 <!-- KPI strip -->
 <div class="an-kpi-row">
 <div class="an-kpi green">
 <div class="an-kpi-val">${overallAvailPct}%</div>
 <div class="an-kpi-lbl">Overall Availability</div>
 <div class="an-kpi-sub">All months combined</div>
 </div>
 <div class="an-kpi red">
 <div class="an-kpi-val">${allDown}</div>
 <div class="an-kpi-lbl">Total Down-Days</div>
 <div class="an-kpi-sub">Excl. no-data periods</div>
 </div>
 <div class="an-kpi orange">
 <div class="an-kpi-val">${allM}</div>
 <div class="an-kpi-lbl">Machinery Days</div>
 <div class="an-kpi-sub">Biggest downtime cause</div>
 </div>
 <div class="an-kpi blue">
 <div class="an-kpi-val">${Object.keys(monthData).length}</div>
 <div class="an-kpi-lbl">Months Tracked</div>
 <div class="an-kpi-sub">${anFleet==='SCB'?11:12} boats in fleet</div>
 </div>
 </div>
 <!-- Monthly availability trend -->
 <div class="an-section">
 <div class="an-section-title">Monthly Availability Trend</div>
 <div class="an-card">
 <div class="an-card-title"><span style="display:inline-block;background:rgba(91,196,168,.15);border:1px solid rgba(91,196,168,.35);color:#ffffff;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700;letter-spacing:.03em">Monthly Trend</span></div>
 <div class="an-chart-wrap" style="height:220px">
 <canvas id="an-trend-chart"></canvas>
 </div>
 </div>
 </div>
 <!-- Per-boat bars + pie -->
 <div class="an-section">
 <div class="an-section-title">Fleet Breakdown Cause Analysis</div>
 <div class="an-month-tabs" id="an-month-tabs"></div>
 <div class="an-grid">
 <div class="an-card">
 <div class="an-card-title"><span style="display:inline-block;background:rgba(91,196,168,.15);border:1px solid rgba(91,196,168,.35);color:#ffffff;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700">Availability per Boat</span> <span style="display:inline-block;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);color:#c5cde8;border-radius:20px;padding:3px 10px;font-size:11px" id="an-sel-month-lbl">${selML}</span></div>
 <div id="an-boat-bars"></div>
 </div>
 <div class="an-card">
 <div class="an-card-title"><span style="display:inline-block;background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.3);color:#ffffff;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700">Downtime Breakdown</span> <span style="display:inline-block;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);color:#8892b8;border-radius:20px;padding:3px 10px;font-size:11px">All Months</span></div>
 <div class="an-chart-wrap" style="height:240px">
 <canvas id="an-pie-chart"></canvas>
 </div>
 <div id="an-pie-legend" style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px"></div>
 </div>
 </div>
 </div>
 <!-- Insights -->
 <div class="an-section an-insights">
 <div class="an-section-title">Key Insights</div>
 <ul class="an-insight-list">
 ${insights.map(i=>`<li>${i}</li>`).join('')}
 </ul>
 </div>
 `;
 // Build month tabs
 const tabsEl = document.getElementById('an-month-tabs');
 MO.forEach(m=>{
 if(!monthData[m]) return;
 const btn=document.createElement('button');
 btn.className='an-mtab'+(m===anMK?' '+(isScb?'active-scb':'active-sgs'):'');
 const _p=m.split('_'); btn.textContent=_p[0].slice(0,3)+(_p[1]||'').slice(2);
 btn.onclick=()=>{ anMK=m; renderBoatBars(monthData[m],isScb);
 document.getElementById('an-sel-month-lbl').textContent=m.split('_')[0].slice(0,3)+(m.split('_')[1]||'').slice(2);
 tabsEl.querySelectorAll('.an-mtab').forEach(b=>b.className='an-mtab');
 btn.className='an-mtab '+(isScb?'active-scb':'active-sgs');
 };
 tabsEl.appendChild(btn);
 });
 // Boat bars
 renderBoatBars(selMD, isScb);
 // Trend chart (Chart.js)
 setTimeout(()=>{
 if(!window.Chart){ loadChartJS(()=>{ drawTrendChart(monthAvailPct,accentCol); drawPieChart({M:allM,S:allS,P:allP,W:allW},allDown); }); }
 else { drawTrendChart(monthAvailPct,accentCol); drawPieChart({M:allM,S:allS,P:allP,W:allW},allDown); }
 }, 50);
}
function renderBoatBars(md, isScb){
 if(!md) return;
 const el=document.getElementById('an-boat-bars');
 if(!el) return;
 // Include ALL boats in original fleet order (preserves Vayu1 → Vayu2 sequence)
 const boats=[...md.boats]; // no filter, no sort — keep exact order from data
 if(!boats.length){ el.innerHTML='<p style="color:#5a6278;text-align:center;padding:20px">No data</p>'; return; }
 const maxDays=Math.max(...boats.map(b=>b.total),1); // guard against all-zero case
 const BAR_W=42,GAP=14,PAD_L=34,PAD_R=12,PAD_T=18,PAD_B=58,CHART_H=200;
 const totalW=PAD_L+boats.length*(BAR_W+GAP)-GAP+PAD_R;
 const yS=function(v){return CHART_H-(v/maxDays)*CHART_H;};
 const gridLines=[0,0.25,0.5,0.75,1].map(function(frac){
 const days=Math.round(maxDays*frac),y=PAD_T+yS(days);
 return '<line x1="'+PAD_L+'" x2="'+(totalW-PAD_R)+'" y1="'+y+'" y2="'+y+'" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>'+
 '<text x="'+(PAD_L-6)+'" y="'+(y+3.5)+'" fill="#3a4468" font-size="8.5" text-anchor="end">'+days+'</text>';
 }).join('');
 const SEGS=[
 {k:'avail',c:'#92D050'},{k:'M',c:'#FF0000'},{k:'S',c:'#4472C4'},{k:'P',c:'#FF66FF'},{k:'W',c:'#ED7D31'},
 ];
 const bars=boats.map(function(b,i){
 const bx=PAD_L+i*(BAR_W+GAP);
 const nx=bx+BAR_W/2, ny=PAD_T+CHART_H+14;
 // No-data boat: show empty bar with dashed outline and '—' label
 if(b.total===0){
 return '<g>'+
 '<rect x="'+bx+'" y="'+(PAD_T+CHART_H-4)+'" width="'+BAR_W+'" height="4" fill="rgba(255,255,255,0.06)" rx="1"/>'+
 '<text x="'+nx+'" y="'+(PAD_T+CHART_H-8)+'" fill="#3a4468" font-size="9" text-anchor="middle">—</text>'+
 '<text x="'+nx+'" y="'+ny+'" fill="#4a5478" font-size="9" text-anchor="middle" transform="rotate(-38,'+nx+','+ny+')">'+b.name+'</text>'+
 '</g>';
 }
 let sy=CHART_H;
 const segs=SEGS.filter(function(s){return (b[s.k]||0)>0;}).map(function(s){
 const h=(b[s.k]/maxDays)*CHART_H; sy-=h;
 return '<rect x="'+bx+'" y="'+(PAD_T+sy)+'" width="'+BAR_W+'" height="'+h+'" fill="'+s.c+'"/>';
 }).join('');
 const totalH=(b.total/maxDays)*CHART_H;
 const topY=PAD_T+CHART_H-totalH;
 const pct=Math.round(100*b.avail/b.total);
 const lc=pct>=80?'#7ED321':pct>=60?'#FF8C00':'#FF4444';
 return '<g>'+segs+
 '<rect x="'+bx+'" y="'+topY+'" width="'+BAR_W+'" height="2.5" fill="'+lc+'" rx="1.5"/>'+
 '<text x="'+nx+'" y="'+(topY-6)+'" fill="'+lc+'" font-size="9" text-anchor="middle" font-weight="700">'+pct+'%</text>'+
 '<text x="'+nx+'" y="'+ny+'" fill="#6a7498" font-size="9" text-anchor="middle" transform="rotate(-38,'+nx+','+ny+')">'+b.name+'</text>'+
 '</g>';
 }).join('');
 const legendItems=[
 {c:'#92D050',l:'Available'},{c:'#FF0000',l:'Machinery Issues'},
 {c:'#4472C4',l:'Structural Damage'},{c:'#FF66FF',l:'Propeller Damage'},{c:'#ED7D31',l:'Payment Delays'},
 ];
 const legend=legendItems.map(function(x){
 return '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:#6a7498">'+
 '<div style="width:9px;height:9px;border-radius:2px;background:'+x.c+'"></div>'+x.l+'</div>';
 }).join('');
 el.innerHTML=
 '<div style="overflow-x:auto">'+
 '<svg width="'+totalW+'" height="'+(PAD_T+CHART_H+PAD_B)+'" style="display:block">'+
 '<defs><linearGradient id="gbg" x1="0" y1="0" x2="0" y2="1">'+
 '<stop offset="0%" stop-color="rgba(255,255,255,0.04)"/>'+
 '<stop offset="100%" stop-color="rgba(0,0,0,0)"/></linearGradient></defs>'+
 '<rect x="'+PAD_L+'" y="'+PAD_T+'" width="'+(totalW-PAD_L-PAD_R)+'" height="'+CHART_H+'" fill="url(#gbg)" rx="2"/>'+
 gridLines+bars+
 '<line x1="'+PAD_L+'" x2="'+(totalW-PAD_R)+'" y1="'+(PAD_T+CHART_H)+'" y2="'+(PAD_T+CHART_H)+'" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>'+
 '</svg></div>'+
 '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;padding:0 2px">'+legend+'</div>';
}
function loadChartJS(cb){
 const s=document.createElement('script');
 s.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
 s.onload=cb; document.head.appendChild(s);
}
function drawTrendChart(data, accentCol){
 const ctx=document.getElementById('an-trend-chart');
 if(!ctx||!window.Chart) return;
 const ch=new Chart(ctx,{
 type:'bar',
 data:{
 labels:data.map(d=>d.m),
 datasets:[{
 label:'Availability %',
 data:data.map(d=>d.pct),
 backgroundColor:data.map(d=>d.pct>=80?'rgba(146,208,80,.75)':d.pct>=60?'rgba(255,140,0,.75)':'rgba(255,80,80,.75)'),
 borderColor:data.map(d=>d.pct>=80?'#92D050':d.pct>=60?'#FF8C00':'#FF5050'),
 borderWidth:1.5,borderRadius:4
 }]
 },
 options:{
 responsive:true,maintainAspectRatio:false,
 plugins:{legend:{display:false},
 tooltip:{callbacks:{label:ctx=>`${ctx.raw}% available`}}},
 scales:{
 y:{min:0,max:100,
 ticks:{color:'#8892b8',font:{size:10},callback:v=>v+'%'},
 grid:{color:'rgba(255,255,255,.04)'},
 border:{color:'transparent'}},
 x:{ticks:{color:'#8892b8',font:{size:10}},
 grid:{display:false},border:{color:'transparent'}}
 }
 }
 });
 window._anCharts.push(ch);
}
function drawPieChart(cats, total){
 const ctx=document.getElementById('an-pie-chart');
 if(!ctx||!window.Chart) return;
 if(total===0){
 ctx.parentElement.innerHTML='<p style="color:#5a6278;text-align:center;padding:40px 0">No downtime recorded</p>';
 return;
 }
 const labels=['Machinery Issues','Structural Damage','Propeller Damage','Payment Delays'];
 const vals=[cats.M,cats.S,cats.P,cats.W];
 const colors=['#FF0000','#4472C4','#FF66FF','#ED7D31'];
 const filtered = labels.map((l,i)=>({l,v:vals[i],c:colors[i]})).filter(x=>x.v>0);
 const ch=new Chart(ctx,{
 type:'doughnut',
 data:{
 labels:filtered.map(x=>x.l),
 datasets:[{data:filtered.map(x=>x.v),
 backgroundColor:filtered.map(x=>x.c),
 borderColor:'#1a2340',borderWidth:2,hoverOffset:6}]
 },
 options:{
 responsive:true,maintainAspectRatio:false,
 plugins:{
 legend:{display:false},
 tooltip:{callbacks:{label:ctx=>{
 const pct=Math.round(100*ctx.raw/total);
 return ` ${ctx.label}: ${ctx.raw} days (${pct}%)`;
 }}}
 },
 cutout:'60%'
 }
 });
 window._anCharts.push(ch);
 // custom legend
 const leg=document.getElementById('an-pie-legend');
 if(leg){
 leg.innerHTML=filtered.map(x=>{
 const pct=Math.round(100*x.v/total);
 return `<div class="an-bar-legend-item">
 <div class="an-bar-legend-dot" style="background:${x.c}"></div>
 <span>${x.l}: ${pct}%</span></div>`;
 }).join('');
 }
}
// ── END ANALYTICS ─────────────────────────────────────────────────────────

// Expose to window
window.cellDown=cellDown;
window.handleDown=handleDown;
window.cellEnter=cellEnter;
window.cellLeave=cellLeave;
window.toggleEdit=toggleEdit;
window.render=render;
window.renderKPI=renderKPI;
window.renderTable=renderTable;
window.buildDD=buildDD;
window.setFleet=setFleet;
window.setDay=setDay;
window.shiftDay=shiftDay;
window.jumpToday=jumpToday;
window.onMonthChange=onMonthChange;
window.saveAll=saveAll;
window.exportJSON=exportJSON;
window.showTip=showTip;
window.hideTip=hideTip;
window.positionTip=positionTip;
window.applyEdit=applyEdit;
window.loadAsBrush=loadAsBrush;
window.setActivePaint=setActivePaint;
window.clearActivePaint=clearActivePaint;
window.openAnalytics=openAnalytics;
window.closeAnalytics=closeAnalytics;
window.renderAnalytics=renderAnalytics;
window.renderBoatBars=renderBoatBars;
window.toggleMonthPicker=toggleMonthPicker;
window.closeMonthPicker=closeMonthPicker;
// Undo
var _undoStack=[];
window.undoLast=function(){
 if(!_undoStack.length){
 var b=document.getElementById('sp-undo');
 if(b){b.textContent='Nothing to undo';setTimeout(function(){b.textContent='Undo last';},1200);}
 return;
 }
 var en=_undoStack.pop(),el=en.el; if(!el)return;
 ['sA','sM','sS','sP','sW','sN'].forEach(function(x){el.classList.remove(x);});
 el.classList.add('s'+en.oldS); el.dataset.s=en.oldS; el.dataset.r=en.oldR;
 el.classList.remove('edited');
 var ek=el.dataset.k+'|'+el.dataset.sr+'|'+el.dataset.d+'|'+el.dataset.si;
 if(en.wasEdited){EDITS[ek]={s:en.oldS,r:en.oldR};}else{delete EDITS[ek];}
 if(typeof renderKPI==='function')renderKPI();
 var b=document.getElementById('sp-undo');
 if(b){b.textContent='Undone!';setTimeout(function(){b.textContent='Undo last';},1000);}
};
window.commitCell=commitCell=function(el,s,r){
 var ek=el.dataset.k+'|'+el.dataset.sr+'|'+el.dataset.d+'|'+el.dataset.si;
 _undoStack.push({el:el,oldS:el.dataset.s||'N',oldR:el.dataset.r||'',wasEdited:el.classList.contains('edited')});
 if(_undoStack.length>50)_undoStack.shift();
 applyStatusToCell(el,s,r); el.classList.add('edited'); EDITS[ek]={s:s,r:r};
 var ov=document.getElementById('analytics-overlay');
 if(ov&&ov.classList.contains('open')) renderAnalytics();
};
// Drag + localStorage for popup position
(function(){
 var K='fleet_popup_pos',_e=null,_ox=0,_oy=0;
 function sv(l,t){try{localStorage.setItem(K,JSON.stringify({left:l,top:t}));}catch(e){}}
 function ld(){try{var s=localStorage.getItem(K);return s?JSON.parse(s):null;}catch(e){return null;}}
 window._positionPopup=function(dl,dt){
 var p=document.getElementById('side-panel'); if(!p)return;
 var s=ld(); p.style.left=(s?s.left:dl)+'px'; p.style.top=(s?s.top:dt)+'px';
 };
 document.addEventListener('mousedown',function(e){
 var h=e.target.closest&&e.target.closest('.sp-head'); if(!h)return;
 var p=document.getElementById('side-panel'); if(!p)return;
 _e=p; var r=p.getBoundingClientRect(); _ox=e.clientX-r.left; _oy=e.clientY-r.top; e.preventDefault();
 });
 document.addEventListener('mousemove',function(e){
 if(!_e)return;
 var l=Math.max(0,Math.min(e.clientX-_ox,window.innerWidth-_e.offsetWidth));
 var t=Math.max(0,Math.min(e.clientY-_oy,window.innerHeight-_e.offsetHeight));
 _e.style.left=l+'px'; _e.style.top=t+'px';
 });
 document.addEventListener('mouseup',function(){
 if(!_e)return; sv(parseInt(_e.style.left),parseInt(_e.style.top)); _e=null;
 });
})();
// Wrappers so attribute handlers always hit the IIFE implementations
window.pickStatus=function(s){pickStatus(s);};
window.openPicker=function(e,el){openPicker(e,el);};
window.closePicker=function(){closePicker();};
// init -- called once when Fleet tab is first opened
window.initFleetModule=async function(){
 if(window._fbInited)return; window._fbInited=true;
 try{
 await loadFleetData();
 var now=new Date();
 var mm=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 var key=mm[now.getMonth()]+'_'+now.getFullYear();
 if(D['SCB_'+key]){mk=key; selDay=now.getDate();}
 else{mk='Mar_2026'; selDay=19;}
 if(typeof render==='function')render();
 if(typeof driveAutoLoad==='function') driveAutoLoad();
 }catch(err){console.error('Fleet init:',err);}
};
})();
// -- GDRIVE SYNC --
// ── NIRIX FLEET BOARD — PHP / Google Drive Sync ──────────────────────────────
// Calls PHP service-account scripts to save/load fleet data to Google Drive.
// No OAuth, no popup — credentials stay on the server.
// ─────────────────────────────────────────────────────────────────────────────
const SAVE_PATH = '/api/fleet-save.php';
const LOAD_PATH = '/api/fleet-load.php';
// ── SAVE ─────────────────────────────────────────────────────────────────────
async function driveSave() {
 _showSyncStatus('Saving to Drive…', 'busy');
 try {
 const res = await fetch(SAVE_PATH, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json'
 },
 body: JSON.stringify(window.D || D)
 });
 const data = await res.json();
 if (data.ok) {
 _showSyncStatus('✓ Saved to Drive', 'ok');
 } else {
 _showSyncStatus('Save failed: ' + (data.error || res.status), 'error');
 }
 } catch (e) {
 _showSyncStatus('Save error: ' + e.message, 'error');
 console.error('driveSave error:', e);
 }
}
// ── LOAD ─────────────────────────────────────────────────────────────────────
async function driveLoad() {
 _showSyncStatus('Loading from Drive…', 'busy');
 try {
 const res = await fetch(LOAD_PATH, {
 method: 'GET',
 headers: {}
 });
 if (res.status === 404) {
 _showSyncStatus('No saved data yet', 'warn');
 return;
 }
 const data = await res.json();
 if (data.ok && data.data) {
 // Merge loaded data into D
 const _D = window.D || D;
 Object.assign(_D, data.data);
 if (window.D) window.D = _D;
 // Re-render board with loaded data
 if (typeof render === 'function') render();
 _showSyncStatus('✓ Loaded from Drive', 'ok');
 } else {
 _showSyncStatus('Load failed: ' + (data.error || 'unknown'), 'error');
 }
 } catch (e) {
 _showSyncStatus('Load error: ' + e.message, 'error');
 console.error('driveLoad error:', e);
 }
}
// ── UI STATUS ─────────────────────────────────────────────────────────────────
function _showSyncStatus(msg, type) {
 const el = document.getElementById('gdrive-status');
 if (!el) return;
 const colors = { ok: '#5bc4a8', error: '#FF5555', warn: '#FF8C00', busy: '#8892b8' };
 el.textContent = msg;
 el.style.color = colors[type] || '#8892b8';
 el.style.opacity = '1';
 if (type === 'ok') {
 setTimeout(() => { el.style.opacity = '0'; }, 3000);
 }
}
// ── AUTO-LOAD on fleet module init ────────────────────────────────────────────
// Called once when the Fleet tab is first opened
function driveAutoLoad() {
 // Small delay so the board renders first, then overlays saved data
 setTimeout(driveLoad, 800);
}
// Expose to window
window.driveSave = driveSave;
window.driveLoad = driveLoad;
window.driveAutoLoad = driveAutoLoad;