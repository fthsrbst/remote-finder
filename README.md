# Remote Finder

A modern and minimal web-based SFTP client. Provides a user-friendly interface for file management over SSH/SFTP connections.

![Remote Finder](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.x-brightgreen.svg)

## ✨ Features

### Core Features
- 🔐 **Secure Connection**: Support for password or SSH private key authentication
- 📁 **File Management**: Browse directories, create/delete/rename files and folders
- 📝 **Text Editor**: Edit files up to 2MB directly in the browser
- ⬆️⬇️ **File Transfer**: Upload and download files (up to 1GB)
- 🗂️ **Multi-Select**: Select multiple files with Ctrl/Cmd + Click or Shift + Click
- 🗑️ **Bulk Delete**: Delete multiple selected files at once

### Advanced Features
- 🖥️ **Multiple Terminals**: Open multiple SSH terminals with tab support
- 💾 **Saved Connections**: Save and manage connection profiles
- 📜 **Server History**: Automatically track your last 10 connections
- ⭐ **Favorites**: Quick access to frequently used directories
- 🎨 **Theme Support**: Auto-detect system theme (light/dark mode)
- 🔍 **Inline Search**: Real-time file filtering with Ctrl/Cmd + K shortcut
- 📐 **Collapsible Sidebar**: Icon-only mode for more screen space

### SFTP Tools
- 📊 **Disk Usage**: Analyze top 20 largest files/folders
- 🔍 **Find Duplicates**: MD5-based duplicate file detection
- 📦 **Compress/Extract**: Support for tar.gz, tgz, tar, zip, tar.bz2 formats
- ⚙️ **Properties**: View detailed file/folder information
- 🔐 **Permissions**: Change file permissions (chmod)

### UI/UX
- 🧭 **Advanced Navigation**: Breadcrumb navigation, forward/back history
- 📱 **Mobile Responsive**: Touch-friendly interface
- ⚡ **Optimized Performance**: Minimal dependencies, fast rendering
- 🎯 **User-Friendly**: No alerts/confirms, custom modal dialogs

## 📋 Requirements

- Node.js 16.x or higher
- npm or yarn

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/fthsrbst/sftp-remote-finder.git
cd remote-finder

# Install dependencies
npm install

# Start the server
npm start
```

The server will run at `http://localhost:3000` by default.

## 📖 Usage

### Connecting to a Server

1. Open `http://localhost:3000` in your browser
2. Click "Connect" button
3. Enter your connection details:
   - **Host**: SSH server address
   - **Port**: SSH port number (default: 22)
   - **Username**: Your username
   - **Password** or **Private Key**: Choose your authentication method
4. Click **Connect**
5. Optionally save the connection for quick access later

### Test Connection

Use the free test SFTP server:
- **Host**: test.rebex.net
- **Port**: 22
- **Username**: demo
- **Password**: password

### File Operations

- **Single Click**: Select file
- **Double Click**: Open file or enter directory
- **Ctrl/Cmd + Click**: Multi-select
- **Shift + Click**: Range select
- **Right Click**: Context menu (rename, delete, properties, permissions)
- **Drag & Drop**: Upload multiple files

### Terminal

- Click "Terminal" in sidebar to open
- Click "+" button to open multiple terminals
- Switch between terminals using tabs
- Close terminals with "x" button

### Quick Search

- Click search box or press **Ctrl/Cmd + K**
- Type to filter files in real-time
- No modal popups, inline filtering

### Saved Connections

Frequently used connections are saved in browser localStorage. Click on a saved connection to auto-fill the connection form.

### Favorites

Add frequently accessed directories to favorites for quick navigation.

## 🔧 Technologies

### Backend
- **Express 5.x**: Web framework
- **ssh2-sftp-client**: SFTP connection management
- **ssh2**: SSH shell for terminal support
- **ws**: WebSocket for interactive terminals
- **multer**: File upload handling
- **uuid**: Session token generation

### Frontend
- **Vanilla JavaScript**: Pure, no frameworks
- **CSS3**: Modern responsive design with Finder-style interface
- **xterm.js**: Terminal emulator
- **LocalStorage**: Profile and favorites management

## 🌍 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/connect` | POST | Create SFTP connection |
| `/api/disconnect` | POST | Close connection |
| `/api/list` | GET | List directory contents |
| `/api/stat` | GET | Get file/directory info |
| `/api/mkdir` | POST | Create new directory |
| `/api/rename` | POST | Rename file/directory |
| `/api/delete` | POST | Delete file/directory |
| `/api/read` | GET | Read file contents (max 2MB) |
| `/api/write` | POST | Write to file |
| `/api/touch` | POST | Create new file |
| `/api/download` | GET | Download file |
| `/api/upload` | POST | Upload file (max 1GB) |
| `/api/exec` | POST | Execute SSH command |
| `/api/health` | GET | Server health check |

## 🔒 Security

- Connection credentials are stored only in memory
- Session tokens generated with UUID
- Automatic session cleanup after 15 minutes of inactivity
- Private keys are never stored on the server
- Optional password storage in browser (encrypted)

## ⌨️ Keyboard Shortcuts

- **Ctrl/Cmd + K**: Focus search box
- **Escape**: Close any open modal
- **Ctrl/Cmd + Click**: Multi-select files
- **Shift + Click**: Range select files

## 📝 Notes

- Text editor supports UTF-8 files only
- Binary files cannot be edited (download only)
- Maximum upload size: 1GB
- Maximum editable file size: 2MB
- Terminal scrollback: 1000 lines (optimized for performance)

## 🚀 Performance Optimizations

- **State Management**: Single state object
- **Element Caching**: All DOM elements cached
- **Debounced Search**: 200ms debounce for search
- **Throttled Resize**: 100ms throttle for terminal resize
- **Canvas Renderer**: Terminal uses canvas for better performance
- **Reduced Scrollback**: Optimized from 10,000 to 1,000 lines

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC

## 👤 Author

**fthsrbst**
- GitHub: [@fthsrbst](https://github.com/fthsrbst)

## 🙏 Acknowledgments

- Inspired by macOS Finder interface
- Built with modern web technologies
- Optimized for performance and user experience

---

⭐ If you like this project, please give it a star!

## 📸 Screenshots

### Main Interface
![Main Interface](docs/screenshot-main.png)

### Multiple Terminals
![Terminals](docs/screenshot-terminals.png)

### Dark Mode
![Dark Mode](docs/screenshot-dark.png)

---

**Made with ❤️ by fthsrbst**
