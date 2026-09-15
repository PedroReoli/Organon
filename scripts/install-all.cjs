#!/usr/bin/env node

/**
 * Organon Install All
 * Instala e verifica todas as dependências do projeto com feedback visual.
 */

const { spawn } = require('child_process');
const path = require('path');

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  gray: '\x1b[90m',
  bgCyan: '\x1b[46m',
  white: '\x1b[37m',
};

console.log(`\n${c.bgCyan}${c.bold}${c.white} ORGANON INSTALL 📦 ${c.reset} ${c.brightCyan}Instalando dependências do projeto...${c.reset}`);
console.log(`${c.gray}─────────────────────────────────────────────────────────────────${c.reset}\n`);

const child = spawn('npm', ['install'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..')
});

child.on('close', (code) => {
  console.log(`\n${c.gray}─────────────────────────────────────────────────────────────────${c.reset}`);
  if (code === 0) {
    console.log(`${c.brightGreen}${c.bold}✔ Todas as dependências foram instaladas com sucesso!${c.reset}\n`);
  } else {
    console.log(`${c.brightRed}${c.bold}✖ Falha ao instalar dependências (código ${code})${c.reset}\n`);
  }
  process.exit(code);
});

child.on('error', (err) => {
  console.error(`\n${c.brightRed}Erro ao iniciar npm install: ${err.message}${c.reset}`);
  process.exit(1);
});
