// Optimized Remote Finder App
const el = (id) => document.getElementById(id);

// App State
const state = {
  token: null,
  currentPath: '/',
  userHost: null,
  backStack: [],
  fwdStack: [],
  savedConnections: [],
  serverHistory: [],
  favorites: {},
  selectedItems: new Set(),
  contextItem: null,
  currentView: 'list',
  terminals: [],
  activeTerminalId: null,
  allFileItems: []
};

// Elements Cache
const elements = {
  status: el('status'),
  connectBtn: el('connectBtn'),
  connectModalBtn: el('connectModalBtn'),
  emptyConnectBtn: el('emptyConnectBtn'),
  headerDisconnect: el('headerDisconnect'),
  savedConnectionsEl: el('savedConnections'),
  favoritesEl: el('favorites'),
  themeToggle: el('themeToggle'),
  refreshBtn: el('refreshBtn'),
  trashBtn: el('trashBtn'),
  newFolderBtn: el('newFolderBtn'),
  newFileBtn: el('newFileBtn'),
  fileInput: el('fileInput'),
  breadcrumbs: el('breadcrumbs'),
  fileListBody: el('fileListBody'),
  backBtn: el('backBtn'),
  forwardBtn: el('forwardBtn'),
  favAddBtn: el('favAddBtn'),
  emptyState: el('emptyState'),
  fileList: el('fileList'),
  fileGrid: el('fileGrid'),
  listViewBtn: el('listViewBtn'),
  gridViewBtn: el('gridViewBtn'),
  terminalToggle: el('terminalToggle'),
  terminalPanel: el('terminalPanel'),
  terminalBody: el('terminalBody'),
  terminalTabs: el('terminalTabs'),
  closeTerminal: el('closeTerminal'),
  newTerminalBtn: el('newTerminalBtn'),
  mainContent: document.querySelector('.main-content'),
  quickSearchInput: el('quickSearchInput'),
  serverHistoryToggle: el('serverHistoryToggle'),
  contextMenu: el('contextMenu'),
  sidebarToggle: el('sidebarToggle'),
  sidebar: el('sidebar'),
  currentUser: el('currentUser'),
  currentDateTime: el('currentDateTime')
};

// Utility: Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Utility: Custom confirm
function customConfirm(message, title = 'Confirm') {
  return new Promise((resolve) => {
    const modal = el('confirmModal');
    const titleEl = el('confirmTitle');
    const messageEl = el('confirmMessage');
    const okBtn = el('okConfirm');
    const cancelBtn = el('cancelConfirm');
    const closeBtn = el('closeConfirm');

    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.remove('hidden');

    const cleanup = (result) => {
      modal.classList.add('hidden');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      closeBtn.onclick = null;
      resolve(result);
    };

    okBtn.onclick = () => cleanup(true);
    cancelBtn.onclick = () => cleanup(false);
    closeBtn.onclick = () => cleanup(false);
  });
}

// Utility: Custom prompt
function customPrompt(message, defaultValue = '', title = 'Input') {
  return new Promise((resolve) => {
    const modal = el('promptModal');
    const titleEl = el('promptTitle');
    const labelEl = el('promptLabel');
    const input = el('promptInput');
    const confirmBtn = el('confirmPrompt');
    const cancelBtn = el('cancelPrompt');
    const closeBtn = el('closePrompt');

    titleEl.textContent = title;
    labelEl.textContent = message;
    input.value = defaultValue;
    modal.classList.remove('hidden');
    input.focus();
    input.select();

    const cleanup = (result) => {
      modal.classList.add('hidden');
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      closeBtn.onclick = null;
      input.onkeydown = null;
      resolve(result);
    };

    confirmBtn.onclick = () => cleanup(input.value);
    cancelBtn.onclick = () => cleanup(null);
    closeBtn.onclick = () => cleanup(null);
    input.onkeydown = (e) => {
      if (e.key === 'Enter') cleanup(input.value);
      if (e.key === 'Escape') cleanup(null);
    };
  });
}

// Utility: API call
async function api(path, opts = {}) {
  const headers = opts.headers || {};
  if (state.token) headers['x-session-token'] = state.token;
  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.details || err.error || `HTTP ${res.status}`);
  }
  const ctype = res.headers.get('content-type') || '';
  if (ctype.includes('application/json')) return res.json();
  return res;
}

// Utility: Format bytes
function fmtBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Utility: Format date
function fmtDate(ms) {
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return '—'; }
}

// Utility: Set status
function setStatus(text, ok = false) {
  elements.status.textContent = text;
  elements.status.style.color = ok ? 'var(--success)' : 'var(--text-secondary)';
}

