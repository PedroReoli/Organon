const assert = require('assert/strict')
const crypto = require('crypto')
const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { app } = require('electron')

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return server.address().port
}

async function close(server) {
  await new Promise(resolve => server.close(resolve))
}

async function run() {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'organon-whisper-installer-'))
  process.env.ORGANON_WHISPER_MODELS_DIR = testRoot

  const payload = Buffer.alloc(256 * 1024, 0x5a)
  payload.write('lmgg', 0, 'ascii')
  const sha256 = crypto.createHash('sha256').update(payload).digest('hex')
  let requests = 0
  let resumedFrom = 0

  const server = http.createServer((request, response) => {
    requests += 1
    const range = request.headers.range
    if (!range && requests === 1) {
      response.writeHead(200, { 'Content-Length': payload.length })
      response.flushHeaders()
      let sent = 0
      const timer = setInterval(() => {
        const next = Math.min(sent + 16 * 1024, 64 * 1024)
        response.write(payload.subarray(sent, next))
        sent = next
        if (sent >= 64 * 1024) {
          clearInterval(timer)
          setTimeout(() => response.destroy(), 100)
        }
      }, 15)
      return
    }

    resumedFrom = range ? Number(range.match(/^bytes=(\d+)-$/)?.[1] ?? 0) : 0
    response.writeHead(resumedFrom > 0 ? 206 : 200, {
      'Accept-Ranges': 'bytes',
      'Content-Length': payload.length - resumedFrom,
      ...(resumedFrom > 0 ? { 'Content-Range': `bytes ${resumedFrom}-${payload.length - 1}/${payload.length}` } : {}),
    })
    response.end(payload.subarray(resumedFrom))
  })

  try {
    const port = await listen(server)
    const engine = require('../dist/main/whisper/engine.js')
    const installer = require('../dist/main/whisper/modelInstaller.js')
    const model = {
      id: 'ggml-integration-test',
      name: 'Whisper integration test',
      version: 'test-v1',
      sizeMb: 0.25,
      sizeBytes: payload.length,
      sha256,
      vramRequiredMb: 0,
      url: `http://127.0.0.1:${port}/model.bin`,
      downloaded: false,
    }
    engine.AVAILABLE_MODELS.push(model)

    await assert.rejects(installer.downloadWhisperModel(model.id))
    const modelPath = path.join(testRoot, `${model.id}.bin`)
    const partialPath = `${modelPath}.part`
    assert.ok(fs.statSync(partialPath).size > 0, 'download parcial deve ser preservado')

    const result = await installer.downloadWhisperModel(model.id)
    assert.equal(result.downloaded, true)
    assert.ok(resumedFrom > 0, 'segunda tentativa deve usar HTTP Range')
    assert.deepEqual(fs.readFileSync(modelPath), payload)
    assert.equal(fs.existsSync(partialPath), false)

    const manifest = JSON.parse(fs.readFileSync(`${modelPath}.manifest.json`, 'utf8'))
    assert.equal(manifest.schemaVersion, 1)
    assert.equal(manifest.modelVersion, model.version)
    assert.equal(manifest.sha256, sha256)
    console.log('Whisper model installer: resume, checksum e manifesto OK.')
  } finally {
    await close(server)
    try {
      fs.rmSync(testRoot, { recursive: true, force: true, maxRetries: 8, retryDelay: 75 })
    } catch (error) {
      if (error?.code !== 'ENOTEMPTY' && error?.code !== 'EBUSY') throw error
    }
  }
}

app.whenReady()
  .then(run)
  .then(() => app.quit())
  .catch(error => {
    console.error(error)
    app.exit(1)
  })
