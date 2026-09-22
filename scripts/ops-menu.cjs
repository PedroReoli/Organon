#!/usr/bin/env node

/**
 * Organon Ops - Menu CLI Compacto & Direto
 */

const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Desabilitar avisos de depreciação do Node
process.env.NODE_NO_WARNINGS = '1';

// Cores ANSI
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
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  white: '\x1b[37m',
  brightWhite: '\x1b[97m',
  gray: '\x1b[90m',
  bgDark: '\x1b[100m',
  bgCyan: '\x1b[46m',
  bgMagenta: '\x1b[45m',
};

// Ler package.json
const packageJsonPath = path.resolve(__dirname, '../package.json');
let pkg = { name: 'organon', version: '6.x', scripts: {} };
function reloadPkg() {
  try {
    pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch {}
}
reloadPkg();

// Itens principais do menu
const MENU_ITEMS = [
  {
    key: '1',
    type: 'action',
    script: 'dev',
    tag: 'DEV FULL',
    tagColor: c.brightCyan,
    desc: 'Inicia ambiente dev completo (Vite + Electron)',
    icon: '⚡'
  },
  {
    key: '2',
    type: 'action',
    script: 'build:full',
    tag: 'BUILD FULL',
    tagColor: c.brightYellow,
    desc: 'Compila, empacota e pergunta se deseja dar bump & instalar',
    icon: '📦'
  },
  {
    key: '3',
    type: 'action',
    script: 'exec:1',
    tag: 'RELEASE & INSTALAR',
    tagColor: c.brightMagenta,
    desc: 'Bump versão + Build + Empacota Windows e instala já',
    icon: '🚀'
  },
  {
    key: '4',
    type: 'action',
    script: 'install:all',
    tag: 'INSTALAR TUDO',
    tagColor: c.brightGreen,
    desc: 'Instala todas as dependências do projeto (npm install)',
    icon: '📥'
  },
  {
    key: '5',
    type: 'custom',
    id: 'more',
    tag: 'OUTROS SCRIPTS',
    tagColor: c.white,
    desc: 'Ver e disparar qualquer outro script do package.json',
    icon: '⚙️'
  },
  {
    key: '0',
    type: 'custom',
    id: 'exit',
    tag: 'SAIR',
    tagColor: c.red,
    desc: 'Encerrar o menu Ops',
    icon: '🚪'
  }
];

let selectedIndex = 0;

function clearScreen() {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1b[2J\x1b[0;0H');
  }
}

function renderHeader() {
  console.log(
    `\n ${c.bgCyan}${c.bold}${c.white} ORGANON OPS ${c.reset} ` +
    `${c.dim}v${pkg.version || '1.0.0'}${c.reset} ` +
    `${c.gray}│${c.reset} ` +
    `${c.dim}Atalhos: ${c.reset}${c.bold}[1-5]${c.reset} ou ${c.bold}[↑/↓ + Enter]${c.reset} ${c.dim}| [Q/0] Sair${c.reset}`
  );
  console.log(`${c.gray}─────────────────────────────────────────────────────────────────${c.reset}`);
}

function renderMenu() {
  clearScreen();
  renderHeader();

  MENU_ITEMS.forEach((item, idx) => {
    const isSelected = idx === selectedIndex;
    const num = `[${item.key}]`;
    const tag = `${item.icon} ${item.tag}`.padEnd(24, ' ');

    if (isSelected) {
      console.log(
        ` ${c.brightCyan}${c.bold}❯${c.reset} ${c.brightCyan}${c.bold}${num}${c.reset} ` +
        `${c.bgDark}${item.tagColor}${c.bold} ${tag}${c.reset} ` +
        `${c.brightWhite}${item.desc}${c.reset}`
      );
    } else {
      console.log(
        `   ${c.gray}${num}${c.reset} ` +
        `${item.tagColor}${tag}${c.reset} ` +
        `${c.dim}${item.desc}${c.reset}`
      );
    }
  });

  console.log(`${c.gray}─────────────────────────────────────────────────────────────────${c.reset}`);
}

function showAllScriptsSubmenu(onBack) {
  const allScripts = Object.keys(pkg.scripts || {});
  let subIndex = 0;

  function renderSub() {
    clearScreen();
    console.log(`\n ${c.bgMagenta}${c.bold}${c.white} TODOS OS SCRIPTS (${allScripts.length}) ${c.reset} ${c.dim}[↑/↓ + Enter | Esc/Q voltar]${c.reset}`);
    console.log(`${c.gray}─────────────────────────────────────────────────────────────────${c.reset}`);

    allScripts.forEach((script, idx) => {
      const isSelected = idx === subIndex;
      const pointer = isSelected ? `${c.brightMagenta}${c.bold}❯${c.reset}` : ' ';
      const command = (pkg.scripts[script] || '').slice(0, 48);

      if (isSelected) {
        console.log(
          ` ${pointer} ${c.bgDark}${c.brightMagenta}${c.bold} ${script.padEnd(20, ' ')} ${c.reset} ` +
          `${c.brightWhite}${command}${c.reset}`
        );
      } else {
        console.log(
          ` ${pointer} ${c.cyan}${script.padEnd(20, ' ')}${c.reset} ` +
          `${c.dim}${command}${c.reset}`
        );
      }
    });

    console.log(`${c.gray}─────────────────────────────────────────────────────────────────${c.reset}`);
  }

  renderSub();

  function onKeySub(str, key) {
    if (!key) return;
    if (key.name === 'up' || key.name === 'k') {
      subIndex = (subIndex - 1 + allScripts.length) % allScripts.length;
      renderSub();
    } else if (key.name === 'down' || key.name === 'j') {
      subIndex = (subIndex + 1) % allScripts.length;
      renderSub();
    } else if (key.name === 'escape' || key.name === 'q' || key.name === 'backspace') {
      cleanupSub();
      onBack();
    } else if (key.name === 'return' || key.name === 'enter') {
      cleanupSub();
      runScript(allScripts[subIndex]);
    } else if (key.ctrl && key.name === 'c') {
      cleanupSub();
      exitMenu();
    }
  }

  function cleanupSub() {
    process.stdin.removeListener('keypress', onKeySub);
  }

  process.stdin.on('keypress', onKeySub);
}

function runScript(scriptName) {
  clearScreen();
  console.log(`\n${c.bgCyan}${c.bold}${c.white} EXECUTANDO ⚡ ${c.reset} ${c.bold}${c.brightCyan}npm run ${scriptName}${c.reset}`);
  console.log(`${c.dim}Comando:${c.reset} ${c.yellow}${pkg.scripts[scriptName] || 'npm run ' + scriptName}${c.reset}`);
  console.log(`${c.gray}─────────────────────────────────────────────────────────────────${c.reset}\n`);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }

  const isWin = process.platform === 'win32';
  let child;

  try {
    if (scriptName === 'dev' || scriptName === 'full') {
      child = spawn(process.execPath, [path.resolve(__dirname, 'dev-app.cjs')], {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
        shell: isWin,
        env: { ...process.env, NODE_NO_WARNINGS: '1' }
      });
    } else if (scriptName === 'install:all') {
      child = spawn(process.execPath, [path.resolve(__dirname, 'install-all.cjs')], {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
        shell: isWin,
        env: { ...process.env, NODE_NO_WARNINGS: '1' }
      });
    } else if (scriptName === 'bump' || scriptName === 'bump:v') {
      child = spawn(process.execPath, [path.resolve(__dirname, 'bump-version.js')], {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
        shell: isWin,
        env: { ...process.env, NODE_NO_WARNINGS: '1' }
      });
    } else {
      const npmCmd = isWin ? 'npm.cmd' : 'npm';
      child = spawn(npmCmd, ['run', scriptName], {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
        shell: true,
        env: { ...process.env, NODE_NO_WARNINGS: '1' }
      });
    }
  } catch (err) {
    console.error(`\n${c.brightRed}Erro ao disparar processo: ${err.message}${c.reset}`);
    return;
  }

  child.on('close', (code) => {
    console.log(`\n${c.gray}─────────────────────────────────────────────────────────────────${c.reset}`);
    if (code === 0) {
      console.log(`${c.brightGreen}${c.bold}✔ Sucesso (Código 0)${c.reset}`);
    } else {
      console.log(`${c.brightRed}${c.bold}✖ Finalizado com código: ${code}${c.reset}`);
    }

    // Se foi build completa com sucesso (opção [2]), perguntar se deseja dar bump e instalar
    if (code === 0 && (scriptName === 'build:full' || scriptName === 'build:electron')) {
      const rlInstall = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      console.log(`\n${c.brightYellow}${c.bold}📦 Build concluída com sucesso!${c.reset}`);
      rlInstall.question(`\n${c.brightCyan}${c.bold}Deseja dar bump na versão e instalar na sua máquina agora? (S/n): ${c.reset}`, (answer) => {
        rlInstall.close();
        const ans = answer.trim().toLowerCase();
        const shouldInstall = ans === '' || ans === 's' || ans === 'sim' || ans === 'y' || ans === 'yes';

        if (shouldInstall) {
          handleBumpAndInstall(() => {
            askReturnToMenu();
          });
        } else {
          console.log(`${c.dim}Instalação ignorada.${c.reset}`);
          askReturnToMenu();
        }
      });
      return;
    }

    askReturnToMenu();
  });

  child.on('error', (err) => {
    console.error(`\n${c.brightRed}Erro ao executar: ${err.message}${c.reset}`);
    exitMenu(1);
  });
}

function findLatestInstaller() {
  const candidateDirs = [
    path.resolve(__dirname, '../release'),
    path.resolve(__dirname, '../../release'),
    path.resolve(__dirname, '../../../release')
  ];

  let latestInstaller = null;
  let latestMtime = 0;

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.exe') && entry.name.includes('Setup')) {
          const stat = fs.statSync(fullPath);
          if (stat.mtimeMs > latestMtime) {
            latestMtime = stat.mtimeMs;
            latestInstaller = fullPath;
          }
        }
      }
    } catch {}
  }

  for (const cDir of candidateDirs) {
    scanDir(cDir);
  }

  return latestInstaller;
}

