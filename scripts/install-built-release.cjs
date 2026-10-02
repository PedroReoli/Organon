#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { spawn, spawnSync } = require('child_process')

const projectRoot = path.resolve(__dirname, '..')
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
const builderConfig = JSON.parse(fs.readFileSync(path.join(projectRoot, 'electron-builder.json'), 'utf8'))

const expandBuilderTemplate = (template, extension = 'exe') => template
  .replaceAll('${version}', packageJson.version)
  .replaceAll('${productName}', builderConfig.productName)
  .replaceAll('${ext}', extension)

const outputTemplate = builderConfig.directories?.output
const artifactTemplate = builderConfig.win?.artifactName

if (typeof outputTemplate !== 'string' || typeof artifactTemplate !== 'string') {
  throw new Error('electron-builder.json não define directories.output e win.artifactName.')
}

const outputDir = path.resolve(projectRoot, expandBuilderTemplate(outputTemplate))
const installerPath = path.join(outputDir, expandBuilderTemplate(artifactTemplate))

if (!fs.existsSync(installerPath) || !fs.statSync(installerPath).isFile()) {
  throw new Error(`Instalador da versão ${packageJson.version} não encontrado em: ${installerPath}`)
}

console.log(`Instalador localizado: ${installerPath}`)

if (process.argv.includes('--check')) {
  process.exit(0)
}

if (process.platform !== 'win32') {
  console.log('Instalação automática disponível apenas no Windows.')
  process.exit(0)
}

const localAppData = process.env.LOCALAPPDATA

if (!localAppData) {
  throw new Error('LOCALAPPDATA não está disponível para validar a instalação.')
}

const installedDir = path.join(localAppData, 'Programs', builderConfig.productName)
const installedExecutable = path.join(installedDir, `${builderConfig.productName}.exe`)
const installedAppArchive = path.join(installedDir, 'resources', 'app.asar')
const releaseAppArchive = path.join(outputDir, 'win-unpacked', 'resources', 'app.asar')
const quotePowerShell = (value) => `'${value.replaceAll("'", "''")}'`
const installCommand = [
  "$ErrorActionPreference = 'Stop'",
  `$installer = Start-Process -FilePath ${quotePowerShell(installerPath)} -ArgumentList '/S' -WindowStyle Hidden -Wait -PassThru`,
  'exit $installer.ExitCode',
].join('; ')

console.log('Instalando e aguardando a cópia completa dos arquivos...')

const result = spawnSync('powershell.exe', [
  '-NoProfile',
  '-NonInteractive',
  '-ExecutionPolicy',
  'Bypass',
  '-Command',
  installCommand,
], {
  stdio: 'inherit',
  windowsHide: false,
})

if (result.error) {
  throw result.error
}

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

const missingFiles = [installedExecutable, installedAppArchive, releaseAppArchive]
  .filter((filePath) => !fs.existsSync(filePath) || !fs.statSync(filePath).isFile())

if (missingFiles.length > 0) {
  throw new Error(
    `A instalação terminou sem copiar arquivos obrigatórios:\n${missingFiles.join('\n')}`
  )
}

const sha256 = (filePath) => {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

const installedHash = sha256(installedAppArchive)
const releaseHash = sha256(releaseAppArchive)

if (installedHash !== releaseHash) {
  throw new Error(
    `A instalação não corresponde à release ${packageJson.version}: app.asar divergente.`
  )
}

console.log(`Instalação validada: ${installedExecutable}`)
console.log(`app.asar validado: ${installedHash}`)
console.log('Abrindo o Organon...')

const app = spawn(installedExecutable, [], {
  detached: true,
  stdio: 'ignore',
  windowsHide: false,
})

app.unref()
