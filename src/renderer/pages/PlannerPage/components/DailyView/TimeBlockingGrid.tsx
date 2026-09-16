import { PlanningTask } from '../../types/planning.types';

interface TimeBlockingGridProps {
  tasks: PlanningTask[];
  onEdit: (id: string) => void;
  onAddTask?: (task: Partial<PlanningTask>) => void;
}


export const TimeBlockingGrid = ({
  tasks,
  onEdit,
  onAddTask,
}: TimeBlockingGridProps) => {
  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 às 21:00
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter((t) => !t.date || t.date === todayStr);

  const handleSlotClick = (hour: number) => {
    if (!onAddTask) return;
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    const title = window.prompt(`Nova tarefa para às ${timeStr}:`);
    if (!title || !title.trim()) return;
    onAddTask({
      title: title.trim(),
      time: timeStr,
      date: todayStr,
      hasDate: true,
      status: 'todo',
      priority: 'P3',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="time-blocking-grid" style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 4v4l2.5 2.5" />
          </svg>
          <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text)' }}>
            Grade Horária do Dia
          </h3>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          Clique em um horário para agendar rapidamente
        </span>
      </div>

      <div
        className="grid-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          background: 'var(--color-surface)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        {hours.map((hour) => {
          const blockTasks = todayTasks.filter((t) => {
            if (!t.time) return false;
            const tHour = parseInt(t.time.split(':')[0], 10);
            return tHour === hour;
          });

          return (
            <div
              key={hour}
              className="time-row"
              style={{
                display: 'flex',
                minHeight: '38px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                alignItems: 'center',
                transition: 'background 0.12s ease',
              }}
            >
              <div
                className="time-label"
                style={{
                  width: '64px',
                  color: 'var(--color-text-muted)',
                  fontSize: '11.5px',
                  paddingLeft: '12px',
                  fontFamily: 'monospace',
                }}
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div
                className="time-slot"
                onClick={() => handleSlotClick(hour)}
                title={`Clique para agendar às ${hour.toString().padStart(2, '0')}:00`}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  display: 'flex',
                  gap: '6px',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  minHeight: '34px',
                  cursor: 'pointer',
                }}
              >
                {blockTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task.id);
                    }}
                    style={{
                      padding: '4px 10px',
                      background: 'color-mix(in srgb, var(--color-primary) 18%, var(--color-surface))',
                      color: 'var(--color-text)',
                      border: '1px solid color-mix(in srgb, var(--color-primary) 35%, transparent)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}
                  >
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                      }}
                    />
                    <span>{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


