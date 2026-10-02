const assert = require('assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { app } = require('electron')

function wavHeader(dataBytes, sampleRate) {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(dataBytes + 36, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataBytes, 40)
  return header
}

function tone(frequency, seconds, sampleRate = 16_000) {
  const output = Buffer.alloc(seconds * sampleRate * 2)
  for (let sample = 0; sample < seconds * sampleRate; sample += 1) {
    const envelope = 0.65 + 0.25 * Math.sin(2 * Math.PI * sample / sampleRate * 3)
    const value = Math.sin(2 * Math.PI * frequency * sample / sampleRate) * envelope
    output.writeInt16LE(Math.round(value * 12_000), sample * 2)
  }
  return output
}

async function run() {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'organon-diarization-'))
  const audioPath = path.join(testRoot, 'voices.wav')
  const pcm = Buffer.concat([tone(105, 2), tone(235, 2), tone(105, 2), tone(235, 2)])
  fs.writeFileSync(audioPath, Buffer.concat([wavHeader(pcm.length, 16_000), pcm]))
  const { diarizeWavSegments, extractSelfIntroducedName } = require('../dist/main/meeting/speakerDiarization.js')

  try {
    const result = await diarizeWavSegments(audioPath, [
      { id: 'a1', text: 'Eu sou Ana', startMs: 0, endMs: 2_000 },
      { id: 'b1', text: 'Bom dia para todos', startMs: 2_000, endMs: 4_000 },
      { id: 'a2', text: 'Vamos revisar o projeto', startMs: 4_000, endMs: 6_000 },
      { id: 'b2', text: 'Tenho uma pergunta', startMs: 6_000, endMs: 8_000 },
    ])
    assert.equal(result.length, 4)
    assert.equal(result[0].speakerId, result[2].speakerId)
    assert.equal(result[1].speakerId, result[3].speakerId)
    assert.notEqual(result[0].speakerId, result[1].speakerId)
    assert.equal(result[0].speakerName, 'Ana')
    assert.equal(extractSelfIntroducedName('Meu nome é Pedro Lucas e trabalho aqui.'), 'Pedro Lucas')
    assert.ok(result.every(item => item.confidence >= 0.35 && item.confidence <= 0.96))
    console.log('Meeting diarization: clustering acústico, nomes e confiança OK.')
  } finally {
    fs.rmSync(testRoot, { recursive: true, force: true })
  }
}

app.whenReady()
  .then(run)
  .then(() => app.quit())
  .catch(error => {
    console.error(error)
    app.exit(1)
  })
