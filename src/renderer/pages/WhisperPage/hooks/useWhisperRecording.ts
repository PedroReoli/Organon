import { WhisperPcmRecorder } from '../../../services/WhisperPcmRecorder'
import { startWhisperLiveCapture } from '../../../services/whisperLiveCapture'
import { stopRecorder } from '../../../services/whisperAudio'
import { useState, useRef, useEffect } from 'react'
import { SpeakerSegment, LiveReport, WhisperRecord, WhisperCaptureReadiness } from '../types/whisper.types'
import { RecordingModeType } from '../components/WhisperRecordingHero'
import { MeetingIntelligenceData, ProjectContextConfig, ResearchScope } from '../../../services/meetingIntelligence/types'
import { MeetingOrchestrator } from '../../../services/meetingIntelligence/MeetingOrchestrator'
import {
  transcribeAudioBlobWithFallback,
  loadWhisperConfig,
  getWhisperTranscriptionTuning,
  WhisperTranscriptionContext,
} from '../../../services/whisperService'
import { extractHotwords } from '../utils/whisperUtils'

interface RecordingProps {
  projectContext: ProjectContextConfig | undefined
  captureReadiness: WhisperCaptureReadiness
  selectedRecord: WhisperRecord | undefined
  setRecords: React.Dispatch<React.SetStateAction<WhisperRecord[]>>
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void
}

