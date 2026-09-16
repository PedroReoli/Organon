#!/usr/bin/env node

/**
 * Organon Dev Runner - Dashboard Limpo e Sem Ruídos
 * Execução direta de binários (Node/Vite/Electron) sem batch .cmd, sem avisos de lote e sem warnings.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');

// Silenciar warnings do Node
process.env.NODE_NO_WARNINGS = '1';

// Caminhos dos binários diretos em node_modules
const nodeBin = process.execPath;
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const tscBin = path.join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');
const electronBin = process.platform === 'win32'
  ? path.join(rootDir, 'node_modules', 'electron', 'dist', 'electron.exe')
  : path.join(rootDir, 'node_modules', 'electron', 'dist', 'electron');

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

// Estado em tempo real
const state = {
  viteStatus: 'Iniciando servidor Vite...',
  viteUrl: '',
  viteTime: '',
  electronStatus: 'Compilando TypeScript...',
  shortcuts: '',
  conversationsDir: '',
  logs: []
};

// Padrões de ruídos a ignorar
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
  /Deseja finalizar o arquivo em lotes/,
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

  // Atalhos e Diretórios
  if (state.shortcuts) {
    console.log(` ${c.brightMagenta}${c.bold}⌨️  Atalhos:${c.reset}      ${c.brightWhite}${state.shortcuts}${c.reset}`);
  }
  if (state.conversationsDir) {
    console.log(` ${c.dim}📁 Storage AI:${c.reset}    ${c.dim}${state.conversationsDir}${c.reset}`);
  }

  console.log(`${c.gray}─────────────────────────────────────────────────────────────────────────────${c.reset}`);
  console.log(` ${c.dim}${c.bold}LOGS RECENTES:${c.reset}`);

  if (state.logs.length === 0) {
    console.log(` ${c.dim}Aguardando inicialização dos módulos...${c.reset}`);
  } else {
    state.logs.slice(-12).forEach(log => {
      console.log(` ${log}`);
    });
  }
  console.log(`${c.gray}─────────────────────────────────────────────────────────────────────────────${c.reset}`);
}

function addLog(formattedLine) {
  if (!formattedLine) return;
  state.logs.push(formattedLine);
  if (state.logs.length > 50) {
    state.logs.shift();
  }
  renderDashboard();
}

function formatElectronLine(rawLine) {
  const line = rawLine.trim();
  if (shouldIgnoreLine(line)) return null;

  if (line.includes('Atalhos globais') && line.includes('registrados')) {
    const match = line.match(/\((.*?)\)/);
    if (match) state.shortcuts = match[1];
  }
  if (line.includes('[Conversations] Diretório:')) {
    state.conversationsDir = line.replace(/.*Diretório:\s*/, '');
  }

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
    // Extrai os arquivos atualizados pelo HMR para exibir de forma limpa
    const updateFiles = line.replace(/.*hmr update\s*/i, '');
    return `${c.brightCyan}⚡ [HMR]${c.reset} ${c.dim}${updateFiles}${c.reset}`;
  }

  return `${c.gray}› [Vite] ${line}${c.reset}`;
}

let viteProcess = null;
let electronProcess = null;
let isCleaningUp = false;

function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;

  if (viteProcess) {
    try { viteProcess.kill(); } catch {}
  }
  if (electronProcess) {
    try { electronProcess.kill(); } catch {}
  }
}

process.on('SIGINT', () => {
  cleanup();
  clearScreen();
  console.log(`\n${c.cyan}Ambiente de desenvolvimento Organon encerrado.${c.reset}\n`);
  process.exit(0);
});

process.on('exit', cleanup);

// Início
renderDashboard();

// 1. Iniciar Vite Dev Server chamando node direto
viteProcess = spawn(nodeBin, [viteBin], {
  cwd: rootDir,
  env: { ...process.env, FORCE_COLOR: '1', NODE_NO_WARNINGS: '1' }
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

viteProcess.on('error', (err) => {
  addLog(`${c.brightRed}Erro ao iniciar Vite: ${err.message}${c.reset}`);
});

// 2. Compilar TypeScript do Node e lançar Electron direto
const tscProcess = spawn(nodeBin, [tscBin, '-p', 'tsconfig.node.json'], {
  cwd: rootDir,
  env: { ...process.env, FORCE_COLOR: '1', NODE_NO_WARNINGS: '1' }
});

tscProcess.on('close', (code) => {
  if (code !== 0) {
    state.electronStatus = `${c.brightRed}${c.bold}Falha na compilação TypeScript (Código ${code})${c.reset}`;
    renderDashboard();
    return;
  }

  state.electronStatus = `${c.brightGreen}${c.bold}Executando (Janela Ativa)${c.reset}`;
  renderDashboard();

  if (!fs.existsSync(electronBin)) {
    addLog(`${c.brightRed}Executável do Electron não encontrado em: ${electronBin}${c.reset}`);
    return;
  }

  electronProcess = spawn(electronBin, ['.'], {
    cwd: rootDir,
    env: { ...process.env, FORCE_COLOR: '1', NODE_NO_WARNINGS: '1' }
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

  electronProcess.on('error', (err) => {
    addLog(`${c.brightRed}Erro ao iniciar Electron: ${err.message}${c.reset}`);
  });

  electronProcess.on('close', (electronCode) => {
    state.electronStatus = `${c.gray}Encerrado (Código ${electronCode})${c.reset}`;
    renderDashboard();
    setTimeout(() => {
      cleanup();
      process.exit(electronCode || 0);
    }, 400);
  });
});
