import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PlanningTask } from '../../types/planning.types';
import { PlanningCardCompact } from '../Card/PlanningCardCompact';
import type { Project } from '@types';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderKanban,
  Bell,
  Tag,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Flame,
  CheckSquare,
  RotateCcw,
  Check,
} from 'lucide-react';

interface DailyViewProps {
  tasks: PlanningTask[];
  projects?: Project[];
  onEdit: (id: string) => void;
  onAddTask?: (task: Partial<PlanningTask>) => void;
  onUpdateTask?: (id: string, updates: Partial<PlanningTask>) => void;
  onMoveTask?: (taskId: string, targetLocation: any, targetDate?: string | null) => void;
  onRescheduleOverdue: () => void;
  onToggleStatus?: (id: string) => void;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 às 23:00

/**
 * Droppable Slot para Hora específica ou Inbox Livre
 */
interface DailySlotProps {
  id: string;
  hour?: number;
  tasks: PlanningTask[];
  projects?: Project[];
  activeTask?: PlanningTask | null;
  onEdit: (id: string) => void;
  onToggleStatus?: (id: string) => void;
  onOpenAdd: () => void;
}

const DailyHourSlot: React.FC<DailySlotProps> = ({
  id,
  hour,
  tasks,
  projects = [],
  activeTask,
  onEdit,
  onToggleStatus,
  onOpenAdd,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const hourLabel = hour !== undefined ? `${hour.toString().padStart(2, '0')}:00` : '';

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver
          ? 'color-mix(in srgb, var(--color-primary, #6366f1) 18%, #0f172a)'
          : '#0d1424',
        borderColor: isOver ? 'var(--color-primary, #6366f1)' : 'rgba(255,255,255,0.05)',
      }}
      className={`group/slot relative flex items-start min-h-[48px] border-b transition-all ${
        isOver ? 'ring-2 ring-indigo-500/50 bg-indigo-950/30' : ''
      }`}
    >
      {/* Time Label */}
      <div className="w-16 px-3 py-2 text-right text-xs font-mono font-bold text-slate-500 select-none shrink-0 border-r border-white/5 bg-[#0b1120]">
        {hourLabel}
      </div>

