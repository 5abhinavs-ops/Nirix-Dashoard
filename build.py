#!/usr/bin/env python3
"""
build.py  --  CLEAN REBUILD
Reads index_base.html, strips any leftover fleet code, then injects fresh.
Safe to run repeatedly.

Also exposes strip_fleet_from_html() for export_clean_base.py (CURSOR_INSTRUCTIONS.md).
"""
import os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
INDEX_BASE = os.path.join(BASE, 'index_base.html')
INDEX_OUT = os.path.join(BASE, 'index.html')
FLEET = os.path.join(BASE, 'fleet_board.html')


def remove_between(text, start, end):
    while start in text and end in text:
        s = text.index(start)
        e = text.index(end, s) + len(end)
        text = text[:s] + text[e:]
    return text


def remove_div_id(text, div_id):
    m = f'<div id="{div_id}"'
    if m not in text:
        return text
    s = text.index(m)
    depth, i = 0, s
    while i < len(text):
        if text[i : i + 4] == '<div':
            depth += 1
        elif text[i : i + 6] == '</div>':
            depth -= 1
            if depth == 0:
                return text[:s] + text[i + 6 :]
        i += 1
    return text


def strip_script_tags_from_html_fragment(fragment):
    """Remove all <script>...</script> from an HTML fragment.
    Uses rindex to find the LAST </script> to avoid matching
    </script> strings inside JS template literals."""
    out = fragment
    low = out.lower()
    while '<script' in low:
        s = low.index('<script')
        # Use rindex to find the LAST </script> — avoids template literal false matches
        ec = low.rindex('</script>')
        if ec <= s:
            break
        out = out[:s] + out[ec + len('</script>'):]
        low = out.lower()
    return out.strip()


def remove_fn(text, fn_name):
    pat = re.compile(r'\n[ \t]*function\s+' + fn_name + r'\s*\([^)]*\)\s*\{')
    for m in reversed(list(pat.finditer(text))):
        start = m.start()
        depth, i = 0, m.end() - 1
        while i < len(text):
            if text[i] == '{':
                depth += 1
            elif text[i] == '}':
                depth -= 1
                if depth == 0:
                    text = text[:start] + text[i + 1 :]
                    break
            i += 1
    return text


# Marker pairs (order: outer / duplicate blocks first). Repeat until stable.
_STRIP_PAIRS = [
    ('/* -- FLEET CSS START -- */', '/* -- FLEET CSS END -- */'),
    ('/* -- FLEET CSS -- */', '/* -- END FLEET CSS -- */'),
    ('/* -- FLEET OVERRIDE', '/* -- END FLEET OVERRIDE'),
    ('/* FLEET LAYOUT OVERRIDE */', '/* end of layout */'),
    ('/* -- FLEET JS START -- */', '/* -- FLEET JS END -- */'),
    ('/* -- FLEET JS -- */', '/* -- END FLEET JS -- */'),
    # Also handle the Unicode dash variants
    ('\u2500\u2500 FLEET CSS START', '\u2500\u2500 FLEET CSS END'),
    ('\u2500\u2500 FLEET CSS \u2500\u2500', '\u2500\u2500 END FLEET CSS'),
    ('\u2500\u2500 FLEET JS START', '\u2500\u2500 FLEET JS END'),
    ('\u2500\u2500 FLEET JS \u2500\u2500', '\u2500\u2500 END FLEET JS'),
    ('\u2500\u2500 FLEET OVERRIDE', '\u2500\u2500 END FLEET OVERRIDE'),
]


