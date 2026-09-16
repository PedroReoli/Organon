import { PlanningTask } from '../../types/planning.types';

interface OverdueWarningBannerProps {
  tasks: PlanningTask[];
  onReschedule: () => void;
}

export const OverdueWarningBanner = ({ tasks, onReschedule }: OverdueWarningBannerProps) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueTasks = tasks.filter(
    (t) => t.hasDate && t.date && t.date < todayStr && t.status !== 'done' && t.status !== 'cancelled'
  );

  if (overdueTasks.length === 0) return null;

  return (
    <div
      style={{
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '8px',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#f59e0b" strokeWidth="1.8">
          <path d="M8 1.5l6.5 12h-13L8 1.5z" />
          <line x1="8" y1="6" x2="8" y2="9.5" />
          <circle cx="8" cy="11.5" r="0.75" fill="#f59e0b" />
        </svg>
        <span style={{ fontWeight: 500, color: '#f59e0b', fontSize: '13px' }}>
          Você tem {overdueTasks.length} {overdueTasks.length > 1 ? 'tarefas atrasadas' : 'tarefa atrasada'}.
        </span>
      </div>
      <button
        type="button"
        onClick={onReschedule}
        style={{
          background: '#f59e0b',
          color: '#ffffff',
          border: 'none',
          padding: '6px 14px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 120ms ease-out',
        }}
      >
        Reagendar para Hoje
      </button>
    </div>
  );
};

