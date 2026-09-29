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
  console.log('Whisper transcription: segmentos, offsets e confiança OK.')
}

app.whenReady()
  .then(run)
  .then(() => app.quit())
  .catch(error => {
    console.error(error)
    app.exit(1)
  })
