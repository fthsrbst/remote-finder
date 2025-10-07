const el = (id) => document.getElementById(id);

// State
let token = null;
let currentPath = '/';
let userHost = null;
let backStack = [];
let fwdStack = [];
let savedConnections = [];
let serverHistory = [];
let favorites = {};
let selectedItems = new Set(); // Multi-select support
let contextItem = null;
let currentView = 'list';
let terminalOpen = false;

// Elements
const statusEl = el('status');
const connectBtn = el('connectBtn');
const connectModalBtn = el('connectModalBtn');
const emptyConnectBtn = el('emptyConnectBtn');
const headerDisconnect = el('headerDisconnect');
const favoritesEl = el('favorites');
const themeToggle = el('themeToggle');
const refreshBtn = el('refreshBtn');
const trashBtn = el('trashBtn');
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
const quickSearchToggle = el('quickSearchToggle');
const serverHistoryToggle = el('serverHistoryToggle');

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
const quickSearchModal = el('quickSearchModal');
const closeQuickSearch = el('closeQuickSearch');
const searchInput = el('searchInput');
const searchResults = el('searchResults');
const serverHistoryModal = el('serverHistoryModal');
const closeServerHistory = el('closeServerHistory');
const serverHistoryList = el('serverHistoryList');
const saveConnectionModal = el('saveConnectionModal');
const closeSaveConnection = el('closeSaveConnection');
const cancelSaveConnection = el('cancelSaveConnection');
const confirmSaveConnection = el('confirmSaveConnection');
const saveConnName = el('saveConnName');
const saveConnCustomName = el('saveConnCustomName');

// Context Menu
const contextMenu = el('contextMenu');
const ctxOpen = el('ctxOpen');
const ctxDownload = el('ctxDownload');
const ctxRename = el('ctxRename');
const ctxDelete = el('ctxDelete');

// Custom notification system (temaya uygun)
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

// Custom confirm dialog (temaya uygun)
function customConfirm(message, title = 'Confirm') {
  return new Promise((resolve) => {
    const confirmModal = el('confirmModal');
    const confirmTitle = el('confirmTitle');
    const confirmMessage = el('confirmMessage');
    const okConfirm = el('okConfirm');
    const cancelConfirm = el('cancelConfirm');
    const closeConfirm = el('closeConfirm');

    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmModal.classList.remove('hidden');

    const cleanup = (result) => {
      confirmModal.classList.add('hidden');
      okConfirm.onclick = null;
      cancelConfirm.onclick = null;
      closeConfirm.onclick = null;
      resolve(result);
    };

    okConfirm.onclick = () => cleanup(true);
    cancelConfirm.onclick = () => cleanup(false);
    closeConfirm.onclick = () => cleanup(false);
  });
}

// Custom prompt dialog (temaya uygun)
function customPrompt(message, defaultValue = '', title = 'Input') {
  return new Promise((resolve) => {
    const promptModal = el('promptModal');
    const promptTitle = el('promptTitle');
    const promptLabel = el('promptLabel');
    const promptInput = el('promptInput');
    const confirmPrompt = el('confirmPrompt');
    const cancelPrompt = el('cancelPrompt');
    const closePrompt = el('closePrompt');

    promptTitle.textContent = title;
    promptLabel.textContent = message;
    promptInput.value = defaultValue;
    promptModal.classList.remove('hidden');
    promptInput.focus();
    promptInput.select();

    const cleanup = (result) => {
      promptModal.classList.add('hidden');
      confirmPrompt.onclick = null;
      cancelPrompt.onclick = null;
      closePrompt.onclick = null;
      promptInput.onkeydown = null;
      resolve(result);
    };

    confirmPrompt.onclick = () => cleanup(promptInput.value);
    cancelPrompt.onclick = () => cleanup(null);
    closePrompt.onclick = () => cleanup(null);

    promptInput.onkeydown = (e) => {
      if (e.key === 'Enter') cleanup(promptInput.value);
      if (e.key === 'Escape') cleanup(null);
    };
  });
}

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
  selectedItems.clear();

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

  // Multi-select events
  row.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey) {
      toggleSelectItem(row);
    } else if (e.shiftKey && selectedItems.size > 0) {
      selectRangeItems(row);
    } else {
      selectSingleItem(row);
    }
  });

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

  // Multi-select events
  gridItem.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey) {
      toggleSelectGridItem(gridItem);
    } else {
      selectSingleGridItem(gridItem);
    }
  });

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

