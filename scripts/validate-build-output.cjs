const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const repositoryRoot = path.resolve(__dirname, '..')
const mainOutput = path.join(repositoryRoot, 'dist', 'main')

const expectedFiles = [
  'index.js',
  'backup/backupService.js',
  'core/autoUpdater.js',
  'ipc/content.ipc.js',
  'meeting/research.js',
  'storage/filePrimitives.js',
  'storage/generationStore.js',
  'storage/generationWorker.js',
  'storage/generationCoordinator.js',
  'storage/store.js',
  'whisper/localTranscriber.js',
]

for (const relativePath of expectedFiles) {
  assert.equal(
    fs.existsSync(path.join(mainOutput, relativePath)),
    true,
    `Artefato atual ausente no build: dist/main/${relativePath}`,
  )
}

const rootSourceFiles = fs
  .readdirSync(path.join(repositoryRoot, 'src', 'main'), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .map((entry) => entry.name.replace(/\.ts$/, '.js'))
  .sort()

const rootBuildFiles = fs
  .readdirSync(mainOutput, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  .map((entry) => entry.name)
  .sort()

assert.deepEqual(
  rootBuildFiles,
  rootSourceFiles,
  `O build contem JavaScript sem fonte atual: ${rootBuildFiles.filter((file) => !rootSourceFiles.includes(file)).join(', ')}`,
)

console.log(JSON.stringify({ buildLayout: 'ok', rootBuildFiles, checkedArtifacts: expectedFiles.length }))
