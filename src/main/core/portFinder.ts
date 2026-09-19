import * as net from 'net'

/**
 * Verifica de forma não invasiva se uma determinada porta TCP está livre para bind.
 */
export function isPortAvailable(port: number, host = '0.0.0.0'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.once('error', () => {
      resolve(false)
    })
    server.once('listening', () => {
      server.close(() => {
        resolve(true)
      })
    })
    server.listen(port, host)
  })
}

/**
 * Busca a primeira porta TCP livre a partir de startPort.
 * Se todas no intervalo estiverem em uso, retorna 0 (porta dinâmica do SO).
 */
export async function findAvailablePort(
  startPort: number,
  host = '0.0.0.0',
  maxAttempts = 30
): Promise<number> {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    const available = await isPortAvailable(port, host)
    if (available) {
      return port
    }
  }
  return 0
}
