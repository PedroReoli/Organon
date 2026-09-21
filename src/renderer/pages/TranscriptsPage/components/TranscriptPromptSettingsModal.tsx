import { WhisperModelSettings } from './WhisperModelSettings'
import React, { useState, useEffect } from 'react'
import {
  X,
  HardDrive,
  Cloud,
  FileText,
  Zap,
  ChevronDown,
  Check,
  KeyRound,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react'
import {
  ReportPromptConfig,
  loadPromptConfig,
  savePromptConfig,
  PRESET_PROMPTS,
  PresetType,
  LIGHTWEIGHT_LOCAL_MODELS,
} from '../../../services/transcriptReportService'
import {
  WhisperServiceConfig,
  loadWhisperConfig,
  saveWhisperConfig,
  WhisperTranscriptionProfile,
  WHISPER_TRANSCRIPTION_PROFILES,
} from '../../../services/whisperService'
import '../../../styles/features/whisper/whisper-settings-modal.css'

interface Props {
  isOpen?: boolean
  onClose: () => void
}

type MainRoute = 'local' | 'cloud' | 'reports' | 'performance'

export const TranscriptPromptSettingsModal: React.FC<Props> = ({ isOpen = true, onClose }) => {
  const [mainRoute, setMainRoute] = useState<MainRoute>('local')
  const [config, setConfig] = useState<ReportPromptConfig>(loadPromptConfig())
  const [whisperCfg, setWhisperCfg] = useState<WhisperServiceConfig>(loadWhisperConfig())
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isCustomModel, setIsCustomModel] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const loadedPrompt = loadPromptConfig()
      const loadedWhisper = loadWhisperConfig()
      setConfig(loadedPrompt)
      setWhisperCfg(loadedWhisper)
      setIsCustomModel(!LIGHTWEIGHT_LOCAL_MODELS.some((m) => m.id === loadedPrompt.model))
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
    setConfig((prev) => ({ ...prev, preset, customPrompt: prompt }))
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
    <div className="wsm-backdrop" onClick={onClose}>
      <div className="wsm-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header do Modal */}
        <div className="wsm-header">
          <div className="wsm-header-title-box">
            <div className="wsm-header-icon">
              <SlidersHorizontal size={17} />
            </div>
            <div>
              <h2 className="wsm-title">Configurações do Whisper</h2>
              <div className="wsm-subtitle">
                Modelos de transcrição, provedores em nuvem e prompts de síntese
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Fechar (Esc)"
            className="wsm-close-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="wsm-tabs-bar">
          {[
            { id: 'local', label: 'Motor Local (Offline)', icon: <HardDrive size={13} /> },
            { id: 'cloud', label: 'Motor Cloud (Nuvem)', icon: <Cloud size={13} /> },
            { id: 'reports', label: 'Relatórios & IA', icon: <FileText size={13} /> },
            { id: 'performance', label: 'Perfis & Áudio', icon: <Zap size={13} /> },
          ].map((r) => {
            const active = mainRoute === r.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setMainRoute(r.id as MainRoute)}
                className={`wsm-tab-btn ${active ? 'active' : ''}`}
              >
                {r.icon}
                <span>{r.label}</span>
              </button>
            )
          })}
        </div>

        {/* Corpo do Conteúdo */}
        <div className="wsm-body">
          {/* ROTA 1: MOTOR LOCAL (OFFLINE) */}
          {mainRoute === 'local' && (
            <WhisperModelSettings config={whisperCfg} onChange={setWhisperCfg} />
          )}

          {/* ROTA 2: MOTOR CLOUD (NUVEM) */}
          {mainRoute === 'cloud' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="wsm-label">Provedor Cloud de Transcrição</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'groq', name: 'Groq Whisper', desc: 'Transcrição ultrarrápida via nuvem' },
                    { id: 'openai', name: 'OpenAI Whisper-1', desc: 'Modelo oficial hospedado na OpenAI' },
                  ].map((prov) => {
                    const isSelected = whisperCfg.provider === prov.id
                    return (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() =>
                          setWhisperCfg({
                            ...whisperCfg,
                            provider: prov.id as any,
                            model:
                              prov.id === 'openai'
                                ? 'whisper-1'
                                : 'whisper-large-v3-turbo',
                          })
                        }
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          background: isSelected
                            ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))'
                            : 'var(--color-background)',
                          color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.16s ease',
                        }}
                      >
                        <div style={{ fontSize: '12.5px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>{prov.name}</span>
                          {isSelected && <Check size={13} />}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {prov.desc}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Select do Modelo Cloud */}
              <div>
                <label className="wsm-label">
                  Modelo em Nuvem Selecionado
                  <span className="wsm-label-hint">
                    ({whisperCfg.provider === 'groq' ? 'Groq Cloud' : 'OpenAI Cloud'})
                  </span>
                </label>
                <div className="wsm-select-container">
                  <select
                    className="wsm-select"
                    value={
                      whisperCfg.model ||
                      (whisperCfg.provider === 'openai'
                        ? 'whisper-1'
                        : 'whisper-large-v3-turbo')
                    }
                    onChange={(e) =>
                      setWhisperCfg({ ...whisperCfg, model: e.target.value })
                    }
                  >
                    {whisperCfg.provider === 'groq' ? (
                      <>
                        <option value="whisper-large-v3-turbo">
                          whisper-large-v3-turbo (Ultrarrápido / Recomendado)
                        </option>
                        <option value="whisper-large-v3">
                          whisper-large-v3 (Alta Precisão)
                        </option>
                        <option value="distil-whisper-large-v3-en">
                          distil-whisper-large-v3-en (Inglês Otimizado)
                        </option>
                      </>
                    ) : (
                      <option value="whisper-1">whisper-1 (Original OpenAI)</option>
                    )}
                  </select>
                  <ChevronDown size={14} className="wsm-select-arrow" />
                </div>
              </div>

              {/* API Key Input */}
              <div>
                <label className="wsm-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <KeyRound size={12} style={{ color: 'var(--color-primary)' }} />
                  <span>
                    Chave de API {whisperCfg.provider === 'groq' ? 'Groq (gsk_...)' : 'OpenAI (sk-...)'}
                  </span>
                </label>
                <input
                  type="password"
                  placeholder={whisperCfg.provider === 'groq' ? 'gsk_xxxxxxxxxxxxxxxx' : 'sk-xxxxxxxxxxxxxxxx'}
                  value={
                    whisperCfg.provider === 'groq'
                      ? whisperCfg.groqApiKey || ''
                      : whisperCfg.openaiApiKey || ''
                  }
                  onChange={(e) => {
                    if (whisperCfg.provider === 'groq') {
                      setWhisperCfg({ ...whisperCfg, groqApiKey: e.target.value })
                    } else {
                      setWhisperCfg({ ...whisperCfg, openaiApiKey: e.target.value })
                    }
                  }}
                  className="wsm-input"
                />
                <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                  Sua chave é armazenada de forma segura e local nas preferências do Organon.
                </span>
              </div>
            </div>
          )}

          {/* ROTA 3: PRESETS DE RELATÓRIO & IA */}
          {mainRoute === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="wsm-label">Preset Padrão de Análise</label>
                <div className="wsm-preset-grid">
                  {reportPresets.map((p) => {
                    const isSelected = config.preset === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePresetChange(p.id)}
                        className={`wsm-preset-btn ${isSelected ? 'active' : ''}`}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Select do Modelo LLM para Síntese */}
              <div>
                <label className="wsm-label">
                  Modelo LLM para Geração de Relatórios e Atas
                </label>
                <div className="wsm-select-container">
                  <select
                    className="wsm-select"
                    value={isCustomModel ? 'custom' : config.model}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomModel(true)
                      } else {
                        setIsCustomModel(false)
                        setConfig({ ...config, model: e.target.value })
                      }
                    }}
                  >
                    {LIGHTWEIGHT_LOCAL_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                    <option value="custom">Outro Modelo (Digitar identificador)...</option>
                  </select>
                  <ChevronDown size={14} className="wsm-select-arrow" />
                </div>

                {isCustomModel && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder="Ex.: llama3.2:1b, mistral:7b, gpt-4o-mini"
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      className="wsm-input"
                    />
                  </div>
                )}
              </div>

              {/* Prompt Customizado */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <label className="wsm-label" style={{ margin: 0 }}>
                    Instrução do Prompt de Relatório
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultPrompt = PRESET_PROMPTS[config.preset]
                      if (defaultPrompt) setConfig({ ...config, customPrompt: defaultPrompt })
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                    title="Restaurar prompt padrão do preset atual"
                  >
                    <RotateCcw size={11} />
                    <span>Restaurar Padrão</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={config.customPrompt}
                  onChange={(e) => setConfig({ ...config, customPrompt: e.target.value })}
                  className="wsm-textarea"
                />
              </div>
            </div>
          )}

          {/* ROTA 4: PERFIS DE PERFORMANCE & ÁUDIO */}
          {mainRoute === 'performance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="wsm-label">Perfil de Desempenho da Transcrição</label>
                <div className="wsm-select-container">
                  <select
                    className="wsm-select"
                    value={whisperCfg.transcriptionProfile || 'equilibrado'}
                    onChange={(e) =>
                      setWhisperCfg({
                        ...whisperCfg,
                        transcriptionProfile: e.target.value as WhisperTranscriptionProfile,
                      })
                    }
                  >
                    <option value="equilibrado">
                      Equilibrado (Recomendado — chunk de 90ms, resposta rápida)
                    </option>
                    <option value="pc-fraco">
                      Econômico / PC Fraco (Chunk de 140ms, menor uso de CPU)
                    </option>
                    <option value="openwhisper">
                      OpenWhisper (Máxima fidelidade para transcrições longas)
                    </option>
                  </select>
                  <ChevronDown size={14} className="wsm-select-arrow" />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                  {WHISPER_TRANSCRIPTION_PROFILES[whisperCfg.transcriptionProfile || 'equilibrado']?.description}
                </span>
              </div>

              {/* Checkbox de Limpeza de Ditado */}
              <div className="wsm-card">
                <label className="wsm-check-row">
                  <input
                    type="checkbox"
                    checked={!!whisperCfg.cleanupDictation}
                    onChange={(e) =>
                      setWhisperCfg({ ...whisperCfg, cleanupDictation: e.target.checked })
                    }
                    style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ fontSize: '12px' }}>Limpar pausas e palavras repetidas no ditado</strong>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      Remove gagueiras, "humm", "éé" e silêncios automaticamente da transcrição final.
                    </div>
                  </div>
                </label>
              </div>

              {/* Endpoint Customizado */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: 0,
                  }}
                >
                  <ChevronDown
                    size={14}
                    style={{
                      transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.18s ease',
                    }}
                  />
                  <span>Endpoint HTTP do Servidor Whisper Local</span>
                </button>

                {showAdvanced && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder="http://localhost:8080/v1/audio/transcriptions"
                      value={whisperCfg.customEndpoint || ''}
                      onChange={(e) =>
                        setWhisperCfg({ ...whisperCfg, customEndpoint: e.target.value })
                      }
                      className="wsm-input"
                    />
                    <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                      Útil para conectar ao whisper.cpp ou local-ai em containers Docker locais.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Fixo com Ações */}
        <div className="wsm-footer">
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Pressione <strong>Esc</strong> para fechar
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="wsm-btn-secondary"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="wsm-btn-primary"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