// Get file icon
function getFileIcon(filename, type) {
  if (type === 'dir') {
    return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M28 26H4C2.89543 26 2 25.1046 2 24V10C2 8.89543 2.89543 8 4 8H13L15 11H28C29.1046 11 30 11.8954 30 13V24C30 25.1046 29.1046 26 28 26Z" fill="#60A5FA"/>
      <path d="M28 26H4C2.89543 26 2 25.1046 2 24V10C2 8.89543 2.89543 8 4 8H13L15 11H28C29.1046 11 30 11.8954 30 13V24C30 25.1046 29.1046 26 28 26Z" stroke="#3B82F6" stroke-width="1.5"/>
    </svg>`;
  }
  const ext = filename.split('.').pop().toLowerCase();
  const colors = {
    'js': '#F7DF1E', 'jsx': '#61DAFB', 'ts': '#3178C6', 'tsx': '#3178C6', 'json': '#F59E0B',
    'html': '#E34F26', 'css': '#1572B6', 'scss': '#CC6699',
    'png': '#10B981', 'jpg': '#10B981', 'svg': '#10B981',
    'md': '#374151', 'txt': '#6B7280', 'pdf': '#DC2626',
    'py': '#3776AB', 'rb': '#CC342D', 'php': '#777BB4',
    'zip': '#F59E0B', 'gz': '#F59E0B', 'sh': '#4EAA25'
  };
  const color = colors[ext] || '#9CA3AF';
  return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M26 28H6C4.89543 28 4 27.1046 4 26V6C4 4.89543 4.89543 4 6 4H18L28 14V26C28 27.1046 27.1046 28 26 28Z" fill="${color}"/>
    <path d="M18 4L28 14H20C18.8954 14 18 13.1046 18 12V4Z" fill="#fff" fill-opacity="0.3"/>
  </svg>`;
}

// Render breadcrumbs
function renderCrumbs(pathStr) {
  const parts = pathStr.split('/').filter(Boolean);
  const items = ['<span class="breadcrumb-item" data-path="/">/</span>'];
  let accum = '';
  for (const p of parts) {
    accum += '/' + p;
    items.push('<span class="breadcrumb-separator">/</span>');
    items.push(`<span class="breadcrumb-item" data-path="${accum}">${p}</span>`);
  }
  elements.breadcrumbs.innerHTML = items.join('');
  elements.breadcrumbs.querySelectorAll('.breadcrumb-item').forEach(span => {
    span.addEventListener('click', () => changeDir(span.dataset.path));
  });
}

// Create list item
function createListItem(item) {
  const row = document.createElement('div');
  row.className = 'file-item';
  row.dataset.path = item.path;
  row.dataset.type = item.type;
  row.dataset.name = item.name;

  const nameDiv = document.createElement('div');
  nameDiv.className = 'file-item-name';
  const icon = document.createElement('div');
  icon.className = 'file-icon ' + (item.type === 'dir' ? 'folder' : 'file');
  icon.innerHTML = getFileIcon(item.name, item.type);
  const nameSpan = document.createElement('span');
  nameSpan.textContent = item.name;
  nameDiv.append(icon, nameSpan);

  const sizeDiv = document.createElement('div');
  sizeDiv.className = 'file-size';
  sizeDiv.textContent = item.type === 'dir' ? '—' : fmtBytes(item.size);

  const modDiv = document.createElement('div');
  modDiv.className = 'file-modified';
  modDiv.textContent = fmtDate(item.modifyTime);

  row.append(nameDiv, sizeDiv, modDiv);

  // Events - FIX: Prevent double-click selection issue
  let clickTimeout = null;
  row.addEventListener('click', (e) => {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
      // Double click
      if (item.type === 'dir') {
        changeDir(item.path);
      } else {
        openEditor(item.path);
      }
    } else {
      clickTimeout = setTimeout(() => {
        clickTimeout = null;
        // Single click
        if (e.ctrlKey || e.metaKey) {
          toggleSelectItem(row);
        } else if (e.shiftKey && state.selectedItems.size > 0) {
          selectRangeItems(row);
        } else {
          selectSingleItem(row);
        }
      }, 250);
    }
  });

  row.addEventListener('contextmenu', (e) => showContextMenu(e, row));
  elements.fileListBody.appendChild(row);
}

// Create grid item
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

  gridItem.append(icon, nameDiv);

  let clickTimeout = null;
  gridItem.addEventListener('click', (e) => {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
      if (item.type === 'dir') {
        changeDir(item.path);
      } else {
        openEditor(item.path);
      }
    } else {
      clickTimeout = setTimeout(() => {
        clickTimeout = null;
        if (e.ctrlKey || e.metaKey) {
          toggleSelectGridItem(gridItem);
        } else {
          selectSingleGridItem(gridItem);
        }
      }, 250);
    }
  });

  gridItem.addEventListener('contextmenu', (e) => showContextMenu(e, gridItem));
  elements.fileGrid.appendChild(gridItem);
}

// Selection functions
function selectSingleItem(row) {
  document.querySelectorAll('.file-item').forEach(r => r.classList.remove('selected'));
  state.selectedItems.clear();
  row.classList.add('selected');
  state.selectedItems.add(row.dataset.path);
}

function toggleSelectItem(row) {
  if (state.selectedItems.has(row.dataset.path)) {
    row.classList.remove('selected');
    state.selectedItems.delete(row.dataset.path);
  } else {
    row.classList.add('selected');
    state.selectedItems.add(row.dataset.path);
  }
}

function selectRangeItems(row) {
  const allRows = Array.from(document.querySelectorAll('.file-item'));
  const lastSelected = Array.from(state.selectedItems)[state.selectedItems.size - 1];
  const lastRow = allRows.find(r => r.dataset.path === lastSelected);
  if (!lastRow) return selectSingleItem(row);
  const startIdx = allRows.indexOf(lastRow);
  const endIdx = allRows.indexOf(row);
  const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
  for (let i = from; i <= to; i++) {
    allRows[i].classList.add('selected');
    state.selectedItems.add(allRows[i].dataset.path);
  }
}

function selectSingleGridItem(gridItem) {
  document.querySelectorAll('.file-grid-item').forEach(r => r.classList.remove('selected'));
  state.selectedItems.clear();
  gridItem.classList.add('selected');
  state.selectedItems.add(gridItem.dataset.path);
}

function toggleSelectGridItem(gridItem) {
  if (state.selectedItems.has(gridItem.dataset.path)) {
    gridItem.classList.remove('selected');
    state.selectedItems.delete(gridItem.dataset.path);
  } else {
    gridItem.classList.add('selected');
    state.selectedItems.add(gridItem.dataset.path);
  }
}

// List files
async function list(pathStr) {
  renderCrumbs(pathStr);
  const data = await api(`/api/list?path=${encodeURIComponent(pathStr)}`);
  elements.fileListBody.innerHTML = '';
  elements.fileGrid.innerHTML = '';
  state.selectedItems.clear();
  state.allFileItems = data.items;

  for (const item of data.items) {
    if (state.currentView === 'list') {
      createListItem(item);
    } else {
      createGridItem(item);
    }
  }
}

