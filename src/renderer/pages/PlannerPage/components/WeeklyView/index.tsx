import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  MeasuringStrategy,
  getClientRect,
} from '@dnd-kit/core';
import type { PlanningTask } from '../../types/planning.types';
import { Plus, Calendar } from 'lucide-react';
import type { Day, Period, Project } from '@types';
import {
  MatrixSlot,
  MonthWeekDroppable,
  WeeklyViewHeader,
} from './components';
import { PlanningQuickAddModal, type PlanningQuickAddState } from '../Modals/PlanningQuickAddModal';

interface WeeklyViewProps {
  tasks: PlanningTask[];
  projects?: Project[];
  onEdit: (id: string) => void;
  onMoveTask?: (taskId: string, targetLocation: any, targetDate?: string | null) => void;
  onUpdateTask?: (id: string, updates: Partial<PlanningTask>) => void;
  onAddTask?: (task: Partial<PlanningTask>) => void;
}

const SHIFTS: { id: Period; label: string }[] = [
  { id: 'morning', label: 'MANHÃ' },
  { id: 'afternoon', label: 'TARDE' },
  { id: 'night', label: 'NOITE' },
];

const DAYS_META: { key: Day; label: string; shortName: string }[] = [
  { key: 'mon', label: 'SEGUNDA', shortName: 'Seg' },
  { key: 'tue', label: 'TERÇA', shortName: 'Ter' },
  { key: 'wed', label: 'QUARTA', shortName: 'Qua' },
  { key: 'thu', label: 'QUINTA', shortName: 'Qui' },
  { key: 'fri', label: 'SEXTA', shortName: 'Sex' },
  { key: 'sat', label: 'SÁBADO', shortName: 'Sáb' },
  { key: 'sun', label: 'DOMINGO', shortName: 'Dom' },
];

