import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  pointerWithin,
  MeasuringStrategy,
  getClientRect,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PlanningTask } from '../../types/planning.types';
import { PlanningCardCompact } from '../Card/PlanningCardCompact';
import { Plus, ChevronLeft, ChevronRight, Clock, FolderKanban, Bell, Tag, Sparkles } from 'lucide-react';
import type { Day, Period, Project } from '@types';

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

/**
 * Droppable Slot Component para Célula da Matriz ou Backlog
 */
interface MatrixSlotProps {
  id: string;
  isBacklog?: boolean;
  tasks: PlanningTask[];
  projects?: Project[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onSlotClick: (slotId: string) => void;
  onEdit: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onPostponeWeek: (id: string) => void;
  onOpenAdd: () => void;
}

const MatrixSlot: React.FC<MatrixSlotProps> = ({
  id,
  isBacklog,
  tasks,
  projects = [],
  selectedTaskId,
  onSelectTask,
  onSlotClick,
  onEdit,
  onToggleStatus,
  onPostponeWeek,
  onOpenAdd,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      onClick={() => {
        if (selectedTaskId) {
          onSlotClick(id);
        }
      }}
      style={{
        background: isOver
          ? 'color-mix(in srgb, var(--color-primary, #6366f1) 18%, #0f172a)'
          : isBacklog
          ? '#0c1220'
          : '#0e1526',
        borderColor: isOver
          ? 'var(--color-primary, #6366f1)'
          : selectedTaskId
          ? 'rgba(99,102,241,0.5)'
          : 'rgba(255,255,255,0.06)',
      }}
      className={`relative flex-1 h-full min-h-[90px] rounded-lg border p-1.5 flex flex-col justify-between transition-all group/slot ${
        isOver ? 'ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-950/40' : ''
      } ${
        selectedTaskId ? 'cursor-pointer hover:border-indigo-400 hover:bg-[#141e34]' : ''
      }`}
    >
      {/* Task List */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-full">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => {
            const project = projects.find((p) => p.id === task.projectId);
            return (
              <div
                key={task.id}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    e.stopPropagation();
                    onSelectTask(task.id);
                  }
                }}
                className={`transition-all rounded-md ${
                  selectedTaskId === task.id ? 'ring-2 ring-indigo-500 bg-indigo-950/50' : ''
                }`}
              >
                <PlanningCardCompact
                  task={task}
                  project={project}
                  isSortable
                  onEdit={() => onEdit(task.id)}
                  onToggleStatus={onToggleStatus}
                  onPostponeWeek={onPostponeWeek}
                />
              </div>
            );
          })}
        </SortableContext>

        {/* Empty State Prompt */}
        {tasks.length === 0 && (
          <div
            onClick={(e) => {
              if (!selectedTaskId) {
                e.stopPropagation();
                onOpenAdd();
              }
            }}
            className="flex-1 flex flex-col items-center justify-center text-center p-2 cursor-pointer select-none text-slate-500 hover:text-slate-300 transition-colors group/empty"
          >
            <div className="w-5 h-5 rounded border border-slate-700/60 flex items-center justify-center mb-1 text-slate-500 group-hover/slot:border-slate-400 group-hover/slot:text-slate-300 transition-colors">
              <Plus className="w-3 h-3" />
            </div>
            <span className="text-[9.5px] font-bold tracking-wider uppercase text-slate-500/90 group-hover/slot:text-slate-400 leading-tight">
              {selectedTaskId ? 'CLIQUE PARA MOVER' : 'ARRASTE OU CTRL+CLIQUE PARA MOVER'}
            </span>
          </div>
        )}
      </div>

      {/* Quick Add Button at bottom when cards exist */}
      {tasks.length > 0 && (
        <div className="pt-1 mt-1 border-t border-white/5 opacity-0 group-hover/slot:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAdd();
            }}
            className="w-full py-0.5 text-[9.5px] font-semibold flex items-center justify-center gap-1 rounded bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>Adicionar</span>
          </button>
        </div>
      )}
    </div>
  );
};

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
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const zoomFactorRef = useRef(1);

  // Quick Add Modal State
  const [quickAddModal, setQuickAddModal] = useState<{
    isOpen: boolean;
    dayKey?: Day;
    shiftId?: Period;
    dateStr?: string;
    dayLabel?: string;
    title: string;
    projectId: string;
    priority: 'P1' | 'P2' | 'P3' | 'P4';
    hasTime: boolean;
    time: string;
    hasReminder: boolean;
    reminderOffset: number; // minutes
    storyPoints: number;
    tagsInput: string;
  } | null>(null);

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
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = (currentDayOfWeek === 0 ? -6 : 1) - currentDayOfWeek;

  const mondayDate = new Date(today);
  mondayDate.setDate(today.getDate() + diffToMonday + weekOffset * 7);

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

  // Zoom calibrated client rect for accurate mouse placement in Electron
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

    // Drop over another task
    const targetTask = tasks.find((t) => t.id === overId);
    if (targetTask) {
      onMoveTask?.(
        draggedTaskId,
        targetTask.location || 'backlog',
        targetTask.date
      );
    }
  };

  // Cursor styling during drag
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
      // Add to backlog
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
  const activeTaskProject = activeTask ? projects.find((p) => p.id === activeTask.projectId) : undefined;

  return (
    <div className="flex flex-col h-full w-full select-none bg-[#0a0f1d] text-slate-200 overflow-hidden">
      {/* Top Navigator Bar with Legend & Date Range */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0d1424] shrink-0 gap-3">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w - 1)}
            title="Semana Anterior (Alt + ←)"
            className="w-7 h-7 rounded border border-slate-700/60 bg-[#121b2f] text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className={`px-3 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
              weekOffset === 0
                ? 'border-indigo-500/50 bg-indigo-950/40 text-indigo-300'
                : 'border-slate-700/60 bg-[#121b2f] text-slate-300 hover:border-slate-500 hover:text-white'
            }`}
          >
            Esta semana
          </button>

          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            title="Próxima Semana (Alt + →)"
            className="w-7 h-7 rounded border border-slate-700/60 bg-[#121b2f] text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Legend Pills */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1 rounded-full border border-white/5 bg-[#0b101e] text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-300">Prioridade:</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> P1</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> P2</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> P3</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> P4</span>
          </div>
          <span className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-2 text-slate-400">
            <span className="flex items-center gap-1"><FolderKanban className="w-3 h-3 text-indigo-400" /> Projeto</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> Horário</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-400" /> Points</span>
          </div>
        </div>

        {/* Date Range Display */}
        <div className="text-xs font-mono font-medium text-slate-400 tracking-wider shrink-0">
          {rangeFormatted}
        </div>
      </div>

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
        <div className="flex-1 flex overflow-hidden p-2.5 gap-2.5 min-h-0">
          {/* Backlog Column */}
          <div
            className={`flex flex-col border border-white/5 rounded-xl bg-[#0c1220] transition-all duration-200 shrink-0 ${
              isBacklogCollapsed ? 'w-11' : 'w-56 min-w-[210px]'
            }`}
          >
            {/* Backlog Header (Ícone posicionado à ESQUERDA do título) */}
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
                {/* Clean + Card Button */}
                <button
                  type="button"
                  onClick={() => openAddModal()}
                  className="w-full py-1.5 px-3 rounded-lg border border-slate-700/60 bg-[#121b2f] hover:bg-[#18243e] hover:border-slate-500 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-300" />
                  <span>Card</span>
                </button>

                {/* Backlog Slot Area */}
                <MatrixSlot
                  id="backlog"
                  isBacklog
                  tasks={backlogTasks}
                  projects={projects}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={setSelectedTaskId}
                  onSlotClick={handleSlotClickToMove}
                  onEdit={onEdit}
                  onToggleStatus={handleToggleStatus}
                  onPostponeWeek={handlePostponeWeek}
                  onOpenAdd={() => openAddModal()}
                />
              </div>
            )}
          </div>

          {/* 7 Days x 3 Shifts Matrix (Fluid Responsive) */}
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
                  {/* Shift Label Column */}
                  <div className="p-1 border-r border-white/5 flex items-center justify-center text-center bg-[#0d1424] select-none">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      {shift.label}
                    </span>
                  </div>

                  {/* 7 Day Slots for this Shift */}
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
                          onSelectTask={setSelectedTaskId}
                          onSlotClick={handleSlotClickToMove}
                          onEdit={onEdit}
                          onToggleStatus={handleToggleStatus}
                          onPostponeWeek={handlePostponeWeek}
                          onOpenAdd={() => openAddModal(day.key, shift.id, day.dateStr, day.label)}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Precise Drag Overlay with exact coordinate tracking */}
        <DragOverlay
          zIndex={9999}
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
          }}
        >
          {activeTask ? (
            <div className="w-[200px] shadow-2xl rounded-lg border border-indigo-500 bg-[#162138] p-1 opacity-95 pointer-events-none">
              <PlanningCardCompact task={activeTask} project={activeTaskProject} onEdit={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Quick Add Modal */}
      {quickAddModal?.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
          onClick={() => setQuickAddModal(null)}
        >
          <div
            className="w-full max-w-md p-5 rounded-xl border border-white/10 bg-[#0e1628] shadow-2xl space-y-4 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Criar Novo Card de Planejamento</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Destino: {quickAddModal.dayLabel} {quickAddModal.shiftId ? `· ${quickAddModal.shiftId === 'morning' ? 'Manhã' : quickAddModal.shiftId === 'afternoon' ? 'Tarde' : 'Noite'}` : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Título da Tarefa *
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ex: Entregar Módulo do Organon ou Alinhamento"
                  value={quickAddModal.title}
                  onChange={(e) => setQuickAddModal({ ...quickAddModal, title: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitQuickAddModal();
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-[#131d33] text-white focus:border-indigo-500 outline-hidden"
                />
              </div>

              {/* Project & Priority */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                    <FolderKanban className="w-3 h-3 text-indigo-400" />
                    Projeto
                  </label>
                  <select
                    value={quickAddModal.projectId}
                    onChange={(e) => setQuickAddModal({ ...quickAddModal, projectId: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-white/10 bg-[#131d33] text-white focus:border-indigo-500 outline-hidden"
                  >
                    <option value="">Nenhum Projeto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Prioridade
                  </label>
                  <select
                    value={quickAddModal.priority}
                    onChange={(e) => setQuickAddModal({ ...quickAddModal, priority: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-white/10 bg-[#131d33] text-white focus:border-indigo-500 outline-hidden"
                  >
                    <option value="P1">P1 (Crítico)</option>
                    <option value="P2">P2 (Alto)</option>
                    <option value="P3">P3 (Médio)</option>
                    <option value="P4">P4 (Baixo)</option>
                  </select>
                </div>
              </div>

              {/* Horário Toggle (On/Off) */}
              <div className="p-2.5 rounded-lg border border-white/5 bg-[#121b2f] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Definir Horário Específico
                  </label>
                  <input
                    type="checkbox"
                    checked={quickAddModal.hasTime}
                    onChange={(e) => setQuickAddModal({ ...quickAddModal, hasTime: e.target.checked })}
                    className="cursor-pointer accent-indigo-500"
                  />
                </div>

                {quickAddModal.hasTime && (
                  <div className="pt-1 flex items-center gap-2">
                    <input
                      type="time"
                      value={quickAddModal.time}
                      onChange={(e) => setQuickAddModal({ ...quickAddModal, time: e.target.value })}
                      className="px-2.5 py-1 text-xs rounded-md border border-white/10 bg-[#162138] text-white focus:border-indigo-500 outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">Exibido diretamente no turno do dia</span>
                  </div>
                )}
              </div>

              {/* Lembrete Toggle (On/Off) */}
              <div className="p-2.5 rounded-lg border border-white/5 bg-[#121b2f] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    Ativar Lembrete / Notificação
                  </label>
                  <input
                    type="checkbox"
                    checked={quickAddModal.hasReminder}
                    onChange={(e) => setQuickAddModal({ ...quickAddModal, hasReminder: e.target.checked })}
                    className="cursor-pointer accent-amber-500"
                  />
                </div>

                {quickAddModal.hasReminder && (
                  <div className="pt-1 flex items-center gap-2">
                    <select
                      value={quickAddModal.reminderOffset}
                      onChange={(e) => setQuickAddModal({ ...quickAddModal, reminderOffset: parseInt(e.target.value, 10) })}
                      className="px-2.5 py-1 text-xs rounded-md border border-white/10 bg-[#162138] text-white focus:border-indigo-500 outline-hidden"
                    >
                      <option value={0}>No horário exato</option>
                      <option value={10}>10 minutos antes</option>
                      <option value={15}>15 minutos antes</option>
                      <option value={30}>30 minutos antes</option>
                      <option value={60}>1 hora antes</option>
                    </select>
                    <span className="text-[10px] text-slate-400">Notificação nativa no app</span>
                  </div>
                )}
              </div>

              {/* Story Points & Tags */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    Story Points
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 5, 8].map((pts) => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => setQuickAddModal({ ...quickAddModal, storyPoints: quickAddModal.storyPoints === pts ? 0 : pts })}
                        className={`flex-1 py-1 text-[10px] font-mono font-bold rounded border cursor-pointer transition-colors ${
                          quickAddModal.storyPoints === pts
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-[#131d33] border-white/10 text-slate-400 hover:border-slate-500 hover:text-white'
                        }`}
                      >
                        {pts}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-indigo-400" />
                    Tags
                  </label>
                  <input
                    type="text"
                    placeholder="dev, sprint, ui"
                    value={quickAddModal.tagsInput}
                    onChange={(e) => setQuickAddModal({ ...quickAddModal, tagsInput: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-white/10 bg-[#131d33] text-white focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setQuickAddModal(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg border border-white/10 bg-transparent cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitQuickAddModal}
                disabled={!quickAddModal.title.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 cursor-pointer transition-colors"
              >
                Criar Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