// Change directory
async function changeDir(next) {
  if (next && next !== state.currentPath) {
    state.backStack.push(state.currentPath);
    state.fwdStack = [];
  }
  state.currentPath = next || '/';
  await list(state.currentPath);
  persist();
}

// Context menu
function showContextMenu(e, element) {
  e.preventDefault();
  if (!state.selectedItems.has(element.dataset.path)) {
    if (state.currentView === 'list') {
      selectSingleItem(element);
    } else {
      selectSingleGridItem(element);
    }
  }
  state.contextItem = {
    path: element.dataset.path,
    type: element.dataset.type,
    name: element.dataset.name
  };

  const ctxOpen = el('ctxOpen');
  const ctxDownload = el('ctxDownload');
  if (state.contextItem.type === 'dir') {
    ctxOpen.classList.add('disabled');
    ctxDownload.classList.add('disabled');
  } else {
    ctxOpen.classList.remove('disabled');
    ctxDownload.classList.remove('disabled');
  }

  elements.contextMenu.style.left = e.pageX + 'px';
  elements.contextMenu.style.top = e.pageY + 'px';
  elements.contextMenu.classList.remove('hidden');
}

function hideContextMenu() {
  elements.contextMenu.classList.add('hidden');
  state.contextItem = null;
}

document.addEventListener('click', (e) => {
  if (!elements.contextMenu.contains(e.target)) {
    hideContextMenu();
  }
});

// Context menu actions
el('ctxOpen').addEventListener('click', () => {
  if (state.contextItem && state.contextItem.type !== 'dir') {
    openEditor(state.contextItem.path);
  }
  hideContextMenu();
});

el('ctxDownload').addEventListener('click', () => {
  if (state.contextItem && state.contextItem.type !== 'dir') {
    download(state.contextItem.path);
  }
  hideContextMenu();
});

el('ctxRename').addEventListener('click', async () => {
  if (state.contextItem) await rename(state.contextItem.path);
  hideContextMenu();
});

el('ctxDelete').addEventListener('click', async () => {
  if (state.contextItem) await remove(state.contextItem.path, state.contextItem.type);
  hideContextMenu();
});

