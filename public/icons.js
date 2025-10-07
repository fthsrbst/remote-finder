// Modern SVG icons for files and folders
export function getFileIcon(filename, type) {
  if (type === 'dir') {
    return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M28 26H4C2.89543 26 2 25.1046 2 24V10C2 8.89543 2.89543 8 4 8H13L15 11H28C29.1046 11 30 11.8954 30 13V24C30 25.1046 29.1046 26 28 26Z" fill="url(#folder-grad)"/>
      <path d="M28 26H4C2.89543 26 2 25.1046 2 24V10C2 8.89543 2.89543 8 4 8H13L15 11H28C29.1046 11 30 11.8954 30 13V24C30 25.1046 29.1046 26 28 26Z" stroke="#3B82F6" stroke-width="1.5" stroke-linejoin="round"/>
      <defs>
        <linearGradient id="folder-grad" x1="2" y1="8" x2="30" y2="26" gradientUnits="userSpaceOnUse">
          <stop stop-color="#60A5FA"/>
          <stop offset="1" stop-color="#3B82F6"/>
        </linearGradient>
      </defs>
    </svg>`;
  }

  const ext = filename.split('.').pop().toLowerCase();

  const iconMap = {
    // JavaScript
    'js': { color: '#F7DF1E', icon: 'JS' },
    'jsx': { color: '#61DAFB', icon: 'JSX' },
    'ts': { color: '#3178C6', icon: 'TS' },
    'tsx': { color: '#3178C6', icon: 'TSX' },
    'json': { color: '#F59E0B', icon: '{}' },

    // Web
    'html': { color: '#E34F26', icon: 'HTML' },
    'htm': { color: '#E34F26', icon: 'HTM' },
    'css': { color: '#1572B6', icon: 'CSS' },
    'scss': { color: '#CC6699', icon: 'SCSS' },
    'sass': { color: '#CC6699', icon: 'SASS' },
    'less': { color: '#1D365D', icon: 'LESS' },

    // Images
    'png': { color: '#10B981', icon: 'PNG' },
    'jpg': { color: '#10B981', icon: 'JPG' },
    'jpeg': { color: '#10B981', icon: 'JPEG' },
    'gif': { color: '#10B981', icon: 'GIF' },
    'svg': { color: '#10B981', icon: 'SVG' },
    'webp': { color: '#10B981', icon: 'WEBP' },
    'ico': { color: '#10B981', icon: 'ICO' },

    // Documents
    'md': { color: '#374151', icon: 'MD' },
    'txt': { color: '#6B7280', icon: 'TXT' },
    'pdf': { color: '#DC2626', icon: 'PDF' },
    'doc': { color: '#2B579A', icon: 'DOC' },
    'docx': { color: '#2B579A', icon: 'DOCX' },

    // Programming
    'py': { color: '#3776AB', icon: 'PY' },
    'rb': { color: '#CC342D', icon: 'RB' },
    'php': { color: '#777BB4', icon: 'PHP' },
    'java': { color: '#007396', icon: 'JAVA' },
    'c': { color: '#A8B9CC', icon: 'C' },
    'cpp': { color: '#00599C', icon: 'C++' },
    'h': { color: '#A8B9CC', icon: 'H' },
    'go': { color: '#00ADD8', icon: 'GO' },
    'rs': { color: '#CE422B', icon: 'RS' },
    'swift': { color: '#FA7343', icon: 'SWIFT' },
    'kt': { color: '#7F52FF', icon: 'KT' },

    // Config
    'yaml': { color: '#CB171E', icon: 'YML' },
    'yml': { color: '#CB171E', icon: 'YML' },
    'xml': { color: '#F59E0B', icon: 'XML' },
    'toml': { color: '#9C4221', icon: 'TOML' },
    'ini': { color: '#6B7280', icon: 'INI' },
    'env': { color: '#EAB308', icon: 'ENV' },

    // Archives
    'zip': { color: '#F59E0B', icon: 'ZIP' },
    'tar': { color: '#F59E0B', icon: 'TAR' },
    'gz': { color: '#F59E0B', icon: 'GZ' },
    'rar': { color: '#F59E0B', icon: 'RAR' },
    '7z': { color: '#F59E0B', icon: '7Z' },

    // Shell
    'sh': { color: '#4EAA25', icon: 'SH' },
    'bash': { color: '#4EAA25', icon: 'BASH' },
    'zsh': { color: '#4EAA25', icon: 'ZSH' },

    // Database
    'sql': { color: '#CC2927', icon: 'SQL' },
    'db': { color: '#CC2927', icon: 'DB' },
    'sqlite': { color: '#003B57', icon: 'SQLite' },
  };

  const iconInfo = iconMap[ext] || { color: '#9CA3AF', icon: ext.toUpperCase().slice(0, 4) };

  return `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M26 28H6C4.89543 28 4 27.1046 4 26V6C4 4.89543 4.89543 4 6 4H18L28 14V26C28 27.1046 27.1046 28 26 28Z" fill="${iconInfo.color}15"/>
    <path d="M18 4L28 14H20C18.8954 14 18 13.1046 18 12V4Z" fill="${iconInfo.color}40"/>
    <path d="M26 28H6C4.89543 28 4 27.1046 4 26V6C4 4.89543 4.89543 4 6 4H18L28 14V26C28 27.1046 27.1046 28 26 28Z" stroke="${iconInfo.color}" stroke-width="1.5" stroke-linejoin="round"/>
    <text x="16" y="22" text-anchor="middle" fill="${iconInfo.color}" font-size="8" font-weight="600" font-family="system-ui">${iconInfo.icon}</text>
  </svg>`;
}
