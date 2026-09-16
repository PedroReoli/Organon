import { useState, useEffect } from 'react';
import { DndContext, closestCorners, DragOverlay } from '@dnd-kit/core';
import { PlanningTask } from '../../types/planning.types';
import { WeekDayColumn } from './WeekDayColumn';
import { usePlanningDragDrop } from '../../hooks/usePlanningDragDrop';
import { PlanningCardCompact } from '../Card/PlanningCardCompact';

interface WeeklyViewProps {
  tasks: PlanningTask[];
  onEdit: (id: string) => void;
  onMoveTask?: (taskId: string, targetDate: string) => void;
  onUpdateTask?: (id: string, updates: Partial<PlanningTask>) => void;
  onAddTask?: (task: Partial<PlanningTask>) => void;
}

export const WeeklyView = ({
  tasks,
  onEdit,
  onMoveTask,
  onUpdateTask,
  onAddTask,
}: WeeklyViewProps) => {
  const [weekOffset, setWeekOffset] = useState(0);

  // Keyboard navigation between weeks (Alt+Left, Alt+Right, Alt+Home)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        setWeekOffset((w) => w - 1);
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        setWeekOffset((w) => w + 1);
      } else if (e.altKey && (e.key === 'Home' || e.key === 'h')) {
        e.preventDefault();
        setWeekOffset(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  const daysNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

  // Base date computation with offset
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = (currentDayOfWeek === 0 ? -6 : 1) - currentDayOfWeek;

  const mondayDate = new Date(today);
  mondayDate.setDate(today.getDate() + diffToMonday + weekOffset * 7);

  const weekDays = daysNames.map((name, idx) => {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + idx);
    const dateStr = d.toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    return {
      name,
      dateStr,
      isToday: dateStr === todayStr,
      dateObj: d,
    };
  });

  const startDateStr = weekDays[0]?.dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const endDateStr = weekDays[6]?.dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleTaskMove = (taskId: string, targetId: string) => {
    if (onMoveTask) {
      onMoveTask(taskId, targetId);
    }
  };

  const handlePostponeWeek = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.date) return;
    try {
      const parts = task.date.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + 7);
      const nextDateStr = d.toISOString().slice(0, 10);
      onUpdateTask?.(taskId, { date: nextDateStr });
    } catch {
      // fallback
    }
  };

  const handleToggleStatus = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    onUpdateTask?.(taskId, { status: nextStatus, updatedAt: new Date().toISOString() });
  };

  const handleQuickAdd = (date: string) => {
    const title = window.prompt('Título da nova tarefa:');
    if (!title || !title.trim()) return;
    onAddTask?.({
      title: title.trim(),
      date,
      hasDate: true,
      status: 'todo',
      priority: 'P3',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const { activeId, handleDragStart, handleDragOver, handleDragEnd } = usePlanningDragDrop(handleTaskMove);
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Week Navigator Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'var(--color-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            title="Semana Anterior"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12L6 8l4-4" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            title="Ir para a Semana Atual"
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: weekOffset === 0 ? 'var(--color-primary)' : 'var(--color-bg)',
              color: weekOffset === 0 ? '#ffffff' : 'var(--color-text)',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            title="Próxima Semana"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 600 }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="2" y="3" width="12" height="11" rx="2" />
            <path d="M2 6h12" />
            <path d="M5 2v2M11 2v2" />
          </svg>
          <span style={{ color: 'var(--color-text)' }}>
            {startDateStr} – {endDateStr}
          </span>
          {weekOffset !== 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--color-text-muted)',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              {weekOffset > 0 ? `+${weekOffset} sem` : `${weekOffset} sem`}
            </span>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => handleQuickAdd(new Date().toISOString().slice(0, 10))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--color-primary)',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 2v12M2 8h12" />
            </svg>
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Week Columns Grid */}
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flex: 1,
            overflowX: 'auto',
            padding: '16px 20px',
            alignItems: 'stretch',
          }}
        >
          {weekDays.map((day) => {
            const dayTasks = tasks.filter((t) => t.date === day.dateStr);
            return (
              <WeekDayColumn
                key={day.dateStr}
                date={day.dateStr}
                dayName={day.name}
                isToday={day.isToday}
                tasks={dayTasks}
                onEdit={onEdit}
                onToggleStatus={handleToggleStatus}
                onPostponeWeek={handlePostponeWeek}
                onAddTask={handleQuickAdd}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <PlanningCardCompact
              task={activeTask}
              onEdit={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

