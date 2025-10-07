const el = (id) => document.getElementById(id);

// State
let token = null;
let currentPath = '/';
let userHost = null;
let backStack = [];
let fwdStack = [];
let profiles = [];
let favorites = {};
let selectedItem = null;
let contextItem = null;

// Elements
const statusEl = el('status');
const connectBtn = el('connectBtn');
const connectModalBtn = el('connectModalBtn');
const emptyConnectBtn = el('emptyConnectBtn');
const headerDisconnect = el('headerDisconnect');
const profilesEl = el('profiles');
const favoritesEl = el('favorites');
const themeToggle = el('themeToggle');
const refreshBtn = el('refreshBtn');
const newFolderBtn = el('newFolderBtn');
const newFileBtn = el('newFileBtn');
const fileInput = el('fileInput');
const breadcrumbs = el('breadcrumbs');
const fileListBody = el('fileListBody');
const backBtn = el('backBtn');
const forwardBtn = el('forwardBtn');
const favAddBtn = el('favAddBtn');
const emptyState = el('emptyState');
const fileList = el('fileList');

// Modals
const connectionModal = el('connectionModal');
const closeConnectionModal = el('closeConnectionModal');
const cancelConnectBtn = el('cancelConnectBtn');
const editorModal = el('editorModal');
const closeEditorModal = el('closeEditorModal');
const cancelEditBtn = el('cancelEditBtn');
const editorTitle = el('editorTitle');
const editor = el('editor');
const saveBtn = el('saveBtn');

// Context Menu
const contextMenu = el('contextMenu');
const ctxOpen = el('ctxOpen');
const ctxDownload = el('ctxDownload');
const ctxRename = el('ctxRename');
const ctxDelete = el('ctxDelete');

// Utility functions
function setStatus(text, ok = false) {
  statusEl.textContent = text;
  statusEl.style.color = ok ? 'var(--success)' : 'var(--text-secondary)';
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

function fmtBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes && bytes !== 0) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function fmtDate(ms) {
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch { return '—'; }
}

// Breadcrumbs
function renderCrumbs(pathStr) {
  const parts = pathStr.split('/').filter(Boolean);
  const items = ['<span class="breadcrumb-item" data-path="/">/</span>'];
  let accum = '';
  for (const p of parts) {
    accum += '/' + p;
    items.push(`<span class="breadcrumb-separator">/</span>`);
    items.push(`<span class="breadcrumb-item" data-path="${accum}">${p}</span>`);
  }
  breadcrumbs.innerHTML = items.join('');
  breadcrumbs.querySelectorAll('.breadcrumb-item').forEach((span) => {
    span.addEventListener('click', () => changeDir(span.dataset.path));
  });
}

// File listing
async function list(pathStr) {
  renderCrumbs(pathStr);
  const data = await api(`/api/list?path=${encodeURIComponent(pathStr)}`);
  fileListBody.innerHTML = '';

  for (const item of data.items) {
    const row = document.createElement('div');
    row.className = 'file-item';
    row.dataset.path = item.path;
    row.dataset.type = item.type;
    row.dataset.name = item.name;

    // Name column
    const nameDiv = document.createElement('div');
    nameDiv.className = 'file-item-name';
    const icon = document.createElement('div');
    icon.className = 'file-icon ' + (item.type === 'dir' ? 'folder' : 'file');
    icon.textContent = item.type === 'dir' ? '📁' : '📄';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = item.name;
    nameDiv.appendChild(icon);
    nameDiv.appendChild(nameSpan);

    // Size column
    const sizeDiv = document.createElement('div');
    sizeDiv.className = 'file-size';
    sizeDiv.textContent = item.type === 'dir' ? '—' : fmtBytes(item.size);

    // Modified column
    const modDiv = document.createElement('div');
    modDiv.className = 'file-modified';
    modDiv.textContent = fmtDate(item.modifyTime);

    row.append(nameDiv, sizeDiv, modDiv);

    // Events
    row.addEventListener('click', () => selectItem(row));
    row.addEventListener('dblclick', () => {
      if (item.type === 'dir') {
        changeDir(item.path);
      } else {
        openEditor(item.path);
      }
    });
    row.addEventListener('contextmenu', (e) => showContextMenu(e, row));

    fileListBody.appendChild(row);
  }
}

