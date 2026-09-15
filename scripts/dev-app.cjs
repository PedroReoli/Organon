#!/usr/bin/env node

/**
 * Organon Dev Runner - Dashboard Limpo e Sem Ruídos
 * Orquestra Vite e Electron com logs filtrados e formatados em tempo real.
 */

const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Desabilitar avisos de depreciação do Node nos processos filhos
process.env.NODE_NO_WARNINGS = '1';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  magenta: '\x1b[35m',
  brightMagenta: '\x1b[95m',
  blue: '\x1b[34m',
  brightBlue: '\x1b[94m',
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  white: '\x1b[37m',
  brightWhite: '\x1b[97m',
  gray: '\x1b[90m',
  bgCyan: '\x1b[46m',
  bgGreen: '\x1b[42m',
  bgMagenta: '\x1b[45m',
  bgBlue: '\x1b[44m',
  bgDark: '\x1b[100m',
};

// Estado da sessão dev
const state = {
  viteStatus: 'Iniciando...',
  viteUrl: '',
  viteTime: '',
  electronStatus: 'Compilando TypeScript...',
  shortcuts: '',
  conversationsDir: '',
  logs: []
};

// Padrões de ruídos a serem completamente ignorados
const IGNORED_PATTERNS = [
  /DeprecationWarning/,
  /The CJS build of Vite's Node API is deprecated/,
  /vite-cjs-node-api-deprecated/,
  /Browserslist: browsers data/,
  /npx update-browserslist-db/,
  /Why you should do it regularly/,
  /> organon@/,
  /> vite/,
  /> tsc -p/,
  /^\s*$/
];

function shouldIgnoreLine(line) {
  return IGNORED_PATTERNS.some(regex => regex.test(line));
}