// File operations
async function download(p) {
  try {
    const res = await api(`/api/download?path=${encodeURIComponent(p)}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = p.split('/').pop();
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Download started', 'success');
  } catch (err) {
    showNotification(`Download failed: ${err.message}`, 'error');
  }
}

async function remove(p, type) {
  const confirmed = await customConfirm(`Delete ${p}?`, 'Delete');
  if (!confirmed) return;
  try {
    await api('/api/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: p, type })
    });
    await list(state.currentPath);
    showNotification('Deleted successfully', 'success');
  } catch (err) {
    showNotification(`Delete failed: ${err.message}`, 'error');
  }
}

async function rename(oldPath) {
  const base = oldPath.split('/').pop();
  const dir = oldPath.slice(0, oldPath.length - base.length);
  const name = await customPrompt('New name:', base, 'Rename');
  if (!name || name === base) return;
  const newPath = (dir.endsWith('/') ? dir : dir + '/') + name;
  try {
    await api('/api/rename', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath })
    });
    await list(state.currentPath);
    showNotification('Renamed successfully', 'success');
  } catch (err) {
    showNotification(`Rename failed: ${err.message}`, 'error');
  }
}

// Editor
async function openEditor(p) {
  const modal = el('editorModal');
  const title = el('editorTitle');
  const editor = el('editor');
  const saveBtn = el('saveBtn');

  modal.classList.remove('hidden');
  title.textContent = p;
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
        await list(state.currentPath);
        modal.classList.add('hidden');
        showNotification('File saved', 'success');
      } catch (err) {
        showNotification(`Save failed: ${err.message}`, 'error');
      } finally {
        saveBtn.disabled = false;
      }
    };
  } catch (err) {
    editor.value = `Cannot open: ${err.message}\n\nBinary or large files cannot be edited.`;
    editor.disabled = true;
  }
}

el('closeEditorModal').addEventListener('click', () => el('editorModal').classList.add('hidden'));
el('cancelEditBtn').addEventListener('click', () => el('editorModal').classList.add('hidden'));
el('editorModal').querySelector('.modal-backdrop').addEventListener('click', () => el('editorModal').classList.add('hidden'));

// Connection modal
elements.connectModalBtn.addEventListener('click', () => el('connectionModal').classList.remove('hidden'));
elements.emptyConnectBtn.addEventListener('click', () => el('connectionModal').classList.remove('hidden'));
el('closeConnectionModal').addEventListener('click', () => el('connectionModal').classList.add('hidden'));
el('cancelConnectBtn').addEventListener('click', () => el('connectionModal').classList.add('hidden'));
el('connectionModal').querySelector('.modal-backdrop').addEventListener('click', () => el('connectionModal').classList.add('hidden'));

// Connect
elements.connectBtn.addEventListener('click', async () => {
  const host = el('host').value.trim();
  const port = Number(el('port').value) || 22;
  const username = el('username').value.trim();
  const password = el('password').value;
  const privateKey = el('privateKey').value.trim();
  const passphrase = el('passphrase').value;

  elements.connectBtn.disabled = true;
  setStatus('Connecting...');

  try {
    const data = await api('/api/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ host, port, username, password: password || undefined, privateKey: privateKey || undefined, passphrase: passphrase || undefined })
    });

    state.token = data.token;
    state.userHost = `${data.username}@${data.host}`;
    setStatus(`Connected: ${state.userHost}`, true);
    document.body.setAttribute('data-connected', 'true');
    await changeDir('/');
    localStorage.setItem('rf_token', state.token);
    localStorage.setItem('rf_userhost', state.userHost);
    renderFavorites();
    updateUserDisplay();
    el('connectionModal').classList.add('hidden');

    // Server history
    const historyEntry = { host, port, username, timestamp: Date.now() };
    state.serverHistory.unshift(historyEntry);
    state.serverHistory = state.serverHistory.slice(0, 10);
    localStorage.setItem('rf_serverHistory', JSON.stringify(state.serverHistory));

    // Ask to save
    const connectionName = await showSaveConnectionModal({ host, port, username });
    if (connectionName) {
      const storePassword = password ? await customConfirm('Store password in browser?', 'Security Warning') : false;
      const id = crypto.randomUUID();
      state.savedConnections.push({
        id, name: connectionName, host, port, username,
        password: storePassword ? password : undefined,
        privateKey: privateKey || undefined,
        passphrase: passphrase || undefined
      });
      localStorage.setItem('rf_savedConnections', JSON.stringify(state.savedConnections));
      renderSavedConnections();
      showNotification('Connection saved', 'success');
    }

    showNotification('Connected successfully', 'success');
  } catch (e) {
    showNotification(`Connection error: ${e.message}`, 'error');
    setStatus('Not connected');
  } finally {
    elements.connectBtn.disabled = false;
  }
});

// Disconnect
async function disconnect() {
  if (!state.token) return;
  try { await api('/api/disconnect', { method: 'POST' }); } catch {}
  state.token = null;
  state.userHost = null;
  state.currentPath = '/';
  setStatus('Not connected');
  document.body.setAttribute('data-connected', 'false');
  elements.fileListBody.innerHTML = '';
  localStorage.removeItem('rf_token');
  localStorage.removeItem('rf_path');
  localStorage.removeItem('rf_userhost');
  updateUserDisplay();
  showNotification('Disconnected', 'info');

  // Destroy all terminals
  destroyAllTerminals();
}

elements.headerDisconnect.addEventListener('click', disconnect);

// Navigation
elements.backBtn.addEventListener('click', async () => {
  if (!state.backStack.length) return;
  state.fwdStack.push(state.currentPath);
  state.currentPath = state.backStack.pop();
  await list(state.currentPath);
});

elements.forwardBtn.addEventListener('click', async () => {
  if (!state.fwdStack.length) return;
  state.backStack.push(state.currentPath);
  state.currentPath = state.fwdStack.pop();
  await list(state.currentPath);
});

elements.refreshBtn.addEventListener('click', () => list(state.currentPath));

// View toggle
elements.listViewBtn.addEventListener('click', () => {
  state.currentView = 'list';
  elements.fileList.classList.remove('hidden');
  elements.fileGrid.classList.add('hidden');
  elements.listViewBtn.classList.add('active');
  elements.gridViewBtn.classList.remove('active');
  list(state.currentPath);
});

elements.gridViewBtn.addEventListener('click', () => {
  state.currentView = 'grid';
  elements.fileList.classList.add('hidden');
  elements.fileGrid.classList.remove('hidden');
  elements.gridViewBtn.classList.add('active');
  elements.listViewBtn.classList.remove('active');
  list(state.currentPath);
});

// Multi-Terminal Management
function createTerminal() {
  if (!state.token) {
    showNotification('Please connect first', 'warning');
    return;
  }

  const terminalId = 'term_' + Date.now();
  const container = document.createElement('div');
  container.className = 'terminal-container';
  container.id = terminalId;
  elements.terminalBody.appendChild(container);

  const terminal = new Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace',
    theme: {
      background: document.documentElement.getAttribute('data-theme') === 'dark' ? '#0a0a0a' : '#ffffff',
      foreground: document.documentElement.getAttribute('data-theme') === 'dark' ? '#d4d4d4' : '#1d1d1f',
      cursor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#d4d4d4' : '#1d1d1f'
    },
    scrollback: 1000,
    rendererType: 'canvas'
  });

  const fitAddon = new FitAddon.FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(container);
  setTimeout(() => fitAddon.fit(), 100);

  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProto}//${window.location.host}?token=${state.token}`;
  const socket = new WebSocket(wsUrl);

  socket.onopen = () => terminal.writeln('\x1b[32m✓ Connected\x1b[0m\r\n');
  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'output') terminal.write(msg.data);
      else if (msg.type === 'error') terminal.writeln(`\r\n\x1b[31m✗ ${msg.data}\x1b[0m\r\n`);
    } catch {}
  };
  socket.onerror = () => terminal.writeln('\r\n\x1b[31m✗ Error\x1b[0m\r\n');
  socket.onclose = () => terminal.writeln('\r\n\x1b[33m○ Closed\x1b[0m\r\n');
  terminal.onData((data) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', data }));
    }
  });

  let resizeTimeout;
  const resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      try {
        fitAddon.fit();
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'resize',
            rows: terminal.rows,
            cols: terminal.cols
          }));
        }
      } catch {}
    }, 100);
  });
  resizeObserver.observe(container);

  state.terminals.push({ id: terminalId, terminal, fitAddon, socket, resizeObserver, container });
  state.activeTerminalId = terminalId;
  renderTerminalTabs();
  switchTerminal(terminalId);
}

function switchTerminal(terminalId) {
  state.terminals.forEach(t => {
    t.container.classList.remove('active');
  });
  const term = state.terminals.find(t => t.id === terminalId);
  if (term) {
    term.container.classList.add('active');
    state.activeTerminalId = terminalId;
    setTimeout(() => term.fitAddon.fit(), 50);
    renderTerminalTabs();
  }
}

function closeTerminalTab(terminalId) {
  const index = state.terminals.findIndex(t => t.id === terminalId);
  if (index === -1) return;

  const term = state.terminals[index];
  if (term.socket) term.socket.close();
  if (term.terminal) term.terminal.dispose();
  if (term.resizeObserver) term.resizeObserver.disconnect();
  if (term.container) term.container.remove();

  state.terminals.splice(index, 1);

  if (state.terminals.length === 0) {
    elements.terminalPanel.classList.add('hidden');
    elements.mainContent.classList.remove('terminal-open');
    state.activeTerminalId = null;
  } else {
    const newActive = state.terminals[Math.max(0, index - 1)];
    switchTerminal(newActive.id);
  }

  renderTerminalTabs();
}