function selectItem(row) {
  document.querySelectorAll('.file-item').forEach(r => r.classList.remove('selected'));
  row.classList.add('selected');
  selectedItem = {
    path: row.dataset.path,
    type: row.dataset.type,
    name: row.dataset.name
  };
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

// Context Menu
function showContextMenu(e, row) {
  e.preventDefault();
  selectItem(row);
  contextItem = {
    path: row.dataset.path,
    type: row.dataset.type,
    name: row.dataset.name
  };

  // Enable/disable menu items based on type
  if (contextItem.type === 'dir') {
    ctxOpen.classList.add('disabled');
    ctxDownload.classList.add('disabled');
  } else {
    ctxOpen.classList.remove('disabled');
    ctxDownload.classList.remove('disabled');
  }

  contextMenu.style.left = e.pageX + 'px';
  contextMenu.style.top = e.pageY + 'px';
  contextMenu.classList.remove('hidden');
}

function hideContextMenu() {
  contextMenu.classList.add('hidden');
  contextItem = null;
}

// Click outside to hide context menu
document.addEventListener('click', (e) => {
  if (!contextMenu.contains(e.target)) {
    hideContextMenu();
  }
});

// Context menu actions
ctxOpen.addEventListener('click', () => {
  if (contextItem && contextItem.type !== 'dir') {
    openEditor(contextItem.path);
  }
  hideContextMenu();
});

ctxDownload.addEventListener('click', () => {
  if (contextItem && contextItem.type !== 'dir') {
    download(contextItem.path);
  }
  hideContextMenu();
});

ctxRename.addEventListener('click', () => {
  if (contextItem) {
    rename(contextItem.path);
  }
  hideContextMenu();
});

ctxDelete.addEventListener('click', () => {
  if (contextItem) {
    remove(contextItem.path, contextItem.type);
  }
  hideContextMenu();
});

// File operations
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
  await api('/api/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: p, type })
  });
  await list(currentPath);
}

async function rename(oldPath) {
  const base = oldPath.split('/').pop();
  const dir = oldPath.slice(0, oldPath.length - base.length);
  const name = prompt('New name:', base);
  if (!name || name === base) return;
  const newPath = (dir.endsWith('/') ? dir : dir + '/') + name;
  await api('/api/rename', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ oldPath, newPath })
  });
  await list(currentPath);
}

// Editor Modal
async function openEditor(p) {
  editorModal.classList.remove('hidden');
  editorTitle.textContent = p;
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
        await api('/api/write', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ path: p, content: editor.value })
        });
        await list(currentPath);
        closeEditorModalFn();
      } catch (err) {
        alert('Save failed: ' + err.message);
      } finally {
        saveBtn.disabled = false;
      }
    };
  } catch (err) {
    editor.value = 'Cannot open: ' + err.message + '\n\nBinary or large files cannot be edited. You can download it instead.';
    editor.disabled = true;
  }
}

function closeEditorModalFn() {
  editorModal.classList.add('hidden');
}

closeEditorModal.addEventListener('click', closeEditorModalFn);
cancelEditBtn.addEventListener('click', closeEditorModalFn);
editorModal.querySelector('.modal-backdrop').addEventListener('click', closeEditorModalFn);

// Connection Modal
function openConnectionModal() {
  connectionModal.classList.remove('hidden');
}

function closeConnectionModalFn() {
  connectionModal.classList.add('hidden');
}

connectModalBtn.addEventListener('click', openConnectionModal);
emptyConnectBtn.addEventListener('click', openConnectionModal);
closeConnectionModal.addEventListener('click', closeConnectionModalFn);
cancelConnectBtn.addEventListener('click', closeConnectionModalFn);
connectionModal.querySelector('.modal-backdrop').addEventListener('click', closeConnectionModalFn);

// Connect
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
    const data = await api('/api/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        host,
        port,
        username,
        password: password || undefined,
        privateKey: privateKey || undefined,
        passphrase: passphrase || undefined
      })
    });

    token = data.token;
    userHost = `${data.username}@${data.host}`;
    setStatus(`Connected: ${userHost}`, true);
    document.body.setAttribute('data-connected', 'true');
    await changeDir('/');
    localStorage.setItem('rf_token', token);
    localStorage.setItem('rf_userhost', userHost);
    renderFavorites();
    closeConnectionModalFn();

    // Ask to save profile
    const defaultName = `${username}@${host}`;
    if (confirm(`Save this connection as "${defaultName}" for quick access?`)) {
      const name = prompt('Profile name:', defaultName) || defaultName;
      const storePassword = password && confirm('Store password in browser?');
      const id = crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      profiles.push({
        id,
        name,
        host,
        port,
        username,
        password: storePassword ? password : undefined,
        privateKey: privateKey || undefined,
        passphrase: passphrase || undefined
      });
      localStorage.setItem('rf_profiles', JSON.stringify(profiles));
      renderProfiles();
    }
  } catch (e) {
    alert('Connection error: ' + e.message);
    setStatus('Not connected');
  } finally {
    connectBtn.disabled = false;
  }
});

// Disconnect
async function disconnect() {
  if (!token) return;
  try {
    await api('/api/disconnect', { method: 'POST' });
  } catch {}
  token = null;
  userHost = null;
  currentPath = '/';
  setStatus('Not connected');
  document.body.setAttribute('data-connected', 'false');
  fileListBody.innerHTML = '';
  localStorage.removeItem('rf_token');
  localStorage.removeItem('rf_path');
  localStorage.removeItem('rf_userhost');
}

