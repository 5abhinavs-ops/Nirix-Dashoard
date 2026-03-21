"""
apply_all_fixes.py
Applies ALL pending fixes to fleet_board.html in one safe shot:
1. Remove Down (D) category entirely
2. Fix toggleEdit null guard for edit-chip
3. Fix pickStatus to sync activePaintStatus (drag colour fix)
4. Correct status colours: Structural=blue, Propeller=pink, Payment=orange
5. Correct label names everywhere
6. Replace horizontal bars with vertical stacked SVG bar chart
7. Remove duplicate static legend from analytics card
Run: python apply_all_fixes.py
Then: python build.py && git add index.html fleet_board.html && git commit -m "All fixes applied" && git push origin main
"""
import re

content = open('fleet_board.html', encoding='utf-8').read()
original_size = len(content)
print(f'Read fleet_board.html: {original_size} chars')

# ── 1. REMOVE DOWN (D) CATEGORY ─────────────────────────────────────────────
content = content.replace('.sD{background:#e05050}', '')
content = re.sub(r'\s*<div class="leg">.*?e05050.*?Down.*?</div>', '', content)
content = re.sub(r"D:'Down',?\s*", '', content)
content = re.sub(r"D:'#e05050',?\s*", '', content)
content = re.sub(r"D:'#fff',?\s*", '', content)
content = re.sub(r"'sD',?\s*", '', content)
content = content.replace('"s":"D"', '"s":"M"')
content = re.sub(r'\{A:0,M:0,S:0,P:0,W:0,D:0,N:0\}', '{A:0,M:0,S:0,P:0,W:0,N:0}', content)
content = re.sub(r'\{A:0,M:0,S:0,P:0,W:0,D:0\}', '{A:0,M:0,S:0,P:0,W:0}', content)
content = content.replace('cnt.A+cnt.M+cnt.S+cnt.P+cnt.W+cnt.D', 'cnt.A+cnt.M+cnt.S+cnt.P+cnt.W')
content = re.sub(r'avail:cnt\.A, M:cnt\.M, S:cnt\.S, P:cnt\.P, W:cnt\.W, D:cnt\.D, total',
                 'avail:cnt.A, M:cnt.M, S:cnt.S, P:cnt.P, W:cnt.W, total', content)
content = content.replace('tot.M+=b.M;tot.S+=b.S;tot.P+=b.P;tot.W+=b.W;tot.D+=b.D;',
                          'tot.M+=b.M;tot.S+=b.S;tot.P+=b.P;tot.W+=b.W;')
content = content.replace('tot.M+tot.S+tot.P+tot.W+tot.D', 'tot.M+tot.S+tot.P+tot.W')
content = re.sub(r'allM=0,allS=0,allP=0,allW=0,allD=0,allA=0', 'allM=0,allS=0,allP=0,allW=0,allA=0', content)
content = content.replace('allW+=md.totals.W; allD+=md.totals.D; allA+=md.totals.A',
                          'allW+=md.totals.W; allA+=md.totals.A')
content = content.replace('allM+allS+allP+allW+allD', 'allM+allS+allP+allW')
content = re.sub(r"\s*\{k:'D',v:allD,label:'Down \(accidents\)'\},?", '', content)
content = re.sub(r"boatStats\[b\.name\]\.D\+=b\.D;?\s*", '', content)
content = re.sub(r"if\(!boatStats\[b\.name\]\) boatStats\[b\.name\]=\{a:0,tot:0,M:0,S:0,P:0,W:0,D:0\}",
                 "if(!boatStats[b.name]) boatStats[b.name]={a:0,tot:0,M:0,S:0,P:0,W:0}", content)
content = re.sub(r'<div class="an-bar-legend-item"><div class="an-bar-legend-dot" style="background:#e05050"></div>Down</div>\n?', '', content)
content = re.sub(r'<div class="an-bar-seg" style="width:\$\{wD\}%;background:#e05050"></div>\n?', '', content)
content = content.replace('wP=b.P/b.total*100, wW=b.W/b.total*100, wD=b.D/b.total*100',
                          'wP=b.P/b.total*100, wW=b.W/b.total*100')
content = content.replace("['Machinery','Structural','Propeller','Payment Delay','Down/Accident']",
                          "['Machinery Issues','Structural Damage','Propeller Damage','Payment Delays']")