export const WeeklyView = ({
  tasks,
  projects = [],
  onEdit,
  onMoveTask,
  onUpdateTask,
  onAddTask,
}: WeeklyViewProps) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isBacklogCollapsed, setIsBacklogCollapsed] = useState(false);
  const [showMonthWeeks, setShowMonthWeeks] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const zoomFactorRef = useRef(1);

  // Quick Add Modal State
  const [quickAddModal, setQuickAddModal] = useState<PlanningQuickAddState | null>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTaskId(null);
        setQuickAddModal(null);
      }
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

  // Compute Week Dates (Monday to Sunday)
  const today = useMemo(() => new Date(), []);
  const currentDayOfWeek = today.getDay();
  const diffToMonday = (currentDayOfWeek === 0 ? -6 : 1) - currentDayOfWeek;

  const mondayDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + diffToMonday + weekOffset * 7);
    return d;
  }, [today, diffToMonday, weekOffset]);

  const weekDays = useMemo(() => {
    return DAYS_META.map((meta, idx) => {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + idx);
      const dateStr = d.toISOString().slice(0, 10);
      const todayStr = new Date().toISOString().slice(0, 10);
      return {
        key: meta.key,
        label: meta.label,
        shortName: meta.shortName,
        dateStr,
        dayNumber: d.getDate(),
        isToday: dateStr === todayStr,
      };
    });
  }, [mondayDate]);

  // Month Name for Current View
  const monthNameCapitalized = useMemo(() => {
    const raw = mondayDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [mondayDate]);

  // Compute Weeks for the Month of current view
  const monthWeeks = useMemo(() => {
    const year = mondayDate.getFullYear();
    const month = mondayDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const firstDow = firstDayOfMonth.getDay();
    const diffFirstMon = (firstDow === 0 ? -6 : 1) - firstDow;

    const iterMonday = new Date(year, month, 1 + diffFirstMon);
    const list = [];
    const currentMondayStr = weekDays[0]?.dateStr;

    const todayMonday = new Date(today);
    todayMonday.setDate(today.getDate() + diffToMonday);

    for (let i = 0; i < 6; i++) {
      const m = new Date(iterMonday);
      m.setDate(iterMonday.getDate() + i * 7);

      const sun = new Date(m);
      sun.setDate(m.getDate() + 6);

      if (m.getMonth() > month && m.getFullYear() >= year && i >= 4) {
        break;
      }

      const mStr = m.toISOString().slice(0, 10);
      const sunStr = sun.toISOString().slice(0, 10);

      const count = tasks.filter((t) => t.hasDate && t.date && t.date >= mStr && t.date <= sunStr).length;
      const offset = Math.round((m.getTime() - todayMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));

      list.push({
        weekIndex: i + 1,
        mondayDateStr: mStr,
        sundayDateStr: sunStr,
        label: `Semana ${i + 1}`,
        datesLabel: `${m.getDate().toString().padStart(2, '0')}/${(m.getMonth() + 1).toString().padStart(2, '0')} — ${sun.getDate().toString().padStart(2, '0')}/${(sun.getMonth() + 1).toString().padStart(2, '0')}`,
        taskCount: count,
        isCurrentWeek: mStr === currentMondayStr,
        offsetFromToday: offset,
      });
    }

    return list;
  }, [mondayDate, tasks, weekDays, today, diffToMonday]);

  // Date range formatted as "2026-09-14 a 2026-09-20"
  const rangeFormatted = useMemo(() => {
    if (!weekDays.length) return '';
    const start = weekDays[0].dateStr;
    const end = weekDays[6].dateStr;
    return `${start} a ${end}`;
  }, [weekDays]);

  // Filter Backlog Tasks
  const backlogTasks = useMemo(() => {
    return tasks.filter((t) => !t.hasDate || !t.date || t.location?.day === null || (t.location as any) === 'backlog');
  }, [tasks]);

  // Map tasks to (Day x Shift)
  const matrixTaskMap = useMemo(() => {
    const map = new Map<string, PlanningTask[]>();
    for (const day of weekDays) {
      for (const shift of SHIFTS) {
        const key = `${day.key}-${shift.id}`;
        const matched = tasks.filter((t) => {
          if (!t.hasDate || t.date !== day.dateStr) return false;
          if (t.location?.period) {
            return t.location.period === shift.id;
          }
          if (t.time) {
            const hour = parseInt(t.time.slice(0, 2), 10);
            if (hour < 12) return shift.id === 'morning';
            if (hour < 18) return shift.id === 'afternoon';
            return shift.id === 'night';
          }
          return shift.id === 'morning';
        });
        map.set(key, matched);
      }
    }
    return map;
  }, [tasks, weekDays]);

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const zoomedClientRect = useCallback((element: HTMLElement) => {
    const rect = getClientRect(element);
    const zoom = zoomFactorRef.current;
    if (!zoom || zoom === 1) return rect;
    return {
      ...rect,
      top: rect.top * zoom,
      right: rect.right * zoom,
      bottom: rect.bottom * zoom,
      left: rect.left * zoom,
      width: rect.width * zoom,
      height: rect.height * zoom,
    };
  }, []);

  const measuring = useMemo(() => {
    return {
      draggable: { measure: zoomedClientRect },
      droppable: { strategy: MeasuringStrategy.Always, measure: zoomedClientRect },
      dragOverlay: { measure: zoomedClientRect },
    };
  }, [zoomedClientRect]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
    try {
      zoomFactorRef.current = (window.electronAPI as any)?.getNativeZoom?.() ?? 1;
    } catch {
      zoomFactorRef.current = 1;
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);
    if (!over) return;

    const draggedTaskId = active.id as string;
    const overId = over.id as string;

    if (overId === 'backlog') {
      onMoveTask?.(draggedTaskId, 'backlog', null);
      return;
    }

    if (overId.startsWith('week-target:')) {
      const targetMondayStr = overId.replace('week-target:', '');
      onMoveTask?.(
        draggedTaskId,
        { day: 'mon', period: 'morning' },
        targetMondayStr
      );
      return;
    }

    if (overId.startsWith('cell:')) {
      const [, dayKey, shiftId] = overId.split(':');
      const targetDayObj = weekDays.find((d) => d.key === dayKey);
      if (targetDayObj) {
        onMoveTask?.(
          draggedTaskId,
          { day: dayKey as any, period: shiftId as any },
          targetDayObj.dateStr
        );
      }
      return;
    }

    const targetTask = tasks.find((t) => t.id === overId);
    if (targetTask) {
      onMoveTask?.(
        draggedTaskId,
        targetTask.location || 'backlog',
        targetTask.date
      );
    }
  };

  useEffect(() => {
    if (!activeTaskId) return;
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = 'grabbing';
    return () => {
      document.body.style.cursor = prevCursor;
    };
  }, [activeTaskId]);

  const handleSlotClickToMove = (slotId: string) => {
    if (!selectedTaskId) return;

    if (slotId === 'backlog') {
      onMoveTask?.(selectedTaskId, 'backlog', null);
    } else if (slotId.startsWith('week-target:')) {
      const targetMondayStr = slotId.replace('week-target:', '');
      onMoveTask?.(
        selectedTaskId,
        { day: 'mon', period: 'morning' },
        targetMondayStr
      );
    } else if (slotId.startsWith('cell:')) {
      const [, dayKey, shiftId] = slotId.split(':');
      const targetDayObj = weekDays.find((d) => d.key === dayKey);
      if (targetDayObj) {
        onMoveTask?.(
          selectedTaskId,
          { day: dayKey as any, period: shiftId as any },
          targetDayObj.dateStr
        );
      }
    }
    setSelectedTaskId(null);
  };

  const openAddModal = (dayKey?: Day, shiftId?: Period, dateStr?: string, dayLabel?: string) => {
    const defaultTime = shiftId === 'morning' ? '09:00' : shiftId === 'afternoon' ? '14:00' : shiftId === 'night' ? '19:00' : '';
    setQuickAddModal({
      isOpen: true,
      dayKey,
      shiftId,
      dateStr,
      dayLabel: dayLabel ? `${dayLabel} (${dateStr?.slice(8)}/${dateStr?.slice(5, 7)})` : 'Backlog',
      title: '',
      projectId: '',
      priority: 'P3',
      hasTime: !!shiftId,
      time: defaultTime,
      hasReminder: false,
      reminderOffset: 15,
      storyPoints: 0,
      tagsInput: '',
    });
  };

  const submitQuickAddModal = () => {
    if (!quickAddModal || !quickAddModal.title.trim()) return;

    const {
      dayKey,
      shiftId,
      dateStr,
      title,
      projectId,
      priority,
      hasTime,
      time,
      hasReminder,
      reminderOffset,
      storyPoints,
      tagsInput,
    } = quickAddModal;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const reminder = hasReminder
      ? {
          enabled: true,
          offsetMinutes: reminderOffset,
        }
      : null;

    if (dayKey && shiftId && dateStr) {
      onAddTask?.({
        title: title.trim(),
        date: dateStr,
        hasDate: true,
        location: { day: dayKey, period: shiftId },
        projectId: projectId || null,
        priority: priority || 'P3',
        time: hasTime && time.trim() ? time.trim() : null,
        reminder,
        storyPoints: storyPoints > 0 ? storyPoints : undefined,
        tags,
        status: 'todo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      onAddTask?.({
        title: title.trim(),
        hasDate: false,
        date: null,
        location: { day: null, period: null },
        projectId: projectId || null,
        priority: priority || 'P3',
        time: hasTime && time.trim() ? time.trim() : null,
        reminder,
        storyPoints: storyPoints > 0 ? storyPoints : undefined,
        tags,
        status: 'todo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setQuickAddModal(null);
  };

  const handleToggleStatus = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    onUpdateTask?.(taskId, { status: nextStatus, updatedAt: new Date().toISOString() });
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

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;

  return (
    <div className="flex flex-col h-full w-full select-none bg-[#0a0f1d] text-slate-200 overflow-hidden">
      <WeeklyViewHeader
        weekOffset={weekOffset}
        showMonthWeeks={showMonthWeeks}
        activeTaskId={activeTaskId}
        rangeFormatted={rangeFormatted}
        onSetWeekOffset={setWeekOffset}
        onToggleMonthWeeks={() => setShowMonthWeeks((prev) => !prev)}
      />

      {/* Main Board (Backlog + Matrix Grid) */}
      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const pointerHits = pointerWithin(args);
          if (pointerHits.length > 0) return pointerHits;
          return closestCorners(args);
        }}
        measuring={measuring}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Month Weeks Drop Bar */}
        {(showMonthWeeks || activeTaskId !== null) && (
          <div className="px-3 py-2 bg-[#090e1a] border-b border-white/5 shrink-0 transition-all">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Semanas de {monthNameCapitalized}
                </span>
                {activeTaskId && (
                  <span className="text-[10px] text-indigo-300 font-medium bg-indigo-950/80 border border-indigo-500/50 px-2 py-0.2 rounded-full animate-pulse">
                    Solte aqui para mover o card para a semana selecionada
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                Arraste um card ou clique em uma semana para navegar
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {monthWeeks.map((week) => (
                <MonthWeekDroppable
                  key={week.mondayDateStr}
                  id={`week-target:${week.mondayDateStr}`}
                  weekLabel={week.label}
                  datesLabel={week.datesLabel}
                  taskCount={week.taskCount}
                  isCurrentWeek={week.isCurrentWeek}
                  activeTask={activeTask}
                  onClick={() => setWeekOffset(week.offsetFromToday)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden p-2.5 gap-2.5 min-h-0">
          {/* Backlog Column */}
          <div
            className={`flex flex-col border border-white/5 rounded-xl bg-[#0c1220] transition-all duration-200 shrink-0 ${
              isBacklogCollapsed ? 'w-11' : 'w-56 min-w-[210px]'
            }`}
          >
            <div className="flex items-center justify-between p-2.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBacklogCollapsed((prev) => !prev)}
                  className="w-6 h-6 rounded border border-slate-700/60 bg-[#121b2f] hover:bg-[#18233c] hover:border-slate-500 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title={isBacklogCollapsed ? 'Expandir Backlog' : 'Recolher Backlog'}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform duration-200 ${isBacklogCollapsed ? 'rotate-180' : ''}`}
                  >
                    <rect width="18" height="18" x="3" y="3" rx="3" />
                    <path d="M9 3v18" />
                  </svg>
                </button>

                {!isBacklogCollapsed && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      BACKLOG
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-950/60 text-indigo-400 text-[10px] font-bold border border-indigo-800/40">
                      {backlogTasks.length}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {!isBacklogCollapsed && (
              <div className="flex-1 flex flex-col p-2 gap-2 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => openAddModal()}
                  className="w-full py-1.5 px-3 rounded-lg border border-slate-700/60 bg-[#121b2f] hover:bg-[#18243e] hover:border-slate-500 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-300" />
                  <span>Card</span>
                </button>

                <MatrixSlot
                  id="backlog"
                  isBacklog
                  tasks={backlogTasks}
                  projects={projects}
                  selectedTaskId={selectedTaskId}
                  activeTask={activeTask}
                  onSelectTask={setSelectedTaskId}
                  onSlotClick={handleSlotClickToMove}
                  onEdit={onEdit}
                  onToggleStatus={handleToggleStatus}
                  onPostponeWeek={handlePostponeWeek}
                  onOpenAdd={() => openAddModal()}
                  onQuickCreate={(title) => {
                    onAddTask?.({
                      title,
                      status: 'todo',
                      priority: 'P3',
                      location: { day: null, period: null },
                    });
                  }}
                />
              </div>
            )}
          </div>

          {/* 7 Days x 3 Shifts Matrix */}
          <div className="flex-1 flex flex-col border border-white/5 rounded-xl bg-[#0c1220] overflow-auto min-w-0 h-full">
            {/* Header Row: 7 Day Columns */}
            <div className="grid grid-cols-[56px_repeat(7,minmax(105px,1fr))] sticky top-0 z-10 border-b border-white/5 bg-[#0e1526] min-w-[750px]">
              <div className="p-2 border-r border-white/5" />
              {weekDays.map((day) => (
                <div
                  key={day.key}
                  className={`p-2 text-center border-r border-white/5 last:border-r-0 flex items-center justify-center gap-1.5 ${
                    day.isToday ? 'bg-indigo-950/20' : ''
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                    day.isToday ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  >
                    {day.label}
                  </span>
                  <span
                    className={`text-[11px] font-extrabold px-1.5 py-0.2 rounded ${
                      day.isToday
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white/5 text-slate-200'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                </div>
              ))}
            </div>

            {/* 3 Shift Rows: MANHÃ, TARDE, NOITE */}
            <div className="flex-1 grid grid-rows-3 divide-y divide-white/5 min-w-[750px] min-h-[360px] h-full">
              {SHIFTS.map((shift) => (
                <div key={shift.id} className="grid grid-cols-[56px_repeat(7,minmax(105px,1fr))] h-full">
                  <div className="p-1 border-r border-white/5 flex items-center justify-center text-center bg-[#0d1424] select-none">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      {shift.label}
                    </span>
                  </div>

                  {weekDays.map((day) => {
                    const slotKey = `cell:${day.key}:${shift.id}`;
                    const slotTasks = matrixTaskMap.get(`${day.key}-${shift.id}`) || [];

                    return (
                      <div
                        key={slotKey}
                        className="p-1 border-r border-white/5 last:border-r-0 flex flex-col overflow-hidden h-full"
                      >
                        <MatrixSlot
                          id={slotKey}
                          tasks={slotTasks}
                          projects={projects}
                          selectedTaskId={selectedTaskId}
                          activeTask={activeTask}
                          onSelectTask={setSelectedTaskId}
                          onSlotClick={handleSlotClickToMove}
                          onEdit={onEdit}
                          onToggleStatus={handleToggleStatus}
                          onPostponeWeek={handlePostponeWeek}
                          onOpenAdd={() => openAddModal(day.key, shift.id, day.dateStr, day.label)}
                          onQuickCreate={(title) => {
                            onAddTask?.({
                              title,
                              date: day.dateStr,
                              status: 'todo',
                              priority: 'P3',
                              location: { day: day.key, period: shift.id },
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DragOverlay zIndex={9999}>
          {null}
        </DragOverlay>
      </DndContext>

      <PlanningQuickAddModal
        modal={quickAddModal}
        projects={projects}
        onChange={setQuickAddModal}
        onSubmit={submitQuickAddModal}
      />
    </div>
  );
};
