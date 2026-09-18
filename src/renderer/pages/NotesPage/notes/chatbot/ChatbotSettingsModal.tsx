import React, { useState } from 'react'
import { Eye, EyeOff, Copy, Check, X } from 'lucide-react'
import { AiConfig, PROVIDER_PRESETS } from './chatbot.types'

interface ChatbotSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  config: AiConfig
  onSave: (config: AiConfig) => void
}

export const ChatbotSettingsModal: React.FC<ChatbotSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [localConfig, setLocalConfig] = useState<AiConfig>(config)
  const [showKey, setShowKey] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  if (!isOpen) return null

  const handleProviderChange = (provider: AiConfig['provider']) => {
    const preset = PROVIDER_PRESETS[provider]
    setLocalConfig(prev => ({
      ...prev,
      provider,
      baseUrl: preset ? preset.url : prev.baseUrl,
      model: preset ? preset.defaultModel : prev.model,
    }))
  }

  const handleCopy = () => {
    if (localConfig.apiKey) {
      navigator.clipboard.writeText(localConfig.apiKey)
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    }
  }

  const handleSave = () => {
    onSave(localConfig)
    onClose()
  }

  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--color-text)',
        }}
      >
        <span>Configurações de IA & API</span>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '2px',
          }}
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          Provedor de IA:
        </label>
        <select
          value={localConfig.provider}
          onChange={e => handleProviderChange(e.target.value as any)}
          style={{
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '12px',
          }}
        >
          {Object.entries(PROVIDER_PRESETS).map(([key, item]) => (
            <option key={key} value={key}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          Modelo:
        </label>
        <input
          type="text"
          value={localConfig.model}
          onChange={e => setLocalConfig(prev => ({ ...prev, model: e.target.value }))}
          placeholder="ex: openai/gpt-4o ou llama3"
          style={{
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '12px',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          Endpoint Base URL:
        </label>
        <input
          type="text"
          value={localConfig.baseUrl}
          onChange={e => setLocalConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
          style={{
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '12px',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          Chave de API (API Key):
        </label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={localConfig.apiKey}
            onChange={e => setLocalConfig(prev => ({ ...prev, apiKey: e.target.value }))}
            placeholder="sk-or-..."
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
              fontSize: '12px',
            }}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            style={{
              padding: '6px 10px',
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
            title={showKey ? 'Ocultar chave' : 'Mostrar chave'}
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!localConfig.apiKey}
            style={{
              padding: '6px 10px',
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text)',
              cursor: localConfig.apiKey ? 'pointer' : 'not-allowed',
            }}
            title="Copiar chave"
          >
            {copiedKey ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            color: 'var(--color-text-muted)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          style={{
            padding: '6px 14px',
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: '6px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Salvar Configurações
        </button>
      </div>
    </div>
  )
}
