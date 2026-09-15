import { WhisperPcmRecorder } from './services/WhisperPcmRecorder'
import { transcribeAudioBlobWithFallback } from './services/whisperService'
import { stopRecorder } from './services/whisperAudio'
/**
 * Super Whisper - Popup de Gravação de Voz
 * Captura áudio real e usa o serviço compartilhado do Whisper.
 *
 * Tema: dinâmico - sincronizado com o app via IPC (super-whisper:get-theme).
 *       O IPC mantém o tema alinhado com as configurações do processo principal.
 */

// ============================================================
// ESTADO
// ============================================================

let isRecording = false
let startTime = null
let timerInterval = null
let currentTheme = null

// Elementos do DOM (cache)
const $ = (id) => document.getElementById(id)
const recordBtn = $('recordBtn')
const recordBtnText = $('recordBtnText')
const sendBtn = $('sendBtn')
const copyBtn = $('copyBtn')
const clearBtn = $('clearBtn')
const closeBtn = $('closeBtn')
const statusDot = $('statusDot')
const statusText = $('statusText')
const statusMessage = $('statusMessage')
const timer = $('timer')
const waveform = $('waveform')
const transcriptionText = $('transcriptionText')
const charCount = $('charCount')
const historyList = $('historyList')
const historyCount = $('historyCount')
const historyDetails = $('historyDetails')

// ============================================================
// TEMA DINÂMICO (sincronizado com o app)
// ============================================================

/**
 * Aplica um tema calculando as variáveis CSS a partir dos 4 valores base.
 * Espelha o applyTheme() do renderer React para manter paridade visual.
 */
