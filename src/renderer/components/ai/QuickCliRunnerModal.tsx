import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Terminal,
  PaperPlaneRight,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react'
import { isElectron } from '@utils'

interface QuickCliRunnerModalProps {
  isOpen: boolean
  onClose: () => void
}

const PRESET_COMMANDS = [
  { label: 'Diagnóstico', cmd: 'doctor', desc: 'Verifica saúde e storage do Organon' },
  { label: 'Listar Notas', cmd: 'note list', desc: 'Lista notas ativas' },
  { label: 'Status Geral', cmd: 'status', desc: 'Resumo de tarefas, notas e hábitos' },
  { label: 'Sincronizar', cmd: 'sync', desc: 'Força atualização de ponte IPC' },
  { label: 'Nova Tarefa', cmd: 'task add "Minha Tarefa" --priority high', desc: 'Adiciona card no Planejamento' },
  { label: 'Nova Nota', cmd: 'note new "Minha Nota" --folder "Geral"', desc: 'Cria nota em Markdown' },
]

export const QuickCliRunnerModal: React.FC<QuickCliRunnerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [command, setCommand] = useState('')
  const [output, setOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleRun = async (cmdToRun?: string) => {
    const finalCmd = (cmdToRun || command).trim()
    if (!finalCmd) return

    setIsLoading(true)
    setOutput(null)
    setError(null)

    try {
      if (isElectron() && window.electronAPI?.executeCliCommand) {
        const res = await window.electronAPI.executeCliCommand(finalCmd)
        if (res.success) {
          setOutput(res.output || 'Comando executado com sucesso.')
        } else {
          setError(res.error || res.output || 'Erro ao executar comando.')
        }
      } else {
        setError('CLI Runner disponível apenas no ambiente desktop Organon.')
      }
    } catch (err: any) {
      setError(err?.message || 'Falha na execução.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRun()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          backgroundColor: 'var(--color-surface, #181825)',
          borderRadius: 16,
          border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'zoomIn 0.15s ease',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                padding: 6,
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
              }}
            >
              <Terminal size={16} weight="bold" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>
                Organon Quick CLI Runner
              </h3>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted, #a1a1aa)' }}>
                Execute comandos da CLI e automações diretamente
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted, #a1a1aa)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
            }}
            className="hover:text-white"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Input Bar */}
        <div style={{ padding: '16px 18px 12px', display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                color: 'var(--color-primary, #818cf8)',
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              organon &gt;
            </span>
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="doctor, task add '...', note list, sync..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 92px',
                borderRadius: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--color-border, rgba(255,255,255,0.15))',
                color: '#fff',
                fontSize: 13,
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => handleRun()}
            disabled={isLoading || !command.trim()}
            style={{
              padding: '0 16px',
              borderRadius: 10,
              backgroundColor: 'var(--color-primary, #6366f1)',
              border: 'none',
              color: '#fff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: isLoading || !command.trim() ? 'not-allowed' : 'pointer',
              opacity: isLoading || !command.trim() ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            className="hover:brightness-110"
          >
            {isLoading ? (
              <ArrowsClockwise size={15} className="animate-spin" />
            ) : (
              <PaperPlaneRight size={15} weight="bold" />
            )}
            <span>Executar</span>
          </button>
        </div>

        {/* Presets Chips */}
        <div style={{ padding: '0 18px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRESET_COMMANDS.map((preset) => (
            <button
              key={preset.cmd}
              type="button"
              onClick={() => {
                setCommand(preset.cmd)
                handleRun(preset.cmd)
              }}
              title={preset.desc}
              style={{
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--color-text-muted, #d4d4d8)',
                cursor: 'pointer',
              }}
              className="hover:bg-white/10 hover:text-white"
            >
              <strong>{preset.label}</strong> ({preset.cmd})
            </button>
          ))}
        </div>

        {/* Console Output Area */}
        {(output || error || isLoading) && (
          <div
            style={{
              borderTop: '1px solid var(--color-border, rgba(255,255,255,0.08))',
              padding: 16,
              backgroundColor: 'rgba(0,0,0,0.4)',
              maxHeight: 280,
              overflowY: 'auto',
            }}
            className="custom-scrollbar"
          >
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary, #818cf8)', fontSize: 12 }}>
                <ArrowsClockwise size={14} className="animate-spin" />
                <span>Processando comando na CLI...</span>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#f87171', fontSize: 12 }}>
                <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{error}</pre>
              </div>
            )}

            {output && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#34d399', fontSize: 12 }}>
                <CheckCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: '#e4e4e7' }}>{output}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
