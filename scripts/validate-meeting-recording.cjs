const assert = require('assert/strict')
const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { app } = require('electron')

function pcmChunk(seconds = 1, sampleRate = 16_000) {
  const output = Buffer.alloc(seconds * sampleRate * 2)
  for (let sample = 0; sample < seconds * sampleRate; sample += 1) {
    output.writeInt16LE(Math.round(Math.sin(sample / 18) * 8_000), sample * 2)
  }
  return output
}

async function run() {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'organon-meeting-recording-'))
  const { MeetingRecordingSessionManager } = require('../dist/main/meeting/recordingSession.js')
  const manager = new MeetingRecordingSessionManager(() => testRoot)
  const ownerId = 41
  const channels = ['microphone', 'system', 'mixed']

  try {
    const { sessionId } = await manager.start(ownerId, {
      meetingId: 'meeting-stream-test',
      channels,
      sampleRate: 16_000,
    })
    const chunk = pcmChunk()
    for (let second = 0; second < 120; second += 1) {
      for (const channel of channels) {
        await manager.append(ownerId, {
          sessionId,
          channel,
          pcm: chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength),
        })
      }
    }
    await assert.rejects(
      manager.append(ownerId + 1, { sessionId, channel: 'microphone', pcm: chunk }),
      /inválida ou encerrada/,
    )

    const result = await manager.finalize(ownerId, { sessionId, durationMs: 120_000 })
    assert.deepEqual(result.tracks.map(track => track.channel), channels)
    for (const track of result.tracks) {
      const filePath = path.join(testRoot, 'meetings', track.path)
      const buffer = fs.readFileSync(filePath)
      assert.equal(buffer.toString('ascii', 0, 4), 'RIFF')
      assert.equal(buffer.toString('ascii', 8, 12), 'WAVE')
      assert.equal(buffer.readUInt32LE(24), 16_000)
      assert.equal(buffer.readUInt32LE(40), chunk.length * 120)
      assert.equal(track.bytes, buffer.length)
      assert.equal(track.sha256, crypto.createHash('sha256').update(buffer).digest('hex'))
      assert.equal(track.durationMs, 120_000)
      assert.ok(fs.existsSync(`${filePath.slice(0, -4)}.audio.json`))
    }
    assert.equal(fs.existsSync(path.join(testRoot, 'meetings', '.recording', sessionId)), false)

    const cancelled = await manager.start(ownerId, { meetingId: 'cancel-test', channels: ['microphone'] })
    await manager.append(ownerId, { sessionId: cancelled.sessionId, channel: 'microphone', pcm: chunk })
    await manager.cancel(ownerId, cancelled.sessionId)
    assert.equal(fs.existsSync(path.join(testRoot, 'meetings', '.recording', cancelled.sessionId)), false)
    console.log('Meeting recording: streaming, canais, WAV, ownership e limpeza OK.')
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
