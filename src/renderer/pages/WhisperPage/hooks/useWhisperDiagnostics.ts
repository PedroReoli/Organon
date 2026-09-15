import { useState, useEffect } from 'react'
import { detectWhisperCaptureReadiness } from '../services/whisperCaptureCapabilities'
import { loadWhisperConfig } from '../../../services/whisperService'

export type WhisperPathKind = 'webSpeech' | 'groq' | 'localEndpoint' | 'localModel'

export type WhisperPathDiagnostic = {
  kind: WhisperPathKind
  label: string
  available: boolean
  state: 'ready' | 'optional' | 'missing'
  detail: string
}

export type WhisperLocalModelInfo = {
  id: string
  name: string
  sizeMb: number
  vramRequiredMb: number
  url: string
  downloaded: boolean
}

export function useWhisperDiagnostics() {
  const [captureReadiness] = useState(() => detectWhisperCaptureReadiness())
  const [localWhisperModels, setLocalWhisperModels] = useState<WhisperLocalModelInfo[]>([])

  const refreshWhisperLocalModels = async () => {
    try {
      const models = await window.electronAPI?.listWhisperModels?.()
      if (Array.isArray(models)) {
        setLocalWhisperModels(models)
      }
    } catch (err) {
      console.warn('[useWhisperDiagnostics] Falha ao consultar modelos locais do Whisper:', err)
      setLocalWhisperModels([])
    }
  }

  useEffect(() => {
    void refreshWhisperLocalModels()
  }, [])

  const whisperConfig = loadWhisperConfig()
  const webSpeechReady = captureReadiness.speechRecognitionReady
  const groqReady = Boolean(whisperConfig.groqApiKey?.trim())
  const endpointReady = Boolean(whisperConfig.customEndpoint?.trim())
  const localModelReady = localWhisperModels.some(model => model.downloaded)

  const whisperPathDiagnostics: WhisperPathDiagnostic[] = [
    {
      kind: 'webSpeech',
      label: 'Captura PCM (AudioWorklet)',
      available: webSpeechReady,
      state: webSpeechReady ? 'ready' : 'missing',
      detail: webSpeechReady
        ? 'Captura PCM disponível; a transcrição depende do motor selecionado.'
        : 'AudioWorklet indisponível neste ambiente.',
    },
    {
      kind: 'groq',
      label: 'Groq Whisper (Nuvem)',
      available: groqReady,
      state: groqReady ? 'ready' : 'optional',
      detail: groqReady
        ? 'Chave do Groq configurada e pronta para transcrição via nuvem.'
        : 'Opcional. Adicione uma API key do Groq nas configurações se desejar utilizar este provedor.',
    },
    {
      kind: 'localEndpoint',
      label: 'Endpoint HTTP Local',
      available: endpointReady,
      state: endpointReady ? 'ready' : 'optional',
      detail: endpointReady
        ? `Configurado para ${whisperConfig.customEndpoint}`
        : 'Opcional. Defina uma URL de endpoint customizado se possuir um servidor local de áudio.',
    },
    {
      kind: 'localModel',
      label: 'Modelo local GGML',
      available: localModelReady,
      state: localModelReady ? 'ready' : 'missing',
      detail: localModelReady
        ? `${localWhisperModels.filter(m => m.downloaded).length} modelo(s) baixado(s). O executável nativo é verificado ao transcrever.`
        : 'Nenhum modelo local baixado. Baixe um modelo Whisper nas configurações para uso offline.',
    },
  ]

  const readyDiagnosticsCount = whisperPathDiagnostics.filter(item => item.available).length

  return {
    captureReadiness,
    localWhisperModels,
    whisperPathDiagnostics,
    readyDiagnosticsCount,
    refreshWhisperLocalModels,
  }
}