      {/* Task Content Container */}
      <div className="flex-1 p-1.5 flex flex-col gap-1 min-w-0">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => {
            const project = projects.find((p) => p.id === task.projectId);
            return (
              <div key={task.id} className="transition-all">
                <PlanningCardCompact
                  task={task}
                  project={project}
                  isSortable
                  onEdit={() => onEdit(task.id)}
                  onToggleStatus={onToggleStatus}
                />
              </div>
            );
          })}
        </SortableContext>

        {/* Ghost Drop Placeholder */}
        {isOver && activeTask && !tasks.some((t) => t.id === activeTask.id) && (
          <div className="w-full min-h-[32px] rounded-md border-2 border-dashed border-indigo-400/80 bg-indigo-950/40 p-1.5 flex items-center gap-2 text-xs text-indigo-300 animate-pulse select-none pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
            <span className="truncate font-medium flex-1 text-slate-200">{activeTask.title}</span>
            <span className="text-[9px] font-mono text-indigo-300/80 shrink-0 uppercase tracking-wider">
              Mover para {hourLabel}
            </span>
          </div>
        )}

        {/* Empty Slot Hover Add Button */}
        {tasks.length === 0 && (!isOver || !activeTask) && (
          <div
            onClick={onOpenAdd}
            className="h-8 flex items-center justify-between px-3 rounded-md text-xs text-slate-600 opacity-0 group-hover/slot:opacity-100 hover:bg-white/5 hover:text-slate-300 transition-all cursor-pointer select-none"
          >
            <span className="text-[11px] font-medium">+ Adicionar tarefa às {hourLabel}</span>
            <Plus className="w-3.5 h-3.5 text-slate-400" />
          </div>
        )}
      </div>

      {/* Add button on the right when tasks already exist */}
      {tasks.length > 0 && (
        <div className="px-2 py-1 opacity-0 group-hover/slot:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onOpenAdd}
            title={`Adicionar tarefa às ${hourLabel}`}
            className="w-6 h-6 rounded border border-slate-700/60 bg-[#121b2f] hover:bg-[#18243e] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export const DailyView: React.FC<DailyViewProps> = ({
  tasks,
  projects = [],
  onEdit,
  onAddTask,
  onUpdateTask,
  onMoveTask: _onMoveTask,
  onRescheduleOverdue,
  onToggleStatus,
}) => {
  const [dayOffset, setDayOffset] = useState(0);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);

  const zoomFactorRef = useRef(1);

  // Quick Add Modal State
  const [quickAddModal, setQuickAddModal] = useState<{
    isOpen: boolean;
    time: string;
    title: string;
    projectId: string;
    priority: 'P1' | 'P2' | 'P3' | 'P4';
    hasTime: boolean;
    hasReminder: boolean;
    reminderOffset: number;
    storyPoints: number;
    tagsInput: string;
  } | null>(null);

  // Compute Active Selected Date
  const selectedDateObj = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);

  const selectedDateStr = useMemo(() => {
    return selectedDateObj.toISOString().slice(0, 10);
  }, [selectedDateObj]);

  const todayStr = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const isToday = selectedDateStr === todayStr;

  // Formatted date string (ex: "Quarta-feira, 16 de Setembro de 2026")
  const formattedDateTitle = useMemo(() => {
    const raw = selectedDateObj.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [selectedDateObj]);

  // Tasks of Selected Day
  const dayTasks = useMemo(() => {
    return tasks.filter((t) => t.hasDate && t.date === selectedDateStr);
  }, [tasks, selectedDateStr]);

  // Overdue Tasks (date < todayStr and not done)
  const overdueTasks = useMemo(() => {
    return tasks.filter(
      (t) => t.hasDate && t.date && t.date < todayStr && t.status !== 'done' && t.status !== 'cancelled'
    );
  }, [tasks, todayStr]);

  // Completed Tasks of Today
  const completedTodayTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        t.status === 'done' &&
        (t.date === selectedDateStr || (t.updatedAt && t.updatedAt.startsWith(selectedDateStr)))
    );
  }, [tasks, selectedDateStr]);

  // Top 3 Priorities for Selected Day (P1/P2)
  const topPriorities = useMemo(() => {
    return dayTasks
      .filter((t) => (t.priority === 'P1' || t.priority === 'P2') && t.status !== 'done')
      .slice(0, 3);
  }, [dayTasks]);

  // Unscheduled / Free Tasks of the Day (time: null)
  const unassignedDayTasks = useMemo(() => {
    return dayTasks.filter((t) => !t.time && t.status !== 'done');
  }, [dayTasks]);

  // Tasks by Hour map
  const hourTasksMap = useMemo(() => {
    const map = new Map<number, PlanningTask[]>();
    for (const h of HOURS) {
      const matched = dayTasks.filter((t) => {
        if (!t.time) return false;
        const hourNum = parseInt(t.time.slice(0, 2), 10);
        return hourNum === h;
      });
      map.set(h, matched);
    }
    return map;
  }, [dayTasks]);

  // Day Stats
  const totalTasksCount = dayTasks.length;
  const completedCount = dayTasks.filter((t) => t.status === 'done').length;
  const completionPercentage = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;
  const totalStoryPoints = dayTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
  const completedStoryPoints = dayTasks
    .filter((t) => t.status === 'done')
    .reduce((acc, t) => acc + (t.storyPoints || 0), 0);

  // Real-time "Now" Line percentage
  const [currentMinutesFrom6am, setCurrentMinutesFrom6am] = useState<number | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const mins = now.getMinutes();
      if (hours >= 6 && hours < 24) {
        const totalMinutes = (hours - 6) * 60 + mins;
        setCurrentMinutesFrom6am(totalMinutes);
      } else {
        setCurrentMinutesFrom6am(null);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

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

    if (overId === 'daily-inbox') {
      onUpdateTask?.(draggedTaskId, {
        date: selectedDateStr,
        hasDate: true,
        time: null,
      });
      return;
    }

    if (overId.startsWith('hour:')) {
      const hourNum = parseInt(overId.replace('hour:', ''), 10);
      const timeStr = `${hourNum.toString().padStart(2, '0')}:00`;
      onUpdateTask?.(draggedTaskId, {
        date: selectedDateStr,
        hasDate: true,
        time: timeStr,
      });
      return;
    }

    // Drop on another task
    const targetTask = tasks.find((t) => t.id === overId);
    if (targetTask) {
      onUpdateTask?.(draggedTaskId, {
        date: selectedDateStr,
        hasDate: true,
        time: targetTask.time || null,
      });
    }
  };

  const openQuickAdd = (defaultHour?: number) => {
    const defaultTimeStr =
      defaultHour !== undefined ? `${defaultHour.toString().padStart(2, '0')}:00` : '09:00';

    setQuickAddModal({
      isOpen: true,
      time: defaultTimeStr,
      title: '',
      projectId: '',
      priority: 'P3',
      hasTime: defaultHour !== undefined,
      hasReminder: false,
      reminderOffset: 15,
      storyPoints: 0,
      tagsInput: '',
    });
  };

  const submitQuickAdd = () => {
    if (!quickAddModal || !quickAddModal.title.trim()) return;

    const {
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

    onAddTask?.({
      title: title.trim(),
      date: selectedDateStr,
      hasDate: true,
      time: hasTime && time ? time : null,
      projectId: projectId || null,
      priority: priority || 'P3',
      reminder,
      storyPoints: storyPoints > 0 ? storyPoints : undefined,
      tags,
      status: 'todo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setQuickAddModal(null);
  };

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0f1d] text-slate-200 overflow-hidden select-none">
      {/* Top Header / Navigator & Day Dashboard Stats */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/5 bg-[#0d1424] shrink-0 gap-4">
        {/* Date Navigator Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDayOffset((d) => d - 1)}
              title="Dia Anterior"
              className="w-7 h-7 rounded-lg border border-slate-700/60 bg-[#121b2f] text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setDayOffset(0)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                dayOffset === 0
                  ? 'border-indigo-500/60 bg-indigo-950/40 text-indigo-300 shadow-xs'
                  : 'border-slate-700/60 bg-[#121b2f] text-slate-300 hover:border-slate-500 hover:text-white'
              }`}
            >
              Hoje
            </button>

            <button
              type="button"
              onClick={() => setDayOffset((d) => d + 1)}
              title="Próximo Dia"
              className="w-7 h-7 rounded-lg border border-slate-700/60 bg-[#121b2f] text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pl-2">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>{formattedDateTitle}</span>
            </h2>
            {isToday && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px] font-bold uppercase tracking-wider">
                Hoje
              </span>
            )}
          </div>
        </div>

        {/* Day Stats Pill & Quick Add Button */}
        <div className="flex items-center gap-3">
          {/* Progress Bar & Stats */}
          <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-xl bg-[#090e1a] border border-white/5 text-xs">
            <div className="flex items-center gap-1.5 font-mono text-slate-300">
              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {completedCount}/{totalTasksCount} concluídas
              </span>
            </div>

            <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <span className="font-mono text-indigo-400 font-bold">{completionPercentage}%</span>

            {totalStoryPoints > 0 && (
              <>
                <span className="w-px h-3 bg-white/10" />
                <div className="flex items-center gap-1 font-mono text-amber-400">
                  <Sparkles className="w-3 h-3" />
                  <span>
                    {completedStoryPoints}/{totalStoryPoints} pts
                  </span>
                </div>
              </>
            )}
          </div>

          {/* + Nova Tarefa Button */}
          <button
            type="button"
            onClick={() => openQuickAdd()}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-950/50 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Main Content: DnD Layout (Sidebar Esquerda + Time Blocking Grid Direita) */}
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
        <div className="flex-1 flex overflow-hidden p-3 gap-3 min-h-0">
          {/* Left Sidebar (Overdue + Top 3 + Inbox Livre + Concluídas) */}
          <div className="w-80 min-w-[280px] max-w-[340px] flex flex-col gap-3 overflow-y-auto shrink-0 pr-1">
            {/* Overdue Tasks Alert Banner */}
            {overdueTasks.length > 0 && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-200 flex flex-col gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-amber-300">
                    {overdueTasks.length} {overdueTasks.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Tarefas anteriores a hoje ainda não foram concluídas.
                </p>
                <button
                  type="button"
                  onClick={onRescheduleOverdue}
                  className="w-full py-1 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reagendar para Hoje</span>
                </button>
              </div>
            )}

            {/* Top 3 Prioridades do Dia */}
            <div className="p-3 rounded-xl border border-white/5 bg-[#0c1220] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Top Prioridades (P1 / P2)
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/5 text-slate-400">
                  {topPriorities.length}/3
                </span>
              </div>

              {topPriorities.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  Nenhuma prioridade urgente para hoje.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {topPriorities.map((task) => {
                    const project = projects.find((p) => p.id === task.projectId);
                    return (
                      <div key={task.id}>
                        <PlanningCardCompact
                          task={task}
                          project={project}
                          onEdit={() => onEdit(task.id)}
                          onToggleStatus={onToggleStatus}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Inbox / Tarefas Sem Horário Fixo (Tarefas Livres do Dia) */}
            <div className="flex-1 min-h-[160px] p-3 rounded-xl border border-white/5 bg-[#0c1220] flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Tarefas Livres de Hoje
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/5 text-slate-400">
                  {unassignedDayTasks.length}
                </span>
              </div>

              {/* Droppable Container para tarefas livres */}
              <div className="flex-1 flex flex-col gap-1 overflow-y-auto min-h-[60px]">
                <SortableContext
                  items={unassignedDayTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {unassignedDayTasks.map((task) => {
                    const project = projects.find((p) => p.id === task.projectId);
                    return (
                      <div key={task.id}>
                        <PlanningCardCompact
                          task={task}
                          project={project}
                          isSortable
                          onEdit={() => onEdit(task.id)}
                          onToggleStatus={onToggleStatus}
                        />
                      </div>
                    );
                  })}
                </SortableContext>

                {unassignedDayTasks.length === 0 && (
                  <div
                    onClick={() => openQuickAdd()}
                    className="flex-1 flex flex-col items-center justify-center p-3 text-center text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg border border-dashed border-slate-700/50 transition-colors cursor-pointer select-none"
                  >
                    <Plus className="w-4 h-4 mb-1 text-slate-500" />
                    <span className="text-[11px] font-medium">
                      + Adicionar tarefa sem horário fixo
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Concluídas Hoje Accordion */}
            {completedTodayTasks.length > 0 && (
              <div className="rounded-xl border border-white/5 bg-[#0c1220] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsCompletedCollapsed((prev) => !prev)}
                  className="w-full p-2.5 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 bg-[#0e1628] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Concluídas Hoje ({completedTodayTasks.length})</span>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isCompletedCollapsed ? '' : 'rotate-90'
                    }`}
                  />
                </button>

                {!isCompletedCollapsed && (
                  <div className="p-2 flex flex-col gap-1 bg-[#0a0f1d]/50 max-h-48 overflow-y-auto">
                    {completedTodayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-1.5 rounded bg-white/5 text-xs text-slate-400"
                      >
                        <span className="line-through truncate flex-1">{task.title}</span>
                        <button
                          type="button"
                          onClick={() => onToggleStatus?.(task.id)}
                          title="Desmarcar tarefa"
                          className="w-4 h-4 rounded border border-emerald-500 bg-emerald-600 text-white flex items-center justify-center cursor-pointer shrink-0 ml-2"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel: Time Blocking Timeline Grid (06:00 - 23:00) */}
          <div className="flex-1 flex flex-col border border-white/5 rounded-xl bg-[#0c1220] overflow-hidden min-w-0 h-full">
            {/* Timeline Header */}
            <div className="px-4 py-2 border-b border-white/5 bg-[#0e1526] flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Cronograma Horário (06:00 — 23:00)</span>
              </div>
              <span className="text-[10px] font-normal text-slate-500">
                Arraste tarefas para os horários ou clique para agendar
              </span>
            </div>

            {/* Timeline Body */}
            <div className="relative flex-1 overflow-y-auto">
              {/* Real-time "Now" indicator line */}
              {isToday && currentMinutesFrom6am !== null && (
                <div
                  style={{
                    top: `${(currentMinutesFrom6am / (18 * 60)) * 100}%`,
                  }}
                  className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-md shadow-red-500/80 -ml-1.5" />
                  <div className="flex-1 h-0.5 bg-red-500/80 shadow-xs" />
                  <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[9px] font-bold font-mono mr-2">
                    AGORA
                  </span>
                </div>
              )}

              {/* Hourly Slots */}
              {HOURS.map((hour) => {
                const hourTasks = hourTasksMap.get(hour) || [];
                return (
                  <DailyHourSlot
                    key={hour}
                    id={`hour:${hour}`}
                    hour={hour}
                    tasks={hourTasks}
                    projects={projects}
                    activeTask={activeTask}
                    onEdit={onEdit}
                    onToggleStatus={onToggleStatus}
                    onOpenAdd={() => openQuickAdd(hour)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Drag Overlay null so no floating card tracks the mouse */}
        <DragOverlay zIndex={9999}>{null}</DragOverlay>
      </DndContext>

      {/* Quick Add Inline Modal */}
      {quickAddModal?.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
          onClick={() => setQuickAddModal(null)}
        >
          <div
            className="w-full max-w-md p-5 rounded-xl border border-white/10 bg-[#0e1628] shadow-2xl space-y-4 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Nova Tarefa para o Dia</h3>
                  <span className="text-xs text-slate-400">{formattedDateTitle}</span>
                </div>
              </div>
            </div>

            {/* Task Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Título da Tarefa *
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Ex: Alinhar escopo com a diretoria"
                value={quickAddModal.title}
                onChange={(e) => setQuickAddModal({ ...quickAddModal, title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitQuickAdd();
                }}
                className="w-full px-3 py-2 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Project Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
                <span>Projeto Vinculado</span>
              </label>
              <select
                value={quickAddModal.projectId}
                onChange={(e) => setQuickAddModal({ ...quickAddModal, projectId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs focus:outline-hidden focus:border-indigo-500"
              >
                <option value="">Sem Projeto (Geral)</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority & Story Points */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Prioridade</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['P1', 'P2', 'P3', 'P4'] as const).map((p) => {
                    const isSelected = quickAddModal.priority === p;
                    const color =
                      p === 'P1'
                        ? 'border-red-500 text-red-400 bg-red-950/40'
                        : p === 'P2'
                        ? 'border-amber-500 text-amber-400 bg-amber-950/40'
                        : p === 'P3'
                        ? 'border-blue-500 text-blue-400 bg-blue-950/40'
                        : 'border-slate-500 text-slate-400 bg-slate-900/40';

                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setQuickAddModal({ ...quickAddModal, priority: p })}
                        className={`py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                          isSelected ? color : 'border-white/5 bg-[#090e1a] text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Story Points</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={quickAddModal.storyPoints || ''}
                  onChange={(e) =>
                    setQuickAddModal({
                      ...quickAddModal,
                      storyPoints: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Time Toggle (On/Off) */}
            <div className="p-3 rounded-lg border border-white/5 bg-[#090e1a] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-200">Definir Horário Fixo</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setQuickAddModal({ ...quickAddModal, hasTime: !quickAddModal.hasTime })
                  }
                  className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${
                    quickAddModal.hasTime ? 'bg-indigo-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {quickAddModal.hasTime && (
                <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                  <input
                    type="time"
                    value={quickAddModal.time}
                    onChange={(e) => setQuickAddModal({ ...quickAddModal, time: e.target.value })}
                    className="px-2.5 py-1.5 rounded bg-[#101726] border border-white/10 text-slate-100 text-xs font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-400">Horário de início da atividade</span>
                </div>
              )}
            </div>

            {/* Reminders Toggle (On/Off) */}
            <div className="p-3 rounded-lg border border-white/5 bg-[#090e1a] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-200">Lembrete / Alerta</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setQuickAddModal({
                      ...quickAddModal,
                      hasReminder: !quickAddModal.hasReminder,
                    })
                  }
                  className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${
                    quickAddModal.hasReminder ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {quickAddModal.hasReminder && (
                <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                  <select
                    value={quickAddModal.reminderOffset}
                    onChange={(e) =>
                      setQuickAddModal({
                        ...quickAddModal,
                        reminderOffset: parseInt(e.target.value, 10),
                      })
                    }
                    className="px-2.5 py-1 rounded bg-[#101726] border border-white/10 text-slate-100 text-xs font-mono"
                  >
                    <option value="5">5 minutos antes</option>
                    <option value="15">15 minutos antes</option>
                    <option value="30">30 minutos antes</option>
                    <option value="60">1 hora antes</option>
                  </select>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Tags (separadas por vírgula)</span>
              </label>
              <input
                type="text"
                placeholder="reunião, cliente, sprint"
                value={quickAddModal.tagsInput}
                onChange={(e) => setQuickAddModal({ ...quickAddModal, tagsInput: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setQuickAddModal(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700/60 bg-[#121b2f] hover:bg-[#18233c] text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitQuickAdd}
                disabled={!quickAddModal.title.trim()}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
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