function renderTerminalTabs() {
  elements.terminalTabs.innerHTML = '';
  state.terminals.forEach((term, idx) => {
    const tab = document.createElement('button');
    tab.className = 'terminal-tab' + (term.id === state.activeTerminalId ? ' active' : '');
    tab.innerHTML = `
      <span>Terminal ${idx + 1}</span>
      <span class="terminal-tab-close">✕</span>
    `;
    tab.querySelector('span:first-child').addEventListener('click', () => switchTerminal(term.id));
    tab.querySelector('.terminal-tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeTerminalTab(term.id);
    });
    elements.terminalTabs.appendChild(tab);
  });
}

function destroyAllTerminals() {
  state.terminals.forEach(term => {
    if (term.socket) term.socket.close();
    if (term.terminal) term.terminal.dispose();
    if (term.resizeObserver) term.resizeObserver.disconnect();
    if (term.container) term.container.remove();
  });
  state.terminals = [];
  state.activeTerminalId = null;
  elements.terminalPanel.classList.add('hidden');
  elements.mainContent.classList.remove('terminal-open');
}

// Terminal toggle
elements.terminalToggle.addEventListener('click', () => {
  if (!state.token) {
    showNotification('Connect first', 'warning');
    return;
  }

  if (elements.terminalPanel.classList.contains('hidden')) {
    elements.terminalPanel.classList.remove('hidden');
    elements.mainContent.classList.add('terminal-open');
    if (state.terminals.length === 0) {
      createTerminal();
    }
  } else {
    elements.terminalPanel.classList.add('hidden');
    elements.mainContent.classList.remove('terminal-open');
  }
});

elements.newTerminalBtn.addEventListener('click', createTerminal);
elements.closeTerminal.addEventListener('click', () => {
  elements.terminalPanel.classList.add('hidden');
  elements.mainContent.classList.remove('terminal-open');
});

// New folder/file
elements.newFolderBtn.addEventListener('click', async () => {
  const name = await customPrompt('Folder name:', '', 'New Folder');
  if (!name) return;
  const p = (state.currentPath.endsWith('/') ? state.currentPath : state.currentPath + '/') + name;
  try {
    await api('/api/mkdir', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: p })
    });
    await list(state.currentPath);
    showNotification('Folder created', 'success');
  } catch (err) {
    showNotification(`Failed: ${err.message}`, 'error');
  }
});

elements.newFileBtn.addEventListener('click', async () => {
  const name = await customPrompt('File name:', '', 'New File');
  if (!name) return;
  const p = (state.currentPath.endsWith('/') ? state.currentPath : state.currentPath + '/') + name;
  try {
    await api('/api/touch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: p, content: '' })
    });
    await list(state.currentPath);
    showNotification('File created', 'success');
  } catch (err) {
    showNotification(`Failed: ${err.message}`, 'error');
  }
});

// Upload
elements.fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  for (const file of files) {
    const target = (state.currentPath.endsWith('/') ? state.currentPath : state.currentPath + '/') + file.name;
    const form = new FormData();
    form.append('file', file);
    form.append('path', target);
    try {
      await api('/api/upload', { method: 'POST', body: form });
    } catch (err) {
      showNotification(`Upload failed for ${file.name}`, 'error');
    }
  }
  await list(state.currentPath);
  showNotification(`Uploaded ${files.length} file(s)`, 'success');
  e.target.value = '';
});

// Drag & drop
['dragenter', 'dragover'].forEach(ev =>
  elements.fileList.addEventListener(ev, e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    elements.fileList.classList.add('drag-over');
  })
);

['dragleave', 'drop'].forEach(ev =>
  elements.fileList.addEventListener(ev, e => {
    e.preventDefault();
    elements.fileList.classList.remove('drag-over');
  })
);

elements.fileList.addEventListener('drop', async (e) => {
  const files = [...e.dataTransfer.files];
  for (const file of files) {
    const target = (state.currentPath.endsWith('/') ? state.currentPath : state.currentPath + '/') + file.name;
    const form = new FormData();
    form.append('file', file);
    form.append('path', target);
    try {
      await api('/api/upload', { method: 'POST', body: form });
    } catch (err) {
      showNotification(`Failed: ${file.name}`, 'error');
    }
  }
  await list(state.currentPath);
  showNotification(`Uploaded ${files.length} file(s)`, 'success');
});

// Trash button
elements.trashBtn.addEventListener('click', async () => {
  if (!state.selectedItems.size) {
    showNotification('No files selected', 'warning');
    return;
  }
  const confirmed = await customConfirm(`Delete ${state.selectedItems.size} item(s)?`, 'Delete');
  if (!confirmed) return;

  const items = Array.from(state.selectedItems);
  for (const path of items) {
    try {
      const element = document.querySelector(`[data-path="${path}"]`);
      const type = element?.dataset.type || 'file';
      await api('/api/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path, type })
      });
    } catch (err) {
      showNotification(`Failed to delete ${path}`, 'error');
    }
  }
  await list(state.currentPath);
  showNotification(`Deleted ${items.length} item(s)`, 'success');
});

// Favorites
elements.favAddBtn.addEventListener('click', () => {
  if (!state.userHost) {
    showNotification('Connect first', 'warning');
    return;
  }
  const list = state.favorites[state.userHost] || [];
  if (list.includes(state.currentPath)) {
    showNotification('Already in favorites', 'info');
    return;
  }
  list.push(state.currentPath);
  state.favorites[state.userHost] = list;
  localStorage.setItem('rf_favorites', JSON.stringify(state.favorites));
  renderFavorites();
  showNotification('Added to favorites', 'success');
});

