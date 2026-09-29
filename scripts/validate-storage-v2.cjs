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

  const filesystem = require('../dist/main/storage/filesystem.js')
  const storeModule = require('../dist/main/storage/store.js')
  const generationStore = require('../dist/main/storage/generationStore.js')
  const { StorageHydrationGuard } = require('../dist/main/storage/hydrationGuard.js')
  const migration = require('../dist/main/storage/storageMigration.js')
  const backup = require('../dist/main/backup/backupService.js')

  const missingRoot = path.join(sandbox, 'missing-root')
  storeModule.loadStoreFromPath(missingRoot)
  if (fs.existsSync(missingRoot)) fail('Leitura de root ausente criou arquivos no disco.')

  const hydrationGuard = new StorageHydrationGuard()
  if (hydrationGuard.canWrite(7, 'invalido')) fail('Guard liberou escrita antes da hidratacao.')
  const hydrationToken = hydrationGuard.markHydrated(7)
  if (!hydrationGuard.canWrite(7, hydrationToken)) fail('Guard nao liberou cliente hidratado.')
  if (hydrationGuard.canWrite(7, 'invalido')) fail('Guard aceitou token de hidratacao incorreto.')
  hydrationGuard.revoke(7)
  if (hydrationGuard.canWrite(7, hydrationToken)) fail('Guard manteve permissao depois da revogacao.')

  const discoveryDedicated = path.join(sandbox, 'discovery-dedicated')
  const discoveryLegacy = path.join(sandbox, 'discovery-legacy')
  fs.mkdirSync(path.join(discoveryDedicated, '_sistema'), { recursive: true })
  fs.writeFileSync(
    path.join(discoveryDedicated, '_sistema', 'storage-layout.json'),
    JSON.stringify({ version: 2, state: 'completed' }),
    'utf8'
  )
  const discoveredPath = filesystem.resolveDataPath(filesystem.getDefaultConfig(), discoveryDedicated, discoveryLegacy)
  if (discoveredPath !== discoveryDedicated) fail('Desktop nao redescobriu o root dedicado valido.')
  const explicitPath = path.join(sandbox, 'explicit-root')
  const configuredPath = filesystem.resolveDataPath(
    { ...filesystem.getDefaultConfig(), dataDir: explicitPath },
    discoveryDedicated,
    discoveryLegacy
  )
  if (configuredPath !== explicitPath) fail('Desktop ignorou o root configurado explicitamente.')

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
  const firstGeneration = generationStore.loadCommittedGeneration(legacyRoot)
  if (!firstGeneration || firstGeneration.revision !== 1) fail('Primeira geracao transacional nao foi publicada.')
  const currentPath = path.join(legacyRoot, '_sistema', 'CURRENT')
  const currentBeforeFault = fs.readFileSync(currentPath, 'utf8')
  const faultedCommit = generationStore.commitStoreGeneration(store, legacyRoot, {
    source: 'fault-injection',
    expectedRevision: firstGeneration.revision,
    faultAt: 'generation-published',
  })
  if (faultedCommit.success) fail('Falha injetada foi reportada como commit concluido.')
  if (fs.readFileSync(currentPath, 'utf8') !== currentBeforeFault) fail('Falha antes de CURRENT alterou a geracao visivel.')
  if (generationStore.loadCommittedGeneration(legacyRoot)?.revision !== firstGeneration.revision) fail('Leitura observou geracao parcial.')
  const conflict = generationStore.commitStoreGeneration(store, legacyRoot, { expectedRevision: 999 })
  if (conflict.success || !conflict.conflict) fail('Compare-and-swap nao rejeitou revisao divergente.')
  const lockPath = path.join(legacyRoot, '_sistema', 'storage.lock')
  fs.writeFileSync(lockPath, JSON.stringify({ token: 'other-writer', pid: process.pid, createdAt: new Date().toISOString() }), 'utf8')
  const locked = generationStore.commitStoreGeneration(store, legacyRoot, { expectedRevision: firstGeneration.revision })
  fs.unlinkSync(lockPath)
  if (locked.success || !locked.error?.includes('ocupado')) fail('Lock entre processos nao bloqueou o segundo escritor.')
  if (!storeModule.saveStoreToPath(store, legacyRoot)) fail('Retry apos falha transacional nao concluiu.')
  const secondGeneration = generationStore.loadCommittedGeneration(legacyRoot)
  if (!secondGeneration || secondGeneration.revision !== 2) fail('Revisao nao avancou apos commit valido.')
  const journalPath = path.join(legacyRoot, '_sistema', 'transactions', secondGeneration.transactionId, 'transaction.json')
  if (!fs.existsSync(journalPath)) fail('Journal duravel da transacao nao foi preservado.')
  const committedAfterPointer = generationStore.commitStoreGeneration(store, legacyRoot, {
    source: 'fault-injection',
    expectedRevision: secondGeneration.revision,
    faultAt: 'current-published',
  })
  if (!committedAfterPointer.success || committedAfterPointer.revision !== 3) fail('Commit publicado foi perdido apos falha tardia.')
  const currentBeforeBoots = fs.readFileSync(currentPath, 'utf8')
  for (let index = 0; index < 10; index++) {
    if (generationStore.loadCommittedGeneration(legacyRoot)?.revision !== 3) fail('Boot repetido alterou a revisao.')
  }
  if (fs.readFileSync(currentPath, 'utf8') !== currentBeforeBoots) fail('Boot read-only alterou o ponteiro CURRENT.')
  const dirtyRoot = path.join(sandbox, 'dirty-sections')
  const dirtyInitial = generationStore.commitStoreGeneration(store, dirtyRoot, { expectedRevision: 0, source: 'dirty-set-initial' })
  if (!dirtyInitial.success || dirtyInitial.metrics?.changedSections.length !== generationStore.STORE_SECTIONS.length) fail('Primeiro commit nao marcou todas as secoes.')
  const dirtyUpdate = generationStore.commitStoreGeneration(
    { ...store, cards: [...store.cards, { id: 'card-dirty-set' }] },
    dirtyRoot,
    { expectedRevision: 1, source: 'dirty-set-update' }
  )
  if (!dirtyUpdate.success) fail(dirtyUpdate.error || 'Commit incremental falhou.')
  if (dirtyUpdate.metrics?.changedSections.join(',') !== 'planning.json') fail('Dirty-set nao isolou a secao planning.json.')
  if (!dirtyUpdate.metrics || dirtyUpdate.metrics.payloadBytesReused <= 0) fail('Commit incremental nao reutilizou secoes imutaveis.')
  const legacyStorePath = filesystem.getStorePath(legacyRoot)
  const fixedMtime = new Date('2001-01-01T00:00:00.000Z')
  fs.utimesSync(legacyStorePath, fixedMtime, fixedMtime)
  storeModule.loadStoreFromPath(legacyRoot)
  if (fs.statSync(legacyStorePath).mtimeMs !== fixedMtime.getTime()) fail('Leitura do store alterou o arquivo canonico.')
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
  const targetCurrentPath = path.join(targetRoot, '_sistema', 'CURRENT')
  fs.writeFileSync(targetCurrentPath, '{invalido', 'utf8')
  fs.writeFileSync(filesystem.getStorePath(targetRoot), '{invalido', 'utf8')
  fs.writeFileSync(path.join(filesystem.getStoreDir(targetRoot), 'notes.json'), '{invalido', 'utf8')
  const recovered = storeModule.loadStoreFromPath(targetRoot)
  if (recovered.notes.length !== 1 || recovered.cards.length !== 1) fail('A recuperação pelo último índice íntegro falhou.')
  if (fs.readFileSync(targetCurrentPath, 'utf8') !== '{invalido') fail('Recuperacao read-only reescreveu CURRENT.')
  if (fs.readFileSync(filesystem.getStorePath(targetRoot), 'utf8') !== '{invalido') fail('Leitura de recuperacao reescreveu o store corrompido.')

  const created = backup.createBackup(targetRoot, 'manual')
  if (!created.success || !created.backupPath) fail(created.error || 'Backup manual falhou.')
  const validation = backup.validateBackup(created.backupPath)
  if (!validation.valid) fail(validation.error || 'Backup não passou na validação.')
  const preUpdate = backup.createPreUpdateBackup(targetRoot)
  if (!preUpdate.success || !preUpdate.backupPath) fail(preUpdate.error || 'Backup pre-update falhou.')
  const invalidDataRoot = path.join(sandbox, 'invalid-data-root')
  fs.writeFileSync(invalidDataRoot, 'arquivo', 'utf8')
  if (backup.createPreUpdateBackup(invalidDataRoot).success) fail('Backup pre-update aceitou um data root invalido.')
  fs.unlinkSync(notePath)
  const restored = backup.restoreBackup(created.backupPath, targetRoot)
  if (!restored.success) fail(restored.error || 'A restauração falhou.')
  if (fs.readFileSync(notePath, 'utf8') !== '# Conteúdo preservado') fail('A restauração não recuperou o Markdown da nota.')

  console.log(JSON.stringify({
    migration: 'ok', recovery: 'ok', backup: 'ok', restore: 'ok', preUpdateGate: 'ok', readOnlyLoad: 'ok', hydrationGuard: 'ok', autoDiscovery: 'ok', transactionalGeneration: 'ok', revisionCas: 'ok', writerLock: 'ok', journal: 'ok', faultRecovery: 'ok', repeatBoot: 'ok', dirtySections: 'ok', notes: migrated.notes.length,
    readablePath: migrated.notes[0].mdPath, root: targetRoot,
  }))
  fs.rmSync(sandbox, { recursive: true, force: true })
  app.quit()
}).catch(error => {
  console.error(error)
  app.exit(1)
})