export function useWhisperRecording({
  projectContext,
  selectedRecord,
  setRecords,
  showToast,
}: RecordingProps) {
  const [recordingMode, setRecordingMode] = useState<RecordingModeType>('meeting')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [systemCaptureActive, setSystemCaptureActive] = useState(false)
  const [durationSeconds, setDurationSeconds] = useState(0)

  const [liveSegments, setLiveSegments] = useState<SpeakerSegment[]>([])
  const [liveReport] = useState<LiveReport>({
    discussedConcepts: [],
    forgottenPoints: [],
    actionItems: [],
  })

  const [intelligenceData, setIntelligenceData] = useState<MeetingIntelligenceData>({
    questions: [],
    findings: [],
    decisions: [],
    actionItems: [],
    auditLog: [],
  })

  const startingRef = useRef(false)
  const mediaRecorderRef = useRef<WhisperPcmRecorder | null>(null)
  const stopLiveRef = useRef<(() => Promise<void>) | null>(null)
  const mixContextRef = useRef<AudioContext | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const micStreamRef = useRef<MediaStream | null>(null)
  const systemStreamRef = useRef<MediaStream | null>(null)
  const orchestratorRef = useRef<MeetingOrchestrator | null>(null)

  const savedRecordIdRef = useRef<string | null>(null)
  const projectContextRef = useRef(projectContext)
  projectContextRef.current = projectContext
  const ensureOrchestrator = () => {
    if (!orchestratorRef.current) {
      const orchestrator = new MeetingOrchestrator(`Reunião ${new Date().toLocaleString('pt-BR')}`, projectContextRef.current, 'codex')
      orchestratorRef.current = orchestrator
      orchestrator.subscribe(data => {
        const snapshot: MeetingIntelligenceData = JSON.parse(JSON.stringify(data))
        setIntelligenceData(snapshot)
        if (savedRecordIdRef.current) setRecords(records => records.map(record => record.id === savedRecordIdRef.current ? { ...record, intelligenceData: snapshot } : record))
      })
    }
    orchestratorRef.current.configure(projectContextRef.current)
    return orchestratorRef.current
  }
  useEffect(() => {
    if (isRecording || isTranscribing || selectedRecord?.id === savedRecordIdRef.current) return
    orchestratorRef.current?.dispose(); orchestratorRef.current = null
    savedRecordIdRef.current = null
    ensureOrchestrator().restore(selectedRecord?.intelligenceData || { questions: [], findings: [], decisions: [], actionItems: [], auditLog: [], tasks: [] }, selectedRecord?.fullTranscript || '')
    savedRecordIdRef.current = selectedRecord?.id || null
  }, [selectedRecord?.id])
  const handleAskAgents = async (question: string, scope: ResearchScope) => {
    if ((scope === 'web' || scope === 'both') && projectContextRef.current?.allowWebResearch === false) { showToast('Ative a pesquisa na internet.', 'error'); return }
    await ensureOrchestrator().ask(question, scope)
  }
  const handleCancelResearch = (id: string) => { void orchestratorRef.current?.cancel(id) }
  const handleExportResearch = () => ensureOrchestrator().exportReport()
  useEffect(() => {
    orchestratorRef.current?.configure(projectContext)
    const api = window.electronAPI as any
    const root = projectContext?.enabled && projectContext.watchChanges ? projectContext.path : undefined
    const off = api?.onMeetingFilesChanged?.((event: { files: string[]; at?: string; error?: string }) => {
      if (event.error) { showToast(event.error, 'error'); return }
      if (root && event.files.length) void ensureOrchestrator().ask(`Analise o estado atual dos arquivos alterados em ${event.at || new Date().toISOString()} e seus impactos: ${event.files.join(', ')}`, 'project', true)
    })
    void api?.meetingAgentWatch?.(root).catch((error: Error) => showToast(error.message, 'error'))
    return () => { off?.(); void api?.meetingAgentWatch?.() }
  }, [projectContext])

  const systemCaptureEnabledRef = useRef(false)

  const whisperConfig = loadWhisperConfig()
  const whisperTuning = getWhisperTranscriptionTuning(whisperConfig)

  useEffect(() => () => {
    orchestratorRef.current?.dispose()
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop())
    micStreamRef.current?.getTracks().forEach(track => track.stop())
    systemStreamRef.current?.getTracks().forEach(track => track.stop())
    void stopLiveRef.current?.()
    void mixContextRef.current?.close()
  }, [])

  // Cronômetro de gravação
  useEffect(() => {
    let interval: number | null = null
    if (isRecording) {
      interval = window.setInterval(() => {
        setDurationSeconds(prev => prev + 1)
      }, 1000)
    } else {
      setDurationSeconds(0)
    }
    return () => {
      if (interval) window.clearInterval(interval)
    }
  }, [isRecording])

  const getRecordingModeLabel = (mode: RecordingModeType) => {
    if (mode === 'interview') return 'Entrevista'
    if (mode === 'prompt') return 'Prompt por voz'
    return 'Reunião'
  }

  const buildWhisperContext = (chunkText = ''): WhisperTranscriptionContext => {
    const recentText = [
      ...liveSegments.slice(-4).map(segment => segment.text),
      chunkText,
    ].filter(Boolean).join(' ').trim()

    const hotwords = [
      ...extractHotwords(recentText),
      'Organon',
      'Whisper',
      'Codex',
    ]

    return {
      mode: recordingMode,
      projectName: projectContext?.name,
      recentTranscript: recentText ? `Contexto da reunião: ${recentText}` : '',
      selectedSnippets: selectedRecord?.fullTranscript ? [selectedRecord.fullTranscript] : [],
      hotwords,
    }
  }

  const appendLiveTranscriptSegment = (text: string, sourceKind: 'microphone' | 'system' | 'mixed' = 'microphone') => {
    const cleanText = text.trim()
    if (!cleanText) return

    setLiveSegments(prev => {
      const now = new Date().toLocaleTimeString('pt-BR')
      const speakerName = sourceKind === 'mixed' ? 'Microfone + sistema' : sourceKind === 'system'
        ? 'Áudio do sistema'
        : (recordingMode === 'meeting' ? 'Você (Microfone)' : recordingMode === 'interview' ? 'Candidato' : 'Comando')

      const lastSegment = prev[prev.length - 1]
      if (
        lastSegment &&
        lastSegment.sourceKind === sourceKind &&
        lastSegment.speakerName === speakerName &&
        lastSegment.text.toLowerCase().slice(-20) === cleanText.toLowerCase().slice(0, 20)
      ) {
        return prev
      }

      return [
        ...prev,
        {
          id: `seg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          speaker: sourceKind === 'system' ? 'system' : 'user',
          speakerName,
          timestamp: now,
          text: cleanText,
          sourceKind,
        },
      ]
    })
  }

  const handleStartRecording = async (mode: RecordingModeType = 'meeting') => {
    if (startingRef.current || isRecording || isTranscribing) return
    startingRef.current = true
    try {
      setRecordingMode(mode)
      setLiveSegments([])
      setInterimText('')
      audioChunksRef.current = []
      systemCaptureEnabledRef.current = false
      setSystemCaptureActive(false)

      if (savedRecordIdRef.current) { orchestratorRef.current?.dispose(); orchestratorRef.current = null }
      savedRecordIdRef.current = null
      const orchestrator = ensureOrchestrator()

      const savedMicId = localStorage.getItem('organon_selected_mic_id')
      const audioConstraints = savedMicId && savedMicId !== 'default'
        ? { deviceId: { exact: savedMicId } }
        : true

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
      micStreamRef.current = micStream

      let recordingStream = micStream
      if ((mode === 'meeting' || mode === 'interview') && projectContextRef.current?.systemAudio !== false) {
        const systemStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        systemStreamRef.current = systemStream
        for (const track of systemStream.getAudioTracks()) track.addEventListener('ended', () => {
          setSystemCaptureActive(false)
          showToast('A captura do sistema foi interrompida. O microfone continua gravando.', 'error')
        }, { once: true })
        if (!systemStream.getAudioTracks().length) throw new Error('A fonte selecionada não forneceu áudio do sistema. Ative o compartilhamento de áudio.')
        const mix = new AudioContext()
        mixContextRef.current = mix
        await mix.resume()
        const destination = mix.createMediaStreamDestination()
        for (const stream of [micStream, systemStream]) {
          const gain = mix.createGain()
          gain.gain.value = 0.5
          mix.createMediaStreamSource(new MediaStream(stream.getAudioTracks())).connect(gain).connect(destination)
        }
        recordingStream = destination.stream
        setSystemCaptureActive(true)
        systemCaptureEnabledRef.current = true
      }
      const mediaRecorder = await WhisperPcmRecorder.create(recordingStream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(whisperTuning.liveChunkMs)
      setIsRecording(true)
      try {
        stopLiveRef.current = await startWhisperLiveCapture(recordingStream, async audio => {
          try {
            const text = await transcribeAudioBlobWithFallback(audio, loadWhisperConfig(), { mode })
            if (text) {
              appendLiveTranscriptSegment(text, mode === 'prompt' ? 'microphone' : 'mixed')
              if (mode !== 'prompt') void orchestrator.processTranscriptSnippet(text)
            }
          } catch { setInterimText('Prévia indisponível. O áudio completo será transcrito ao parar.') }
        })
      } catch { setInterimText('Gravando. A transcrição será feita ao parar.') }

      showToast(`Gravação iniciada em modo ${getRecordingModeLabel(mode)}.`, 'info')
    } catch (err: any) {
      micStreamRef.current?.getTracks().forEach(track => track.stop())
      systemStreamRef.current?.getTracks().forEach(track => track.stop())
      void mixContextRef.current?.close()
      mixContextRef.current = null
      console.error('[useWhisperRecording] Erro ao iniciar gravação:', err)
      setIsRecording(false)
      showToast(err?.message || 'Erro ao acessar áudio.', 'error')
    } finally { startingRef.current = false }
  }

  const handleStopRecording = async () => {
    if (!isRecording) return
    setIsRecording(false)
    setIsTranscribing(true)

    try {
      await stopRecorder(mediaRecorderRef.current)
      await stopLiveRef.current?.()
      stopLiveRef.current = null
      await mixContextRef.current?.close()
      mixContextRef.current = null
      setSystemCaptureActive(false)

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop())
        micStreamRef.current = null
      }

      if (systemStreamRef.current) {
        systemStreamRef.current.getTracks().forEach(track => track.stop())
        systemStreamRef.current = null
      }

      let finalMicTranscript = ''

      if (audioChunksRef.current.length > 0) {
        const micMimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'
        const micBlob = new Blob(audioChunksRef.current, { type: micMimeType })
        const whisperCfg = loadWhisperConfig()
        const whisperContext = buildWhisperContext('')

        finalMicTranscript = await transcribeAudioBlobWithFallback(micBlob, whisperCfg, whisperContext)
      }

      const hasMicSegments = liveSegments.some(segment => segment.sourceKind === 'microphone')
      if (finalMicTranscript && !hasMicSegments && !finalMicTranscript.startsWith('[Erro')) {
        appendLiveTranscriptSegment(finalMicTranscript, 'microphone')
      }

      const combinedText = finalMicTranscript
      if (!combinedText.trim()) { showToast('Nenhuma fala detectada.', 'info'); return }

      orchestratorRef.current?.setTranscript(combinedText)
      const newRecord: WhisperRecord = {
        folderId: null,
        id: `rec-${Date.now()}`,
        title: recordingMode === 'meeting'
          ? `Reunião Whisper (${new Date().toLocaleTimeString('pt-BR')})`
          : recordingMode === 'interview'
            ? `Entrevista (${new Date().toLocaleTimeString('pt-BR')})`
            : `Prompt por voz (${new Date().toLocaleTimeString('pt-BR')})`,
        createdAt: new Date().toISOString(),
        durationSeconds,
        fullTranscript: combinedText,
        segments: [
          {
            id: `seg-${Date.now()}`,
            speaker: 'user',
            speakerName: systemCaptureEnabledRef.current ? 'Microfone + sistema' : 'Você (Microfone)',
            timestamp: new Date().toLocaleTimeString('pt-BR'),
            text: combinedText,
            sourceKind: systemCaptureEnabledRef.current ? 'mixed' : 'microphone',
          },
        ],
        liveReport,
        intelligenceData: orchestratorRef.current?.getData(),
        mode: recordingMode,
      }

      savedRecordIdRef.current = newRecord.id
      setRecords(prev => [newRecord, ...prev])
      showToast('Gravação encerrada e salva com sucesso.', 'success')
      return newRecord.id
    } catch (err: any) {
      console.error('[useWhisperRecording] Erro ao encerrar gravação:', err)
      showToast(err?.message || 'Erro ao processar transcrição final.', 'error')
    } finally {
      micStreamRef.current?.getTracks().forEach(track => track.stop())
      systemStreamRef.current?.getTracks().forEach(track => track.stop())
      setIsTranscribing(false)
    }
  }

  const handleSearchProjectFromSelection = (query: string) => {
    showToast(`Pesquisando "${query}" no projeto...`, 'info')
    void handleAskAgents(query, 'project')
  }

  const handleSearchWebFromSelection = (query: string) => {
    showToast(`Pesquisando "${query}" na web...`, 'info')
    void handleAskAgents(query, 'web')
  }

  return {
    recordingMode,
    setRecordingMode,
    isRecording,
    isTranscribing,
    interimText,
    systemCaptureActive,
    durationSeconds,
    liveSegments,
    setLiveSegments,
    liveReport,
    intelligenceData,
    setIntelligenceData,
    orchestratorRef,
    handleAskAgents,
    handleCancelResearch,
    handleExportResearch,
    handleStartRecording,
    handleStopRecording,
    handleSearchProjectFromSelection,
    handleSearchWebFromSelection,
  }
}
