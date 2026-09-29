const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const fail = (message) => { throw new Error(message) }
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'organon-cli-storage-'))

try {
  const homeDir = path.join(sandbox, 'home')
  const appData = path.join(sandbox, 'appdata')
  const cwd = path.join(sandbox, 'workspace')
  const dedicated = path.join(homeDir, 'Documents', 'Organon')
  const userData = path.join(appData, 'Organon')
  fs.mkdirSync(path.join(dedicated, '_sistema'), { recursive: true })
  fs.mkdirSync(userData, { recursive: true })
  fs.mkdirSync(cwd, { recursive: true })
  fs.writeFileSync(
    path.join(dedicated, '_sistema', 'storage-layout.json'),
    JSON.stringify({ version: 2, state: 'completed' }),
    'utf8'
  )

  const store = require('../bin/lib/store.cjs')
  const options = { env: { APPDATA: appData }, platform: 'win32', homeDir, cwd }
  if (store.resolveDataDir(options) !== dedicated) fail('CLI nao redescobriu o root dedicado valido.')

  const explicitRoot = path.join(sandbox, 'explicit-root')
  fs.writeFileSync(path.join(userData, 'config.json'), JSON.stringify({ version: 2, dataDir: explicitRoot }), 'utf8')
  if (store.resolveDataDir(options) !== explicitRoot) fail('CLI ignorou o root configurado explicitamente.')

  fs.writeFileSync(path.join(userData, 'config.json'), '{invalido', 'utf8')
  fs.writeFileSync(path.join(userData, 'config.json.bak'), JSON.stringify({ version: 2, dataDir: explicitRoot }), 'utf8')
  if (store.resolveDataDir(options) !== explicitRoot) fail('CLI nao recuperou o root pelo backup da configuracao.')

  console.log(JSON.stringify({ cliAutoDiscovery: 'ok', configBackup: 'ok' }))
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true })
}