function renderFavorites() {
  elements.favoritesEl.innerHTML = '';
  const list = state.favorites[state.userHost] || [];
  if (!list.length) {
    elements.favoritesEl.innerHTML = '<div class="sidebar-empty">No favorites</div>';
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
      state.favorites[state.userHost] = (state.favorites[state.userHost] || []).filter(x => x !== p);
      localStorage.setItem('rf_favorites', JSON.stringify(state.favorites));
      renderFavorites();
    });
    div.append(nameSpan, rmBtn);
    elements.favoritesEl.appendChild(div);
  }
}

// Saved Connections
function renderSavedConnections() {
  elements.savedConnectionsEl.innerHTML = '';
  if (!state.savedConnections.length) {
    elements.savedConnectionsEl.innerHTML = '<div class="sidebar-empty">No saved connections</div>';
    return;
  }
  state.savedConnections.forEach(conn => {
    const div = document.createElement('div');
    div.className = 'sidebar-item';
    div.title = `${conn.username}@${conn.host}:${conn.port}`;
    const nameSpan = document.createElement('span');
    nameSpan.className = 'sidebar-item-name';
    nameSpan.textContent = conn.name;
    const rmBtn = document.createElement('span');
    rmBtn.className = 'sidebar-item-action';
    rmBtn.textContent = '✕';
    rmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.savedConnections = state.savedConnections.filter(c => c.id !== conn.id);
      localStorage.setItem('rf_savedConnections', JSON.stringify(state.savedConnections));
      renderSavedConnections();
    });
    div.addEventListener('click', () => {
      el('host').value = conn.host;
      el('port').value = conn.port;
      el('username').value = conn.username;
      if (conn.password) el('password').value = conn.password;
      if (conn.privateKey) el('privateKey').value = conn.privateKey;
      if (conn.passphrase) el('passphrase').value = conn.passphrase;
      el('connectionModal').classList.remove('hidden');
    });
    div.append(nameSpan, rmBtn);
    elements.savedConnectionsEl.appendChild(div);
  });
}

function showSaveConnectionModal(connectionInfo) {
  const defaultName = `${connectionInfo.username}@${connectionInfo.host}`;
  el('saveConnName').textContent = defaultName;
  el('saveConnCustomName').value = '';
  el('saveConnectionModal').classList.remove('hidden');

  return new Promise((resolve) => {
    const cleanup = (shouldSave) => {
      el('saveConnectionModal').classList.add('hidden');
      el('confirmSaveConnection').onclick = null;
      el('cancelSaveConnection').onclick = null;
      el('closeSaveConnection').onclick = null;
      resolve(shouldSave ? (el('saveConnCustomName').value || defaultName) : null);
    };
    el('confirmSaveConnection').onclick = () => cleanup(true);
    el('cancelSaveConnection').onclick = () => cleanup(false);
    el('closeSaveConnection').onclick = () => cleanup(false);
  });
}

// Server History
elements.serverHistoryToggle.addEventListener('click', () => {
  el('serverHistoryModal').classList.remove('hidden');
  renderServerHistory();
});

el('closeServerHistory').addEventListener('click', () => {
  el('serverHistoryModal').classList.add('hidden');
});

el('serverHistoryModal').querySelector('.modal-backdrop').addEventListener('click', () => {
  el('serverHistoryModal').classList.add('hidden');
});

function renderServerHistory() {
  const list = el('serverHistoryList');
  list.innerHTML = '';
  if (!state.serverHistory.length) {
    list.innerHTML = '<div class="server-history-empty">No recent connections</div>';
    return;
  }
  state.serverHistory.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'server-history-item';
    div.innerHTML = `
      <div class="server-history-info">
        <div class="server-history-host">${entry.username}@${entry.host}:${entry.port}</div>
        <div class="server-history-time">${new Date(entry.timestamp).toLocaleString()}</div>
      </div>
    `;
    div.addEventListener('click', () => {
      el('host').value = entry.host;
      el('port').value = entry.port;
      el('username').value = entry.username;
      el('serverHistoryModal').classList.add('hidden');
      el('connectionModal').classList.remove('hidden');
    });
    list.appendChild(div);
  });
}

// SFTP Tools - Fixed for SSH connection
el('diskUsageToggle').addEventListener('click', async () => {
  if (!state.token) {
    showNotification('Connect first', 'warning');
    return;
  }
  try {
    showNotification('Analyzing disk usage...', 'info');
    const result = await api('/api/exec', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: `du -sh ${state.currentPath}/* 2>/dev/null | sort -hr | head -20` })
    });
    const lines = result.output.trim().split('\n').filter(l => l);
    if (!lines.length) {
      showNotification('No data', 'info');
      return;
    }
    let message = 'Top 20 largest items:\n\n' + lines.join('\n');
    el('alertTitle').textContent = 'Disk Usage - ' + state.currentPath;
    el('alertMessage').textContent = message;
    el('alertMessage').style.whiteSpace = 'pre-wrap';
    el('alertMessage').style.fontFamily = 'monospace';
    el('alertMessage').style.fontSize = '12px';
    el('alertModal').classList.remove('hidden');
    el('okAlert').onclick = () => {
      el('alertModal').classList.add('hidden');
      el('alertMessage').style.whiteSpace = '';
      el('alertMessage').style.fontFamily = '';
      el('alertMessage').style.fontSize = '';
    };
    el('closeAlert').onclick = el('okAlert').onclick;
  } catch (err) {
    showNotification(`Failed: ${err.message}`, 'error');
  }
});

