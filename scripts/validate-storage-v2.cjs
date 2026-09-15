const { app } = require('electron')
const fs = require('fs')
const os = require('os')
const path = require('path')

const fail = (message) => { throw new Error(message) }

app.whenReady().then(() => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'organon-storage-v2-'))
  const userData = path.join(sandbox, 'user-data')
  const documents = path.join(sandbox, 'Documents')
  const legacyRoot = path.join(userData, 'legacy')
  const targetRoot = path.join(documents, 'Organon')
  fs.mkdirSync(userData, { recursive: true })
  fs.mkdirSync(documents, { recursive: true })
  app.setPath('userData', userData)
  app.setPath('documents', documents)

  const filesystem = require('../dist/main/filesystem.js')
  const storeModule = require('../dist/main/store.js')
  const migration = require('../dist/main/storageMigration.js')
  const backup = require('../dist/main/backup.js')

  filesystem.setConfig({
    version: 1,
    dataDir: legacyRoot,
    installerCompleted: true,
    storageLayoutVersion: 0,
    dedicatedStorageCompleted: false,
    migrationState: 'pending',
  })

  const store = storeModule.getDefaultStore()
  store.noteFolders = [{ id: 'folder-work', name: 'Trabalho', parentId: null, order: 0 }]
  store.notes = [{
    id: '12345678-note-test', title: 'Plano de produção', mdPath: '12345678-note-test.md',
    folderId: 'folder-work', isLocked: false, createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(), order: 0,
  }]
  store.cards = [{ id: 'card-1' }]
  if (!storeModule.saveStoreToPath(store, legacyRoot)) fail('Não foi possível preparar o store legado.')
  fs.mkdirSync(filesystem.getNotesDir(legacyRoot), { recursive: true })
  fs.writeFileSync(path.join(filesystem.getNotesDir(legacyRoot), '12345678-note-test.md'), '# Conteúdo preservado', 'utf8')

  const result = migration.migrateToDedicatedStorage(targetRoot, 'dark-default')
  if (!result.success) fail(result.error || 'Migração falhou.')
  if (!filesystem.isDedicatedStorageRoot(targetRoot)) fail('Marcador v2 ausente.')
  const migrated = storeModule.loadStoreFromPath(targetRoot)
  if (migrated.notes.length !== 1 || migrated.cards.length !== 1) fail('Contagens divergentes.')
  const notePath = path.join(filesystem.getNotesDir(targetRoot), migrated.notes[0].mdPath)
  if (!fs.existsSync(notePath) || !migrated.notes[0].mdPath.includes('Plano de produção--12345678.md')) fail('Nota legível não foi materializada.')

  if (!storeModule.saveStoreToPath(migrated, targetRoot)) fail('Não foi possível criar o último índice íntegro.')
  fs.writeFileSync(filesystem.getStorePath(targetRoot), '{invalido', 'utf8')
  fs.writeFileSync(path.join(filesystem.getStoreDir(targetRoot), 'notes.json'), '{invalido', 'utf8')
  const recovered = storeModule.loadStoreFromPath(targetRoot)
  if (recovered.notes.length !== 1 || recovered.cards.length !== 1) fail('A recuperação pelo último índice íntegro falhou.')

  const created = backup.createBackup(targetRoot, 'manual')
  if (!created.success || !created.backupPath) fail(created.error || 'Backup manual falhou.')
  const validation = backup.validateBackup(created.backupPath)
  if (!validation.valid) fail(validation.error || 'Backup não passou na validação.')
  fs.unlinkSync(notePath)
  const restored = backup.restoreBackup(created.backupPath, targetRoot)
  if (!restored.success) fail(restored.error || 'A restauração falhou.')
  if (fs.readFileSync(notePath, 'utf8') !== '# Conteúdo preservado') fail('A restauração não recuperou o Markdown da nota.')

  console.log(JSON.stringify({
    migration: 'ok', recovery: 'ok', backup: 'ok', restore: 'ok', notes: migrated.notes.length,
    readablePath: migrated.notes[0].mdPath, root: targetRoot,
  }))
  fs.rmSync(sandbox, { recursive: true, force: true })
  app.quit()
}).catch(error => {
  console.error(error)
  app.exit(1)
})