def strip_fleet_from_html(idx):
    """Remove all injected fleet CSS/JS/HTML and switchModule from merged index."""
    # Legacy duplicate IIFE (unicode-dash comment) left from older merges — must go before main FLEET JS
    _legacy_start = '\u2500\u2500 FLEET AVAILABILITY MODULE JS \u2500\u2500'
    if _legacy_start in idx and '/* -- FLEET JS -- */' in idx:
        s = idx.index('/* ' + _legacy_start + ' */')
        e = idx.index('/* -- FLEET JS -- */', s)
        idx = idx[:s] + idx[e:]
    for _ in range(25):
        before = idx
        for sm, em in _STRIP_PAIRS:
            idx = remove_between(idx, sm, em)
        for _ in range(3):
            idx = remove_div_id(idx, 'module-fleet')
            idx = remove_div_id(idx, 'tab-fleet')
        for fn in ('switchModule', 'initFleetModule'):
            idx = remove_fn(idx, fn)
        idx = idx.replace('<!-- FLEET AVAILABILITY MODULE -->', '')
        idx = idx.replace('/* -- END FLEET AVAILABILITY MODULE JS -- */', '')
        idx = re.sub(r'(?m)^[ \t]*--[ \t]*\*/[ \t]*\n?', '', idx)
        if idx == before:
            break
    idx = re.sub(r'\n{4,}', '\n\n', idx)
    return idx


# switchModule for base HTML only (no Fleet tab) -- opens in browser without build.
SWITCH_MODULE_NO_FLEET = """
    function switchModule(mod){
      activeModule=mod;
      ['daily','runhrs','boatspecs','certs'].forEach(function(m){
        var t=document.getElementById('tab-'+m);
        var e=document.getElementById('module-'+m);
        if(t) t.style.opacity=(m===mod)?'1':'0.55';
        if(e) e.style.display=(m===mod)?'flex':'none';
      });
      renderAll();
    }
"""


def inject_switch_module_no_fleet(idx):
    """Insert dashboard-only switchModule before closing script tag near </head>."""
    needle = '</script>\n</head>'
    if needle not in idx:
        needle = '</script>\r\n</head>'
    if needle not in idx:
        return idx
    return idx.replace(needle, SWITCH_MODULE_NO_FLEET + '\n' + needle, 1)


