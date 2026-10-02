const assert = require('assert/strict')
const fs = require('fs')
const path = require('path')
const { app } = require('electron')

async function run() {
  const fixturePath = path.join(__dirname, 'fixtures', 'whisper-output-full.json')
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
  const { parseWhisperJson } = require('../dist/main/whisper/localTranscriber.js')
  const result = parseWhisperJson(fixture, 'ggml-fixture')

  assert.equal(result.text, 'Olá, equipe. Vamos começar.')
  assert.equal(result.provider, 'local')
  assert.equal(result.model, 'ggml-fixture')
  assert.equal(result.language, 'pt')
  assert.equal(result.timingPrecision, 'segment')
  assert.equal(result.segments.length, 2)
  assert.deepEqual(
    result.segments.map(segment => [segment.startMs, segment.endMs]),
    [[0, 1250], [1250, 2600]],
  )
  assert.ok(Math.abs(result.segments[0].confidence - 0.88) < 0.0001)

  const temporaryDirectory = path.join(__dirname, '..', '.whisper-validation', 'transcription-input')
  const dataPath = path.join(temporaryDirectory, 'data')
  const meetingsPath = path.join(dataPath, 'meetings')
  fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  fs.mkdirSync(meetingsPath, { recursive: true })
  const wav = Buffer.alloc(44)
  wav.write('RIFF', 0); wav.writeUInt32LE(36, 4); wav.write('WAVE', 8)
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28)
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(0, 40)
  const persistedName = 'rec-validation--system--fixture.wav'
  const persistedPath = path.join(meetingsPath, persistedName)
  fs.writeFileSync(persistedPath, wav)
  const { resolveTranscriptionInput } = require('../dist/main/whisper/transcriptionInput.js')
  const persisted = resolveTranscriptionInput(persistedName, { dataPath, temporaryDirectory })
  assert.equal(persisted.path, persistedPath)
  assert.equal(persisted.cleanup, false)
  const encoded = resolveTranscriptionInput(wav.toString('base64'), { dataPath, temporaryDirectory })
  assert.equal(encoded.cleanup, true)
  assert.equal(fs.readFileSync(encoded.path).subarray(0, 4).toString('ascii'), 'RIFF')
  fs.rmSync(temporaryDirectory, { recursive: true, force: true })

  console.log('Whisper transcription: segmentos, offsets, confiança e faixas persistidas OK.')
}

app.whenReady()
  .then(run)
  .then(() => app.quit())
  .catch(error => {
    console.error(error)
    app.exit(1)
  })