headerDisconnect.addEventListener('click', disconnect);

// Navigation
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

refreshBtn.addEventListener('click', () => list(currentPath));

// File/Folder creation
newFolderBtn.addEventListener('click', async () => {
  const name = prompt('Folder name:');
  if (!name) return;
  const p = (currentPath.endsWith('/') ? currentPath : currentPath + '/') + name;
  await api('/api/mkdir', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: p })
  });
  await list(currentPath);
});

newFileBtn.addEventListener('click', async () => {
  const name = prompt('File name:');
  if (!name) return;
  const p = (currentPath.endsWith('/') ? currentPath : currentPath + '/') + name;
  await api('/api/touch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: p, content: '' })
  });
  await list(currentPath);
});

// Upload
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
['dragenter', 'dragover'].forEach(ev =>
  fileList.addEventListener(ev, e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    fileList.classList.add('drag-over');
  })
);

['dragleave', 'drop'].forEach(ev =>
  fileList.addEventListener(ev, e => {
    e.preventDefault();
    fileList.classList.remove('drag-over');
  })
);

fileList.addEventListener('drop', async (e) => {
  const files = [...e.dataTransfer.files];
  for (const file of files) {
    const target = (currentPath.endsWith('/') ? currentPath : currentPath + '/') + file.name;
    const form = new FormData();
    form.append('file', file);
    form.append('path', target);
    try {
      await api('/api/upload', { method: 'POST', body: form });
    } catch (err) {
      alert('Failed: ' + file.name + ' - ' + err.message);
    }
  }
  await list(currentPath);
});

// Favorites
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
  if (!list.length) {
    favoritesEl.innerHTML = '<div class="sidebar-empty">No favorites</div>';
    return;
  }
  for (const p of list) {
    const div = document.createElement('div');
    div.className = 'sidebar-item';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'sidebar-item-name';
    nameSpan.textContent = p;
    nameSpan.addEventListener('click', () => changeDir(p));
    const rmBtn = document.createElement('span');
    rmBtn.className = 'sidebar-item-action';
    rmBtn.textContent = '✕';
    rmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      favorites[userHost] = (favorites[userHost] || []).filter(x => x !== p);
      localStorage.setItem('rf_favorites', JSON.stringify(favorites));
      renderFavorites();
    });
    div.append(nameSpan, rmBtn);
    favoritesEl.appendChild(div);
  }
}

// Profiles
function loadProfiles() {
  try {
    profiles = JSON.parse(localStorage.getItem('rf_profiles') || '[]');
  } catch {
    profiles = [];
  }
}

function renderProfiles() {
  profilesEl.innerHTML = '';
  if (!profiles.length) {
    profilesEl.innerHTML = '<div class="sidebar-empty">No saved connections</div>';
    return;
  }
  for (const p of profiles) {
    const div = document.createElement('div');
    div.className = 'sidebar-item';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'sidebar-item-name';
    nameSpan.textContent = p.name || `${p.username}@${p.host}`;
    nameSpan.addEventListener('click', () => quickConnect(p.id));
    const delBtn = document.createElement('span');
    delBtn.className = 'sidebar-item-action';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profiles = profiles.filter(x => x.id !== p.id);
      localStorage.setItem('rf_profiles', JSON.stringify(profiles));
      renderProfiles();
    });
    div.append(nameSpan, delBtn);
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
  openConnectionModal();
}

// Theme
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('rf_theme', t);
}

themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(cur === 'light' ? 'dark' : 'light');
});

// Persist session
function persist() {
  if (token) localStorage.setItem('rf_token', token);
  if (currentPath) localStorage.setItem('rf_path', currentPath);
  if (userHost) localStorage.setItem('rf_userhost', userHost);
}

setInterval(persist, 1000);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideContextMenu();
    if (!editorModal.classList.contains('hidden')) closeEditorModalFn();
    if (!connectionModal.classList.contains('hidden')) closeConnectionModalFn();
  }
});

// Initial setup
renderCrumbs('/');
loadProfiles();
renderProfiles();
try {
  favorites = JSON.parse(localStorage.getItem('rf_favorites') || '{}');
} catch {
  favorites = {};
}

// Try to restore session
(async function tryRestore() {
  const theme = localStorage.getItem('rf_theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
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
    document.body.setAttribute('data-connected', 'true');
    renderFavorites();
  } catch {
    token = null;
    userHost = null;
    setStatus('Not connected');
    document.body.setAttribute('data-connected', 'false');
    localStorage.removeItem('rf_token');
    localStorage.removeItem('rf_userhost');
  }
})();