function handleBumpAndInstall(callback) {
  console.log(`\n${c.brightMagenta}${c.bold}⚡ Executando bump de versão...${c.reset}`);

  const bumpChild = spawn(process.execPath, [path.resolve(__dirname, 'bump-version.js')], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    shell: process.platform === 'win32'
  });

  bumpChild.on('close', () => {
    reloadPkg();

    const installer = findLatestInstaller();
    if (!installer) {
      console.error(`\n${c.brightRed}${c.bold}✖ Instalador .exe não encontrado nas pastas de release.${c.reset}`);
      return callback ? callback() : null;
    }

    console.log(`\n${c.brightCyan}${c.bold}🚀 Iniciando instalador:${c.reset} ${c.brightWhite}${installer}${c.reset}`);
    console.log(`${c.dim}Executando processo de instalação no Windows...${c.reset}\n`);

    if (process.platform === 'win32') {
      const installChild = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-Command',
        `Start-Process -FilePath "${installer}" -Wait`
      ], {
        stdio: 'inherit',
        shell: true
      });

      installChild.on('close', (installCode) => {
        if (installCode === 0) {
          console.log(`\n${c.brightGreen}${c.bold}✔ Organon instalado com sucesso!${c.reset}`);
        } else {
          console.log(`\n${c.yellow}Instalador finalizado (código: ${installCode}).${c.reset}`);
        }
        if (callback) callback();
      });

      installChild.on('error', (err) => {
        console.error(`\n${c.brightRed}Erro ao disparar instalador: ${err.message}${c.reset}`);
        if (callback) callback();
      });
    } else {
      console.log(`\n${c.yellow}Instalador disponível em: ${installer}${c.reset}`);
      if (callback) callback();
    }
  });

  bumpChild.on('error', (err) => {
    console.error(`\n${c.brightRed}Erro ao executar bump: ${err.message}${c.reset}`);
    if (callback) callback();
  });
}

function askReturnToMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`\n${c.cyan}[Enter] voltar ao menu Ops ou [Q + Enter] sair: ${c.reset}`, (answer) => {
    rl.close();
    if (answer.trim().toLowerCase() === 'q') {
      exitMenu();
    } else {
      startInteractiveMode();
    }
  });
}

function exitMenu(code = 0) {
  clearScreen();
  console.log(`\n${c.cyan}Organon Ops encerrado.${c.reset}\n`);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.exit(code);
}

function executeItem(item) {
  if (item.type === 'action') {
    runScript(item.script);
  } else if (item.type === 'custom') {
    if (item.id === 'exit') {
      exitMenu();
    } else if (item.id === 'more') {
      showAllScriptsSubmenu(() => startInteractiveMode());
    }
  }
}

function startInteractiveMode() {
  if (!process.stdin.isTTY) {
    renderHeader();
    MENU_ITEMS.forEach(it => {
      console.log(`[${it.key}] ${it.tag} -> ${it.script || it.id} (${it.desc})`);
    });
    return;
  }

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  renderMenu();

  function onKeyPress(str, key) {
    if (!key) return;

    if (key.ctrl && key.name === 'c') {
      cleanup();
      exitMenu();
      return;
    }

    // Atalhos numéricos diretos (1, 2, 3, 4, 5, 0)
    const matchByKey = MENU_ITEMS.find(it => it.key === str);
    if (matchByKey) {
      cleanup();
      executeItem(matchByKey);
      return;
    }

    if (key.name === 'q') {
      cleanup();
      exitMenu();
      return;
    }

    if (key.name === 'up' || key.name === 'k') {
      selectedIndex = (selectedIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
      renderMenu();
    } else if (key.name === 'down' || key.name === 'j') {
      selectedIndex = (selectedIndex + 1) % MENU_ITEMS.length;
      renderMenu();
    } else if (key.name === 'return' || key.name === 'enter' || key.name === 'space') {
      cleanup();
      executeItem(MENU_ITEMS[selectedIndex]);
    }
  }

  function cleanup() {
    process.stdin.removeListener('keypress', onKeyPress);
  }

  process.stdin.on('keypress', onKeyPress);
}

startInteractiveMode();
