#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const projectRoot = path.resolve(__dirname, '..')
const packagePath = path.join(projectRoot, 'package.json')
const lockPath = path.join(projectRoot, 'package-lock.json')
const counterPath = path.join(projectRoot, 'build.counter.json')
const builderConfigPath = path.join(projectRoot, 'electron-builder.json')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const readCurrentVersion = () => JSON.parse(fs.readFileSync(packagePath, 'utf8')).version

const getInstallerPath = (version) => {
  const builderConfig = JSON.parse(fs.readFileSync(builderConfigPath, 'utf8'))
  const expand = (template, extension = 'exe') => template
    .replaceAll('${version}', version)
    .replaceAll('${productName}', builderConfig.productName)
    .replaceAll('${ext}', extension)
  const outputDir = path.resolve(projectRoot, expand(builderConfig.directories.output))
  return path.join(outputDir, expand(builderConfig.win.artifactName))
}

const run = (command, args, env = process.env) => {
  const needsShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(command)
  const executable = needsShell ? (process.env.ComSpec || 'cmd.exe') : command
  const commandArgs = needsShell ? ['/d', '/s', '/c', [command, ...args].join(' ')] : args
  const result = spawnSync(executable, commandArgs, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    windowsHide: false,
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    const error = new Error(`${command} terminou com código ${result.status ?? 1}.`)
    error.exitCode = result.status ?? 1
    throw error
  }
}

const currentVersion = readCurrentVersion()
const isPlan = process.argv.includes('--plan')

console.log('\nORGANON RELEASE')
console.log(`Aplicando bump automático a partir da versão ${currentVersion}.`)

if (isPlan) {
  console.log('Depois do bump, a release será gerada e instalada automaticamente.')
  process.exit(0)
}

const previousPackage = fs.readFileSync(packagePath, 'utf8')
const previousLock = fs.existsSync(lockPath) ? fs.readFileSync(lockPath, 'utf8') : null
const previousCounter = fs.existsSync(counterPath) ? fs.readFileSync(counterPath, 'utf8') : null
let releaseVersion = null
let releaseReady = false

try {
  run(process.execPath, [path.join(__dirname, 'bump-version.js')])
  releaseVersion = readCurrentVersion()
  console.log(`Gerando e instalando Organon v${releaseVersion}.`)

  const nodeOptions = process.env.NODE_OPTIONS?.includes('--max-old-space-size')
    ? process.env.NODE_OPTIONS
    : `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=4096`.trim()

  const buildStartedAt = Date.now()
  run(npmCommand, ['run', 'exec:manual'], {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  })

  const installerPath = getInstallerPath(releaseVersion)
  if (!fs.existsSync(installerPath) || fs.statSync(installerPath).mtimeMs < buildStartedAt - 2000) {
    throw new Error(`A build não gerou um instalador atualizado: ${installerPath}`)
  }
  releaseReady = true
} catch (error) {
  fs.writeFileSync(packagePath, previousPackage, 'utf8')
  if (previousLock === null) {
    if (fs.existsSync(lockPath)) fs.rmSync(lockPath)
  } else {
    fs.writeFileSync(lockPath, previousLock, 'utf8')
  }
  if (previousCounter === null) {
    if (fs.existsSync(counterPath)) fs.rmSync(counterPath)
  } else {
    fs.writeFileSync(counterPath, previousCounter, 'utf8')
  }
  console.error(`Release interrompida; versão restaurada para ${currentVersion}.`)
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = Number.isInteger(error?.exitCode) ? error.exitCode : 1
}

if (releaseVersion && releaseReady) {
  try {
    run(process.execPath, [path.join(__dirname, 'install-built-release.cjs')])
  } catch (error) {
    console.error(`A release v${releaseVersion} foi gerada, mas a instalação falhou.`)
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = Number.isInteger(error?.exitCode) ? error.exitCode : 1
  }
}
