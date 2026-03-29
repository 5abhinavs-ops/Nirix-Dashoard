// ── NIRIX FLEET BOARD — PHP / Google Drive Sync ──────────────────────────────
// Calls PHP service-account scripts to save/load fleet data to Google Drive.
// No OAuth, no popup — credentials stay on the server.
// ─────────────────────────────────────────────────────────────────────────────

const SAVE_PATH   = '/api/fleet-save.php';
const LOAD_PATH   = '/api/fleet-load.php';

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
window.driveSave     = driveSave;
window.driveLoad     = driveLoad;
window.driveAutoLoad = driveAutoLoad;
