import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import type { Project } from '@types';
import { Clock } from 'lucide-react';
import {
  DailyHourSlot,
  DailyViewHeader,
  DailySidebar,
} from './components';
import { PlanningQuickAddModal, type PlanningQuickAddState } from '../Modals/PlanningQuickAddModal';

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
  const [quickAddModal, setQuickAddModal] = useState<PlanningQuickAddState | null>(null);

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

  // Formatted date string
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

  // Overdue Tasks
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

  // Top 3 Priorities for Selected Day
  const topPriorities = useMemo(() => {
    return dayTasks
      .filter((t) => (t.priority === 'P1' || t.priority === 'P2') && t.status !== 'done')
      .slice(0, 3);
  }, [dayTasks]);

  // Unscheduled / Free Tasks of the Day
  const unassignedDayTasks = useMemo(() => {
    return dayTasks.filter((t) => !t.time && t.status !== 'done');
  }, [dayTasks]);

  // Tasks by Hour map
  const hourTasksMap = useMemo(() => {
    const map = new Map<number, PlanningTask[]>();
    for (const h of HOURS) {
      const matched = dayTasks.filter((t) => {
        if (!t.time) return false;
        const hour = parseInt(t.time.slice(0, 2), 10);
        return hour === h;
      });
      map.set(h, matched);
    }
    return map;
  }, [dayTasks]);

  // Stats calculation
  const totalTasksCount = dayTasks.length;
  const completedCount = completedTodayTasks.length;
  const completionPercentage =
    totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;

  const totalStoryPoints = useMemo(() => {
    return dayTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  }, [dayTasks]);

  const completedStoryPoints = useMemo(() => {
    return completedTodayTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  }, [completedTodayTasks]);

  // Real-time current time indicator
  const [currentMinutesFrom6am, setCurrentMinutesFrom6am] = useState<number | null>(null);

  useEffect(() => {
    const updateNowLine = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      if (h >= 6 && h < 24) {
        const totalMinutes = (h - 6) * 60 + m;
        setCurrentMinutesFrom6am(totalMinutes);
      } else {
        setCurrentMinutesFrom6am(null);
      }
    };
    updateNowLine();
    const interval = setInterval(updateNowLine, 60000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuickAddModal(null);
      }
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        setDayOffset((d) => d - 1);
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        setDayOffset((d) => d + 1);
      } else if (e.altKey && (e.key === 'Home' || e.key === 'h' || e.key === 't')) {
        e.preventDefault();
        setDayOffset(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

    if (overId.startsWith('hour:')) {
      const hour = parseInt(overId.replace('hour:', ''), 10);
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      onUpdateTask?.(draggedTaskId, {
        time: timeStr,
        date: selectedDateStr,
        hasDate: true,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const targetTask = tasks.find((t) => t.id === overId);
    if (targetTask && targetTask.time) {
      onUpdateTask?.(draggedTaskId, {
        time: targetTask.time,
        date: selectedDateStr,
        hasDate: true,
        updatedAt: new Date().toISOString(),
      });
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

  const openQuickAdd = (hour?: number) => {
    const time = hour !== undefined ? `${hour.toString().padStart(2, '0')}:00` : '09:00';
    setQuickAddModal({
      isOpen: true,
      time,
      title: '',
      projectId: '',
      priority: 'P3',
      hasTime: hour !== undefined,
      hasReminder: false,
      reminderOffset: 15,
      storyPoints: 0,
      tagsInput: '',
    });
  };

  const submitQuickAdd = () => {
    if (!quickAddModal || !quickAddModal.title.trim()) return;

    const {
      time,
      title,
      projectId,
      priority,
      hasTime,
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
      time: hasTime && time.trim() ? time.trim() : null,
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
      <DailyViewHeader
        dayOffset={dayOffset}
        formattedDateTitle={formattedDateTitle}
        isToday={isToday}
        completedCount={completedCount}
        totalTasksCount={totalTasksCount}
        completionPercentage={completionPercentage}
        totalStoryPoints={totalStoryPoints}
        completedStoryPoints={completedStoryPoints}
        onSetDayOffset={setDayOffset}
        onOpenQuickAdd={() => openQuickAdd()}
      />

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
          <DailySidebar
            overdueTasks={overdueTasks}
            topPriorities={topPriorities}
            unassignedDayTasks={unassignedDayTasks}
            completedTodayTasks={completedTodayTasks}
            projects={projects}
            isCompletedCollapsed={isCompletedCollapsed}
            onRescheduleOverdue={onRescheduleOverdue}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onToggleCompletedCollapsed={() => setIsCompletedCollapsed((prev) => !prev)}
            onOpenQuickAdd={() => openQuickAdd()}
          />

          {/* Right Panel: Time Blocking Timeline Grid (06:00 - 23:00) */}
          <div className="flex-1 flex flex-col border border-white/5 rounded-xl bg-[#0c1220] overflow-hidden min-w-0 h-full">
            <div className="px-4 py-2 border-b border-white/5 bg-[#0e1526] flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Cronograma Horário (06:00 — 23:00)</span>
              </div>
              <span className="text-[10px] font-normal text-slate-500">
                Arraste tarefas para os horários ou clique para agendar
              </span>
            </div>

            <div className="relative flex-1 overflow-y-auto">
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
                    onQuickCreate={(title) => {
                      onAddTask?.({
                        title,
                        date: selectedDateStr,
                        time: `${hour.toString().padStart(2, '0')}:00`,
                        status: 'todo',
                        priority: 'P3',
                        location: { day: null, period: null },
                      });
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <DragOverlay zIndex={9999}>{null}</DragOverlay>
      </DndContext>

      <PlanningQuickAddModal
        modal={quickAddModal}
        projects={projects}
        contextTitle="Nova Tarefa para o Dia"
        contextSubtitle={formattedDateTitle}
        onChange={setQuickAddModal}
        onSubmit={submitQuickAdd}
      />
    </div>
  );
};
