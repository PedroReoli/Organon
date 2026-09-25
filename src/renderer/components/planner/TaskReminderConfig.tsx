import React, { useState } from 'react'
import type { CardReminder, ReminderMode, ReminderSound } from '../../types/domain/planner.types'
import {
  Bell,
  Clock,
  Repeat,
  Volume2,
  Calendar,
  AlertCircle,
  Play,
  Check,
  X
} from 'lucide-react'
import { playSound } from '../../utils/audioAlert'

interface TaskReminderConfigProps {
  reminder: CardReminder | null | undefined
  onChange: (reminder: CardReminder | null) => void
  taskDate?: string | null
  taskTime?: string | null
}

const SOUND_OPTIONS: { id: ReminderSound; label: string; icon: string }[] = [
  { id: 'bell', label: 'Sino Harmônico', icon: '🔔' },
  { id: 'alarm', label: 'Alarme Insistente', icon: '🚨' },
  { id: 'digital', label: 'Beep Digital', icon: '⏰' },
  { id: 'chime', label: 'Chime Suave', icon: '✨' },
  { id: 'gentle', label: 'Tom Sereno', icon: '🎵' },
  { id: 'none', label: 'Silencioso', icon: '🔕' },
]

export const TaskReminderConfig: React.FC<TaskReminderConfigProps> = ({
  reminder,
  onChange,
  taskDate,
  taskTime
}) => {
  const isEnabled = !!(reminder && reminder.enabled)

  const [mode, setMode] = useState<ReminderMode>(reminder?.mode || 'interval')
  const [intervalMinutes, setIntervalMinutes] = useState<number>(reminder?.intervalMinutes || 10)
  const [offsetMinutes, setOffsetMinutes] = useState<number>(reminder?.offsetMinutes || 15)
  const [relativeMinutes, setRelativeMinutes] = useState<number>(30)
  const [exactDate, setExactDate] = useState<string>(
    reminder?.triggerAt ? reminder.triggerAt.slice(0, 10) : (taskDate || new Date().toISOString().slice(0, 10))
  )
  const [exactTime, setExactTime] = useState<string>(
    reminder?.triggerAt ? reminder.triggerAt.slice(11, 16) : (taskTime || '12:00')
  )
  const [repeatUntilDone, setRepeatUntilDone] = useState<boolean>(reminder?.repeatUntilDone ?? true)
  const [sound, setSound] = useState<ReminderSound>(reminder?.sound || 'bell')
  const [nativeToast, setNativeToast] = useState<boolean>(reminder?.nativeToast ?? true)
  const [alertType, setAlertType] = useState<'alarm' | 'toast'>(reminder?.alertType || 'alarm')

  // Helper para salvar e disparar onChange
  const applyReminder = (updates: Partial<CardReminder>) => {
    let nextTriggerAt: string | null = null
    const now = Date.now()

    const curMode = updates.mode || mode
    const curInterval = updates.intervalMinutes !== undefined ? updates.intervalMinutes : intervalMinutes

    if (curMode === 'interval') {
      nextTriggerAt = new Date(now + curInterval * 60 * 1000).toISOString()
    } else if (curMode === 'relative') {
      nextTriggerAt = new Date(now + relativeMinutes * 60 * 1000).toISOString()
    } else if (curMode === 'exact') {
      nextTriggerAt = new Date(`${exactDate}T${exactTime}:00`).toISOString()
    } else if (curMode === 'before' && taskTime) {
      const d = taskDate || new Date().toISOString().slice(0, 10)
      const evMs = new Date(`${d}T${taskTime}:00`).getTime()
      nextTriggerAt = new Date(evMs - (updates.offsetMinutes || offsetMinutes) * 60 * 1000).toISOString()
    } else {
      nextTriggerAt = new Date(now + 15 * 60 * 1000).toISOString()
    }

    const nextReminder: CardReminder = {
      enabled: true,
      mode: curMode,
      triggerAt: nextTriggerAt,
      offsetMinutes: updates.offsetMinutes !== undefined ? updates.offsetMinutes : offsetMinutes,
      intervalMinutes: curInterval,
      repeatUntilDone: updates.repeatUntilDone !== undefined ? updates.repeatUntilDone : repeatUntilDone,
      sound: updates.sound || sound,
      nativeToast: updates.nativeToast !== undefined ? updates.nativeToast : nativeToast,
      alertType: updates.alertType || alertType,
      hasFired: false,
      fireCount: 0,
      createdAt: new Date().toISOString(),
      ...updates
    }

    onChange(nextReminder)
  }

  // Presets Rápidos
  const handleQuickPreset = (presetType: '10m_recurring' | '15m_recurring' | '30m_recurring' | '1h_recurring' | '10m_once' | '30m_once' | 'task_time') => {
    if (presetType === '10m_recurring') {
      setMode('interval')
      setIntervalMinutes(10)
      setRepeatUntilDone(true)
      applyReminder({ mode: 'interval', intervalMinutes: 10, repeatUntilDone: true })
    } else if (presetType === '15m_recurring') {
      setMode('interval')
      setIntervalMinutes(15)
      setRepeatUntilDone(true)
      applyReminder({ mode: 'interval', intervalMinutes: 15, repeatUntilDone: true })
    } else if (presetType === '30m_recurring') {
      setMode('interval')
      setIntervalMinutes(30)
      setRepeatUntilDone(true)
      applyReminder({ mode: 'interval', intervalMinutes: 30, repeatUntilDone: true })
    } else if (presetType === '1h_recurring') {
      setMode('interval')
      setIntervalMinutes(60)
      setRepeatUntilDone(true)
      applyReminder({ mode: 'interval', intervalMinutes: 60, repeatUntilDone: true })
    } else if (presetType === '10m_once') {
      setMode('relative')
      setRelativeMinutes(10)
      setRepeatUntilDone(false)
      applyReminder({ mode: 'relative', repeatUntilDone: false, intervalMinutes: 10 })
    } else if (presetType === '30m_once') {
      setMode('relative')
      setRelativeMinutes(30)
      setRepeatUntilDone(false)
      applyReminder({ mode: 'relative', repeatUntilDone: false, intervalMinutes: 30 })
    } else if (presetType === 'task_time') {
      setMode('before')
      setOffsetMinutes(0)
      setRepeatUntilDone(false)
      applyReminder({ mode: 'before', offsetMinutes: 0, repeatUntilDone: false })
    }
  }

  const handleToggleEnable = () => {
    if (isEnabled) {
      onChange(null)
    } else {
      applyReminder({ enabled: true })
    }
  }

  return (
    <div
      style={{
        background: 'var(--color-surface, rgba(255, 255, 255, 0.03))',
        border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      {/* Header do Lembrete com Switch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: isEnabled ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              color: isEnabled ? '#ef4444' : 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <Bell size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text)' }}>
              Lembretes & Alarmes de Planejamento
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
              {isEnabled
                ? (reminder?.repeatUntilDone
                    ? `Ativo: Repetindo a cada ${reminder.intervalMinutes || 10} min até concluir`
                    : 'Ativo: Alarme pontual programado')
                : 'Configure alarmes com som e notificações no Windows'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleEnable}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            background: isEnabled ? '#ef4444' : 'rgba(255, 255, 255, 0.08)',
            color: '#fff',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s'
          }}
        >
          {isEnabled ? <Check size={14} /> : <Bell size={14} />}
          {isEnabled ? 'Ativado' : 'Ativar Lembrete'}
        </button>
      </div>

      {/* Presets Rápidos de Usabilidade */}
      <div>
        <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          ⚡ Presets Rápidos de 1 Clique:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
          <button
            type="button"
            onClick={() => handleQuickPreset('10m_recurring')}
            style={{
              padding: '7px 8px',
              borderRadius: '8px',
              background: isEnabled && reminder?.mode === 'interval' && reminder?.intervalMinutes === 10 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${isEnabled && reminder?.mode === 'interval' && reminder?.intervalMinutes === 10 ? '#ef4444' : 'rgba(255, 255, 255, 0.08)'}`,
              color: 'var(--color-text)',
              fontSize: '11.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <Repeat size={12} color="#ef4444" />
            10 em 10 min
          </button>

          <button
            type="button"
            onClick={() => handleQuickPreset('15m_recurring')}
            style={{
              padding: '7px 8px',
              borderRadius: '8px',
              background: isEnabled && reminder?.mode === 'interval' && reminder?.intervalMinutes === 15 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${isEnabled && reminder?.mode === 'interval' && reminder?.intervalMinutes === 15 ? '#ef4444' : 'rgba(255, 255, 255, 0.08)'}`,
              color: 'var(--color-text)',
              fontSize: '11.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <Repeat size={12} color="#f97316" />
            15 em 15 min
          </button>

          <button
            type="button"
            onClick={() => handleQuickPreset('30m_recurring')}
            style={{
              padding: '7px 8px',
              borderRadius: '8px',
              background: isEnabled && reminder?.mode === 'interval' && reminder?.intervalMinutes === 30 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${isEnabled && reminder?.mode === 'interval' && reminder?.intervalMinutes === 30 ? '#ef4444' : 'rgba(255, 255, 255, 0.08)'}`,
              color: 'var(--color-text)',
              fontSize: '11.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <Repeat size={12} color="#eab308" />
            30 em 30 min
          </button>

          <button
            type="button"
            onClick={() => handleQuickPreset('10m_once')}
            style={{
              padding: '7px 8px',
              borderRadius: '8px',
              background: isEnabled && reminder?.mode === 'relative' && relativeMinutes === 10 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${isEnabled && reminder?.mode === 'relative' && relativeMinutes === 10 ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'}`,
              color: 'var(--color-text)',
              fontSize: '11.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px'
            }}
          >
            <Clock size={12} color="#3b82f6" />
            Daqui a 10 min
          </button>

          {taskTime && (
            <button
              type="button"
              onClick={() => handleQuickPreset('task_time')}
              style={{
                padding: '7px 8px',
                borderRadius: '8px',
                background: isEnabled && reminder?.mode === 'before' && offsetMinutes === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${isEnabled && reminder?.mode === 'before' && offsetMinutes === 0 ? '#10b981' : 'rgba(255, 255, 255, 0.08)'}`,
                color: 'var(--color-text)',
                fontSize: '11.5px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px'
              }}
            >
              <Bell size={12} color="#10b981" />
              No Horário ({taskTime})
            </button>
          )}
        </div>
      </div>

      {/* Configurações Customizadas Avançadas */}
      {isEnabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px' }}>
          {/* Seletor de Modo */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px', display: 'block' }}>
              Tipo de Disparo:
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'interval', label: '🔁 De tempo em tempo' },
                { id: 'exact', label: '📅 Hora Fixa' },
                { id: 'relative', label: '⏱️ Contagem' },
                ...(taskTime ? [{ id: 'before', label: '⏰ Antecedência' }] : [])
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMode(m.id as ReminderMode)
                    applyReminder({ mode: m.id as ReminderMode })
                  }}
                  style={{
                    flex: 1,
                    padding: '7px 4px',
                    borderRadius: '7px',
                    background: mode === m.id ? 'var(--color-primary, #6366f1)' : 'rgba(255, 255, 255, 0.04)',
                    color: mode === m.id ? '#fff' : 'var(--color-text-muted)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Opções de Intervalo Recorrente */}
          {mode === 'interval' && (
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--color-text)' }}>Repetir a cada:</span>
                <select
                  value={intervalMinutes}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10)
                    setIntervalMinutes(val)
                    applyReminder({ intervalMinutes: val })
                  }}
                  style={{
                    background: 'var(--color-surface-secondary, #252836)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '12.5px'
                  }}
                >
                  <option value={5}>5 minutos</option>
                  <option value={10}>10 minutos</option>
                  <option value={15}>15 minutos</option>
                  <option value={20}>20 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>1 hora (60 min)</option>
                  <option value={120}>2 horas (120 min)</option>
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#fbbf24' }}>
                <input
                  type="checkbox"
                  checked={repeatUntilDone}
                  onChange={e => {
                    setRepeatUntilDone(e.target.checked)
                    applyReminder({ repeatUntilDone: e.target.checked })
                  }}
                  style={{ accentColor: '#ef4444' }}
                />
                Lembrar várias vezes até eu marcar a tarefa como concluída
              </label>
            </div>
          )}

          {/* Opções de Hora Fixa */}
          {mode === 'exact' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="date"
                value={exactDate}
                onChange={e => {
                  setExactDate(e.target.value)
                  applyReminder({ triggerAt: `${e.target.value}T${exactTime}:00` })
                }}
                style={{
                  flex: 1,
                  background: 'var(--color-surface-secondary, #252836)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '12.5px'
                }}
              />
              <input
                type="time"
                value={exactTime}
                onChange={e => {
                  setExactTime(e.target.value)
                  applyReminder({ triggerAt: `${exactDate}T${e.target.value}:00` })
                }}
                style={{
                  width: '110px',
                  background: 'var(--color-surface-secondary, #252836)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '12.5px'
                }}
              />
            </div>
          )}

          {/* Opções de Som e Notificação */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Som de Alerta:</span>
                <button
                  type="button"
                  onClick={() => playSound(sound, 0.8)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-primary, #6366f1)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <Play size={10} /> Testar
                </button>
              </label>
              <select
                value={sound}
                onChange={e => {
                  const s = e.target.value as ReminderSound
                  setSound(s)
                  playSound(s, 0.8)
                  applyReminder({ sound: s })
                }}
                style={{
                  width: '100%',
                  background: 'var(--color-surface-secondary, #252836)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '12px'
                }}
              >
                {SOUND_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px', display: 'block' }}>
                Toast no Windows:
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text)', marginTop: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={nativeToast}
                  onChange={e => {
                    setNativeToast(e.target.checked)
                    applyReminder({ nativeToast: e.target.checked })
                  }}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Notificação Nativa OS
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