// Multi-select functions
function selectSingleItem(row) {
  document.querySelectorAll('.file-item').forEach(r => r.classList.remove('selected'));
  selectedItems.clear();
  row.classList.add('selected');
  selectedItems.add(row.dataset.path);
}

function toggleSelectItem(row) {
  if (selectedItems.has(row.dataset.path)) {
    row.classList.remove('selected');
    selectedItems.delete(row.dataset.path);
  } else {
    row.classList.add('selected');
    selectedItems.add(row.dataset.path);
  }
}

function selectRangeItems(row) {
  const allRows = Array.from(document.querySelectorAll('.file-item'));
  const lastSelected = Array.from(selectedItems)[selectedItems.size - 1];
  const lastRow = allRows.find(r => r.dataset.path === lastSelected);

  if (!lastRow) {
    selectSingleItem(row);
    return;
  }

  const startIdx = allRows.indexOf(lastRow);
  const endIdx = allRows.indexOf(row);
  const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];

  for (let i = from; i <= to; i++) {
    allRows[i].classList.add('selected');
    selectedItems.add(allRows[i].dataset.path);
  }
}

function selectSingleGridItem(gridItem) {
  document.querySelectorAll('.file-grid-item').forEach(r => r.classList.remove('selected'));
  selectedItems.clear();
  gridItem.classList.add('selected');
  selectedItems.add(gridItem.dataset.path);
}

