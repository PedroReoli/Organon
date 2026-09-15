import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { app } from 'electron'

const run = promisify(execFile)
let active = false

async function runTranscription(audioPath: string, modelPath: string, initialPrompt = ''): Promise<string> {
  const executable = process.env.ORGANON_WHISPER_CLI || path.join(
    app.isPackaged ? process.resourcesPath : app.getAppPath(),
    'resources', 'whisper', process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli',
  )
  try { await fs.access(executable) } catch {
    throw new Error('Motor Whisper nativo ausente. Execute npm run setup:whisper em Apps/desktop e gere novamente o instalador.')
  }
  await fs.access(modelPath)
  const header = Buffer.alloc(44)
  const file = await fs.open(audioPath, 'r')
  try { await file.read(header, 0, 44, 0) } finally { await file.close() }
  if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('O motor local requer WAV PCM. Grave ou importe o áudio pelo painel Whisper para converter.')
  }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'organon-native-whisper-'))
  try {
    const output = path.join(dir, 'transcript')
    await run(executable, ['-m', modelPath, '-f', audioPath, '-l', 'pt', '-otxt', '-of', output,
      '-t', String(Math.max(1, Math.min(4, os.cpus().length - 1))),
      ...(initialPrompt.trim() ? ['--prompt', initialPrompt.trim().slice(0, 760)] : [])], {
      windowsHide: true, timeout: 600_000, maxBuffer: 4 * 1024 * 1024,
    })
    return (await fs.readFile(`${output}.txt`, 'utf8')).trim()
  } catch (error: any) {
    throw new Error(error.killed ? 'A transcrição excedeu 10 minutos. Use um modelo menor.' : 'Falha no motor Whisper nativo. Verifique o modelo e as bibliotecas do executável.')
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
}

export async function transcribeAudioLocally(audioPath: string, modelPath: string, initialPrompt = ''): Promise<string> {
  if (active) throw new Error('Whisper local ocupado. Aguarde a transcrição atual.')
  active = true
  try { return await runTranscription(audioPath, modelPath, initialPrompt) }
  finally { active = false }
}
