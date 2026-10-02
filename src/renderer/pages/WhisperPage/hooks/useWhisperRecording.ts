import { startWhisperLiveCapture } from '../../../services/whisperLiveCapture'
import { useState, useRef, useEffect } from 'react'
import { SpeakerSegment, LiveReport, WhisperRecord, WhisperCaptureReadiness, WhisperAudioMetrics } from '../types/whisper.types'
import { RecordingModeType } from '../components/WhisperRecordingHero'
import { MeetingIntelligenceData, ProjectContextConfig, ResearchScope } from '../../../services/meetingIntelligence/types'
import { MeetingOrchestrator } from '../../../services/meetingIntelligence/MeetingOrchestrator'
import {
  transcribeAudioBlobWithFallback,
  loadWhisperConfig,
  buildWhisperInitialPrompt,
  WhisperTranscriptionContext,
} from '../../../services/whisperService'
import { extractHotwords } from '../utils/whisperUtils'
import { MeetingAudioCapture, MeetingAudioTrack } from '../../../services/MeetingAudioCapture'
import {
  buildSourceSegments,
  formatSpeakerTranscript,
  mergeSourceSegments,
} from '../../../services/meetingIntelligence/speakerSegmentation'
import { applyLocalSpeakerDiarization } from '../../../services/meetingIntelligence/speakerDiarizationClient'

interface RecordingProps {
  projectContext: ProjectContextConfig | undefined
  captureReadiness: WhisperCaptureReadiness
  selectedRecord: WhisperRecord | undefined
  setRecords: React.Dispatch<React.SetStateAction<WhisperRecord[]>>
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void
}