function toggleSelectGridItem(gridItem) {
  if (selectedItems.has(gridItem.dataset.path)) {
    gridItem.classList.remove('selected');
    selectedItems.delete(gridItem.dataset.path);
  } else {
    gridItem.classList.add('selected');
    selectedItems.add(gridItem.dataset.path);
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

// Context Menu
function showContextMenu(e, element) {
  e.preventDefault();

  if (!selectedItems.has(element.dataset.path)) {
    selectSingleItem(element);
  }

  contextItem = {
    path: element.dataset.path,
    type: element.dataset.type,
    name: element.dataset.name
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

ctxRename.addEventListener('click', async () => {
  if (contextItem) {
    await rename(contextItem.path);
  }
  hideContextMenu();
});

ctxDelete.addEventListener('click', async () => {
  if (contextItem) {
    await remove(contextItem.path, contextItem.type);
  }
  hideContextMenu();
});

// Trash button - delete multiple selected files
trashBtn.addEventListener('click', async () => {
  if (selectedItems.size === 0) {
    showNotification('No files selected', 'warning');
    return;
  }

  const confirmed = await customConfirm(
    `Delete ${selectedItems.size} selected item(s)?`,
    'Delete Confirmation'
  );

  if (!confirmed) return;

  const items = Array.from(selectedItems);
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
      showNotification(`Failed to delete ${path}: ${err.message}`, 'error');
    }
  }

  showNotification(`Deleted ${items.length} item(s)`, 'success');
  await list(currentPath);
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
  const confirmed = await customConfirm(`Delete ${p}?`, 'Delete Confirmation');
  if (!confirmed) return;

  try {
    await api('/api/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: p, type })
    });
    await list(currentPath);
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
    await list(currentPath);
    showNotification('Renamed successfully', 'success');
  } catch (err) {
    showNotification(`Rename failed: ${err.message}`, 'error');
  }
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
        showNotification('File saved', 'success');
      } catch (err) {
        showNotification(`Save failed: ${err.message}`, 'error');
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

// Save connection properly
function showSaveConnectionModal(connectionInfo) {
  const defaultName = `${connectionInfo.username}@${connectionInfo.host}`;
  saveConnName.textContent = defaultName;
  saveConnCustomName.value = '';
  saveConnectionModal.classList.remove('hidden');

  return new Promise((resolve) => {
    const cleanup = (shouldSave) => {
      saveConnectionModal.classList.add('hidden');
      confirmSaveConnection.onclick = null;
      cancelSaveConnection.onclick = null;
      closeSaveConnection.onclick = null;
      resolve(shouldSave ? (saveConnCustomName.value || defaultName) : null);
    };

    confirmSaveConnection.onclick = () => cleanup(true);
    cancelSaveConnection.onclick = () => cleanup(false);
    closeSaveConnection.onclick = () => cleanup(false);
  });
}

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

    // Add to server history
    const historyEntry = {
      host,
      port,
      username,
      timestamp: Date.now()
    };
    serverHistory.unshift(historyEntry);
    // Keep only last 10
    serverHistory = serverHistory.slice(0, 10);
    localStorage.setItem('rf_serverHistory', JSON.stringify(serverHistory));

    // Ask to save connection
    const connectionName = await showSaveConnectionModal({ host, port, username });

    if (connectionName) {
      const storePasswordConfirm = password ? await customConfirm(
        'Store password in browser?',
        'Security Warning'
      ) : false;

      const id = crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const newConnection = {
        id,
        name: connectionName,
        host,
        port,
        username,
        password: storePasswordConfirm ? password : undefined,
        privateKey: privateKey || undefined,
        passphrase: passphrase || undefined
      };

      savedConnections.push(newConnection);
      localStorage.setItem('rf_savedConnections', JSON.stringify(savedConnections));
      showNotification('Connection saved', 'success');
    }

    showNotification('Connected successfully', 'success');
  } catch (e) {
    showNotification(`Connection error: ${e.message}`, 'error');
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
  showNotification('Disconnected', 'info');
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
    showNotification('Please connect to a server first', 'warning');
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

// Real interactive terminal with xterm.js - optimized
function initRealTerminal() {
  if (terminalInstance) return;

  terminalBody.innerHTML = '';

  // Create xterm instance with optimized settings
  terminalInstance = new Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
    theme: {
      background: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e1e1e' : '#ffffff',
      foreground: document.documentElement.getAttribute('data-theme') === 'dark' ? '#d4d4d4' : '#1d1d1f',
      cursor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#d4d4d4' : '#1d1d1f'
    },
    scrollback: 1000, // Reduced from 10000 for better performance
    rendererType: 'canvas', // Use canvas renderer for better performance
    fastScrollModifier: 'shift'
  });

  // Fit addon
  terminalFitAddon = new FitAddon.FitAddon();
  terminalInstance.loadAddon(terminalFitAddon);
  terminalInstance.open(terminalBody);

  setTimeout(() => {
    terminalFitAddon.fit();
  }, 100);

  // Throttled resize
  let resizeTimeout;
  const resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
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
    }, 100);
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
  const name = await customPrompt('Folder name:', '', 'New Folder');
  if (!name) return;
  const p = (currentPath.endsWith('/') ? currentPath : currentPath + '/') + name;

  try {
    await api('/api/mkdir', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: p })
    });
    await list(currentPath);
    showNotification('Folder created', 'success');
  } catch (err) {
    showNotification(`Failed to create folder: ${err.message}`, 'error');
  }
});

newFileBtn.addEventListener('click', async () => {
  const name = await customPrompt('File name:', '', 'New File');
  if (!name) return;
  const p = (currentPath.endsWith('/') ? currentPath : currentPath + '/') + name;

  try {
    await api('/api/touch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: p, content: '' })
    });
    await list(currentPath);
    showNotification('File created', 'success');
  } catch (err) {
    showNotification(`Failed to create file: ${err.message}`, 'error');
  }
});

