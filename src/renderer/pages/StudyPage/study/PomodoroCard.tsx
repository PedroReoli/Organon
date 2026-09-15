
import type { PomodoroPhase } from '@Study/study/types'
import { formatClock } from '@Study/study/utils'

interface PomodoroCardProps {
  phase:          PomodoroPhase
  timerRunning:   boolean
  secondsLeft:    number
  focusMinutes:   number
  breakMinutes:   number
  muteSound:      boolean
  setMuteSound:   (v: boolean) => void
  toggleTimer:       () => void
  resetCurrentPhase: () => void
  skipPhase:         () => void
  adjustFocus:    (delta: number) => void
  adjustBreak:    (delta: number) => void
}

export const PomodoroCard = ({
  phase, timerRunning, secondsLeft, focusMinutes, breakMinutes, muteSound, setMuteSound,
  toggleTimer, resetCurrentPhase, skipPhase, adjustFocus, adjustBreak,
}: PomodoroCardProps) => (
  <article className="study-card study-session-card">
    <header className="study-session-header">
      <div>
        <span className="study-card-label">Sessao atual</span>
        <strong className="study-session-date">
          {new Date().toLocaleDateString('pt-BR')}
        </strong>
      </div>
      <span className={`study-phase-chip ${phase === 'focus' ? 'focus' : 'break'}`}>
        {phase === 'focus' ? 'Foco' : 'Descanso'}
      </span>
    </header>

    {/* Circular Progress Ring com Glow Ativo */}
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '16px 0', position: 'relative' }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ filter: timerRunning ? (phase === 'focus' ? 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.45))' : 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.45))') : 'none', transition: 'filter 0.3s ease' }}>
        <circle cx="70" cy="70" r="60" fill="none" stroke="var(--color-background-tertiary)" strokeWidth="8" />
        <circle
          cx="70"
          cy="70"
          r="60"
          fill="none"
          stroke={phase === 'focus' ? 'var(--color-primary)' : '#22c55e'}
          strokeWidth="8"
          strokeDasharray="377"
          strokeDashoffset={377 - (377 * (secondsLeft / ((phase === 'focus' ? focusMinutes : breakMinutes) * 60)))}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-out', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
          {formatClock(secondsLeft)}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '-2px' }}>
          {timerRunning ? (phase === 'focus' ? 'Focando' : 'Descansando') : 'Pausado'}
        </span>
      </div>
    </div>

    <div className="study-session-actions study-session-actions-icons">
      <button type="button" className="study-btn study-btn-icon" onClick={toggleTimer} title={timerRunning ? 'Pausar' : 'Iniciar'}>
        {timerRunning ? (
          <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
            <polygon points="8 5 19 12 8 19" />
          </svg>
        )}
      </button>
      <button type="button" className="study-btn study-btn-icon study-btn-ghost" onClick={resetCurrentPhase} title="Resetar fase">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 3v6h6" />
        </svg>
      </button>
      <button type="button" className="study-btn study-btn-icon study-btn-ghost" onClick={skipPhase} title="Pular fase">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
          <polygon points="5 4 15 12 5 20 5 4" />
          <line x1="19" y1="5" x2="19" y2="19" />
        </svg>
      </button>
    </div>

    <div className="study-session-config study-session-config-stepper">
      <label>
        Foco
        <div className="study-stepper">
          <button type="button" className="study-stepper-btn" onClick={() => adjustFocus(-1)}>-</button>
          <strong>{focusMinutes} min</strong>
          <button type="button" className="study-stepper-btn" onClick={() => adjustFocus(1)}>+</button>
        </div>
      </label>
      <label>
        Descanso
        <div className="study-stepper">
          <button type="button" className="study-stepper-btn" onClick={() => adjustBreak(-1)}>-</button>
          <strong>{breakMinutes} min</strong>
          <button type="button" className="study-stepper-btn" onClick={() => adjustBreak(1)}>+</button>
        </div>
      </label>
    </div>

    <label className="study-mute-toggle">
      <input
        type="checkbox"
        checked={muteSound}
        onChange={e => setMuteSound(e.target.checked)}
      />
      Mutar aviso sonoro
    </label>
  </article>
)
