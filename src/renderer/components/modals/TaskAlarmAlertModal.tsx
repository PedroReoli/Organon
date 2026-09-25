import React from 'react'
import type { ActiveTaskAlarm } from '../../pages/app/usePlanningTaskReminders'
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  Repeat,
  Volume2,
  X,
  Calendar,
  AlertTriangle,
  ArrowRight
} from 'lucide-react'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../types/domain/planner.types'

interface TaskAlarmAlertModalProps {
  alarm: ActiveTaskAlarm | null
  onDismiss: () => void
  onSnooze: (minutes: number) => void
  onComplete: () => void
}

export const TaskAlarmAlertModal: React.FC<TaskAlarmAlertModalProps> = ({
  alarm,
  onDismiss,
  onSnooze,
  onComplete,
}) => {
  if (!alarm) return null

  const { card, reminder, fireCount } = alarm
  const isRecurring = reminder.repeatUntilDone || reminder.mode === 'interval'
  const priorityColor = card.priority ? PRIORITY_COLORS[card.priority] : '#6b7280'
  const priorityLabel = card.priority ? PRIORITY_LABELS[card.priority] : 'Normal'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          background: 'var(--color-surface, #1e2029)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header com Alarme pulsante */}
        <div
          style={{
            padding: '18px 22px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(249, 115, 22, 0.12) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(239, 68, 68, 0.4)',
                animation: 'pulse 1.5s infinite'
              }}
            >
              <BellRing size={22} className="animate-bounce" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                Lembrete de Planejamento
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isRecurring ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
                    <Repeat size={12} /> A cada {reminder.intervalMinutes || 10} min (Aviso #{fireCount})
                  </span>
                ) : (
                  <span>Alarme pontual disparado</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            title="Dispensar alarme"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo da Tarefa */}
        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {card.priority && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: `${priorityColor}25`,
                    color: priorityColor,
                    border: `1px solid ${priorityColor}40`
                  }}
                >
                  {priorityLabel}
                </span>
              )}
              {card.date && (
                <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> {card.date}
                </span>
              )}
              {card.time && (
                <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} /> {card.time}
                </span>
              )}
            </div>

            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
              {card.title || 'Tarefa sem título'}
            </h3>
          </div>

          {isRecurring && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Repeat size={15} style={{ flexShrink: 0 }} />
              <span>Este lembrete continuará alertando a cada <b>{reminder.intervalMinutes || 10} minutos</b> até você marcar a tarefa como concluída.</span>
            </div>
          )}

          {/* Botão de Conclusão Instantânea */}
          <button
            onClick={onComplete}
            style={{
              width: '100%',
              padding: '13px 18px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <CheckCircle2 size={18} />
            Marcar Tarefa como Concluída
          </button>

          {/* Seção de Snooze / Adiar */}
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={13} />
              Adiar Lembrete (Snooze):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { label: '+5 min', mins: 5 },
                { label: '+10 min', mins: 10 },
                { label: '+15 min', mins: 15 },
                { label: '+30 min', mins: 30 },
              ].map(s => (
                <button
                  key={s.mins}
                  onClick={() => onSnooze(s.mins)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé com Dispensar */}
        <div
          style={{
            padding: '12px 24px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.45)' }}>
            Som: {reminder.sound || 'Bell'} • Toast Windows Ativo
          </span>

          <button
            onClick={onDismiss}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '12.5px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Dispensar por agora
          </button>
        </div>
      </div>
    </div>
  )
}
