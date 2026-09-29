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

  process.env.ORGANON_DATA_DIR = dedicated
  const store = require('../bin/lib/store.cjs')
  const options = { env: { APPDATA: appData }, platform: 'win32', homeDir, cwd }
  if (store.resolveDataDir(options) !== dedicated) fail('CLI nao redescobriu o root dedicado valido.')

  const explicitRoot = path.join(sandbox, 'explicit-root')
  fs.writeFileSync(path.join(userData, 'config.json'), JSON.stringify({ version: 2, dataDir: explicitRoot }), 'utf8')
  if (store.resolveDataDir(options) !== explicitRoot) fail('CLI ignorou o root configurado explicitamente.')

  fs.writeFileSync(path.join(userData, 'config.json'), '{invalido', 'utf8')
  fs.writeFileSync(path.join(userData, 'config.json.bak'), JSON.stringify({ version: 2, dataDir: explicitRoot }), 'utf8')
  if (store.resolveDataDir(options) !== explicitRoot) fail('CLI nao recuperou o root pelo backup da configuracao.')

  const initialPlanning = store.getPlanningData()
  initialPlanning.cards.push({ id: 'cli-card-1', title: 'Primeiro commit CLI', status: 'todo' })
  store.savePlanningData(initialPlanning)
  const firstStatus = store.getSystemStatus()
  if (!firstStatus.transactional || firstStatus.revision !== 1) fail('CLI nao publicou a primeira geracao transacional.')
  if (!/^root-[0-9a-f]{16}$/.test(firstStatus.rootId || '')) fail('CLI nao reportou rootId valido.')

  const stalePlanning = store.getPlanningData()
  const concurrentPlanning = store.getPlanningData()
  concurrentPlanning.cards.push({ id: 'cli-card-2', title: 'Commit concorrente', status: 'todo' })
  store.savePlanningData(concurrentPlanning)
  stalePlanning.cards.push({ id: 'cli-card-stale', title: 'Commit obsoleto', status: 'todo' })
  let conflictDetected = false
  try {
    store.savePlanningData(stalePlanning)
  } catch (error) {
    conflictDetected = String(error).includes('Conflito de revisao')
  }
  if (!conflictDetected) fail('CLI nao rejeitou mutacao baseada em revisao obsoleta.')
  const freshPlanning = store.getPlanningData()
  if (!freshPlanning.cards.some(card => card.id === 'cli-card-2')) fail('Commit concorrente valido nao foi preservado.')
  if (freshPlanning.cards.some(card => card.id === 'cli-card-stale')) fail('Commit obsoleto contaminou a geracao atual.')

  console.log(JSON.stringify({ cliAutoDiscovery: 'ok', configBackup: 'ok', transactionalWrite: 'ok', revisionCas: 'ok', revision: store.getSystemStatus().revision }))
} finally {
  delete process.env.ORGANON_DATA_DIR
  fs.rmSync(sandbox, { recursive: true, force: true })
}
