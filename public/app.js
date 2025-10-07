const el = (id) => document.getElementById(id);

let token = null;
let currentPath = '/';
let userHost = null;
let backStack = [];
let fwdStack = [];
let profiles = [];
let favorites = {};

const statusEl = el('status');
const connectBtn = el('connectBtn');
const disconnectBtn = el('disconnectBtn');
const headerDisconnect = el('headerDisconnect');
const connectPanel = el('connectPanel');
const profilesEl = el('profiles');
const favoritesEl = el('favorites');
const themeToggle = el('themeToggle');
const upBtn = el('upBtn');
const refreshBtn = el('refreshBtn');
const newFolderBtn = el('newFolderBtn');
const fileInput = el('fileInput');
const breadcrumbs = el('breadcrumbs');
const tableBody = el('fileTableBody');
const newFileBtn = el('newFileBtn');
const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const favAddBtn = document.getElementById('favAddBtn');

// Modal editor elements
const modal = document.getElementById('modal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const editor = document.getElementById('editor');
const saveBtn = document.getElementById('saveBtn');

function setStatus(text, ok = false) {
  statusEl.textContent = text;
  statusEl.style.color = ok ? 'var(--ok)' : 'var(--muted)';
}

async function api(path, opts = {}) {
  const headers = opts.headers || {};
  if (token) headers['x-session-token'] = token;
  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) {
    let err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || `HTTP ${res.status}`);
  }
  const ctype = res.headers.get('content-type') || '';
  if (ctype.includes('application/json')) return res.json();
  return res;
}

function renderCrumbs(pathStr) {
  const parts = pathStr.split('/').filter(Boolean);
  const items = ['<span data-path="/">/</span>'];
  let accum = '';
  for (const p of parts) {
    accum += '/' + p;
    items.push(`<span data-path="${accum}">${p}</span>`);
  }
  breadcrumbs.innerHTML = items.join('<span class="muted"> / </span>');
  [...breadcrumbs.querySelectorAll('span[data-path]')].forEach((s) => {
    s.addEventListener('click', () => changeDir(s.dataset.path));
  });
}

function fmtBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes && bytes !== 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function fmtDate(ms) {
  if (!ms) return '';
  try { return new Date(ms).toLocaleString(); } catch { return '' }
}

async function list(pathStr) {
  renderCrumbs(pathStr);
  const data = await api(`/api/list?path=${encodeURIComponent(pathStr)}`);
  tableBody.innerHTML = '';
  for (const item of data.items) {
    const row = document.createElement('div');
    row.className = 'table-row';
    const name = document.createElement('div');
    name.className = 'name';
    const icon = document.createElement('span');
    icon.className = 'icon ' + (item.type === 'dir' ? 'folder' : 'file');
    name.appendChild(icon);
    const nameLink = document.createElement('span');
    nameLink.textContent = item.name;
    if (item.type === 'dir') {
      nameLink.className = 'link';
      nameLink.addEventListener('click', () => changeDir(item.path));
    }
    name.appendChild(nameLink);

    const size = document.createElement('div');
    size.textContent = item.type === 'dir' ? '—' : fmtBytes(item.size);

    const mtime = document.createElement('div');
    mtime.textContent = fmtDate(item.modifyTime);

    const ops = document.createElement('div');
    ops.className = 'right ops';
    const open = document.createElement('button');
    open.textContent = 'Open/Edit';
    open.disabled = item.type === 'dir';
    open.addEventListener('click', async () => openEditor(item.path));
    const dl = document.createElement('button');
    dl.textContent = 'Download';
    dl.disabled = item.type === 'dir';
    dl.addEventListener('click', async () => download(item.path));
    const rn = document.createElement('button');
    rn.textContent = 'Rename';
    rn.addEventListener('click', async () => rename(item.path));
    const rm = document.createElement('button');
    rm.textContent = 'Delete';
    rm.addEventListener('click', async () => remove(item.path, item.type));
    ops.append(open, dl, rn, rm);

    row.append(name, size, mtime, ops);
    tableBody.appendChild(row);
  }
}

async function changeDir(next) {
  if (next && next !== currentPath) {
    backStack.push(currentPath);
    fwdStack = [];
  }
  currentPath = next || '/';
  await list(currentPath);
  persist();
}

