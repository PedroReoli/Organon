const { app } = require('electron')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'organon-activity-'))
const dataRoot = path.join(sandbox, 'data')
app.setPath('userData', sandbox)
process.env.ORGANON_DATA_DIR = dataRoot

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

app.whenReady().then(async () => {
  const filesystem = require('../dist/main/storage/filesystem')
  const storage = require('../dist/main/storage/store')
  const { getDefaultStore } = require('../dist/main/storage/storeModel')
  const watcher = require('../dist/main/storage/realtimeSyncWatcher')
  const updates = []
  require('../dist/main/core/window').getMainWindow = () => ({
    isDestroyed: () => false,
    webContents: { send: (channel, payload) => {
      if (channel === 'store:external-update') updates.push(payload)
    } },
  })

  try {
    assert.equal(filesystem.setConfig({ ...filesystem.getDefaultConfig(), dataDir: dataRoot }), true)
    assert.equal(storage.saveStore(getDefaultStore(), { source: 'renderer' }), true)
    watcher.startRealtimeSyncWatcher()

    const manual = storage.loadStore()
    manual.cards.push({ id: 'manual-card', title: 'Edição manual', updatedAt: new Date().toISOString() })
    assert.equal(storage.saveStore(manual, { source: 'renderer' }), true)
    watcher.notifyInternalSave()
    await delay(700)
    assert.equal(watcher.getRecentCliEvents().length, 0, 'Edição manual apareceu como atividade de IA/CLI')

    const cliStore = require('../bin/lib/store.cjs')
    const planning = cliStore.getPlanningData()
    planning.cards.push({ id: 'cli-card', title: 'Edição CLI', updatedAt: new Date().toISOString() })
    cliStore.savePlanningData(planning)
    await delay(1000)

    const events = watcher.getRecentCliEvents()
    assert.equal(events.length, 1, 'A CLI deve gerar exatamente um evento')
    assert.equal(events[0].targetId, 'cli-card')
    assert.equal(events[0].agent, 'CLI Organon')
    assert.ok(updates.some(update => update.changes.some(change => change.targetId === 'cli-card')))
    console.log(JSON.stringify({ manualEvents: 0, cliEvents: events.length, agent: events[0].agent }))
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  } finally {
    watcher.stopRealtimeSyncWatcher()
    delete process.env.ORGANON_DATA_DIR
    app.once('quit', () => {
      try { fs.rmSync(sandbox, { recursive: true, force: true }) } catch { /* Electron pode manter userData aberto ate o processo encerrar. */ }
    })
    app.quit()
  }
})
