const fs = require('node:fs')
const path = require('node:path')
module.exports = async ({ electronPlatformName, packager }) => {
  if (electronPlatformName !== 'win32') return
  const appDir = packager.info.appDir
  for (const file of ['whisper-cli.exe', 'whisper.dll', 'ggml.dll', 'ggml-base.dll', 'ggml-cpu.dll', 'LICENSE']) {
    if (!fs.existsSync(path.join(appDir, 'resources/whisper', file))) {
      throw new Error(`Runtime Whisper incompleto (${file}). Execute npm run setup:whisper antes de empacotar.`)
    }
  }
}
