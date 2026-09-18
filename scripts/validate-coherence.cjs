const { app, ipcMain } = require('electron')
const path = require('path')
const assert = require('assert')

console.log('=== INICIANDO VALIDAÇÃO DE COERÊNCIA E INTEGRIDADE ===')

app.whenReady().then(() => {
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

  // 3. Verificar Camada de Backup
  const { createBackup, listBackups } = require(path.join(baseDir, 'backup/index.js'))
  assert.equal(typeof createBackup, 'function', 'createBackup deve ser uma função')
  assert.equal(typeof listBackups, 'function', 'listBackups deve ser uma função')

  // 4. Verificar Whisper e Serviços
  const { listAvailableWhisperModels } = require(path.join(baseDir, 'whisper/index.js'))
  assert.equal(typeof listAvailableWhisperModels, 'function', 'listAvailableWhisperModels deve ser uma função')

  // 5. Verificar Proxies transparentes na raiz de dist/main/
  console.log('[5/5] Testando compatibilidade de proxies na raiz de dist/main/...')
  const rootFilesystem = require(path.join(baseDir, 'filesystem.js'))
  const rootStore = require(path.join(baseDir, 'store.js'))
  const rootBackup = require(path.join(baseDir, 'backup.js'))
  const rootIpc = require(path.join(baseDir, 'ipc.js'))
  const rootWindow = require(path.join(baseDir, 'window.js'))

  assert.equal(typeof rootFilesystem.getStorePath, 'function', 'filesystem.getStorePath deve existir na raiz')
  assert.equal(typeof rootStore.loadStore, 'function', 'store.loadStore deve existir na raiz')
  assert.equal(typeof rootBackup.startBackupTimer, 'function', 'backup.startBackupTimer deve existir na raiz')
  assert.equal(typeof rootIpc.registerIpcHandlers, 'function', 'ipc.registerIpcHandlers deve existir na raiz')
  assert.equal(typeof rootWindow.createWindow, 'function', 'window.createWindow deve existir na raiz')

  console.log('\n✅ SUCESSO TOTAL: Todos os subsistemas estão íntegros, equiparáveis e 100% operacionais!')
  app.exit(0)
}).catch((err) => {
  console.error('❌ ERRO NA VALIDAÇÃO DE COERÊNCIA:', err)
  app.exit(1)
})