el('findDuplicatesToggle').addEventListener('click', async () => {
  if (!state.token) {
    showNotification('Connect first', 'warning');
    return;
  }
  const confirmed = await customConfirm('Search for duplicates? May take time.', 'Find Duplicates');
  if (!confirmed) return;
  try {
    showNotification('Searching...', 'info');
    const result = await api('/api/exec', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        command: `find ${state.currentPath} -type f -exec md5sum {} + 2>/dev/null | sort | uniq -w32 -D --all-repeated=separate | head -50`
      })
    });
    if (!result.output.trim()) {
      showNotification('No duplicates found', 'success');
      return;
    }
    el('alertTitle').textContent = 'Duplicate Files';
    el('alertMessage').textContent = result.output.trim();
    el('alertMessage').style.whiteSpace = 'pre-wrap';
    el('alertMessage').style.fontFamily = 'monospace';
    el('alertMessage').style.fontSize = '11px';
    el('alertModal').classList.remove('hidden');
    el('okAlert').onclick = () => {
      el('alertModal').classList.add('hidden');
      el('alertMessage').style.whiteSpace = '';
      el('alertMessage').style.fontFamily = '';
      el('alertMessage').style.fontSize = '';
    };
    el('closeAlert').onclick = el('okAlert').onclick;
  } catch (err) {
    showNotification(`Failed: ${err.message}`, 'error');
  }
});

el('compressToggle').addEventListener('click', async () => {
  if (!state.token) {
    showNotification('Connect first', 'warning');
    return;
  }
  if (!state.selectedItems.size) {
    showNotification('Select files to compress', 'warning');
    return;
  }
  const action = await customConfirm('Compress selected items?\n(OK=compress, Cancel=extract)', 'Compress or Extract');
  if (action === null) return;

  if (action) {
    const archiveName = await customPrompt('Archive name:', 'archive.tar.gz', 'Create Archive');
    if (!archiveName) return;
    try {
      const items = Array.from(state.selectedItems).map(p => p.split('/').pop()).join(' ');
      showNotification('Compressing...', 'info');
      const result = await api('/api/exec', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ command: `cd ${state.currentPath} && tar -czf ${archiveName} ${items}` })
      });
      if (result.exitCode === 0) {
        await list(state.currentPath);
        showNotification('Compressed successfully', 'success');
      } else {
        showNotification('Failed: ' + result.errorOutput, 'error');
      }
    } catch (err) {
      showNotification(`Failed: ${err.message}`, 'error');
    }
  } else {
    if (state.selectedItems.size !== 1) {
      showNotification('Select exactly one archive', 'warning');
      return;
    }
    const archivePath = Array.from(state.selectedItems)[0];
    const archiveName = archivePath.split('/').pop();
    if (!archiveName.match(/\.(tar\.gz|tgz|tar|zip|tar\.bz2)$/i)) {
      showNotification('Unsupported format', 'error');
      return;
    }
    try {
      showNotification('Extracting...', 'info');
      let command;
      if (archiveName.endsWith('.tar.gz') || archiveName.endsWith('.tgz')) {
        command = `cd ${state.currentPath} && tar -xzf ${archiveName}`;
      } else if (archiveName.endsWith('.tar.bz2')) {
        command = `cd ${state.currentPath} && tar -xjf ${archiveName}`;
      } else if (archiveName.endsWith('.tar')) {
        command = `cd ${state.currentPath} && tar -xf ${archiveName}`;
      } else if (archiveName.endsWith('.zip')) {
        command = `cd ${state.currentPath} && unzip -o ${archiveName}`;
      }
      const result = await api('/api/exec', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ command })
      });
      if (result.exitCode === 0) {
        await list(state.currentPath);
        showNotification('Extracted successfully', 'success');
      } else {
        showNotification('Failed: ' + result.errorOutput, 'error');
      }
    } catch (err) {
      showNotification(`Failed: ${err.message}`, 'error');
    }
  }
});

// Properties
el('ctxProperties').addEventListener('click', async () => {
  if (!state.contextItem) return;
  try {
    const data = await api(`/api/stat?path=${encodeURIComponent(state.contextItem.path)}`);
    const info = data.info;
    el('propertiesContent').innerHTML = `
      <div class="property-row">
        <div class="property-label">Name:</div>
        <div class="property-value">${state.contextItem.name}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Path:</div>
        <div class="property-value">${state.contextItem.path}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Type:</div>
        <div class="property-value">${state.contextItem.type === 'dir' ? 'Directory' : 'File'}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Size:</div>
        <div class="property-value">${info.size ? (info.size / 1024).toFixed(2) + ' KB' : '—'}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Permissions:</div>
        <div class="property-value">${info.mode ? info.mode.toString(8).slice(-3) : '—'}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Owner:</div>
        <div class="property-value">${info.uid || '—'}</div>
      </div>
      <div class="property-row">
        <div class="property-label">Modified:</div>
        <div class="property-value">${info.mtime ? new Date(info.mtime).toLocaleString() : '—'}</div>
      </div>
    `;
    el('propertiesModal').classList.remove('hidden');
    hideContextMenu();
  } catch (err) {
    showNotification(`Failed: ${err.message}`, 'error');
    hideContextMenu();
  }
});

el('closeProperties').addEventListener('click', () => el('propertiesModal').classList.add('hidden'));
el('closePropertiesBtn').addEventListener('click', () => el('propertiesModal').classList.add('hidden'));
el('propertiesModal').querySelector('.modal-backdrop').addEventListener('click', () => el('propertiesModal').classList.add('hidden'));

// Permissions
el('ctxPermissions').addEventListener('click', async () => {
  if (!state.contextItem) return;
  try {
    const data = await api(`/api/stat?path=${encodeURIComponent(state.contextItem.path)}`);
    const currentPerms = data.info.mode ? data.info.mode.toString(8).slice(-3) : '755';
    el('permissionsInput').value = currentPerms;
    el('permissionsModal').classList.remove('hidden');
    el('permissionsInput').focus();
    el('permissionsInput').select();
    hideContextMenu();
  } catch (err) {
    showNotification(`Failed: ${err.message}`, 'error');
    hideContextMenu();
  }
});

