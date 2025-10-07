import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import SftpClient from 'ssh2-sftp-client';
import { Client as SSHClient } from 'ssh2';
import path from 'path';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 * 1024 } }); // 1GB

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static UI
app.use(express.static(path.join(process.cwd(), 'public')));

// In-memory connection store
const connections = new Map(); // token -> { sftp, ssh, createdAt, lastUsed, host, username, config }

const requireToken = (req, res, next) => {
  const token = req.headers['x-session-token'] || req.query.token || req.body.token;
  if (!token) return res.status(401).json({ error: 'Missing session token' });
  const session = connections.get(token);
  if (!session) return res.status(401).json({ error: 'Invalid or expired session' });
  req.sessionToken = token;
  req.sftp = session.sftp;
  session.lastUsed = Date.now();
  next();
};

app.post('/api/connect', async (req, res) => {
  const { host, port = 22, username, password, privateKey, passphrase } = req.body || {};
  if (!host || !username || (!password && !privateKey)) {
    return res.status(400).json({ error: 'host, username and password or privateKey are required' });
  }
  const sftp = new SftpClient();
  const config = {
    host,
    port,
    username,
    password: password || undefined,
    privateKey: privateKey ? Buffer.from(privateKey) : undefined,
    passphrase: passphrase || undefined,
    readyTimeout: 15000,
  };
  try {
    await sftp.connect(config);
    const token = uuidv4();
    connections.set(token, { sftp, ssh: null, createdAt: Date.now(), lastUsed: Date.now(), host, username, config });
    res.json({ token, host, username });
  } catch (err) {
    try { await sftp.end(); } catch {}
    res.status(500).json({ error: 'Connection failed', details: String(err?.message || err) });
  }
});

app.post('/api/disconnect', requireToken, async (req, res) => {
  const token = req.sessionToken;
  const session = connections.get(token);
  try {
    await session.sftp.end();
  } catch {}
  connections.delete(token);
  res.json({ ok: true });
});

app.get('/api/list', requireToken, async (req, res) => {
  const p = req.query.path || '/';
  try {
    const list = await req.sftp.list(p);
    const items = list.map((i) => ({
      name: i.name,
      type: i.type === 'd' ? 'dir' : (i.type === '-' ? 'file' : i.type),
      size: i.size,
      modifyTime: i.modifyTime,
      rights: i.rights,
      owner: i.owner,
      group: i.group,
      path: path.posix.join(p, i.name)
    }));
    res.json({ path: p, items });
  } catch (err) {
    res.status(500).json({ error: 'List failed', details: String(err?.message || err) });
  }
});

app.get('/api/stat', requireToken, async (req, res) => {
  const p = req.query.path;
  if (!p) return res.status(400).json({ error: 'path is required' });
  try {
    const info = await req.sftp.stat(p);
    res.json({ path: p, info });
  } catch (err) {
    res.status(500).json({ error: 'Stat failed', details: String(err?.message || err) });
  }
});

app.post('/api/mkdir', requireToken, async (req, res) => {
  const { path: p } = req.body || {};
  if (!p) return res.status(400).json({ error: 'path is required' });
  try {
    await req.sftp.mkdir(p, true);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Mkdir failed', details: String(err?.message || err) });
  }
});

app.post('/api/rename', requireToken, async (req, res) => {
  const { oldPath, newPath } = req.body || {};
  if (!oldPath || !newPath) return res.status(400).json({ error: 'oldPath and newPath are required' });
  try {
    await req.sftp.rename(oldPath, newPath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Rename failed', details: String(err?.message || err) });
  }
});

app.post('/api/delete', requireToken, async (req, res) => {
  const { path: p, type } = req.body || {};
  if (!p) return res.status(400).json({ error: 'path is required' });
  try {
    if (type === 'dir') {
      await req.sftp.rmdir(p, true);
    } else {
      await req.sftp.delete(p);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: String(err?.message || err) });
  }
});

// Read small text files (<=2MB) as UTF-8
app.get('/api/read', requireToken, async (req, res) => {
  const p = req.query.path;
  if (!p) return res.status(400).json({ error: 'path is required' });
  try {
    const info = await req.sftp.stat(p);
    if (info.size > 2 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large (limit 2MB)' });
    }
    const buf = await req.sftp.get(p);
    if (!Buffer.isBuffer(buf)) {
      return res.status(500).json({ error: 'Unexpected read result' });
    }
    if (buf.includes(0)) {
      return res.status(415).json({ error: 'Binary file not supported in editor' });
    }
    const content = buf.toString('utf8');
    res.json({ path: p, content, size: info.size });
  } catch (err) {
    res.status(500).json({ error: 'Read failed', details: String(err?.message || err) });
  }
});

// Write text content (UTF-8)
app.post('/api/write', requireToken, async (req, res) => {
  const { path: p, content = '' } = req.body || {};
  if (!p) return res.status(400).json({ error: 'path is required' });
  try {
    await req.sftp.put(Buffer.from(String(content), 'utf8'), p);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Write failed', details: String(err?.message || err) });
  }
});

// Create a new (empty or with content) file
app.post('/api/touch', requireToken, async (req, res) => {
  const { path: p, content = '' } = req.body || {};
  if (!p) return res.status(400).json({ error: 'path is required' });
  try {
    await req.sftp.put(Buffer.from(String(content), 'utf8'), p);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Touch failed', details: String(err?.message || err) });
  }
});

app.get('/api/download', requireToken, async (req, res) => {
  const p = req.query.path;
  if (!p) return res.status(400).json({ error: 'path is required' });
  try {
    const stream = await req.sftp.get(p);
    const base = path.posix.basename(p);
    res.setHeader('Content-Disposition', `attachment; filename="${base}"`);
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Download failed', details: String(err?.message || err) });
  }
});

app.post('/api/upload', requireToken, upload.single('file'), async (req, res) => {
  const targetPath = req.body?.path;
  if (!targetPath) return res.status(400).json({ error: 'path is required' });
  if (!req.file) return res.status(400).json({ error: 'file is required' });
  try {
    await req.sftp.put(req.file.buffer, targetPath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', details: String(err?.message || err) });
  }
});

// Execute command
app.post('/api/exec', requireToken, async (req, res) => {
  const { command, cwd = '/' } = req.body || {};
  if (!command) return res.status(400).json({ error: 'command is required' });

  const token = req.sessionToken;
  const session = connections.get(token);

  try {
    // Create SSH connection if not exists
    if (!session.ssh) {
      session.ssh = new SSHClient();
      await new Promise((resolve, reject) => {
        session.ssh.on('ready', resolve);
        session.ssh.on('error', reject);
        session.ssh.connect(session.config);
      });
    }

    // Execute command
    const fullCommand = `cd ${cwd} && ${command}`;
    const result = await new Promise((resolve, reject) => {
      session.ssh.exec(fullCommand, (err, stream) => {
        if (err) return reject(err);

        let stdout = '';
        let stderr = '';

        stream.on('close', (code) => {
          resolve({ output: stdout || stderr, code });
        });

        stream.on('data', (data) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Execution failed', details: String(err?.message || err) });
  }
});

// Health + cleanup
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, connections: connections.size });
});

// Cleanup idle sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of connections.entries()) {
    if (now - session.lastUsed > 15 * 60 * 1000) { // 15 minutes idle
      session.sftp.end().catch(() => {});
      connections.delete(token);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Remote Finder server running on http://localhost:${PORT}`);
});