const EMPTY_AUDIO_METRICS: WhisperAudioMetrics = { rms: 0, peak: 0, waveform: [], quality: 'silent' }

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
  const [audioMetrics, setAudioMetrics] = useState<WhisperAudioMetrics>(EMPTY_AUDIO_METRICS)

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
  const captureRef = useRef<MeetingAudioCapture | null>(null)
  const stopLiveRefs = useRef<Array<() => Promise<void>>>([])
  const pendingRecordIdRef = useRef<string | null>(null)
  const recordingStartedAtRef = useRef(0)
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

  useEffect(() => () => {
    orchestratorRef.current?.dispose()
    void Promise.all(stopLiveRefs.current.map(stop => stop().catch(() => undefined)))
    void captureRef.current?.cancel()
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
      setAudioMetrics(EMPTY_AUDIO_METRICS)
      systemCaptureEnabledRef.current = false
      setSystemCaptureActive(false)
      stopLiveRefs.current = []

      if (savedRecordIdRef.current) { orchestratorRef.current?.dispose(); orchestratorRef.current = null }
      savedRecordIdRef.current = null
      const orchestrator = ensureOrchestrator()
      const savedMicId = localStorage.getItem('organon_selected_mic_id')
      const recordId = `rec-${Date.now()}`
      pendingRecordIdRef.current = recordId
      const capture = await MeetingAudioCapture.start({
        meetingId: recordId,
        microphoneDeviceId: savedMicId || undefined,
        captureSystemAudio: (mode === 'meeting' || mode === 'interview') && projectContextRef.current?.systemAudio !== false,
        onMicrophoneLevel: ({ rms, peak }) => {
          const quality: WhisperAudioMetrics['quality'] = peak >= 0.98
            ? 'clipping'
            : rms < 0.006
              ? 'silent'
              : rms < 0.03
                ? 'low'
                : 'good'
          setAudioMetrics(previous => ({
            rms,
            peak,
            quality,
            waveform: [...previous.waveform.slice(-35), Math.min(1, Math.max(rms * 5, peak * 0.65))],
          }))
        },
      })
      captureRef.current = capture
      recordingStartedAtRef.current = Date.now()
      systemCaptureEnabledRef.current = capture.hasSystemAudio
      setSystemCaptureActive(capture.hasSystemAudio)

      if (capture.systemStream) {
        for (const track of capture.systemStream.getAudioTracks()) track.addEventListener('ended', () => {
          setSystemCaptureActive(false)
          showToast('A captura do sistema foi interrompida. O microfone continua gravando.', 'error')
        }, { once: true })
      }
      setIsRecording(true)
      try {
        const startLiveSource = async (stream: MediaStream, sourceKind: 'microphone' | 'system') => {
          const stop = await startWhisperLiveCapture(stream, async audio => {
            try {
              const text = await transcribeAudioBlobWithFallback(audio, loadWhisperConfig(), { mode })
              if (!text) return
              appendLiveTranscriptSegment(text, sourceKind)
              void orchestrator.processTranscriptSnippet(text)
            } catch { setInterimText('Prévia indisponível. O áudio completo será transcrito ao parar.') }
          })
          stopLiveRefs.current.push(stop)
        }
        await startLiveSource(capture.microphoneStream, 'microphone')
        if (capture.systemStream) await startLiveSource(capture.systemStream, 'system')
      } catch { setInterimText('Gravando. A transcrição será feita ao parar.') }

      showToast(`Gravação iniciada em modo ${getRecordingModeLabel(mode)}.`, 'info')
    } catch (err: any) {
      await Promise.all(stopLiveRefs.current.map(stop => stop().catch(() => undefined)))
      stopLiveRefs.current = []
      await captureRef.current?.cancel().catch(() => undefined)
      captureRef.current = null
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
      const capture = captureRef.current
      if (!capture) throw new Error('A sessão de gravação não está disponível.')
      const durationMs = Math.max(0, Date.now() - recordingStartedAtRef.current)
      const stops = stopLiveRefs.current
      stopLiveRefs.current = []
      await Promise.all(stops.map(stop => stop().catch(() => undefined)))
      const audioTracks = await capture.stop(durationMs)
      captureRef.current = null
      setSystemCaptureActive(false)

      const recordId = pendingRecordIdRef.current || capture.meetingId
      const whisperCfg = loadWhisperConfig()
      const whisperContext = buildWhisperContext('')
      const finalResults: Array<{
        track: MeetingAudioTrack
        result: Awaited<ReturnType<typeof window.electronAPI.transcribeAudioDetailed>>
      }> = []
      for (const track of audioTracks.filter(item => item.channel !== 'mixed')) {
        try {
          const result = await window.electronAPI.transcribeAudioDetailed(track.path, whisperCfg.model, {
            initialPrompt: buildWhisperInitialPrompt(whisperContext),
            mode: recordingMode,
            projectName: projectContextRef.current?.name,
            hotwords: whisperContext.hotwords,
          })
          if (result.text.trim()) finalResults.push({ track, result })
        } catch (error) {
          console.warn(`[Whisper] Falha na transcrição final do canal ${track.channel}:`, error)
        }
      }

      const sourceSegments = mergeSourceSegments(finalResults.map(({ track, result }) => (
        buildSourceSegments({
          recordId,
          sourceKind: track.channel as 'microphone' | 'system',
          result,
          durationMs,
          mode: recordingMode,
        })
      )))
      const systemTrack = audioTracks.find(track => track.channel === 'system')
      const finalSegments = await applyLocalSpeakerDiarization(sourceSegments, systemTrack?.path)
      const transcriptSegments = finalSegments.length > 0 ? finalSegments : liveSegments
      const rawTranscript = formatSpeakerTranscript(transcriptSegments)
      const cleanTranscript = rawTranscript.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
      orchestratorRef.current?.setTranscript(cleanTranscript)
      const title = recordingMode === 'meeting'
        ? `Reunião Whisper (${new Date().toLocaleTimeString('pt-BR')})`
        : recordingMode === 'interview'
          ? `Entrevista (${new Date().toLocaleTimeString('pt-BR')})`
          : `Prompt por voz (${new Date().toLocaleTimeString('pt-BR')})`
      const primaryAudio = audioTracks.find(track => track.channel === 'mixed')
        || audioTracks.find(track => track.channel === 'microphone')
      const synthesis = cleanTranscript
        ? await window.electronAPI?.generateTranscriptNote?.({ title, transcript: cleanTranscript, mode: recordingMode })
        : undefined
      const synthesizedAt = new Date().toISOString()
      const sourceSegmentIds = transcriptSegments.map(segment => segment.id)
      const baseIntelligence = orchestratorRef.current?.getData() || {
        questions: [], findings: [], decisions: [], actionItems: [], auditLog: [], tasks: [],
      }
      const mergedIntelligence: MeetingIntelligenceData = {
        ...baseIntelligence,
        executiveSummary: synthesis?.summary || baseIntelligence.executiveSummary,
        decisions: [
          ...baseIntelligence.decisions,
          ...(synthesis?.decisions || []).map((text, index) => ({
            id: `decision-${recordId}-${index}`,
            text,
            timestamp: synthesizedAt,
            sourceSegmentIds,
            confirmed: false,
          })),
        ],
        actionItems: [
          ...baseIntelligence.actionItems,
          ...(synthesis?.actionItems || []).map((task, index) => ({
            id: `action-${recordId}-${index}`,
            task,
            timestamp: synthesizedAt,
            status: 'pending' as const,
            sourceSegmentIds,
            confirmed: false,
          })),
        ],
        auditLog: [
          ...baseIntelligence.auditLog,
          {
            id: `synthesis-${recordId}`,
            timestamp: synthesizedAt,
            action: 'automatic_synthesis',
            details: `Síntese automática criada a partir de ${sourceSegmentIds.length} segmento(s).`,
          },
        ],
      }
      setIntelligenceData(mergedIntelligence)
      const newRecord: WhisperRecord = {
        folderId: null,
        id: recordId,
        title,
        createdAt: new Date().toISOString(),
        durationSeconds: Math.round(durationMs / 1000),
        audio: primaryAudio,
        audioTracks,
        audioUrl: primaryAudio?.path,
        fullTranscript: cleanTranscript,
        rawTranscript,
        cleanTranscript,
        timingPrecision: finalResults.some(item => item.result.timingPrecision === 'segment') ? 'segment' : 'none',
        segments: transcriptSegments,
        transcriptionProvenance: {
          schemaVersion: 1,
          raw: {
            version: 1,
            createdAt: synthesizedAt,
            provider: finalResults[0]?.result.provider ?? 'local',
            model: finalResults.map(item => item.result.model).filter(Boolean).join(' + ') || whisperCfg.model || 'unknown',
            language: finalResults.find(item => item.result.language)?.result.language,
            timingPrecision: finalResults.some(item => item.result.timingPrecision === 'segment') ? 'segment' : 'none',
            sourceAudioSha256: primaryAudio?.sha256,
          },
          clean: {
            version: 1,
            createdAt: synthesizedAt,
            derivedFromRawVersion: 1,
            pipeline: 'normalize-whitespace-v1',
          },
          intelligence: {
            version: 1,
            createdAt: synthesizedAt,
            derivedFromSegmentIds: sourceSegmentIds,
            pipeline: 'organon-transcript-note-v1',
          },
        },
        liveReport,
        intelligenceData: mergedIntelligence,
        mode: recordingMode,
      }

      savedRecordIdRef.current = newRecord.id
      setRecords(prev => [newRecord, ...prev])
      showToast(cleanTranscript
        ? 'Gravação encerrada, canais separados e transcrição salvos.'
        : 'Áudio salvo em canais separados, mas nenhuma fala foi reconhecida.', cleanTranscript ? 'success' : 'info')
      return newRecord.id
    } catch (err: any) {
      console.error('[useWhisperRecording] Erro ao encerrar gravação:', err)
      showToast(err?.message || 'Erro ao processar transcrição final.', 'error')
    } finally {
      pendingRecordIdRef.current = null
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
    audioMetrics,
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
