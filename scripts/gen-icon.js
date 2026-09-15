// Ícone do Organon para o system tray
// Gerado como PNG 32x32 - será usado para o tray
import fs from 'fs'
import path from 'path'

// SVG do ícone (32x32)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="28" height="28" rx="6" fill="url(#g)"/>
  <text x="16" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white">O</text>
</svg>`

// Cria o diretório se não existir
const outDir = path.join(process.cwd(), 'src', 'renderer', 'public', 'super-whisper')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

fs.writeFileSync(path.join(outDir, 'icon.svg'), svg)
console.log('Icon criado:', path.join(outDir, 'icon.svg'))