// Upload - multi-file support
fileInput.setAttribute('multiple', 'true');
fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  for (const file of files) {
    const target = (currentPath.endsWith('/') ? currentPath : currentPath + '/') + file.name;
    const form = new FormData();
    form.append('file', file);
    form.append('path', target);

    try {
      await api('/api/upload', { method: 'POST', body: form });
    } catch (err) {
      showNotification(`Upload failed for ${file.name}: ${err.message}`, 'error');
    }
  }

  await list(currentPath);
  showNotification(`Uploaded ${files.length} file(s)`, 'success');
  e.target.value = '';
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
      showNotification(`Failed: ${file.name} - ${err.message}`, 'error');
    }
  }
  await list(currentPath);
  showNotification(`Uploaded ${files.length} file(s)`, 'success');
});

// Favorites
favAddBtn.addEventListener('click', () => {
  if (!userHost) {
    showNotification('Connect first', 'warning');
    return;
  }
  const list = favorites[userHost] || [];
  if (list.includes(currentPath)) {
    showNotification('Already in favorites', 'info');
    return;
  }
  list.push(currentPath);
  favorites[userHost] = list;
  localStorage.setItem('rf_favorites', JSON.stringify(favorites));
  renderFavorites();
  showNotification('Added to favorites', 'success');
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

// Quick Search
quickSearchToggle.addEventListener('click', () => {
  if (!token) {
    showNotification('Please connect to a server first', 'warning');
    return;
  }
  quickSearchModal.classList.remove('hidden');
  searchInput.value = '';
  searchResults.innerHTML = '<div class="search-empty">Type to search files...</div>';
  searchInput.focus();
});

closeQuickSearch.addEventListener('click', () => {
  quickSearchModal.classList.add('hidden');
});

quickSearchModal.querySelector('.modal-backdrop').addEventListener('click', () => {
  quickSearchModal.classList.add('hidden');
});

// Debounced search
let searchTimeout;
searchInput.addEventListener('input', async (e) => {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim().toLowerCase();

  if (!query) {
    searchResults.innerHTML = '<div class="search-empty">Type to search files...</div>';
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const data = await api(`/api/list?path=${encodeURIComponent(currentPath)}`);
      const filtered = data.items.filter(item =>
        item.name.toLowerCase().includes(query)
      );

      if (filtered.length === 0) {
        searchResults.innerHTML = '<div class="search-empty">No results found</div>';
        return;
      }

      searchResults.innerHTML = '';
      filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `
          <div class="file-icon ${item.type === 'dir' ? 'folder' : 'file'}">${getFileIcon(item.name, item.type)}</div>
          <span>${item.name}</span>
        `;
        div.addEventListener('click', () => {
          if (item.type === 'dir') {
            changeDir(item.path);
          } else {
            openEditor(item.path);
          }
          quickSearchModal.classList.add('hidden');
        });
        searchResults.appendChild(div);
      });
    } catch (err) {
      searchResults.innerHTML = `<div class="search-empty">Error: ${err.message}</div>`;
    }
  }, 300);
});

// Server History
serverHistoryToggle.addEventListener('click', () => {
  serverHistoryModal.classList.remove('hidden');
  renderServerHistory();
});

closeServerHistory.addEventListener('click', () => {
  serverHistoryModal.classList.add('hidden');
});

serverHistoryModal.querySelector('.modal-backdrop').addEventListener('click', () => {
  serverHistoryModal.classList.add('hidden');
});

function renderServerHistory() {
  serverHistoryList.innerHTML = '';

  if (serverHistory.length === 0) {
    serverHistoryList.innerHTML = '<div class="server-history-empty">No recent connections</div>';
    return;
  }

  serverHistory.forEach((entry, index) => {
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
      serverHistoryModal.classList.add('hidden');
      openConnectionModal();
    });
    serverHistoryList.appendChild(div);
  });
}

// Theme - detect system preference
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('rf_theme', t);
}

function detectSystemTheme() {
  const savedTheme = localStorage.getItem('rf_theme');
  if (savedTheme) return savedTheme;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(cur === 'light' ? 'dark' : 'light');
});

