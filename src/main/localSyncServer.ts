import * as http from 'http'
import * as os from 'os'
import * as dgram from 'dgram'
import { getMainWindow } from './window'
import { loadStore, saveStore } from './store'

let udpSocket: dgram.Socket | null = null
let udpInterval: NodeJS.Timeout | null = null

function startUdpBroadcast(ip: string, port: number, pin: string) {
  stopUdpBroadcast()
  try {
    udpSocket = dgram.createSocket('udp4')
    udpSocket.bind(() => {
      udpSocket?.setBroadcast(true)
    })
    udpInterval = setInterval(() => {
      if (!udpSocket) return
      const msg = Buffer.from(JSON.stringify({ service: 'organon-sync', ip, port, pin }))
      udpSocket.send(msg, 0, msg.length, 8766, '255.255.255.255')
    }, 3000)
  } catch (err) {
    console.error('Falha ao iniciar broadcast UDP:', err)
  }
}

function stopUdpBroadcast() {
  if (udpInterval) {
    clearInterval(udpInterval)
    udpInterval = null
  }
  if (udpSocket) {
    try {
      udpSocket.close()
    } catch {}
    udpSocket = null
  }
}

interface LocalSyncLog {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface ServerState {
  running: boolean
  port: number
  ip: string
  pin: string
  logs: LocalSyncLog[]
  progress: number
  connectedDevice: string | null
}

let server: http.Server | null = null
let state: ServerState = {
  running: false,
  port: 8765,
  ip: '127.0.0.1',
  pin: '',
  logs: [],
  progress: 0,
  connectedDevice: null,
}

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name]
    if (!iface) continue
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal && alias.address !== '127.0.0.1') {
        return alias.address
      }
    }
  }
  return '127.0.0.1'
}

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function addLog(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const time = new Date().toLocaleTimeString('pt-BR', { hour12: false })
  const logEntry: LocalSyncLog = { timestamp: time, message, type }
  state.logs = [logEntry, ...state.logs].slice(0, 50)

  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('local-sync:log', logEntry)
  }
}

function updateProgress(progress: number) {
  state.progress = Math.min(100, Math.max(0, progress))
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('local-sync:progress', state.progress)
  }
}

function notifyConnected(device: string | null) {
  state.connectedDevice = device
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('local-sync:connected', device)
  }
}

export function startLocalSyncServer(requestedPort = 8765): Promise<ServerState> {
  return new Promise((resolve, reject) => {
    if (server) {
      stopLocalSyncServer()
    }

    const ip = getLocalIpAddress()
    const pin = generatePin()

    server = http.createServer((req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Sync-Token')

      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      const reqUrl = new URL(req.url || '/', `http://${req.headers.host}`)
      const token = reqUrl.searchParams.get('token') || req.headers['x-sync-token']
      const clientIp = req.socket.remoteAddress?.replace(/^.*:/, '') || 'desconhecido'

      // Health status
      if (reqUrl.pathname === '/api/sync/status') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ status: 'ok', device: os.hostname(), version: '1.0.0' }))
        return
      }

      // Validar PIN / Token para exportação e importação
      if (token !== pin) {
        addLog(`Tentativa de conexão não autorizada de ${clientIp}`, 'warning')
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: 'PIN ou Token inválido' }))
        return
      }

      // EXPORT: Enviar dados do desktop para o celular
      if (req.method === 'GET' && reqUrl.pathname === '/api/sync/export') {
        notifyConnected(`Dispositivo (${clientIp})`)
        addLog(`Dispositivo conectado (${clientIp}). Preparando exportação...`, 'info')
        updateProgress(20)

        try {
          const storeData = loadStore()
          updateProgress(60)

          const payload = JSON.stringify({
            exportedAt: new Date().toISOString(),
            sourceDevice: os.hostname(),
            store: storeData,
          })

          updateProgress(90)
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(payload),
          })
          res.end(payload)

          updateProgress(100)
          addLog(`Exportação concluída com sucesso para ${clientIp}`, 'success')
          setTimeout(() => updateProgress(0), 3000)
        } catch (err: any) {
          addLog(`Erro na exportação de dados: ${err.message}`, 'error')
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'Falha ao ler armazenamento local' }))
        }
        return
      }

      // IMPORT: Receber dados do celular para o desktop
      if (req.method === 'POST' && reqUrl.pathname === '/api/sync/import') {
        notifyConnected(`Dispositivo (${clientIp})`)
        addLog(`Recebendo sincronização do dispositivo (${clientIp})...`, 'info')
        updateProgress(20)

        let body = ''
        req.on('data', chunk => {
          body += chunk.toString()
          if (body.length > 50 * 1024 * 1024) { // Limite 50MB
            req.destroy()
          }
        })

        req.on('end', () => {
          try {
            updateProgress(60)
            const parsed = JSON.parse(body)
            if (parsed && parsed.store) {
              saveStore(parsed.store)
              updateProgress(100)
              addLog(`Dados importados e mesclados com sucesso!`, 'success')
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
              res.end(JSON.stringify({ success: true, message: 'Sincronização concluída' }))
            } else {
              throw new Error('Payload inválido')
            }
          } catch (err: any) {
            addLog(`Erro ao importar dados: ${err.message}`, 'error')
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ error: 'Formato de payload inválido' }))
          } finally {
            setTimeout(() => updateProgress(0), 3000)
          }
        })
        return
      }

      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: 'Rota não encontrada' }))
    })

    server.on('error', (err: any) => {
      addLog(`Erro no servidor HTTP local: ${err.message}`, 'error')
      if (err.code === 'EADDRINUSE') {
        server?.listen(0, ip) // Escolhe porta livre
      } else {
        reject(err)
      }
    })

    server.listen(requestedPort, ip, () => {
      const address = server?.address() as any
      const actualPort = address ? address.port : requestedPort

      state = {
        running: true,
        port: actualPort,
        ip,
        pin,
        logs: [],
        progress: 0,
        connectedDevice: null,
      }

      addLog(`Servidor local ativado em http://${ip}:${actualPort}`, 'success')
      addLog(`PIN de segurança gerado: ${pin}`, 'info')
      addLog(`Transmitindo anúncio de auto-descoberta Wi-Fi (UDP porta 8766)...`, 'info')

      startUdpBroadcast(ip, actualPort, pin)

      resolve(state)
    })
  })
}

export function stopLocalSyncServer(): ServerState {
  stopUdpBroadcast()
  if (server) {
    server.close()
    server = null
    addLog(`Servidor local encerrado.`, 'info')
  }

  state = {
    ...state,
    running: false,
    progress: 0,
    connectedDevice: null,
  }

  return state
}

export function getLocalSyncStatus(): ServerState {
  return state
}