content = content.replace("['Machinery','Structural','Propeller','Payment Delay']",
                          "['Machinery Issues','Structural Damage','Propeller Damage','Payment Delays']")
content = content.replace('{M:allM,S:allS,P:allP,W:allW,D:allD}', '{M:allM,S:allS,P:allP,W:allW}')
content = re.sub(r"\[cats\.M,cats\.S,cats\.P,cats\.W,cats\.D\]", '[cats.M,cats.S,cats.P,cats.W]', content)
content = re.sub(r"\['#FF4444','#FF8C00','#9B30FF','#1E90FF','#e05050'\]",
                 "['#FF0000','#4472C4','#FF66FF','#ED7D31']", content)
content = re.sub(r"\['#FF4444','#FF8C00','#9B30FF','#1E90FF'\]",
                 "['#FF0000','#4472C4','#FF66FF','#ED7D31']", content)
print('Step 1 done: Down (D) removed, data remapped to M')

# ── 2. FIX TOGGLE EDIT NULL GUARD ────────────────────────────────────────────
content = content.replace(
    "document.getElementById('edit-chip').classList.toggle('on',emode);",
    "const chip=document.getElementById('edit-chip'); if(chip) chip.classList.toggle('on',emode);"
)
print('Step 2 done: edit-chip null guard')

# ── 3. FIX PICKSTATUS DRAG COLOUR SYNC ───────────────────────────────────────
old_pick = """function pickStatus(s){
  pkStatus=s;
  ['A','M','S','P','W'].forEach(x=>{const el=document.getElementById('sp'+x);if(el)el.classList.toggle('active',x===s)});
  if(pkTarget){
    const r=document.getElementById('sp-reason').value.trim();
    applyStatusToCell(pkTarget,s,r);
  }
}"""
new_pick = """function pickStatus(s){
  pkStatus=s;
  ['A','M','S','P','W','N'].forEach(x=>{const el=document.getElementById('sp'+x);if(el)el.classList.toggle('active',x===s)});
  if(pkTarget){
    const r=document.getElementById('sp-reason').value.trim();
    applyStatusToCell(pkTarget,s,r);
  }
  // Sync active paint brush so drag uses the same colour
  activePaintStatus=s;
  activePaintReason=document.getElementById('sp-reason')?document.getElementById('sp-reason').value.trim():'';
}"""
if old_pick in content:
    content = content.replace(old_pick, new_pick)
    print('Step 3 done: pickStatus drag colour sync')
else:
    print('Step 3 SKIP: pickStatus already updated')

# ── 4. CORRECT STATUS COLOURS ────────────────────────────────────────────────
# CSS classes
content = content.replace('.sS{background:#FF8C00}', '.sS{background:#4472C4}')
content = content.replace('.sP{background:#9B30FF}', '.sP{background:#FF66FF}')
content = content.replace('.sW{background:#1E90FF}', '.sW{background:#ED7D31}')
# SBG dict
content = re.sub(
    r"const SBG = \{A:'#92D050',M:'#FF0000',S:'#FF8C00',P:'#9B30FF',W:'#1E90FF'(?:,D:'#e05050')?,N:'#e8eaee'\};",
    "const SBG = {A:'#92D050',M:'#FF0000',S:'#4472C4',P:'#FF66FF',W:'#ED7D31',N:'#e8eaee'};",
    content
)
# SFG dict
content = re.sub(
    r"const SFG = \{A:'#2d5a1a',M:'#fff',S:'#fff',P:'#fff',W:'#fff'(?:,D:'#fff')?,N:'#9ba3b8'\};",
    "const SFG = {A:'#2d5a1a',M:'#fff',S:'#fff',P:'#333',W:'#fff',N:'#9ba3b8'};",
    content
)
# Legend HTML
content = content.replace("background:#FF8C00\"></div>Structural", "background:#4472C4\"></div>Structural")
content = content.replace("background:#9B30FF\"></div>Propeller", "background:#FF66FF\"></div>Propeller")
content = content.replace("background:#1E90FF\"></div>Payment", "background:#ED7D31\"></div>Payment")
# Picker swatches
content = content.replace("background:#FF8C00\"></div>Structural damage", "background:#4472C4\"></div>Structural Damage")
content = content.replace("background:#9B30FF\"></div>Propeller damage", "background:#FF66FF\"></div>Propeller Damage")
content = content.replace("background:#1E90FF\"></div>Payment delay", "background:#ED7D31\"></div>Payment Delays")
print('Step 4 done: status colours corrected')