// Watch for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('rf_theme')) {
    applyTheme(e.matches ? 'dark' : 'light');
  }
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
    if (!quickSearchModal.classList.contains('hidden')) quickSearchModal.classList.add('hidden');
    if (!serverHistoryModal.classList.contains('hidden')) serverHistoryModal.classList.add('hidden');
    if (!saveConnectionModal.classList.contains('hidden')) saveConnectionModal.classList.add('hidden');
  }

  // Cmd/Ctrl + K for quick search
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    quickSearchToggle.click();
  }
});

// Mobile menu
const mobileMenuBtn = el('mobileMenuBtn');
const sidebar = el('sidebar');
const mobileOverlay = el('mobileOverlay');

mobileMenuBtn.addEventListener('click', () => {
  sidebar.classList.add('mobile-open');
  mobileOverlay.classList.add('active');
});

mobileOverlay.addEventListener('click', () => {
  sidebar.classList.remove('mobile-open');
  mobileOverlay.classList.remove('active');
});

// Initial setup
renderCrumbs('/');
try {
  favorites = JSON.parse(localStorage.getItem('rf_favorites') || '{}');
  savedConnections = JSON.parse(localStorage.getItem('rf_savedConnections') || '[]');
  serverHistory = JSON.parse(localStorage.getItem('rf_serverHistory') || '[]');
} catch {
  favorites = {};
  savedConnections = [];
  serverHistory = [];
}

// SFTP Tools
const diskUsageToggle = el('diskUsageToggle');
const findDuplicatesToggle = el('findDuplicatesToggle');
const compressToggle = el('compressToggle');

// Disk Usage Tool
diskUsageToggle.addEventListener('click', async () => {
  if (!token) {
    showNotification('Please connect to a server first', 'warning');
    return;
  }

  try {
    showNotification('Analyzing disk usage...', 'info');
    const result = await api('/api/exec', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: `du -sh ${currentPath}/* 2>/dev/null | sort -hr | head -20` })
    });

    const lines = result.output.trim().split('\n').filter(l => l);
    if (lines.length === 0) {
      showNotification('No disk usage data available', 'info');
      return;
    }

    let message = 'Top 20 largest items:\n\n';
    lines.forEach(line => {
      message += line + '\n';
    });

    const alertModal = el('alertModal');
    const alertTitle = el('alertTitle');
    const alertMessage = el('alertMessage');
    const okAlert = el('okAlert');
    const closeAlert = el('closeAlert');

    alertTitle.textContent = 'Disk Usage - ' + currentPath;
    alertMessage.textContent = message;
    alertMessage.style.whiteSpace = 'pre-wrap';
    alertMessage.style.fontFamily = 'monospace';
    alertMessage.style.fontSize = '12px';
    alertModal.classList.remove('hidden');

    const cleanup = () => {
      alertModal.classList.add('hidden');
      alertMessage.style.whiteSpace = '';
      alertMessage.style.fontFamily = '';
      alertMessage.style.fontSize = '';
      okAlert.onclick = null;
      closeAlert.onclick = null;
    };

    okAlert.onclick = cleanup;
    closeAlert.onclick = cleanup;
  } catch (err) {
    showNotification(`Disk usage check failed: ${err.message}`, 'error');
  }
});

