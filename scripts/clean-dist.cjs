const fs = require('node:fs')
const path = require('node:path')

const repositoryRoot = path.resolve(__dirname, '..')
const distPath = path.resolve(repositoryRoot, 'dist')
const buildInfoPath = path.resolve(repositoryRoot, 'tsconfig.node.tsbuildinfo')

const cleanDist = () => {
  if (path.dirname(distPath) !== repositoryRoot || path.basename(distPath) !== 'dist') {
    throw new Error(`Recusa de limpeza fora do diretorio de build: ${distPath}`)
  }

  fs.rmSync(distPath, { recursive: true, force: true })
  fs.rmSync(buildInfoPath, { force: true })
  console.log(`Build anterior removido: ${distPath}`)
}

if (require.main === module) cleanDist()

module.exports = { cleanDist }
