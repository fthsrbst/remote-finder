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
let currentView = 'list'; // 'list' or 'grid'
let terminalOpen = false;

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
const fileGrid = el('fileGrid');
const listViewBtn = el('listViewBtn');
const gridViewBtn = el('gridViewBtn');
const terminalToggle = el('terminalToggle');
const terminalPanel = el('terminalPanel');
const terminalBody = el('terminalBody');
const closeTerminal = el('closeTerminal');
const mainContent = document.querySelector('.main-content');

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
  fileGrid.innerHTML = '';

  for (const item of data.items) {
    if (currentView === 'list') {
      createListItem(item);
    } else {
      createGridItem(item);
    }
  }
}

// Get SVG icon for file/folder
function getFileIcon(filename, type) {
  if (type === 'dir') {
    return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M28 26H4C2.89543 26 2 25.1046 2 24V10C2 8.89543 2.89543 8 4 8H13L15 11H28C29.1046 11 30 11.8954 30 13V24C30 25.1046 29.1046 26 28 26Z" fill="#60A5FA"/>
      <path d="M28 26H4C2.89543 26 2 25.1046 2 24V10C2 8.89543 2.89543 8 4 8H13L15 11H28C29.1046 11 30 11.8954 30 13V24C30 25.1046 29.1046 26 28 26Z" stroke="#3B82F6" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
  }

  const ext = filename.split('.').pop().toLowerCase();
  const iconMap = {
    'js': '#F7DF1E', 'jsx': '#61DAFB', 'ts': '#3178C6', 'tsx': '#3178C6', 'json': '#F59E0B',
    'html': '#E34F26', 'css': '#1572B6', 'scss': '#CC6699',
    'png': '#10B981', 'jpg': '#10B981', 'svg': '#10B981',
    'md': '#374151', 'txt': '#6B7280', 'pdf': '#DC2626',
    'py': '#3776AB', 'rb': '#CC342D', 'php': '#777BB4',
    'zip': '#F59E0B', 'gz': '#F59E0B',
    'sh': '#4EAA25', 'bash': '#4EAA25'
  };
  const color = iconMap[ext] || '#9CA3AF';

  return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M26 28H6C4.89543 28 4 27.1046 4 26V6C4 4.89543 4.89543 4 6 4H18L28 14V26C28 27.1046 27.1046 28 26 28Z" fill="${color}"/>
    <path d="M18 4L28 14H20C18.8954 14 18 13.1046 18 12V4Z" fill="#fff" fill-opacity="0.3"/>
    <path d="M26 28H6C4.89543 28 4 27.1046 4 26V6C4 4.89543 4.89543 4 6 4H18L28 14V26C28 27.1046 27.1046 28 26 28Z" stroke="${color}" stroke-opacity="0.5" stroke-width="1" stroke-linejoin="round"/>
  </svg>`;
}

function createListItem(item) {
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
  icon.innerHTML = getFileIcon(item.name, item.type);

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

function createGridItem(item) {
  const gridItem = document.createElement('div');
  gridItem.className = 'file-grid-item';
  gridItem.dataset.path = item.path;
  gridItem.dataset.type = item.type;
  gridItem.dataset.name = item.name;

  const icon = document.createElement('div');
  icon.className = 'file-icon ' + (item.type === 'dir' ? 'folder' : 'file');
  icon.innerHTML = getFileIcon(item.name, item.type);

  const nameDiv = document.createElement('div');
  nameDiv.className = 'file-grid-item-name';
  nameDiv.textContent = item.name;

  gridItem.appendChild(icon);
  gridItem.appendChild(nameDiv);

  // Events
  gridItem.addEventListener('click', () => selectGridItem(gridItem));
  gridItem.addEventListener('dblclick', () => {
    if (item.type === 'dir') {
      changeDir(item.path);
    } else {
      openEditor(item.path);
    }
  });
  gridItem.addEventListener('contextmenu', (e) => showContextMenu(e, gridItem));

  fileGrid.appendChild(gridItem);
}

function selectGridItem(gridItem) {
  document.querySelectorAll('.file-grid-item').forEach(r => r.classList.remove('selected'));
  gridItem.classList.add('selected');
  selectedItem = {
    path: gridItem.dataset.path,
    type: gridItem.dataset.type,
    name: gridItem.dataset.name
  };
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

// View toggle
listViewBtn.addEventListener('click', () => {
  currentView = 'list';
  fileList.classList.remove('hidden');
  fileGrid.classList.add('hidden');
  listViewBtn.classList.add('active');
  gridViewBtn.classList.remove('active');
  list(currentPath);
});

gridViewBtn.addEventListener('click', () => {
  currentView = 'grid';
  fileList.classList.add('hidden');
  fileGrid.classList.remove('hidden');
  gridViewBtn.classList.add('active');
  listViewBtn.classList.remove('active');
  list(currentPath);
});

// Real terminal instance
let terminalInstance = null;
let terminalSocket = null;
let terminalFitAddon = null;

// Terminal toggle
terminalToggle.addEventListener('click', () => {
  if (!token) {
    alert('Please connect to a server first');
    return;
  }
  terminalOpen = !terminalOpen;
  if (terminalOpen) {
    terminalPanel.classList.remove('hidden');
    mainContent.classList.add('terminal-open');
    initRealTerminal();
  } else {
    terminalPanel.classList.add('hidden');
    mainContent.classList.remove('terminal-open');
    destroyRealTerminal();
  }
});

closeTerminal.addEventListener('click', () => {
  terminalOpen = false;
  terminalPanel.classList.add('hidden');
  mainContent.classList.remove('terminal-open');
  destroyRealTerminal();
});

// Real interactive terminal with xterm.js
function initRealTerminal() {
  if (terminalInstance) return;

  terminalBody.innerHTML = '';

  // Create xterm instance
  terminalInstance = new Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4'
    },
    scrollback: 10000
  });

  // Fit addon
  terminalFitAddon = new FitAddon.FitAddon();
  terminalInstance.loadAddon(terminalFitAddon);
  terminalInstance.open(terminalBody);

  setTimeout(() => {
    terminalFitAddon.fit();
  }, 100);

  // Auto resize
  const resizeObserver = new ResizeObserver(() => {
    try {
      terminalFitAddon.fit();
      if (terminalSocket && terminalSocket.readyState === WebSocket.OPEN) {
        terminalSocket.send(JSON.stringify({
          type: 'resize',
          rows: terminalInstance.rows,
          cols: terminalInstance.cols
        }));
      }
    } catch (e) {}
  });
  resizeObserver.observe(terminalBody);

  // WebSocket connection
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProto}//${window.location.host}?token=${token}`;

  terminalSocket = new WebSocket(wsUrl);

  terminalSocket.onopen = () => {
    terminalInstance.writeln('\x1b[32m✓ Connected to remote server\x1b[0m\r\n');
  };

  terminalSocket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'output') {
        terminalInstance.write(msg.data);
      } else if (msg.type === 'error') {
        terminalInstance.writeln(`\r\n\x1b[31m✗ Error: ${msg.data}\x1b[0m\r\n`);
      }
    } catch (e) {}
  };

  terminalSocket.onerror = () => {
    terminalInstance.writeln('\r\n\x1b[31m✗ Connection error\x1b[0m\r\n');
  };

  terminalSocket.onclose = () => {
    terminalInstance.writeln('\r\n\x1b[33m○ Connection closed\x1b[0m\r\n');
  };

  // Terminal input → WebSocket
  terminalInstance.onData((data) => {
    if (terminalSocket && terminalSocket.readyState === WebSocket.OPEN) {
      terminalSocket.send(JSON.stringify({ type: 'input', data }));
    }
  });
}

function destroyRealTerminal() {
  if (terminalSocket) {
    terminalSocket.close();
    terminalSocket = null;
  }
  if (terminalInstance) {
    terminalInstance.dispose();
    terminalInstance = null;
  }
  terminalFitAddon = null;
}

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

// Profiles - Simplified (removed, keeping only favorites)

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
