import { WhisperCaptureCapability, WhisperCaptureReadiness } from '../types/whisper.types'

function pushCapability(
  capabilities: WhisperCaptureCapability[],
  kind: WhisperCaptureCapability['kind'],
  label: string,
  available: boolean,
  detail: string,
) {
  capabilities.push({ kind, label, available, detail })
}

export function detectWhisperCaptureReadiness(): WhisperCaptureReadiness {
  const hasWindow = typeof window !== 'undefined'
  const hasNavigator = typeof navigator !== 'undefined'
  const mediaDevices = hasNavigator ? navigator.mediaDevices : undefined
  const electronAPI = hasWindow ? window.electronAPI : undefined

  const microphoneReady = Boolean(mediaDevices?.getUserMedia)
  const speechRecognitionReady = hasWindow
    ? Boolean(window.AudioWorkletNode)
    : false
  const displayCaptureReady = Boolean(mediaDevices?.getDisplayMedia)
  const electronBridgeReady = Boolean(electronAPI?.openPath && electronAPI?.transcribeAudio)

  const capabilities: WhisperCaptureCapability[] = []

  pushCapability(
    capabilities,
    'microphone',
    'Microfone',
    microphoneReady,
    microphoneReady
      ? 'Captura local de voz disponível.'
      : 'Navegador/Electron não expôs getUserMedia.',
  )

  pushCapability(
    capabilities,
    'speech-recognition',
    'Captura PCM ao vivo',
    speechRecognitionReady,
    speechRecognitionReady
      ? 'AudioWorklet disponível para capturar áudio PCM.'
      : 'AudioWorklet indisponível neste runtime.',
  )

  pushCapability(
    capabilities,
    'display-capture',
    'Tela / áudio do sistema',
    displayCaptureReady,
    displayCaptureReady
      ? 'Base pronta para capturar fonte secundária em outra trilha.'
      : 'Ainda não há captura de sistema disponível no runtime atual.',
  )

  pushCapability(
    capabilities,
    'electron-bridge',
    'Bridge Electron',
    electronBridgeReady,
    electronBridgeReady
      ? 'A app consegue abrir arquivos locais e transcrever via IPC.'
      : 'A ponte Electron ainda não está completa para a base de diarização.',
  )

  const diarizationBaseReady = microphoneReady && speechRecognitionReady
  const summary = diarizationBaseReady
    ? displayCaptureReady
      ? 'Base pronta para evoluir para captura de microfone e sistema.'
      : 'Base mínima pronta: microfone e texto ao vivo ativos.'
    : 'A base de diarização ainda depende do suporte a captura e reconhecimento de voz.'

  return {
    capabilities,
    microphoneReady,
    speechRecognitionReady,
    displayCaptureReady,
    electronBridgeReady,
    diarizationBaseReady,
    summary,
  }
}
