#!/usr/bin/env node

/**
 * Organon Bump Version Utility
 * Incrementa a versão do package.json e sincroniza com build.counter.json
 */

const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(__dirname, '../package.json');
const counterPath = path.resolve(__dirname, '../build.counter.json');

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
};

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version || '1.0.0';

const args = process.argv.slice(2);
let newVersion = '';

const versionArgIndex = args.findIndex(a => a === '--version' || a === '-v');
if (versionArgIndex !== -1 && args[versionArgIndex + 1]) {
  newVersion = args[versionArgIndex + 1].replace(/^v/, '');
} else {
  // Incrementa patch automaticamente (ex: 6.23.2 -> 6.23.3)
  const parts = currentVersion.split('.').map(Number);
  if (parts.length === 3 && parts.every(n => !isNaN(n))) {
    parts[2] += 1;
    newVersion = parts.join('.');
  } else {
    newVersion = `${currentVersion}.1`;
  }
}

// Atualizar package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// Atualizar build.counter.json
try {
  const today = new Date().toISOString().split('T')[0];
  let counter = { date: today, count: 1 };
  if (fs.existsSync(counterPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(counterPath, 'utf8'));
      if (data.date === today) {
        counter.count = (data.count || 0) + 1;
      }
    } catch {}
  }
  fs.writeFileSync(counterPath, JSON.stringify(counter, null, 2) + '\n', 'utf8');
} catch {}

console.log(`${c.brightCyan}${c.bold}⚡ Organon Version Bump:${c.reset} ${c.gray}${currentVersion}${c.reset} → ${c.brightGreen}${c.bold}v${newVersion}${c.reset}`);