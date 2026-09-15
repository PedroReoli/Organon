import React, { useState, useEffect } from 'react'

export const AudioSection: React.FC = () => {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([])

  const [selectedInputId, setSelectedInputId] = useState<string>(() => {
    return localStorage.getItem('organon_selected_mic_id') || 'default'
  })
  const [selectedOutputId, setSelectedOutputId] = useState<string>(() => {
    return localStorage.getItem('organon_selected_speaker_id') || 'default'
  })

  const [isTestingMic, setIsTestingMic] = useState(false)
  const [micVolumeLevel, setMicVolumeLevel] = useState(0)

  const [micGain, setMicGain] = useState<number>(() => {
    const saved = localStorage.getItem('organon_mic_gain')
    return saved ? Number(saved) : 150
  })

  const [autoGain, setAutoGain] = useState<boolean>(() => {
    const saved = localStorage.getItem('organon_mic_auto_gain')
    return saved !== null ? saved === 'true' : true
  })

  // Carregar e monitorar dispositivos de áudio
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        // Solicita permissão se ainda não tiver para obter os nomes dos dispositivos
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          stream.getTracks().forEach(track => track.stop())
        }).catch(() => {})

        const devices = await navigator.mediaDevices.enumerateDevices()
        const inputs = devices.filter(d => d.kind === 'audioinput')
        const outputs = devices.filter(d => d.kind === 'audiooutput')

        setAudioInputs(inputs)
        setAudioOutputs(outputs)
      } catch (err) {
        console.warn('[AudioSettings] Erro ao listar dispositivos:', err)
      }
    }

    fetchDevices()
    navigator.mediaDevices.addEventListener('devicechange', fetchDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', fetchDevices)
  }, [])

  const handleInputDeviceChange = (deviceId: string) => {
    setSelectedInputId(deviceId)
    localStorage.setItem('organon_selected_mic_id', deviceId)
  }

  const handleOutputDeviceChange = (deviceId: string) => {
    setSelectedOutputId(deviceId)
    localStorage.setItem('organon_selected_speaker_id', deviceId)
  }

  const handleMicGainChange = (newGain: number) => {
    setMicGain(newGain)
    localStorage.setItem('organon_mic_gain', String(newGain))
  }

  const handleToggleAutoGain = () => {
    setAutoGain(prev => {
      const next = !prev
      localStorage.setItem('organon_mic_auto_gain', String(next))
      return next
    })
  }

  // Testador de nível de áudio do microfone com multiplicador de Ganho
  useEffect(() => {
    if (!isTestingMic) return

    let audioContext: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let gainNode: GainNode | null = null
    let stream: MediaStream | null = null
    let animationFrameId: number

    const startMicTest = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: selectedInputId === 'default' ? undefined : { exact: selectedInputId },
            autoGainControl: autoGain,
            echoCancellation: true,
            noiseSuppression: true,
          },
        })

        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        analyser = audioContext.createAnalyser()
        gainNode = audioContext.createGain()
        
        // Aplica o fator de ganho (ex: 150% = 1.5x, 300% = 3.0x)
        gainNode.gain.value = micGain / 100

        analyser.fftSize = 256

        const source = audioContext.createMediaStreamSource(stream)
        source.connect(gainNode)
        gainNode.connect(analyser)

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const updateLevel = () => {
          analyser!.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const average = sum / dataArray.length
          setMicVolumeLevel(Math.min(100, Math.round((average / 128) * 100)))
          animationFrameId = requestAnimationFrame(updateLevel)
        }

        updateLevel()
      } catch (err) {
        console.warn('[AudioSettings] Não foi possível testar o microfone:', err)
        setIsTestingMic(false)
      }
    }

    startMicTest()

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (stream) stream.getTracks().forEach(t => t.stop())
      if (audioContext) audioContext.close()
      setMicVolumeLevel(0)
    }
  }, [isTestingMic, selectedInputId, micGain, autoGain])

  // Testar som nos fones de ouvido
  const handleTestSpeaker = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, audioCtx.currentTime) // Nota Lá (440Hz)

      gain.gain.setValueAtTime(0.1, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8)

      osc.connect(gain)
      gain.connect(audioCtx.destination)

      // Definir dispositivo de saída se suportado pelo navegador
      if ((audioCtx as any).setSinkId && selectedOutputId !== 'default') {
        ;(audioCtx as any).setSinkId(selectedOutputId)
      }

      osc.start()
      osc.stop(audioCtx.currentTime + 0.8)
    } catch (err) {
      console.warn('[AudioSettings] Erro ao tocar som de teste:', err)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '720px', color: 'var(--color-text)' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
          Áudio & Dispositivos Conectados
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
          Configure a sensibilidade do microfone, ganho de voz e saída nos fones de ouvido para o Whisper e ditado.
        </p>
      </div>

      {/* BLOCO 1: MICROFONE (ENTRADA & GANHO DE SENSIBILIDADE) */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Microfone de Entrada</h3>
        </div>

        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>
          DISPOSITIVO DE CAPTURA
        </label>
        <select
          value={selectedInputId}
          onChange={e => handleInputDeviceChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '13px',
            marginBottom: '18px',
          }}
        >
          <option value="default">Microfone Padrão do Sistema</option>
          {audioInputs.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microfone (${device.deviceId.slice(0, 8)}...)`}
            </option>
          ))}
        </select>

        {/* SLIDER DE SENSIBILIDADE / GANHO DE VOZ */}
        <div style={{ marginBottom: '18px', background: 'var(--color-background)', padding: '14px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text)' }}>
              SENSIBILIDADE / GANHO DO MICROFONE
            </label>
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--color-primary)' }}>
              {micGain}% ({micGain > 100 ? `+${micGain - 100}% de impulso` : 'Padrão'})
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="300"
            step="5"
            value={micGain}
            onChange={e => handleMicGainChange(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: 'var(--color-primary)',
              cursor: 'pointer',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            <span>50% (Sutil / Ambiente barulhento)</span>
            <span>100% (Normal)</span>
            <span>300% (Ultra Sensível / Voz Baixa)</span>
          </div>
        </div>

        {/* Auto Gain Control */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>Controle Automático de Ganho (AGC)</span>
            <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>Nivela automaticamente vozes distantes ou sussurros</span>
          </div>
          <input
            type="checkbox"
            checked={autoGain}
            onChange={handleToggleAutoGain}
            style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
          />
        </div>

        {/* Nível do Microfone */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            TESTE EM TEMPO REAL
          </span>
          <button
            type="button"
            onClick={() => setIsTestingMic(prev => !prev)}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: isTestingMic ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'var(--color-background)',
              color: isTestingMic ? 'var(--color-primary)' : 'var(--color-text)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isTestingMic ? 'Parar Teste' : 'Testar Sensibilidade'}
          </button>
        </div>

        <div
          style={{
            height: '10px',
            width: '100%',
            background: 'var(--color-background)',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${micVolumeLevel}%`,
              background: micVolumeLevel > 85 ? '#ef4444' : micVolumeLevel > 50 ? '#f59e0b' : '#22c55e',
              transition: 'width 0.05s ease-out',
            }}
          />
        </div>
      </div>

      {/* BLOCO 2: FONES DE OUVIDO / SAÍDA DE ÁUDIO */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Fones de Ouvido & Saída de Áudio</h3>
        </div>

        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>
          DISPOSITIVO DE SAÍDA DE REPRODUÇÃO
        </label>
        <select
          value={selectedOutputId}
          onChange={e => handleOutputDeviceChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          <option value="default">Alto-falante / Fone Padrão do Sistema</option>
          {audioOutputs.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Fone/Alto-falante (${device.deviceId.slice(0, 8)}...)`}
            </option>
          ))}
        </select>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleTestSpeaker}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
            Tocar Som de Teste
          </button>
        </div>
      </div>
    </div>
  )
}