el('confirmPermissions').addEventListener('click', async () => {
  const perms = el('permissionsInput').value.trim();
  if (!/^[0-7]{3}$/.test(perms)) {
    showNotification('Invalid format. Use 3 digits', 'error');
    return;
  }
  try {
    await api('/api/exec', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: `chmod ${perms} "${state.contextItem.path}"` })
    });
    el('permissionsModal').classList.add('hidden');
    await list(state.currentPath);
    showNotification('Permissions updated', 'success');
  } catch (err) {
    showNotification(`Failed: ${err.message}`, 'error');
  }
});

el('closePermissions').addEventListener('click', () => el('permissionsModal').classList.add('hidden'));
el('cancelPermissions').addEventListener('click', () => el('permissionsModal').classList.add('hidden'));
el('permissionsModal').querySelector('.modal-backdrop').addEventListener('click', () => el('permissionsModal').classList.add('hidden'));

// Sidebar toggle
let sidebarCollapsed = localStorage.getItem('rf_sidebarCollapsed') === 'true';
if (sidebarCollapsed) {
  document.body.classList.add('sidebar-collapsed');
  elements.sidebar.classList.add('collapsed');
}

elements.sidebarToggle.addEventListener('click', () => {
  sidebarCollapsed = !sidebarCollapsed;
  localStorage.setItem('rf_sidebarCollapsed', sidebarCollapsed);
  if (sidebarCollapsed) {
    document.body.classList.add('sidebar-collapsed');
    elements.sidebar.classList.add('collapsed');
  } else {
    document.body.classList.remove('sidebar-collapsed');
    elements.sidebar.classList.remove('collapsed');
  }
});

// Mobile menu
const mobileMenuBtn = el('mobileMenuBtn');
const mobileOverlay = el('mobileOverlay');
mobileMenuBtn.addEventListener('click', () => {
  elements.sidebar.classList.add('mobile-open');
  mobileOverlay.classList.add('active');
});
mobileOverlay.addEventListener('click', () => {
  elements.sidebar.classList.remove('mobile-open');
  mobileOverlay.classList.remove('active');
});

// DateTime update
function updateDateTime() {
  if (!elements.currentDateTime) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  elements.currentDateTime.textContent = `${timeStr} • ${dateStr}`;
}
updateDateTime();
setInterval(updateDateTime, 1000);

// Update user display
function updateUserDisplay() {
  if (!elements.currentUser) return;
  if (state.userHost) {
    elements.currentUser.textContent = state.userHost;
    elements.currentUser.style.display = '';
  } else {
    elements.currentUser.textContent = '';
    elements.currentUser.style.display = 'none';
  }
}

// Quick search inline
let searchTimeout;
if (elements.quickSearchInput) {
  elements.quickSearchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim().toLowerCase();

    if (!query) {
      elements.fileListBody.innerHTML = '';
      elements.fileGrid.innerHTML = '';
      state.allFileItems.forEach(item => {
        if (state.currentView === 'list') createListItem(item);
        else createGridItem(item);
      });
      return;
    }

    searchTimeout = setTimeout(() => {
      const filtered = state.allFileItems.filter(item => item.name.toLowerCase().includes(query));
      elements.fileListBody.innerHTML = '';
      elements.fileGrid.innerHTML = '';
      if (!filtered.length) {
        const msg = '<div style="padding:40px;text-align:center;color:var(--text-secondary)">No files found</div>';
        if (state.currentView === 'list') elements.fileListBody.innerHTML = msg;
        else elements.fileGrid.innerHTML = msg;
      } else {
        filtered.forEach(item => {
          if (state.currentView === 'list') createListItem(item);
          else createGridItem(item);
        });
      }
    }, 200);
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      elements.quickSearchInput.focus();
      elements.quickSearchInput.select();
    }
  });
}

// Theme
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('rf_theme', t);
}

function detectSystemTheme() {
  const saved = localStorage.getItem('rf_theme');
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

elements.themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(cur === 'light' ? 'dark' : 'light');
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('rf_theme')) {
    applyTheme(e.matches ? 'dark' : 'light');
  }
});

// Persist
function persist() {
  if (state.token) localStorage.setItem('rf_token', state.token);
  if (state.currentPath) localStorage.setItem('rf_path', state.currentPath);
  if (state.userHost) localStorage.setItem('rf_userhost', state.userHost);
}
setInterval(persist, 1000);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideContextMenu();
    ['editorModal', 'connectionModal', 'serverHistoryModal', 'saveConnectionModal', 'propertiesModal', 'permissionsModal'].forEach(id => {
      const modal = el(id);
      if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
      }
    });
  }
});

// Load saved data
try {
  state.favorites = JSON.parse(localStorage.getItem('rf_favorites') || '{}');
  state.savedConnections = JSON.parse(localStorage.getItem('rf_savedConnections') || '[]');
  state.serverHistory = JSON.parse(localStorage.getItem('rf_serverHistory') || '[]');
} catch {
  state.favorites = {};
  state.savedConnections = [];
  state.serverHistory = [];
}

// Init
renderCrumbs('/');
renderSavedConnections();

// Try restore session
(async function tryRestore() {
  const theme = detectSystemTheme();
  applyTheme(theme);

  const savedToken = localStorage.getItem('rf_token');
  const savedPath = localStorage.getItem('rf_path') || '/';
  const uh = localStorage.getItem('rf_userhost');

  if (!savedToken) return;

  state.token = savedToken;
  state.currentPath = savedPath;
  state.userHost = uh;

  try {
    await list(state.currentPath);
    setStatus(uh ? `Connected: ${uh}` : 'Connected', true);
    document.body.setAttribute('data-connected', 'true');
    renderFavorites();
    updateUserDisplay();
  } catch {
    state.token = null;
    state.userHost = null;
    setStatus('Not connected');
    document.body.setAttribute('data-connected', 'false');
    localStorage.removeItem('rf_token');
    localStorage.removeItem('rf_userhost');
  }
})();
