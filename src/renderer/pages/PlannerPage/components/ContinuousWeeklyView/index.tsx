import { useMemo, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Day, Project } from '@types';
import type { PlanningTask } from '../../types/planning.types';
import { PlanningQuickAddModal, type PlanningQuickAddState } from '../Modals/PlanningQuickAddModal';
import { ContinuousDayColumn } from './ContinuousDayColumn';
import { PlanningDragOverlay } from '../Card/PlanningDragOverlay';

interface ContinuousWeeklyViewProps {
  tasks: PlanningTask[];
  projects?: Project[];
  onEdit: (id: string) => void;
  onMoveTask?: (taskId: string, targetLocation: { day: Day; period: 'morning' | 'afternoon' | 'night' }, targetDate: string, targetTaskId?: string) => void;
  onAddTask?: (task: Partial<PlanningTask>) => void;
  onUpdateTask: (id: string, updates: Partial<PlanningTask>) => void;
}

const DAYS: Array<{ key: Day; label: string }> = [
  { key: 'mon', label: 'SEGUNDA' },
  { key: 'tue', label: 'TERÇA' },
  { key: 'wed', label: 'QUARTA' },
  { key: 'thu', label: 'QUINTA' },
  { key: 'fri', label: 'SEXTA' },
  { key: 'sat', label: 'SÁBADO' },
  { key: 'sun', label: 'DOMINGO' },
];

const toDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const plainTextToHtml = (value: string) => {
  const escaped = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  return escaped ? `<p>${escaped.replace(/\n/g, '<br/>')}</p>` : '';
};

export const ContinuousWeeklyView = ({
  tasks,
  projects = [],
  onEdit,
  onMoveTask,
  onAddTask,
  onUpdateTask,
}: ContinuousWeeklyViewProps) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [quickAddModal, setQuickAddModal] = useState<PlanningQuickAddState | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const weekDays = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setHours(12, 0, 0, 0);
    monday.setDate(today.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) + weekOffset * 7);
    const todayString = toDateString(today);

    return DAYS.map((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const dateString = toDateString(date);
      return { ...day, dateString, dayNumber: date.getDate(), isToday: dateString === todayString };
    });
  }, [weekOffset]);

  const rangeLabel = `${weekDays[0].dateString.split('-').reverse().slice(0, 2).join('/')} — ${weekDays[6].dateString.split('-').reverse().slice(0, 2).join('/')}`;

  const openAdd = (day: typeof weekDays[number]) => {
    setQuickAddModal({
      isOpen: true,
      dayKey: day.key,
      shiftId: 'morning',
      dateStr: day.dateString,
      dayLabel: `${day.label} (${String(day.dayNumber).padStart(2, '0')}/${day.dateString.slice(5, 7)})`,
      title: '',
      description: '',
      projectId: '',
      priority: 'P3',
      hasTime: false,
      time: '09:00',
      hasReminder: false,
      reminderMode: 'before',
      reminderInterval: 10,
      reminderOffset: 10,
      reminderSound: 'bell',
      repeatUntilDone: true,
      storyPoints: 0,
      tagsInput: '',
    });
  };

  const submitQuickAdd = () => {
    if (!quickAddModal?.title.trim() || !quickAddModal.dayKey || !quickAddModal.dateStr) return;
    let reminder: PlanningTask['reminder'] = null;
    if (quickAddModal.hasReminder) {
      const now = Date.now();
      const eventMs = quickAddModal.hasTime && quickAddModal.time
        ? new Date(`${quickAddModal.dateStr}T${quickAddModal.time}:00`).getTime()
        : null;
      const triggerAt = quickAddModal.reminderMode === 'interval'
        ? new Date(now + (quickAddModal.reminderInterval || 10) * 60_000).toISOString()
        : eventMs
          ? new Date(eventMs - (quickAddModal.reminderOffset || 10) * 60_000).toISOString()
          : new Date(now + 10 * 60_000).toISOString();
      reminder = {
        enabled: true,
        mode: quickAddModal.reminderMode,
        triggerAt,
        intervalMinutes: quickAddModal.reminderInterval,
        offsetMinutes: quickAddModal.reminderOffset,
        repeatUntilDone: quickAddModal.repeatUntilDone,
        sound: quickAddModal.reminderSound,
        nativeToast: true,
        hasFired: false,
        createdAt: new Date().toISOString(),
      };
    }
    onAddTask?.({
      title: quickAddModal.title.trim(),
      description: quickAddModal.description,
      descriptionHtml: plainTextToHtml(quickAddModal.description),
      date: quickAddModal.dateStr,
      hasDate: true,
      location: { day: quickAddModal.dayKey, period: 'morning' },
      projectId: quickAddModal.projectId || null,
      priority: quickAddModal.priority || 'P3',
      time: quickAddModal.hasTime && quickAddModal.time ? quickAddModal.time : null,
      storyPoints: quickAddModal.storyPoints || undefined,
      tags: quickAddModal.tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean),
      status: 'todo',
      reminder,
    });
    setQuickAddModal(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTaskId(null);
    if (!over) return;
    if (active.id === over.id) return;

    let day = weekDays.find((item) => `continuous-day:${item.key}` === over.id);
    if (!day) {
      const targetTask = tasks.find((task) => task.id === over.id);
      day = weekDays.find((item) => item.dateString === targetTask?.date);
    }
    if (!day) return;

    const draggedTask = tasks.find((task) => task.id === active.id);
    onMoveTask?.(
      String(active.id),
      { day: day.key, period: draggedTask?.location?.period || 'morning' },
      day.dateString,
      tasks.some(task => task.id === over.id) ? String(over.id) : undefined,
    );
  };

  const activeTask = tasks.find((task) => task.id === activeTaskId);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0B0F17] text-slate-200">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/5 bg-[#0a0f1d] px-4 py-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setWeekOffset((value) => value - 1)} aria-label="Semana anterior" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setWeekOffset(0)} className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
            Esta semana
          </button>
          <button type="button" onClick={() => setWeekOffset((value) => value + 1)} aria-label="Próxima semana" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <CalendarDays className="h-4 w-4 text-indigo-400" />
          <span>{rangeLabel}</span>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const hits = pointerWithin(args);
          return hits.length ? hits : closestCorners(args);
        }}
        onDragStart={({ active }: DragStartEvent) => setActiveTaskId(String(active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTaskId(null)}
      >
        <div className="flex flex-1 gap-2.5 overflow-x-auto overflow-y-hidden p-3 2xl:grid 2xl:grid-cols-7">
          {weekDays.map((day) => (
            <ContinuousDayColumn
              key={day.key}
              id={`continuous-day:${day.key}`}
              label={day.label}
              dayNumber={day.dayNumber}
              isToday={day.isToday}
              tasks={tasks.filter((task) => task.hasDate && task.date === day.dateString)}
              projects={projects}
              onEdit={onEdit}
              onAdd={() => openAdd(day)}
              onUpdateTask={onUpdateTask}
            />
          ))}
        </div>
        <DragOverlay adjustScale={false} dropAnimation={{ duration: 160, easing: 'ease-out' }}>
          {activeTask ? (
            <PlanningDragOverlay
              task={activeTask}
              project={projects.find(project => project.id === activeTask.projectId)}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <PlanningQuickAddModal modal={quickAddModal} projects={projects} onChange={setQuickAddModal} onSubmit={submitQuickAdd} />
    </div>
  );
};