def run_build():
    assert os.path.exists(INDEX_BASE), 'ERROR: index_base.html not found!'
    assert os.path.exists(FLEET), 'ERROR: fleet_board.html not found!'

    with open(INDEX_BASE, 'r', encoding='utf-8') as f:
        idx = f.read()
    with open(FLEET, 'r', encoding='utf-8') as f:
        fleet = f.read()
    print(f'index_base  : {len(idx):,} bytes')
    print(f'fleet_board : {len(fleet):,} bytes')

    idx = strip_fleet_from_html(idx)
    print(f'After strip : {len(idx):,} bytes')

    fleet_css = fleet[fleet.index('<style>') + 7 : fleet.index('</style>')]
    fleet_js = fleet[fleet.index('<script>') + 8 : fleet.rindex('</script>')]
    fleet_js = re.sub(
        r"window\.addEventListener\s*\(\s*['\"]DOMContentLoaded['\"][\s\S]*?\}\s*\)\s*;",
        '',
        fleet_js,
    )
    # Embedded dashboard: CSS uses #module-fleet.painting, not body.painting (BUG 2 in CURSOR_INSTRUCTIONS)
    fleet_js = fleet_js.replace(
        "document.body.classList.add('painting');",
        "document.getElementById('module-fleet').classList.add('painting');",
    )
    fleet_js = fleet_js.replace(
        "document.body.classList.remove('painting');",
        "document.getElementById('module-fleet').classList.remove('painting');",
    )

    b0 = fleet.index('<body')
    b0 = fleet.index('>', b0) + 1
    b1 = fleet.rindex('</body>')
    body = fleet[b0:b1].strip()
    if '<div id="app"' in body:
        body = body[body.index('>', body.index('<div id="app"')) + 1 :]
        body = body[: body.rindex('</div>')].strip()
    if '<div class="hdr"' in body:
        hi = body.index('<div class="hdr"')
        depth, i = 0, hi
        while i < len(body):
            if body[i : i + 4] == '<div':
                depth += 1
            elif body[i : i + 6] == '</div>':
                depth -= 1
                if depth == 0:
                    body = body[:hi] + body[i + 6 :]
                    break
            i += 1

    # spN "Revert (clear)" row lives in fleet_board.html source (keep in sync with picker colours)
    body = body.replace(
        '<button class="sp-apply" onclick="applyEdit()">✓ Apply colour</button>',
        '<button class="sp-apply" onclick="applyEdit()">✓ Apply colour</button>\n    <button class="sp-undo" onclick="undoLast()" id="sp-undo" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);color:#c5cde8;border-radius:8px;padding:7px;font-size:12px;cursor:pointer;font-family:inherit;width:100%">Undo last</button>',
    )
    # fleet_board.html includes <script> inside <body>; omit it here — same JS is injected in <head>.
    body = strip_script_tags_from_html_fragment(body)
    print(f'Fleet body  : {len(body):,} chars')

    def scope_css(css):
        out = []
        lines = css.split('\n')
        i, n = 0, len(lines)
        while i < n:
            L = lines[i]
            S = L.strip()
            if not S:
                out.append('')
                i += 1
                continue
            if S.startswith('/*') or S.startswith('//'):
                out.append(L)
                i += 1
                continue
            if S.startswith('@keyframes'):
                out.append(L)
                i += 1
                d = L.count('{') - L.count('}')
                while i < n and d > 0:
                    out.append(lines[i])
                    d += lines[i].count('{') - lines[i].count('}')
                    i += 1
                continue
            if S.startswith('@media'):
                out.append(L)
                i += 1
                d = L.count('{') - L.count('}')
                inner = []
                while i < n and d > 0:
                    inner.append(lines[i])
                    d += lines[i].count('{') - lines[i].count('}')
                    i += 1
                out.extend(scope_css('\n'.join(inner)).split('\n'))
                out.append('}')
                continue
            if S.startswith(':root'):
                out.append(L.replace(':root', '#module-fleet'))
                i += 1
                d = L.count('{') - L.count('}')
                while i < n and d > 0:
                    out.append(lines[i])
                    d += lines[i].count('{') - lines[i].count('}')
                    i += 1
                continue
            if '{' in S:
                brace = S.index('{')
                sel = S[:brace].strip()
                rest = S[brace:]
                parts = [p.strip() for p in sel.split(',') if p.strip()]
                scoped = []
                for p in parts:
                    if re.match(r'^\*', p) or p in ('html',):
                        continue
                    p = re.sub(r'^body\.emode', '#module-fleet.emode', p)
                    p = re.sub(r'^body\.painting', '#module-fleet.painting', p)
                    p = re.sub(r'^body\.panel-open', '#module-fleet.panel-open', p)
                    p = re.sub(r'^body\b', '#module-fleet', p)
                    p = re.sub(r'^html\b', '#module-fleet', p)
                    if not p.startswith('#module-fleet'):
                        p = '#module-fleet ' + p
                    scoped.append(p)
                if not scoped:
                    i += 1
                    d = rest.count('{') - rest.count('}')
                    while i < n and d > 0:
                        d += lines[i].count('{') - lines[i].count('}')
                        i += 1
                    continue
                out.append(', '.join(scoped) + ' ' + rest)
                i += 1
                d = rest.count('{') - rest.count('}')
                while i < n and d > 0:
                    out.append(lines[i])
                    d += lines[i].count('{') - lines[i].count('}')
                    i += 1
                continue
            out.append(L)
            i += 1
        return '\n'.join(out)

    scoped_css = scope_css(fleet_css)

    # NOTE: Do NOT set display:flex!important on #module-fleet wrapper.
    # switchModule sets display:flex when active; !important would override display:none
    # and break hiding. Layout rules (flex-direction, overflow, etc.) are safe to use
    # !important because they only apply when the element is already visible.
    layout = """
/* FLEET LAYOUT OVERRIDE */
#module-fleet{flex-direction:row!important;overflow:hidden!important;position:relative!important;min-height:0!important;}
#module-fleet .hdr{display:none!important;}
#module-fleet #left-nav{position:relative!important;top:auto!important;left:auto!important;bottom:auto!important;width:180px!important;flex-shrink:0!important;height:100%!important;overflow-y:auto!important;display:flex!important;flex-direction:column!important;}
#module-fleet .main-content{flex:1!important;margin-left:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;min-height:0!important;min-width:0!important;position:relative!important;}
#module-fleet .kpi-strip{flex-shrink:0!important;}
#module-fleet .mbar{flex-shrink:0!important;}
#module-fleet .twrap{flex:1!important;overflow:auto!important;min-height:0!important;max-height:none!important;}
#module-fleet #side-panel{position:fixed!important;width:220px!important;height:auto!important;bottom:auto!important;right:auto!important;border-radius:10px!important;box-shadow:0 8px 32px rgba(0,0,0,.6)!important;z-index:9999!important;display:none;}
#module-fleet #side-panel.open{display:flex!important;}
#module-fleet .sp-head{cursor:grab!important;user-select:none!important;}
#module-fleet .sp-head:active{cursor:grabbing!important;}
#module-fleet .sp-body{flex:0 0 auto!important;overflow-y:visible!important;padding:8px 8px 2px!important;max-height:none!important;}
#module-fleet .sp-footer{flex:0 0 auto!important;padding:6px 10px 10px!important;border-top:none!important;gap:5px!important;margin-top:0!important;}
#module-fleet .sp-reason{margin-top:5px!important;}
#module-fleet #spN .sp-swatch{background:#e8eaee!important;border:1.5px solid #8892b8!important;}
#module-fleet #spN.active{background:rgba(232,234,238,.15)!important;border-color:#e8eaee!important;}
#module-fleet .sp-undo{background:rgba(255,255,255,.07)!important;border:1px solid rgba(255,255,255,.15)!important;color:#c5cde8!important;border-radius:8px!important;padding:7px!important;font-size:12px!important;cursor:pointer!important;width:100%!important;}
#module-fleet .sp-undo:hover{background:rgba(255,255,255,.13)!important;color:#fff!important;}
#module-fleet.emode .cell{cursor:crosshair!important;}
#module-fleet.emode .cell:hover{filter:brightness(.8);box-shadow:inset 0 0 0 2px #ffc832;z-index:8;}
#module-fleet.painting .cell{cursor:crosshair!important;user-select:none!important;}
#module-fleet.emode .cell .fh{display:block!important;}
#module-fleet.emode .cell:hover .fh{opacity:1!important;}
#module-fleet.emode .cell.sN .fh{opacity:0!important;pointer-events:none!important;}
#module-fleet #analytics-overlay{position:absolute!important;top:0!important;left:0!important;right:0!important;bottom:0!important;}
"""

    full_css = f'\n/* -- FLEET CSS -- */\n{scoped_css}\n{layout}\n/* -- END FLEET CSS -- */\n'

    full_js = """
/* -- FLEET JS -- */
(function(){


""" + fleet_js + """

// Expose to window — direct assignments only (no eval); same IIFE closures as inline handlers
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
window.initFleetModule=function(){
  if(window._fbInited)return; window._fbInited=true;
  try{
    var now=new Date();
    var mm=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var key=mm[now.getMonth()]+'_'+now.getFullYear();
    if(typeof D!=='undefined'&&D['SCB_'+key]){mk=key; selDay=now.getDate();}
    else{mk='Mar_2026'; selDay=19;}
    if(typeof render==='function')render();
  }catch(err){console.error('Fleet init:',err);}
};

})();
/* -- END FLEET JS -- */
"""

    switch_fn = """
    function switchModule(mod){
      activeModule=mod;
      ['daily','runhrs','boatspecs','certs','fleet'].forEach(function(m){
        var t=document.getElementById('tab-'+m);
        var e=document.getElementById('module-'+m);
        if(t) t.style.opacity=(m===mod)?'1':'0.55';
        if(e) e.style.display=(m===mod)?'flex':'none';
      });
      if(mod==='fleet'&&window.initFleetModule) window.initFleetModule();
      else renderAll();
    }
"""

    fleet_tab = """
    <div id="tab-fleet" onclick="switchModule('fleet')" style="padding:5px 10px 0;margin-top:5px;border:1px solid #7A5A1A;border-bottom:none;border-radius:6px 6px 0 0;display:flex;flex-direction:column;cursor:pointer;opacity:0.55">
      <div style="font-size:16px;font-weight:700;color:#FFFFFF;padding:3px 0;text-align:center">Fleet Availability</div>
      <div style="display:flex;gap:2px;margin-top:3px">
        <div style="padding:5px 12px;font-size:11px;border-radius:4px 4px 0 0;color:#D4920A;font-weight:500;background:#1A1000;border-bottom:2px solid #7A5A1A">Availability Board</div>
      </div>
    </div>"""

    # module-fleet must live INSIDE the flex:1 content wrapper alongside the other
    # module divs so it participates in the same flex height chain. If placed outside
    # (e.g. before #modalOverlay) it has no constrained height and the page scrolls.
    module_div = f"""
    <!-- FLEET AVAILABILITY MODULE -->
    <div id="module-fleet" style="display:none;flex:1;min-height:0;overflow:hidden;">
{body}
    </div>"""

    assert '</style>' in idx, 'ERROR: </style> not found in base!'
    idx = idx.replace('</style>', full_css + '\n</style>', 1)
    print('[OK] CSS injected')

    assert '</script>' in idx, 'ERROR: </script> not found in base!'
    idx = idx.replace('</script>', switch_fn + '\n' + full_js + '\n</script>', 1)
    print('[OK] JS injected')

    # ── Tab injection: insert fleet tab before the content wrapper div ──────────
    CONTENT_ANCHORS = [
        '<div style="flex:1;display:flex;overflow:hidden">',
        '<div style="flex:1; display:flex; overflow:hidden">',
        '<div style="flex:1;display:flex;overflow:hidden;" >',
    ]
    content_anchor = next((a for a in CONTENT_ANCHORS if a in idx), None)

    if content_anchor:
        pos = idx.index(content_anchor)
        pre = idx[:pos].rstrip()
        nc = pre.rfind('</div>')
        idx = pre[:nc] + fleet_tab + '\n  </div>\n\n  ' + content_anchor + idx[pos + len(content_anchor):]
        print('[OK] Tab injected')
    else:
        print('[WARN] Content anchor not found -- using fallback tab injection')
        FALLBACK = 'id="tab-certs"'
        if FALLBACK in idx:
            pos = idx.index(FALLBACK)
            start = idx.rfind('<div', 0, pos)
            i, depth = start, 0
            while i < len(idx):
                if idx[i:i+4] == '<div':
                    depth += 1
                elif idx[i:i+6] == '</div>':
                    depth -= 1
                    if depth == 0:
                        idx = idx[:i+6] + '\n' + fleet_tab + idx[i+6:]
                        print('[OK] Tab injected (fallback after cert tab)')
                        break
                i += 1

    # ── Module HTML injection: INSIDE the flex:1 content wrapper ────────────────
    # Find the content wrapper and walk to its closing </div>, then insert just before it.
    # This keeps module-fleet in the same flex height chain as all other modules,
    # preventing the board from requiring scroll to reach.
    cw_anchor = next((a for a in CONTENT_ANCHORS if a in idx), None)
    assert cw_anchor, 'ERROR: content wrapper not found for module injection!'
    cw_pos = idx.index(cw_anchor)
    depth, i, cw_close = 0, cw_pos, -1
    while i < len(idx):
        if idx[i:i+4] == '<div':
            depth += 1
        elif idx[i:i+6] == '</div>':
            depth -= 1
            if depth == 0:
                cw_close = i
                break
        i += 1
    assert cw_close != -1, 'ERROR: could not find closing </div> of content wrapper!'
    idx = idx[:cw_close] + '\n' + module_div + '\n\n  ' + idx[cw_close:]
    print('[OK] Module HTML injected (inside content wrapper)')

    # ── Also fix #app to use height:100vh not min-height:100vh ──────────────────
    # min-height lets app grow beyond viewport; height:100vh constrains it so flex
    # children (including module-fleet) fill exactly the screen without page scroll.
    idx = idx.replace(
        'id="app" style="display:none;flex-direction:column;min-height:100vh;',
        'id="app" style="display:none;flex-direction:column;height:100vh;',
    )

    # ── n8n / Google Drive sync injection ──────────────────────────────────────
    gdrive_js_path = os.path.join(BASE, 'gdrive_sync.js')
    if os.path.exists(gdrive_js_path):
        gdrive_js = open(gdrive_js_path, encoding='utf-8').read()

        # 1. Inject sync JS as a separate <script> block before the LAST </body>
        # Must use last occurrence — index_base contains </body> inside downloadPDF's
        # document.write() template literal; replacing the first one injects a
        # literal </script> into that string, terminating the host script early.
        sync_block = '\n<script>\n' + gdrive_js + '\n</script>'
        last_body = idx.rfind('</body>')
        idx = idx[:last_body] + sync_block + '\n</body>' + idx[last_body + len('</body>'):]

        # 2. Inject Cloud Sync UI panel into left nav (before spacer)
        sync_ui = '''
  <div class="ln-section" id="gdrive-section">
    <div class="ln-lbl">Cloud Sync</div>
    <button class="ln-btn" onclick="n8nLoad()" style="margin-bottom:4px">&#8595; Load from Drive</button>
    <div id="gdrive-status" style="font-size:9.5px;color:#8892b8;margin-top:4px;min-height:14px;transition:opacity 1s"></div>
  </div>'''
        idx = idx.replace('<div class="ln-spacer"></div>', sync_ui + '\n<div class="ln-spacer"></div>')

        # 3. Hook saveAll to also call n8nSave after committing to D
        idx = idx.replace(
            "b.style.display='block'; b.textContent='\u2713 Saved!'; b.style.color='#5bc4a8';",
            "b.style.display='block'; b.textContent='\u2713 Saved!'; b.style.color='#5bc4a8';\n  if(typeof n8nSave==='function') n8nSave();"
        )

        # 4. Hook initFleetModule to auto-load from Drive on first open
        idx = idx.replace(
            "if(typeof render==='function')render();",
            "if(typeof render==='function')render();\n    if(typeof n8nAutoLoad==='function') n8nAutoLoad();",
            1  # only replace first occurrence (inside initFleetModule)
        )
        print('[OK] n8n Drive sync injected')
    else:
        print('[SKIP] gdrive_sync.js not found \u2014 Drive sync not injected')

    checks = [
        ('module-fleet div',    '<div id="module-fleet"' in idx),
        ('tab-fleet',           'id="tab-fleet"' in idx),
        ('switchModule',        'function switchModule' in idx),
        ('initFleetModule',     'initFleetModule' in idx),
        ('fleet CSS',           'FLEET CSS' in idx),
        ('fleet JS',            'FLEET JS' in idx),
        ('Revert row spN',      'id="spN"' in idx),
        ('Undo button',         'sp-undo' in idx),
        ('drag+localStorage',   '_positionPopup' in idx),
        ('single module-fleet', idx.count('<div id="module-fleet"') == 1),
        ('single tab-fleet',    idx.count('id="tab-fleet"') == 1),
        ('app height:100vh',    'height:100vh' in idx),
    ]
    all_ok = True
    for name, ok in checks:
        print(f'  {"[OK]" if ok else "[FAIL]"} {name}')
        if not ok:
            all_ok = False

    if not all_ok:
        print('\n[WARN] Checks failed -- NOT writing output')
        sys.exit(1)

    with open(INDEX_OUT, 'w', encoding='utf-8') as f:
        f.write(idx)
    print(f'\n[DONE] Build complete -- {len(idx):,} bytes ({len(idx) // 1024} KB)')


if __name__ == '__main__':
    run_build()
