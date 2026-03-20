# upgrade_chart.py — Run once to apply all fleet_board.html changes
import re

content = open('fleet_board.html', encoding='utf-8').read()
print(f'Read fleet_board.html: {len(content)} chars')

# ── 1. Remove Down (D) category completely ──────────────────────────────────
content = content.replace(".sD{background:#e05050}", "")
content = re.sub(r'    <div class="leg">.*?e05050.*?Down</div>\n?', '', content)
content = re.sub(r"D:'Down',?", '', content)
content = re.sub(r"D:'#e05050',?", '', content)
content = re.sub(r"D:'#fff',?", '', content)
content = re.sub(r"'sD',?", '', content)
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
content = re.sub(r'boatStats\[b\.name\]\.D\+=b\.D;', '', content)
content = re.sub(r'if\(!boatStats\[b\.name\]\) boatStats\[b\.name\]=\{a:0,tot:0,M:0,S:0,P:0,W:0,D:0\}',
                 "if(!boatStats[b.name]) boatStats[b.name]={a:0,tot:0,M:0,S:0,P:0,W:0}", content)
content = re.sub(r'<div class="an-bar-legend-item"><div class="an-bar-legend-dot" style="background:#e05050"></div>Down</div>\n?', '', content)
content = re.sub(r'<div class="an-bar-seg" style="width:\$\{wD\}%;background:#e05050"></div>\n?', '', content)
content = content.replace('wP=b.P/b.total*100, wW=b.W/b.total*100, wD=b.D/b.total*100',
                          'wP=b.P/b.total*100, wW=b.W/b.total*100')
content = content.replace("['Machinery','Structural','Propeller','Payment Delay','Down/Accident']",
                          "['Machinery','Structural','Propeller','Payment Delay']")
content = content.replace('[cats.M,cats.S,cats.P,cats.W,cats.D]', '[cats.M,cats.S,cats.P,cats.W]')
content = content.replace("['#FF4444','#FF8C00','#9B30FF','#1E90FF','#e05050']",
                          "['#FF4444','#FF8C00','#9B30FF','#1E90FF']")
content = content.replace('{M:allM,S:allS,P:allP,W:allW,D:allD}', '{M:allM,S:allS,P:allP,W:allW}')
print('Step 1 done: Down (D) removed')

# ── 2. Fix toggleEdit edit-chip null guard ───────────────────────────────────
content = content.replace(
    "  document.getElementById('edit-chip').classList.toggle('on',emode);",
    "  const chip=document.getElementById('edit-chip'); if(chip) chip.classList.toggle('on',emode);"
)
print('Step 2 done: edit-chip null guard')

# ── 3. Replace renderBoatBars with futuristic vertical stacked SVG bar chart ─
idx = content.find('function renderBoatBars')
end = content.find('\nfunction ', idx+1)
old_func = content[idx:end]

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
    {k:'avail',c:'#6abf45'},{k:'M',c:'#cc1414'},{k:'S',c:'#c96e00'},{k:'P',c:'#6b1b99'},{k:'W',c:'#0a5c96'},
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
    {c:'#92D050',l:'Operational'},{c:'#FF3333',l:'Machinery'},
    {c:'#FF8C00',l:'Structural'},{c:'#9B30FF',l:'Propeller'},{c:'#1E90FF',l:'Payment'},
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
print('Step 3 done: futuristic vertical bar chart applied')

# ── 4. Verify and write ──────────────────────────────────────────────────────
assert '"s":"D"' not in content, 'D data still present'
assert '.sD{' not in content, 'sD CSS still present'
assert 'function renderBoatBars' in content, 'renderBoatBars missing'
assert 'gbg' in content, 'SVG chart missing'

open('fleet_board.html', 'w', encoding='utf-8').write(content)
print(f'Done! fleet_board.html written: {len(content)} chars')
print('Now run: python build.py && git add index.html fleet_board.html && git commit -m "Futuristic vertical bar chart + D category removed" && git push origin main')
