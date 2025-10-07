const el = (id) => document.getElementById(id);

// === CUSTOM MODAL SYSTEM ===
const customAlert = (message, title = 'Notice') => {
  return new Promise((resolve) => {
    const modal = el('alertModal');
    const titleEl = el('alertTitle');
    const messageEl = el('alertMessage');
    if (!modal) return resolve();
    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.remove('hidden');
    const close = () => {
      modal.classList.add('hidden');
      resolve();
    };
    el('okAlert').onclick = close;
    el('closeAlert').onclick = close;
    modal.querySelector('.modal-backdrop').onclick = close;
  });
};

const customConfirm = (message, title = 'Confirm') => {
  return new Promise((resolve) => {
    const modal = el('confirmModal');
    if (!modal) return resolve(false);
    el('confirmTitle').textContent = title;
    el('confirmMessage').textContent = message;
    modal.classList.remove('hidden');
    const close = (result) => {
      modal.classList.add('hidden');
      resolve(result);
    };
    el('okConfirm').onclick = () => close(true);
    el('cancelConfirm').onclick = () => close(false);
    el('closeConfirm').onclick = () => close(false);
    modal.querySelector('.modal-backdrop').onclick = () => close(false);
  });
};

const customPrompt = (message, defaultValue = '', title = 'Input') => {
  return new Promise((resolve) => {
    const modal = el('promptModal');
    if (!modal) return resolve(null);
    el('promptTitle').textContent = title;
    el('promptLabel').textContent = message;
    const inputEl = el('promptInput');
    inputEl.value = defaultValue;
    modal.classList.remove('hidden');
    setTimeout(() => {
      inputEl.focus();
      inputEl.select();
    }, 100);
    const close = (result) => {
      modal.classList.add('hidden');
      resolve(result);
    };
    el('confirmPrompt').onclick = () => close(inputEl.value);
    el('cancelPrompt').onclick = () => close(null);
    el('closePrompt').onclick = () => close(null);
    modal.querySelector('.modal-backdrop').onclick = () => close(null);
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') close(inputEl.value);
      if (e.key === 'Escape') close(null);
    };
  });
};

// === CONNECTION HISTORY ===
const saveConnectionHistory = (host, username, port = 22) => {
  try {
    const history = JSON.parse(localStorage.getItem('rf_server_history') || '[]');
    const entry = { id: `${username}@${host}:${port}`, host, username, port, timestamp: Date.now() };
    const filtered = history.filter(h => h.id !== entry.id);
    filtered.unshift(entry);
    localStorage.setItem('rf_server_history', JSON.stringify(filtered.slice(0, 10)));
    return filtered;
  } catch { return []; }
};

const getConnectionHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('rf_server_history') || '[]');
  } catch { return []; }
};

// === SAVED CONNECTIONS ===
const saveConnection = (name, host, username, password, port, privateKey, passphrase) => {
  try {
    const connections = JSON.parse(localStorage.getItem('rf_saved_connections') || '[]');
    const entry = {
      id: Date.now().toString(),
      name: name || `${username}@${host}`,
      host, username,
      password: password ? btoa(password) : '',
      port,
      privateKey: privateKey ? btoa(privateKey) : '',
      passphrase: passphrase ? btoa(passphrase) : '',
      timestamp: Date.now()
    };
    connections.push(entry);
    localStorage.setItem('rf_saved_connections', JSON.stringify(connections));
    return connections;
  } catch { return []; }
};

const getSavedConnections = () => {
  try {
    const connections = JSON.parse(localStorage.getItem('rf_saved_connections') || '[]');
    return connections.map(c => ({
      ...c,
      password: c.password ? atob(c.password) : '',
      privateKey: c.privateKey ? atob(c.privateKey) : '',
      passphrase: c.passphrase ? atob(c.passphrase) : ''
    }));
  } catch { return []; }
};

const deleteSavedConnection = (id) => {
  try {
    const connections = JSON.parse(localStorage.getItem('rf_saved_connections') || '[]');
    const filtered = connections.filter(c => c.id !== id);
    localStorage.setItem('rf_saved_connections', JSON.stringify(filtered));
    return filtered;
  } catch { return []; }
};

// === SYSTEM THEME ===
const getSystemTheme = () => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('rf_theme', theme);
};

// Initialize with system theme if not set
const storedTheme = localStorage.getItem('rf_theme');
if (!storedTheme) {
  applyTheme(getSystemTheme());
} else {
  applyTheme(storedTheme);
}

// Watch system theme changes
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('rf_theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

// === MULTI-FILE SELECTION ===
let selectedFiles = [];
let allFileItems = [];

const updateSelectionUI = () => {
  // Remove existing counter
  const existing = document.querySelector('.selection-counter');
  if (existing) existing.remove();

  // Update UI
  document.querySelectorAll('.file-item, .file-grid-item').forEach(item => {
    if (selectedFiles.includes(item.dataset.path)) {
      item.classList.add('multi-selected');
    } else {
      item.classList.remove('multi-selected');
      item.classList.remove('selected');
    }
  });

  // Show counter if multiple selected
  if (selectedFiles.length > 1) {
    const counter = document.createElement('div');
    counter.className = 'selection-counter';
    counter.textContent = `${selectedFiles.length} items selected`;
    document.body.appendChild(counter);
  }

  // Enable/disable delete button
  const trashBtn = el('trashBtn');
  if (trashBtn) {
    trashBtn.disabled = selectedFiles.length === 0;
  }
};

const toggleFileSelection = (filePath, event) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const ctrlKey = isMac ? event.metaKey : event.ctrlKey;
  const shiftKey = event.shiftKey;

  if (shiftKey && selectedFiles.length > 0) {
    // Range selection
    const lastSelected = selectedFiles[selectedFiles.length - 1];
    const lastIndex = allFileItems.findIndex(item => item.path === lastSelected);
    const currentIndex = allFileItems.findIndex(item => item.path === filePath);
    if (lastIndex !== -1 && currentIndex !== -1) {
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      selectedFiles = allFileItems.slice(start, end + 1).map(item => item.path);
    }
  } else if (ctrlKey) {
    // Toggle selection
    const index = selectedFiles.indexOf(filePath);
    if (index > -1) {
      selectedFiles.splice(index, 1);
    } else {
      selectedFiles.push(filePath);
    }
  } else {
    // Single selection
    selectedFiles = [filePath];
  }

  updateSelectionUI();
};

const clearFileSelection = () => {
  selectedFiles = [];
  updateSelectionUI();
};

// Export for use in other parts
export {
  customAlert,
  customConfirm,
  customPrompt,
  saveConnectionHistory,
  getConnectionHistory,
  saveConnection,
  getSavedConnections,
  deleteSavedConnection,
  getSystemTheme,
  applyTheme,
  toggleFileSelection,
  clearFileSelection,
  selectedFiles,
  updateSelectionUI
};