async function download(p) {
  const res = await api(`/api/download?path=${encodeURIComponent(p)}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = p.split('/').pop();
  a.click();
  URL.revokeObjectURL(url);
}

async function remove(p, type) {
  if (!confirm(`Delete ${p}?`)) return;
  await api('/api/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: p, type }) });
  await list(currentPath);
}

async function rename(oldPath) {
  const base = oldPath.split('/').pop();
  const dir = oldPath.slice(0, oldPath.length - base.length);
  const name = prompt('New name:', base);
  if (!name || name === base) return;
  const newPath = (dir.endsWith('/') ? dir : dir + '/') + name;
  await api('/api/rename', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ oldPath, newPath }) });
  await list(currentPath);
}

async function openEditor(p) {
  modal.classList.remove('hidden');
  modalTitle.textContent = p;
  editor.value = 'Loading...';
  editor.disabled = true;
  saveBtn.disabled = true;
  try {
    const data = await api(`/api/read?path=${encodeURIComponent(p)}`);
    editor.value = data.content;
    editor.disabled = false;
    saveBtn.disabled = false;
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      try {
        await api('/api/write', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: p, content: editor.value }) });
        await list(currentPath);
        closeModal();
      } catch (err) {
        alert('Save failed: ' + err.message);
      } finally {
        saveBtn.disabled = false;
      }
    };
  } catch (err) {
    editor.value = 'Cannot open: ' + err.message + '\n\nBinary or large files cannot be edited. You can download it instead.';
  }
}

function closeModal() {
  modal.classList.add('hidden');
}

modalBackdrop.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

connectBtn.addEventListener('click', async () => {
  const host = el('host').value.trim();
  const port = Number(el('port').value) || 22;
  const username = el('username').value.trim();
  const password = el('password').value;
  const privateKey = el('privateKey').value.trim();
  const passphrase = el('passphrase').value;
  connectBtn.disabled = true;
  setStatus('Connecting...');
  try {
    const data = await api('/api/connect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ host, port, username, password: password || undefined, privateKey: privateKey || undefined, passphrase: passphrase || undefined }) });
    token = data.token;
    userHost = `${data.username}@${data.host}`;
    setStatus(`Connected: ${userHost}`, true);
    disconnectBtn.disabled = false;
    connectBtn.disabled = true;
    await changeDir('/');
    document.body.setAttribute('data-connected', 'true');
    localStorage.setItem('rf_token', token);
    localStorage.setItem('rf_userhost', userHost);
    renderFavorites();

    // Ask to save profile for quick access
    const defaultName = `${username}@${host}`;
    if (confirm(`Save this connection as "${defaultName}" for quick access?`)) {
      const name = prompt('Profile name:', defaultName) || defaultName;
      const storePassword = password && confirm('Store password in browser?');
      const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      profiles.push({ id, name, host, port, username, password: storePassword ? password : undefined, privateKey: privateKey || undefined, passphrase: passphrase || undefined });
      localStorage.setItem('rf_profiles', JSON.stringify(profiles));
      renderProfiles();
    }
  } catch (e) {
    alert('Connection error: ' + e.message);
    setStatus('Not connected');
    connectBtn.disabled = false;
  }
});

disconnectBtn.addEventListener('click', async () => {
  if (!token) return;
  try { await api('/api/disconnect', { method: 'POST' }); } catch {}
  token = null;
  setStatus('Not connected');
  disconnectBtn.disabled = true;
  connectBtn.disabled = false;
  tableBody.innerHTML = '';
  document.body.setAttribute('data-connected', 'false');
  localStorage.removeItem('rf_token');
  localStorage.removeItem('rf_path');
  localStorage.removeItem('rf_userhost');
  userHost = null;
});
headerDisconnect.addEventListener('click', () => disconnectBtn.click());

upBtn.addEventListener('click', () => {
  if (currentPath === '/' || !currentPath) return;
  const parts = currentPath.split('/').filter(Boolean);
  parts.pop();
  const next = '/' + parts.join('/');
  changeDir(next || '/');
});

refreshBtn.addEventListener('click', () => list(currentPath));

newFolderBtn.addEventListener('click', async () => {
  const name = prompt('Folder name:');
  if (!name) return;
  const p = (currentPath.endsWith('/') ? currentPath : currentPath + '/') + name;
  await api('/api/mkdir', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: p }) });
  await list(currentPath);
});

newFileBtn.addEventListener('click', async () => {
  const name = prompt('File name:');
  if (!name) return;
  const p = (currentPath.endsWith('/') ? currentPath : currentPath + '/') + name;
  await api('/api/touch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: p, content: '' }) });
  await list(currentPath);
});

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const target = (currentPath.endsWith('/') ? currentPath : currentPath + '/') + file.name;
  const form = new FormData();
  form.append('file', file);
  form.append('path', target);
  try {
    await api('/api/upload', { method: 'POST', body: form });
    await list(currentPath);
  } catch (err) {
    alert('Upload failed: ' + err.message);
  } finally {
    e.target.value = '';
  }
});

// Drag & drop upload
const table = document.getElementById('fileTable');
['dragenter','dragover'].forEach(ev => table.addEventListener(ev, e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; table.classList.add('drag'); }));
['dragleave','drop'].forEach(ev => table.addEventListener(ev, e => { e.preventDefault(); table.classList.remove('drag'); }));
table.addEventListener('drop', async (e) => {
  const files = [...e.dataTransfer.files];
  for (const file of files) {
    const target = (currentPath.endsWith('/') ? currentPath : currentPath + '/') + file.name;
    const form = new FormData();
    form.append('file', file);
    form.append('path', target);
    try { await api('/api/upload', { method: 'POST', body: form }); } catch (err) { alert('Failed: ' + file.name + ' - ' + err.message); }
  }
  await list(currentPath);
});
// Favorites add and render
favAddBtn.addEventListener('click', () => {
  if (!userHost) return alert('Connect first');
  const list = favorites[userHost] || [];
  if (list.includes(currentPath)) return alert('Already in favorites');
  list.push(currentPath);
  favorites[userHost] = list;
  localStorage.setItem('rf_favorites', JSON.stringify(favorites));
  renderFavorites();
});

function renderFavorites() {
  favoritesEl.innerHTML = '';
  const list = favorites[userHost] || [];
  if (!list.length) { favoritesEl.innerHTML = '<div class="muted">No favorites</div>'; return; }
  for (const p of list) {
    const div = document.createElement('div');
    div.className = 'item';
    const a = document.createElement('span');
    a.textContent = p;
    a.className = 'link';
    a.addEventListener('click', () => changeDir(p));
    const rm = document.createElement('button');
    rm.className = 'ghost';
    rm.textContent = 'Remove';
    rm.addEventListener('click', () => {
      favorites[userHost] = (favorites[userHost] || []).filter(x => x !== p);
      localStorage.setItem('rf_favorites', JSON.stringify(favorites));
      renderFavorites();
    });
    div.append(a, rm);
    favoritesEl.appendChild(div);
  }
}

// Persist session + path
function persist() {
  if (token) localStorage.setItem('rf_token', token);
  if (currentPath) localStorage.setItem('rf_path', currentPath);
  if (userHost) localStorage.setItem('rf_userhost', userHost);
}

setInterval(persist, 1000);

// Profiles
function loadProfiles() {
  try { profiles = JSON.parse(localStorage.getItem('rf_profiles') || '[]'); } catch { profiles = []; }
}
function renderProfiles() {
  profilesEl.innerHTML = '';
  if (!profiles.length) { profilesEl.innerHTML = '<div class="muted">No saved connections</div>'; return; }
  for (const p of profiles) {
    const div = document.createElement('div');
    div.className = 'item';
    const name = document.createElement('span');
    name.textContent = p.name || `${p.username}@${p.host}`;
    name.className = 'link';
    name.addEventListener('click', () => quickConnect(p.id));
    const del = document.createElement('button');
    del.className = 'ghost';
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      profiles = profiles.filter(x => x.id !== p.id);
      localStorage.setItem('rf_profiles', JSON.stringify(profiles));
      renderProfiles();
    });
    div.append(name, del);
    profilesEl.appendChild(div);
  }
}

async function quickConnect(id) {
  const p = profiles.find(x => x.id === id);
  if (!p) return;
  el('host').value = p.host;
  el('port').value = p.port || 22;
  el('username').value = p.username || '';
  el('password').value = p.password || '';
  el('privateKey').value = p.privateKey || '';
  el('passphrase').value = p.passphrase || '';
  await new Promise(r => setTimeout(r, 50));
  connectBtn.click();
}

// Theme
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('rf_theme', t); }
themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(cur === 'light' ? 'dark' : 'light');
});

// Back/forward
backBtn.addEventListener('click', async () => {
  if (!backStack.length) return;
  fwdStack.push(currentPath);
  currentPath = backStack.pop();
  await list(currentPath);
});
forwardBtn.addEventListener('click', async () => {
  if (!fwdStack.length) return;
  backStack.push(currentPath);
  currentPath = fwdStack.pop();
  await list(currentPath);
});

// Initial
renderCrumbs('/');
loadProfiles();
renderProfiles();
try { favorites = JSON.parse(localStorage.getItem('rf_favorites') || '{}'); } catch { favorites = {}; }

(async function tryRestore() {
  const theme = localStorage.getItem('rf_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(theme);
  const savedToken = localStorage.getItem('rf_token');
  const savedPath = localStorage.getItem('rf_path') || '/';
  const uh = localStorage.getItem('rf_userhost');
  if (!savedToken) return;
  token = savedToken;
  currentPath = savedPath;
  userHost = uh;
  try {
    await list(currentPath);
    setStatus(uh ? `Connected: ${uh}` : 'Connected', true);
    disconnectBtn.disabled = false;
    connectBtn.disabled = true;
    document.body.setAttribute('data-connected', 'true');
    renderFavorites();
  } catch {
    token = null;
    setStatus('Not connected');
    document.body.setAttribute('data-connected', 'false');
  }
})();
