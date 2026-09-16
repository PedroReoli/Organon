import { WhisperModelSettings } from './WhisperModelSettings'
import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import {
  ReportPromptConfig,
  loadPromptConfig,
  savePromptConfig,
  PRESET_PROMPTS,
  PresetType,
} from '../../../services/transcriptReportService'
import {
  WhisperServiceConfig,
  loadWhisperConfig,
  saveWhisperConfig,
} from '../../../services/whisperService'

interface Props {
  isOpen?: boolean
  onClose: () => void
}

type MainRoute = 'local' | 'cloud' | 'reports'

export const TranscriptPromptSettingsModal: React.FC<Props> = ({ isOpen = true, onClose }) => {
  const [mainRoute, setMainRoute] = useState<MainRoute>('local')
  const [config, setConfig] = useState<ReportPromptConfig>(loadPromptConfig())
  const [whisperCfg, setWhisperCfg] = useState<WhisperServiceConfig>(loadWhisperConfig())
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setConfig(loadPromptConfig())
      setWhisperCfg(loadWhisperConfig())
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    savePromptConfig(config)
    saveWhisperConfig(whisperCfg)
    onClose()
  }

  const handlePresetChange = (preset: PresetType) => {
    const prompt = PRESET_PROMPTS[preset] || config.customPrompt
    setConfig(prev => ({ ...prev, preset, customPrompt: prompt }))
  }

  const reportPresets: { id: PresetType; label: string }[] = [
    { id: 'meeting', label: 'Reunião' },
    { id: 'executive', label: 'Ata Executiva' },
    { id: 'interview', label: 'Entrevista' },
    { id: 'study', label: 'Estudo' },
    { id: 'brainstorm', label: 'Brainstorm' },
    { id: 'quick', label: 'Resumo Rápido' },
    { id: 'action', label: 'Ação & Prazos' },
    { id: 'custom', label: 'Customizado' },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '560px',
          maxWidth: '92vw',
          maxHeight: '78vh',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--color-text)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Header Compacto (Sem Emojis) */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text)' }}>
              Configurações do Whisper
            </span>
          </div>

          <button
            onClick={onClose}
            title="Fechar"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '2px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Seletor de Rota Principal (Local vs Cloud vs Relatórios) */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', padding: '0 8px' }}>
          {[
            { id: 'local', label: 'Motor Local (Offline)', icon: (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
              </svg>
            )},
            { id: 'cloud', label: 'Motor Cloud (Nuvem)', icon: (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              </svg>
            )},
            { id: 'reports', label: 'Presets de Relatório', icon: (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              </svg>
            )},
          ].map(r => {
            const active = mainRoute === r.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setMainRoute(r.id as MainRoute)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  fontSize: '11.5px',
                  fontWeight: active ? 700 : 600,
                  border: 'none',
                  background: active ? 'var(--color-background)' : 'transparent',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.icon}
                <span>{r.label}</span>
              </button>
            )
          })}
        </div>

        {/* Conteúdo da Rota */}
        <div style={{ padding: '14px 16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <label style={{ fontSize: 12 }}>
            <input type="checkbox" checked={!!whisperCfg.cleanupDictation} onChange={event => setWhisperCfg({ ...whisperCfg, cleanupDictation: event.target.checked })} /> Limpar pausas e palavras repetidas no ditado
          </label>
          {/* ROTA 1: MOTOR LOCAL */}
          {mainRoute === 'local' && <WhisperModelSettings config={whisperCfg} onChange={setWhisperCfg} />}

          {/* ROTA 2: MOTOR CLOUD */}
          {mainRoute === 'cloud' && (
            <>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
                Provedores em nuvem para transcrição e análise ultrarrápida:
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-background)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'groq', label: 'Groq Whisper (Ultrarrápido)' },
                    { id: 'openai', label: 'OpenAI Whisper-1' },
                  ].map(provider => (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => setWhisperCfg({
                        ...whisperCfg,
                        provider: provider.id as any,
                        model: provider.id === 'openai' ? 'whisper-1' : 'whisper-large-v3-turbo',
                      })}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${whisperCfg.provider === provider.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: whisperCfg.provider === provider.id ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'var(--color-surface)',
                        color: whisperCfg.provider === provider.id ? 'var(--color-primary)' : 'var(--color-text)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {provider.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    {whisperCfg.provider === 'groq' ? 'Groq API Key' : 'OpenAI API Key'}
                  </label>
                  <input
                    type="password"
                    placeholder={whisperCfg.provider === 'groq' ? 'gsk_...' : 'sk-...'}
                    value={whisperCfg.provider === 'groq' ? (whisperCfg.groqApiKey || '') : (whisperCfg.openaiApiKey || '')}
                    onChange={e => {
                      if (whisperCfg.provider === 'groq') {
                        setWhisperCfg({ ...whisperCfg, groqApiKey: e.target.value })
                      } else {
                        setWhisperCfg({ ...whisperCfg, openaiApiKey: e.target.value })
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontSize: '11.5px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* ROTA 3: PRESETS DE RELATÓRIO */}
          {mainRoute === 'reports' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                  Preset Padrão de Análise
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px', marginBottom: '8px' }}>
                  {reportPresets.map(p => {
                    const isSelected = config.preset === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePresetChange(p.id)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          background: isSelected ? 'color-mix(in srgb, var(--color-primary) 14%, transparent)' : 'var(--color-background)',
                          color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Instrução do Prompt de Relatório
                </label>
                <textarea
                  rows={3}
                  value={config.customPrompt}
                  onChange={e => setConfig({ ...config, customPrompt: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              </div>
            </>
          )}

          {/* Acordeão Avançado Recolhível */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '6px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                fontSize: '10.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{ transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span>Opções Avançadas (Endpoint & Modelo)</span>
            </button>

            {showAdvanced && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginTop: '6px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '3px' }}>
                    Endpoint HTTP Local
                  </label>
                  <input
                    type="text"
                    placeholder="http://localhost:8080/v1/audio/transcriptions"
                    value={whisperCfg.customEndpoint || ''}
                    onChange={e => setWhisperCfg({ ...whisperCfg, customEndpoint: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                      fontSize: '10.5px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '3px' }}>
                    ID do Modelo LLM
                  </label>
                  <input
                    type="text"
                    placeholder="llama3.2:1b"
                    value={config.model}
                    onChange={e => setConfig({ ...config, model: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                      fontSize: '10.5px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé Fixo */}
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
            background: 'var(--color-surface)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '4px 10px',
              height: '26px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '4px 12px',
              height: '26px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--color-primary)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