function applyThemeToRoot(theme) {
  if (!theme || typeof theme !== 'object') return

  const root = document.documentElement
  const { primary, background, surface, text } = theme

  // Helpers
  const hexToRgb = (hex) => {
    const m = hex.replace('#', '').match(/.{1,2}/g)
    if (!m || m.length < 3) return { r: 0, g: 0, b: 0 }
    return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) }
  }
  const mix = (c1, c2, t) => {
    const a = hexToRgb(c1), b = hexToRgb(c2)
    const r = Math.round(a.r + (b.r - a.r) * t)
    const g = Math.round(a.g + (b.g - a.g) * t)
    const bl = Math.round(a.b + (b.b - a.b) * t)
    return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`
  }
  const rgba = (hex, a) => {
    const { r, g, b } = hexToRgb(hex)
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }

  // Tokens semânticos (mesmos nomes do renderer principal)
  root.style.setProperty('--sw-bg', background)
  root.style.setProperty('--sw-surface', surface)
  root.style.setProperty('--sw-surface-hover', mix(surface, '#ffffff', 0.08))
  root.style.setProperty('--sw-border', mix(background, '#ffffff', 0.14))
  root.style.setProperty('--sw-text', text)
  root.style.setProperty('--sw-text-muted', rgba(text, 0.55))
  root.style.setProperty('--sw-text-inverse', background)
  root.style.setProperty('--sw-primary', primary)
  root.style.setProperty('--sw-primary-hover', mix(primary, '#ffffff', 0.18))
  root.style.setProperty('--sw-primary-soft', rgba(primary, 0.15))
  root.style.setProperty('--sw-danger', '#ef4444')
  root.style.setProperty('--sw-danger-soft', rgba('#ef4444', 0.18))
  root.style.setProperty('--sw-success', '#22c55e')
  root.style.setProperty('--sw-warning', '#f59e0b')
  root.style.setProperty('--sw-radius', 'var(--radius-md, 8px)')
  root.style.setProperty('--sw-font', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
  root.style.setProperty('--sw-font-mono', '"SF Mono", Monaco, Consolas, monospace')

  // Atualiza backgroundColor do body pra cobrir flash inicial
  document.body.style.background = background
  document.body.style.color = text

  currentTheme = theme
}

/**
 * Carrega o tema atual do app via IPC. Fallback para dark-default
 * se o IPC falhar (ex: rodando fora do Electron).
 */
async function loadTheme() {
  const fallback = {
    primary: '#6366f1',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
  }

  try {
    if (window.electronAPI?.superWhisperGetTheme) {
      const theme = await window.electronAPI.superWhisperGetTheme()
      if (theme && theme.primary) {
        applyThemeToRoot(theme)
        return
      }
    }
  } catch (err) {
    console.warn('[Super Whisper] Falha ao buscar tema via IPC:', err)
  }

  applyThemeToRoot(fallback)
}

// ============================================================
// SPEECH RECOGNITION
// ============================================================

let mediaRecorder = null
let mediaChunks = []

let busy = false
let meterContext = null
let meterFrame = 0
async function startRecording() {
  if (busy || isRecording) return
  busy = true
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaChunks = []
    mediaRecorder = await WhisperPcmRecorder.create(stream)
    mediaRecorder.ondataavailable = e => { if (e.data.size) mediaChunks.push(e.data) }
    mediaRecorder.start(250)
    isRecording = true
    meterContext = new AudioContext()
    const analyser = meterContext.createAnalyser()
    meterContext.createMediaStreamSource(stream).connect(analyser)
    const samples = new Uint8Array(analyser.frequencyBinCount)
    const draw = () => {
      analyser.getByteFrequencyData(samples)
      const level = samples.reduce((a, b) => a + b, 0) / samples.length / 128
      waveform.style.transform = `scaleY(${0.15 + Math.min(1, level)})`
      meterFrame = requestAnimationFrame(draw)
    }
    draw()
    recordBtn.dataset.recording = 'true'
    recordBtnText.textContent = 'Parar'
    waveform.classList.add('recording')
    startTime = Date.now()
    timerInterval = setInterval(updateTimer, 1000)
    setStatus('listening', 'Ouvindo…')
    sendBtn.disabled = copyBtn.disabled = true
  } catch (error) { setStatus('error', error.message || 'Não foi possível acessar o microfone.') }
  finally { busy = false }
}

async function stopRecording() {
  if (!isRecording || busy) return
  busy = true
  isRecording = false
  recordBtn.disabled = true
  try {
    await stopRecorder(mediaRecorder)
    mediaRecorder.stream.getTracks().forEach(track => track.stop())
    cancelAnimationFrame(meterFrame)
    await meterContext?.close()
    clearInterval(timerInterval)
    setStatus('listening', 'Transcrevendo…')
    const blob = new Blob(mediaChunks, { type: mediaRecorder.mimeType })
    transcriptionText.value = await transcribeAudioBlobWithFallback(blob, undefined, { mode: 'prompt' })
    updateCharCount()
    const hasText = !!transcriptionText.value.trim()
    copyBtn.disabled = sendBtn.disabled = !hasText
    setStatus(hasText ? 'done' : 'ready', hasText ? 'Transcrição pronta. Copie ou envie ao Organon.' : 'Nenhuma fala detectada.')
  } catch (error) { setStatus('error', error.message || 'Falha na transcrição.') }
  finally {
    busy = false
    recordBtn.disabled = false
    recordBtn.dataset.recording = 'false'
    recordBtnText.textContent = 'Gravar'
    waveform.classList.remove('recording')
  }
}

function toggleRecording() {
  if (isRecording) {
    stopRecording()
  } else {
    startRecording()
  }
}

// ============================================================
// UI HELPERS
// ============================================================

function setStatus(state, message) {
  statusDot.dataset.state = state
  statusMessage.textContent = message
  statusText.textContent = message
}

function updateTimer() {
  if (!startTime) return
  const elapsed = Math.floor((Date.now() - startTime) / 1000)
  const m = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const s = (elapsed % 60).toString().padStart(2, '0')
  timer.textContent = `${m}:${s}`
}

function updateCharCount() {
  const text = transcriptionText.value
  const count = text.length
  charCount.textContent = `${count} caractere${count !== 1 ? 's' : ''}`
}

function clearAll() {
  if (isRecording) stopRecording()
  transcriptionText.value = ''
  sendBtn.disabled = true
  copyBtn.disabled = true
  setStatus('ready', 'Pronto para gravar')
  updateCharCount()
}

// ============================================================
// HISTÓRICO
// ============================================================

const HISTORY_KEY = 'super-whisper-history'
const MAX_HISTORY = 20

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch (e) {
    console.error('[Super Whisper] Erro ao salvar histórico:', e)
  }
}

function addToHistory(text) {
  if (!text || !text.trim()) return
  const history = loadHistory()
  history.unshift({
    id: Date.now(),
    text: text.trim(),
    timestamp: new Date().toISOString(),
  })
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY
  }
  saveHistory(history)
  renderHistory()
}

function renderHistory() {
  const history = loadHistory()

  // Limpa lista anterior (DOM API evita XSS)
  while (historyList.firstChild) {
    historyList.removeChild(historyList.firstChild)
  }

  // Atualiza contador
  historyCount.textContent = String(history.length)

  if (history.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'sw-history-empty'
    empty.textContent = 'Nenhuma transcrição salva ainda'
    historyList.appendChild(empty)
    return
  }

  history.forEach((item) => {
    const div = document.createElement('div')
    div.className = 'sw-history-item'

    const timeSpan = document.createElement('span')
    timeSpan.className = 'sw-history-time'
    timeSpan.textContent = new Date(item.timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    const textSpan = document.createElement('span')
    textSpan.className = 'sw-history-text'
    const preview = item.text.length > 50 ? item.text.slice(0, 50) + '…' : item.text
    textSpan.textContent = preview
    div.title = item.text

    div.addEventListener('click', () => {
      transcriptionText.value = item.text
      updateCharCount()
      sendBtn.disabled = false
      copyBtn.disabled = false
      setStatus('done', 'Transcrição carregada do histórico')
      transcriptionText.focus()
      transcriptionText.setSelectionRange(transcriptionText.value.length, transcriptionText.value.length)
    })

    div.appendChild(timeSpan)
    div.appendChild(textSpan)
    historyList.appendChild(div)
  })
}

function clearHistory() {
  if (!confirm('Limpar todo o histórico de transcrições?')) return
  saveHistory([])
  renderHistory()
}

// ============================================================
// AÇÕES
// ============================================================

async function copyText() {
  const text = transcriptionText.value
  if (!text) return

  try {
    await navigator.clipboard.writeText(text)
    const original = copyBtn.querySelector('span').textContent
    copyBtn.querySelector('span').textContent = 'Copiado!'
    setTimeout(() => {
      copyBtn.querySelector('span').textContent = original
    }, 1500)
  } catch (err) {
    setStatus('error', 'Não foi possível copiar para a área de transferência')
  }
}

async function sendToAI() {
  const text = transcriptionText.value.trim()
  if (!text) return

  setStatus('processing', 'Enviando...')

  // Salva no histórico
  addToHistory(text)

  try {
    if (window.electronAPI?.superWhisperSend) {
      await window.electronAPI.superWhisperSend(text)
    } else {
      console.warn('[Super Whisper] API de envio indisponível')
    }

    setStatus('done', 'Enviado!')
    setTimeout(() => {
      clearAll()
      window.close()
    }, 800)
  } catch (error) {
    console.error('[Super Whisper] Erro ao enviar:', error)
    setStatus('error', 'Falha ao enviar')
  }
}

async function closeWindow() {
  if (busy) return
  if (isRecording) await stopRecording()
  await window.electronAPI?.superWhisperHide()
}

// ============================================================
// ATALHOS DE TECLADO
// ============================================================

document.addEventListener('keydown', (e) => {
  // Ignora atalhos se o usuário está digitando no textarea
  const inTextarea = document.activeElement === transcriptionText
  const withModifier = e.ctrlKey || e.metaKey || e.altKey

  if (inTextarea && e.key !== 'Escape') return
  if (withModifier) return

  const key = e.key.toLowerCase()

  if (key === 'r') {
    e.preventDefault()
    toggleRecording()
  } else if (key === 'enter') {
    e.preventDefault()
    sendToAI()
  } else if (key === 'c') {
    e.preventDefault()
    copyText()
  } else if (key === 'l' || key === 'delete') {
    e.preventDefault()
    clearAll()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    closeWindow()
  }
})

// ============================================================
// EVENT LISTENERS
// ============================================================

recordBtn.addEventListener('click', toggleRecording)
sendBtn.addEventListener('click', sendToAI)
copyBtn.addEventListener('click', copyText)
clearBtn.addEventListener('click', clearAll)
closeBtn.addEventListener('click', closeWindow)
transcriptionText.addEventListener('input', updateCharCount)

// ============================================================
// INIT
// ============================================================

;(async () => {
  await loadTheme()
  setStatus('ready', 'Pronto para gravar (R)')
  renderHistory()
  updateCharCount()
  console.log('[Super Whisper] Inicializado')
})()
window.electronAPI?.onSuperWhisperToggleRecording?.(() => toggleRecording())