function clearScreen() {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1b[2J\x1b[0;0H');
  }
}

function renderDashboard() {
  clearScreen();
  console.log(`\n ${c.bgCyan}${c.bold}${c.white} ORGANON DEV ⚡ ${c.reset} ${c.brightCyan}${c.bold}Ambiente de Desenvolvimento Ativo${c.reset} ${c.dim}[Ctrl+C para encerrar]${c.reset}`);
  console.log(`${c.gray}─────────────────────────────────────────────────────────────────────────────${c.reset}`);

  // Status do Vite
  if (state.viteUrl) {
    console.log(` ${c.brightGreen}${c.bold}🌐 Vite Server:${c.reset}   ${c.brightWhite}${c.underline}${state.viteUrl}${c.reset} ${c.dim}(Pronto em ${state.viteTime || 'poucos ms'})${c.reset}`);
  } else {
    console.log(` ${c.yellow}${c.bold}🌐 Vite Server:${c.reset}   ${c.yellow}${state.viteStatus}${c.reset}`);
  }

  // Status do Electron
  console.log(` ${c.brightCyan}${c.bold}🖥️  Electron App:${c.reset}  ${state.electronStatus}`);

  // Atalhos e Diretórios se detectados
  if (state.shortcuts) {
    console.log(` ${c.brightMagenta}${c.bold}⌨️  Atalhos:${c.reset}      ${c.brightWhite}${state.shortcuts}${c.reset}`);
  }
  if (state.conversationsDir) {
    console.log(` ${c.dim}📁 Storage AI:${c.reset}    ${c.dim}${state.conversationsDir}${c.reset}`);
  }

  console.log(`${c.gray}─────────────────────────────────────────────────────────────────────────────${c.reset}`);
  console.log(` ${c.dim}${c.bold}LOGS RECENTES:${c.reset}`);

  if (state.logs.length === 0) {
    console.log(` ${c.dim}Aguardando eventos...${c.reset}`);
  } else {
    // Mostrar os últimos 12 logs limpos
    state.logs.slice(-12).forEach(log => {
      console.log(` ${log}`);
    });
  }
  console.log(`${c.gray}─────────────────────────────────────────────────────────────────────────────${c.reset}`);
}

function addLog(formattedLine) {
  state.logs.push(formattedLine);
  if (state.logs.length > 50) {
    state.logs.shift();
  }
  renderDashboard();
}

function formatElectronLine(rawLine) {
  const line = rawLine.trim();
  if (shouldIgnoreLine(line)) return null;

  // Extrair metadados importantes para o cabeçalho
  if (line.includes('Atalhos globais') && line.includes('registrados')) {
    const match = line.match(/\((.*?)\)/);
    if (match) state.shortcuts = match[1];
  }
  if (line.includes('[Conversations] Diretório:')) {
    state.conversationsDir = line.replace(/.*Diretório:\s*/, '');
  }

  // Formatação de badges
  if (line.startsWith('[IPC]')) {
    return `${c.bgBlue}${c.white}${c.bold} IPC ${c.reset} ${c.brightWhite}${line.replace(/^\[IPC\]\s*/, '')}${c.reset}`;
  }
  if (line.startsWith('[Tray]')) {
    return `${c.bgMagenta}${c.white}${c.bold} TRAY ${c.reset} ${c.brightWhite}${line.replace(/^\[Tray\]\s*/, '')}${c.reset}`;
  }
  if (line.startsWith('[Conversations]') || line.startsWith('[AI]')) {
    return `${c.bgGreen}${c.white}${c.bold} AI ${c.reset} ${c.brightWhite}${line.replace(/^\[(Conversations|AI)\]\s*/, '')}${c.reset}`;
  }
  if (line.startsWith('[Whisper]')) {
    return `${c.bgCyan}${c.white}${c.bold} WHISPER ${c.reset} ${c.brightWhite}${line.replace(/^\[Whisper\]\s*/, '')}${c.reset}`;
  }

  // Erros ou warnings reais
  if (/error|erro|fail|exception/i.test(line)) {
    return `${c.brightRed}${c.bold}✖ ${line}${c.reset}`;
  }

  return `${c.gray}›${c.reset} ${c.white}${line}${c.reset}`;
}

function formatViteLine(rawLine) {
  const line = rawLine.trim();
  if (shouldIgnoreLine(line)) return null;

  if (line.includes('ready in')) {
    const timeMatch = line.match(/ready in\s+([0-9]+\s*ms)/i);
    if (timeMatch) state.viteTime = timeMatch[1];
    state.viteStatus = 'Pronto';
    return null;
  }

  if (line.includes('Local:') || line.includes('Network:')) {
    const urlMatch = line.match(/https?:\/\/[^\s]+/);
    if (urlMatch && !state.viteUrl) {
      state.viteUrl = urlMatch[0];
    }
    return null;
  }

  if (line.includes('page reload') || line.includes('hmr update')) {
    return `${c.brightCyan}⚡ [Vite HMR] ${c.dim}${line}${c.reset}`;
  }

  return `${c.gray}› [Vite] ${line}${c.reset}`;
}

let viteProcess = null;
let electronProcess = null;

function cleanup() {
  if (viteProcess) {
    try { viteProcess.kill('SIGTERM'); } catch {}
  }
  if (electronProcess) {
    try { electronProcess.kill('SIGTERM'); } catch {}
  }
}

process.on('SIGINT', () => {
  cleanup();
  clearScreen();
  console.log(`\n${c.cyan}Ambiente de desenvolvimento Organon encerrado.${c.reset}\n`);
  process.exit(0);
});

process.on('exit', cleanup);

// Início do fluxo
renderDashboard();

// 1. Iniciar Vite Dev Server
const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

viteProcess = spawn(npxCmd, ['vite'], {
  cwd: rootDir,
  env: { ...process.env, FORCE_COLOR: '1' }
});

viteProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(l => {
    const formatted = formatViteLine(l);
    if (formatted) addLog(formatted);
    else renderDashboard();
  });
});

viteProcess.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(l => {
    if (!shouldIgnoreLine(l.trim())) {
      addLog(`${c.yellow}⚠️ [Vite] ${l.trim()}${c.reset}`);
    }
  });
});

// 2. Compilar TypeScript do Node e em seguida lançar o Electron
const tscProcess = spawn(npxCmd, ['tsc', '-p', 'tsconfig.node.json'], {
  cwd: rootDir,
  env: { ...process.env, FORCE_COLOR: '1' }
});

tscProcess.on('close', (code) => {
  if (code !== 0) {
    state.electronStatus = `${c.brightRed}${c.bold}Falha na compilação TypeScript (Código ${code})${c.reset}`;
    renderDashboard();
    return;
  }

  state.electronStatus = `${c.brightGreen}${c.bold}Executando (Janela Ativa)${c.reset}`;
  renderDashboard();

  electronProcess = spawn(npxCmd, ['electron', '.'], {
    cwd: rootDir,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  electronProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(l => {
      const formatted = formatElectronLine(l);
      if (formatted) addLog(formatted);
    });
  });

  electronProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(l => {
      const formatted = formatElectronLine(l);
      if (formatted) addLog(formatted);
    });
  });

  electronProcess.on('close', (electronCode) => {
    state.electronStatus = `${c.gray}Encerrado (Código ${electronCode})${c.reset}`;
    renderDashboard();
    setTimeout(() => {
      cleanup();
      process.exit(electronCode || 0);
    }, 500);
  });
});
