// ── NIRIX FLEET BOARD — n8n / Google Drive Sync ──────────────────────────────
// Calls n8n webhooks to save/load fleet data to Google Drive.
// No OAuth, no popup — credentials stay in n8n.
// ─────────────────────────────────────────────────────────────────────────────

const N8N_BASE    = 'https://abnv5.app.n8n.cloud/webhook';
const N8N_SECRET  = 'nirix2026fleet';
const SAVE_PATH   = N8N_BASE + '/nirix-fleet-save';
const LOAD_PATH   = N8N_BASE + '/nirix-fleet-load';

// ── SAVE ─────────────────────────────────────────────────────────────────────

async function n8nSave() {
  _showSyncStatus('Saving to Drive…', 'busy');
  try {
    const res = await fetch(SAVE_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nirix-secret': N8N_SECRET
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
    console.error('n8nSave error:', e);
  }
}

// ── LOAD ─────────────────────────────────────────────────────────────────────

async function n8nLoad() {
  _showSyncStatus('Loading from Drive…', 'busy');
  try {
    const res = await fetch(LOAD_PATH, {
      method: 'GET',
      headers: { 'x-nirix-secret': N8N_SECRET }
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
    console.error('n8nLoad error:', e);
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

function n8nAutoLoad() {
  // Small delay so the board renders first, then overlays saved data
  setTimeout(n8nLoad, 800);
}

// Expose to window
window.n8nSave     = n8nSave;
window.n8nLoad     = n8nLoad;
window.n8nAutoLoad = n8nAutoLoad;
