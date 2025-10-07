// Custom Modal System - Replaces browser alert/prompt/confirm
export const customAlert = (message, title = 'Notice') => {
  return new Promise((resolve) => {
    const modal = document.getElementById('alertModal');
    const titleEl = document.getElementById('alertTitle');
    const messageEl = document.getElementById('alertMessage');
    const okBtn = document.getElementById('okAlert');
    const closeBtn = document.getElementById('closeAlert');

    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.remove('hidden');

    const close = () => {
      modal.classList.add('hidden');
      resolve();
    };

    okBtn.onclick = close;
    closeBtn.onclick = close;
    modal.querySelector('.modal-backdrop').onclick = close;
  });
};

export const customConfirm = (message, title = 'Confirm') => {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('okConfirm');
    const cancelBtn = document.getElementById('cancelConfirm');
    const closeBtn = document.getElementById('closeConfirm');

    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.remove('hidden');

    const close = (result) => {
      modal.classList.add('hidden');
      resolve(result);
    };

    okBtn.onclick = () => close(true);
    cancelBtn.onclick = () => close(false);
    closeBtn.onclick = () => close(false);
    modal.querySelector('.modal-backdrop').onclick = () => close(false);
  });
};

export const customPrompt = (message, defaultValue = '', title = 'Enter value') => {
  return new Promise((resolve) => {
    const modal = document.getElementById('promptModal');
    const titleEl = document.getElementById('promptTitle');
    const labelEl = document.getElementById('promptLabel');
    const inputEl = document.getElementById('promptInput');
    const okBtn = document.getElementById('confirmPrompt');
    const cancelBtn = document.getElementById('cancelPrompt');
    const closeBtn = document.getElementById('closePrompt');

    titleEl.textContent = title;
    labelEl.textContent = message;
    inputEl.value = defaultValue;
    modal.classList.remove('hidden');
    inputEl.focus();
    inputEl.select();

    const close = (result) => {
      modal.classList.add('hidden');
      resolve(result);
    };

    okBtn.onclick = () => close(inputEl.value);
    cancelBtn.onclick = () => close(null);
    closeBtn.onclick = () => close(null);
    modal.querySelector('.modal-backdrop').onclick = () => close(null);

    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') close(inputEl.value);
      if (e.key === 'Escape') close(null);
    };
  });
};

// Connection History
export const saveConnectionHistory = (host, username, port = 22) => {
  try {
    const history = JSON.parse(localStorage.getItem('rf_server_history') || '[]');
    const entry = {
      id: `${username}@${host}:${port}`,
      host,
      username,
      port,
      timestamp: Date.now()
    };

    // Remove duplicates
    const filtered = history.filter(h => h.id !== entry.id);
    filtered.unshift(entry);

    // Keep last 10
    const trimmed = filtered.slice(0, 10);
    localStorage.setItem('rf_server_history', JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return [];
  }
};

export const getConnectionHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('rf_server_history') || '[]');
  } catch {
    return [];
  }
};

// Saved Connections (with passwords - basic encryption)
export const saveConnection = (name, host, username, password, port, privateKey, passphrase) => {
  try {
    const connections = JSON.parse(localStorage.getItem('rf_saved_connections') || '[]');
    const entry = {
      id: Date.now().toString(),
      name,
      host,
      username,
      password: password ? btoa(password) : '', // Basic encoding
      port,
      privateKey: privateKey ? btoa(privateKey) : '',
      passphrase: passphrase ? btoa(passphrase) : '',
      timestamp: Date.now()
    };

    connections.push(entry);
    localStorage.setItem('rf_saved_connections', JSON.stringify(connections));
    return connections;
  } catch {
    return [];
  }
};

export const getSavedConnections = () => {
  try {
    const connections = JSON.parse(localStorage.getItem('rf_saved_connections') || '[]');
    return connections.map(c => ({
      ...c,
      password: c.password ? atob(c.password) : '',
      privateKey: c.privateKey ? atob(c.privateKey) : '',
      passphrase: c.passphrase ? atob(c.passphrase) : ''
    }));
  } catch {
    return [];
  }
};

export const deleteSavedConnection = (id) => {
  try {
    const connections = JSON.parse(localStorage.getItem('rf_saved_connections') || '[]');
    const filtered = connections.filter(c => c.id !== id);
    localStorage.setItem('rf_saved_connections', JSON.stringify(filtered));
    return filtered;
  } catch {
    return [];
  }
};

// Multiple file selection
export let selectedFiles = [];

export const toggleFileSelection = (filePath, ctrlKey, shiftKey, allItems) => {
  if (shiftKey && selectedFiles.length > 0) {
    // Range selection
    const lastSelected = selectedFiles[selectedFiles.length - 1];
    const lastIndex = allItems.findIndex(item => item.path === lastSelected);
    const currentIndex = allItems.findIndex(item => item.path === filePath);

    if (lastIndex !== -1 && currentIndex !== -1) {
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      selectedFiles = allItems.slice(start, end + 1).map(item => item.path);
    }
  } else if (ctrlKey || metaKey) {
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

  return selectedFiles;
};

export const clearFileSelection = () => {
  selectedFiles = [];
};

// Detect system theme
export const getSystemTheme = () => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

// Watch system theme changes
export const watchSystemTheme = (callback) => {
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      callback(e.matches ? 'dark' : 'light');
    });
  }
};