# ── 5. CORRECT LABEL NAMES EVERYWHERE ────────────────────────────────────────
content = re.sub(r"const SL\s*=\s*\{[^}]+\};",
    "const SL  = {A:'Available',M:'Machinery Issues',S:'Structural Damage',P:'Propeller Damage',W:'Payment Delays',N:'No Data'};",
    content)
content = content.replace(
    "background:#FF0000\"></div>Machinery issue",
    "background:#FF0000\"></div>Machinery Issues"
)
content = content.replace(
    "><div class=\"sp-swatch\" style=\"background:#FF0000\"></div>Machinery issue</div>",
    "><div class=\"sp-swatch\" style=\"background:#FF0000\"></div>Machinery Issues</div>"
)
print('Step 5 done: label names standardised')

# ── 6. REPLACE HORIZONTAL BARS WITH VERTICAL STACKED SVG BAR CHART ──────────
idx = content.find('function renderBoatBars')
end = content.find('\nfunction ', idx+1)
if idx >= 0 and end > idx:
    new_func = '''function renderBoatBars(md, isScb){
  if(!md) return;
  const el=document.getElementById('an-boat-bars');
  if(!el) return;

  const boats=[...md.boats].filter(b=>b.total>0).sort((a,b)=>(b.avail/b.total)-(a.avail/a.total));
  if(!boats.length){ el.innerHTML='<p style="color:#5a6278;text-align:center;padding:20px">No data</p>'; return; }

  const maxDays=Math.max(...boats.map(b=>b.total));
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
    let sy=CHART_H;
    const segs=SEGS.filter(function(s){return (b[s.k]||0)>0;}).map(function(s){
      const h=(b[s.k]/maxDays)*CHART_H; sy-=h;
      return '<rect x="'+bx+'" y="'+(PAD_T+sy)+'" width="'+BAR_W+'" height="'+h+'" fill="'+s.c+'"/>';
    }).join('');
    const totalH=(b.total/maxDays)*CHART_H;
    const topY=PAD_T+CHART_H-totalH;
    const pct=Math.round(100*b.avail/b.total);
    const lc=pct>=80?'#7ED321':pct>=60?'#FF8C00':'#FF4444';
    const nx=bx+BAR_W/2,ny=PAD_T+CHART_H+14;
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
    return '<div style="display:flex;align-items:center;gap:5px;font-size:10px;color:#6a7498">'+
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
'''
    content = content[:idx] + new_func + content[end:]
    print('Step 6 done: vertical stacked SVG bar chart applied')
else:
    print('Step 6 SKIP: renderBoatBars not found')

# ── 7. REMOVE DUPLICATE STATIC LEGEND FROM ANALYTICS CARD ───────────────────
content = re.sub(
    r'\s*<div class="an-bar-legend"[^>]*>[\s\S]*?</div>\s*(?=\s*</div>\s*<div class="an-card)',
    '\n          ',
    content
)
# Also fix pie chart colours
content = re.sub(
    r"const colors=\['#FF4444','#FF8C00','#9B30FF','#1E90FF'\];",
    "const colors=['#FF0000','#4472C4','#FF66FF','#ED7D31'];",
    content
)
print('Step 7 done: duplicate legend removed, pie chart colours fixed')

# ── VERIFY ───────────────────────────────────────────────────────────────────
assert '"s":"D"' not in content, 'FAIL: D data still present'
assert '.sD{' not in content, 'FAIL: sD CSS still present'
assert 'function renderBoatBars' in content, 'FAIL: renderBoatBars missing'
assert 'gbg' in content, 'FAIL: SVG chart missing'
assert '#4472C4' in content, 'FAIL: Structural blue missing'
assert '#FF66FF' in content, 'FAIL: Propeller pink missing'
assert '#ED7D31' in content, 'FAIL: Payment orange missing'
assert 'Machinery Issues' in content, 'FAIL: label fix missing'
assert 'Payment Delays' in content, 'FAIL: label fix missing'

open('fleet_board.html', 'w', encoding='utf-8').write(content)
print(f'\nDone! fleet_board.html written: {len(content)} chars')
print('Now run:')
print('  python build.py')
print('  git add index.html fleet_board.html')
print('  git commit -m "All fixes: D removed, colours, labels, vertical bar chart, edit mode"')
print('  git push origin main')