// Find Duplicates Tool
findDuplicatesToggle.addEventListener('click', async () => {
  if (!token) {
    showNotification('Please connect to a server first', 'warning');
    return;
  }

  const confirmed = await customConfirm(
    'This will search for duplicate files in the current directory. This may take some time. Continue?',
    'Find Duplicates'
  );

  if (!confirmed) return;

  try {
    showNotification('Searching for duplicates...', 'info');
    const result = await api('/api/exec', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        command: `find ${currentPath} -type f -exec md5sum {} + 2>/dev/null | sort | uniq -w32 -D --all-repeated=separate | head -50`
      })
    });

    if (!result.output.trim()) {
      showNotification('No duplicate files found', 'success');
      return;
    }

    const alertModal = el('alertModal');
    const alertTitle = el('alertTitle');
    const alertMessage = el('alertMessage');
    const okAlert = el('okAlert');
    const closeAlert = el('closeAlert');

    alertTitle.textContent = 'Duplicate Files Found';
    alertMessage.textContent = result.output.trim();
    alertMessage.style.whiteSpace = 'pre-wrap';
    alertMessage.style.fontFamily = 'monospace';
    alertMessage.style.fontSize = '11px';
    alertModal.classList.remove('hidden');

    const cleanup = () => {
      alertModal.classList.add('hidden');
      alertMessage.style.whiteSpace = '';
      alertMessage.style.fontFamily = '';
      alertMessage.style.fontSize = '';
      okAlert.onclick = null;
      closeAlert.onclick = null;
    };

    okAlert.onclick = cleanup;
    closeAlert.onclick = cleanup;
  } catch (err) {
    showNotification(`Duplicate search failed: ${err.message}`, 'error');
  }
});

// Compress/Extract Tool
compressToggle.addEventListener('click', async () => {
  if (!token) {
    showNotification('Please connect to a server first', 'warning');
    return;
  }

  if (selectedItems.size === 0) {
    showNotification('Please select files or folders to compress', 'warning');
    return;
  }

  const action = await customConfirm(
    'Compress selected items?\n(Click OK to compress, Cancel to extract)',
    'Compress or Extract'
  );

  if (action === null) return;

  if (action) {
    // Compress
    const archiveName = await customPrompt('Archive name:', 'archive.tar.gz', 'Create Archive');
    if (!archiveName) return;

    try {
      const items = Array.from(selectedItems).map(p => {
        const parts = p.split('/');
        return parts[parts.length - 1];
      }).join(' ');

      showNotification('Compressing files...', 'info');
      const result = await api('/api/exec', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          command: `cd ${currentPath} && tar -czf ${archiveName} ${items}`
        })
      });

      if (result.exitCode === 0) {
        await list(currentPath);
        showNotification('Files compressed successfully', 'success');
      } else {
        showNotification('Compression failed: ' + result.errorOutput, 'error');
      }
    } catch (err) {
      showNotification(`Compression failed: ${err.message}`, 'error');
    }
  } else {
    // Extract
    if (selectedItems.size !== 1) {
      showNotification('Please select exactly one archive file to extract', 'warning');
      return;
    }

    const archivePath = Array.from(selectedItems)[0];
    const archiveName = archivePath.split('/').pop();

    if (!archiveName.match(/\.(tar\.gz|tgz|tar|zip|tar\.bz2)$/i)) {
      showNotification('Unsupported archive format. Supported: .tar.gz, .tgz, .tar, .zip, .tar.bz2', 'error');
      return;
    }

    try {
      showNotification('Extracting archive...', 'info');

      let command;
      if (archiveName.endsWith('.tar.gz') || archiveName.endsWith('.tgz')) {
        command = `cd ${currentPath} && tar -xzf ${archiveName}`;
      } else if (archiveName.endsWith('.tar.bz2')) {
        command = `cd ${currentPath} && tar -xjf ${archiveName}`;
      } else if (archiveName.endsWith('.tar')) {
        command = `cd ${currentPath} && tar -xf ${archiveName}`;
      } else if (archiveName.endsWith('.zip')) {
        command = `cd ${currentPath} && unzip -o ${archiveName}`;
      }

      const result = await api('/api/exec', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ command })
      });

      if (result.exitCode === 0) {
        await list(currentPath);
        showNotification('Archive extracted successfully', 'success');
      } else {
        showNotification('Extraction failed: ' + result.errorOutput, 'error');
      }
    } catch (err) {
      showNotification(`Extraction failed: ${err.message}`, 'error');
    }
  }
});

// Try to restore session
(async function tryRestore() {
  const theme = detectSystemTheme();
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
