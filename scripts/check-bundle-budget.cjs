#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rendererDir = path.resolve(__dirname, '..', 'dist', 'renderer');
const assetsDir = path.join(rendererDir, 'assets');
if (!fs.existsSync(assetsDir)) throw new Error(`Diretorio de assets ausente: ${assetsDir}`);

const files = fs.readdirSync(assetsDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({ name, bytes: fs.statSync(path.join(assetsDir, name)).size }))
  .sort((a, b) => b.bytes - a.bytes);

const budgets = [
  { prefix: 'main-', maxBytes: 1_850_000 },
  { prefix: 'subset-shared', maxBytes: 1_900_000 },
  { prefix: 'flowchart-elk', maxBytes: 1_500_000 },
  { prefix: 'excalidraw-', maxBytes: 1_200_000 },
];
const defaultChunkBudget = 800_000;
const totalBudget = 18_000_000;

const violations = [];
for (const file of files) {
  const budget = budgets.find((item) => file.name.startsWith(item.prefix));
  const maxBytes = budget?.maxBytes ?? defaultChunkBudget;
  if (file.bytes > maxBytes) violations.push(`${file.name}: ${file.bytes} > ${maxBytes} bytes`);
}
const totalBytes = files.reduce((total, file) => total + file.bytes, 0);
if (totalBytes > totalBudget) violations.push(`total JavaScript: ${totalBytes} > ${totalBudget} bytes`);

const report = {
  generatedAt: new Date().toISOString(),
  totalBytes,
  totalBudget,
  defaultChunkBudget,
  budgets,
  chunks: files,
  violations,
};
fs.writeFileSync(path.join(rendererDir, 'bundle-report.json'), JSON.stringify(report, null, 2), 'utf-8');

if (violations.length) {
  console.error('Bundle budget excedido:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(JSON.stringify({ bundleBudget: 'ok', chunks: files.length, totalBytes, largest: files.slice(0, 5) }));
