// Real interactive terminal with xterm.js
let terminalInstance = null;
let terminalSocket = null;
let fitAddon = null;

export function initRealTerminal(terminalBody, token) {
  if (terminalInstance) {
    terminalInstance.dispose();
  }

  // Clear terminal body
  terminalBody.innerHTML = '';

  // Create xterm instance
  terminalInstance = new Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5'
    },
    scrollback: 10000,
    allowTransparency: false
  });

  // Fit addon
  fitAddon = new FitAddon.FitAddon();
  terminalInstance.loadAddon(fitAddon);

  // Mount to DOM
  terminalInstance.open(terminalBody);
  fitAddon.fit();

  // Auto resize
  const resizeObserver = new ResizeObserver(() => {
    try {
      fitAddon.fit();
      if (terminalSocket && terminalSocket.readyState === WebSocket.OPEN) {
        terminalSocket.send(JSON.stringify({
          type: 'resize',
          rows: terminalInstance.rows,
          cols: terminalInstance.cols,
          height: terminalInstance.rows * 20,
          width: terminalInstance.cols * 9
        }));
      }
    } catch (e) {
      console.error('Resize error:', e);
    }
  });
  resizeObserver.observe(terminalBody);

  // WebSocket connection
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProto}//${window.location.host}?token=${token}`;

  terminalSocket = new WebSocket(wsUrl);

  terminalSocket.onopen = () => {
    terminalInstance.writeln('✅ Connected to remote server');
    terminalInstance.writeln('');

    // Send initial size
    terminalSocket.send(JSON.stringify({
      type: 'resize',
      rows: terminalInstance.rows,
      cols: terminalInstance.cols,
      height: terminalInstance.rows * 20,
      width: terminalInstance.cols * 9
    }));
  };

  terminalSocket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'output') {
        terminalInstance.write(msg.data);
      } else if (msg.type === 'error') {
        terminalInstance.writeln(`\r\n❌ Error: ${msg.data}\r\n`);
      }
    } catch (e) {
      console.error('Terminal message error:', e);
    }
  };

  terminalSocket.onerror = (error) => {
    terminalInstance.writeln(`\r\n❌ Connection error\r\n`);
    console.error('WebSocket error:', error);
  };

  terminalSocket.onclose = () => {
    terminalInstance.writeln(`\r\n❌ Connection closed\r\n`);
  };

  // Terminal input → WebSocket
  terminalInstance.onData((data) => {
    if (terminalSocket && terminalSocket.readyState === WebSocket.OPEN) {
      terminalSocket.send(JSON.stringify({ type: 'input', data }));
    }
  });

  return {
    terminal: terminalInstance,
    socket: terminalSocket,
    fitAddon,
    resizeObserver,
    destroy: () => {
      resizeObserver.disconnect();
      if (terminalSocket) {
        terminalSocket.close();
      }
      if (terminalInstance) {
        terminalInstance.dispose();
      }
    }
  };
}

export function destroyTerminal() {
  if (terminalSocket) {
    terminalSocket.close();
    terminalSocket = null;
  }
  if (terminalInstance) {
    terminalInstance.dispose();
    terminalInstance = null;
  }
  fitAddon = null;
}
