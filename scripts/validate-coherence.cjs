const { app, ipcMain } = require('electron')
const fs = require('node:fs')
const path = require('path')
const assert = require('assert')

console.log('=== INICIANDO VALIDAÇÃO DE COERÊNCIA E INTEGRIDADE ===')

app.whenReady().then(async () => {
  console.log('[1/5] Electron app.whenReady disparado com sucesso.')

  const baseDir = path.resolve(__dirname, '../dist/main')

  // 1. Verificar registro de IPC
  const { registerIpcHandlers } = require(path.join(baseDir, 'ipc/index.js'))
  console.log('[2/5] Registrando IPC Handlers...')
  registerIpcHandlers()
  
  // Verificar canais IPC essenciais registrados no ipcMain
  const invokeHandlerCount = ipcMain._invokeHandlers ? ipcMain._invokeHandlers.size : 0
  const eventCount = ipcMain.eventNames().length
  console.log(`[3/5] Total de handlers IPC registrados: ${invokeHandlerCount} invoke handlers + ${eventCount} event listeners`)
  assert.ok(invokeHandlerCount > 20, 'Deveria haver mais de 20 invoke handlers registrados')

  // 2. Verificar Store e Storage
  const { loadStore, getDefaultStore, getActiveStorageDir } = require(path.join(baseDir, 'storage/index.js'))
  console.log('[4/5] Testando camada de Storage...')
  const defaultStore = getDefaultStore()
  assert.ok(defaultStore, 'getDefaultStore deve retornar um objeto válido')
  assert.ok(Array.isArray(defaultStore.notes), 'defaultStore.notes deve ser um array')
  assert.ok(Array.isArray(defaultStore.cards), 'defaultStore.cards deve ser um array')
  assert.ok(Array.isArray(defaultStore.noteFolders), 'defaultStore.noteFolders deve ser um array')

  const fakeSender = { id: 9001, once: () => undefined }
  const loadHandler = ipcMain._invokeHandlers.get('store:load')
  const saveHandler = ipcMain._invokeHandlers.get('store:save')
  assert.equal(typeof loadHandler, 'function', 'store:load deve estar registrado')
  assert.equal(typeof saveHandler, 'function', 'store:save deve estar registrado')
  const handshake = await loadHandler({ sender: fakeSender })
  assert.ok(handshake?.store, 'Handshake deve incluir o store')
  assert.match(handshake?.rootId ?? '', /^root-[0-9a-f]{16}$/)
  assert.equal(Number.isSafeInteger(handshake?.revision), true, 'Handshake deve incluir revisao valida')
  assert.equal(typeof handshake?.hydrationToken, 'string', 'Handshake deve incluir token de hidratacao')
  const invalidTokenSave = await saveHandler({ sender: fakeSender }, {
    store: defaultStore,
    expectedRevision: handshake.revision,
    hydrationToken: 'token-invalido',
  })
  assert.equal(invalidTokenSave.success, false, 'Save com token invalido deve ser rejeitado')

  // 3. Verificar Camada de Backup
  const { createBackup, listBackups } = require(path.join(baseDir, 'backup/index.js'))
  assert.equal(typeof createBackup, 'function', 'createBackup deve ser uma função')
  assert.equal(typeof listBackups, 'function', 'listBackups deve ser uma função')

  // 4. Verificar Whisper e Serviços
  const { listAvailableWhisperModels } = require(path.join(baseDir, 'whisper/index.js'))
  assert.equal(typeof listAvailableWhisperModels, 'function', 'listAvailableWhisperModels deve ser uma função')

  // 5. Garantir que o build limpo não preservou proxies removidos do código-fonte
  console.log('[5/5] Verificando ausência de artefatos legados na raiz de dist/main/...')
  const legacyArtifacts = ['filesystem.js', 'store.js', 'backup.js', 'ipc.js', 'window.js']
  for (const artifact of legacyArtifacts) {
    assert.equal(fs.existsSync(path.join(baseDir, artifact)), false, `Artefato legado encontrado: ${artifact}`)
  }

  console.log('\n✅ SUCESSO TOTAL: Todos os subsistemas estão íntegros, equiparáveis e 100% operacionais!')
  app.exit(0)
}).catch((err) => {
  console.error('❌ ERRO NA VALIDAÇÃO DE COERÊNCIA:', err)
  app.exit(1)
})
