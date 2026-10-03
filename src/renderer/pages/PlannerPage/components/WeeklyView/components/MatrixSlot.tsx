import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { PlanningTask } from '../../../types/planning.types';
import { MatrixTaskCard } from '../../Card/MatrixTaskCard';
import { ShiftOverviewPopover } from '../../Card/ShiftOverviewPopover';
import { Plus } from 'lucide-react';
import type { Project } from '@types';
import './matrix-slot.css';

export interface MatrixSlotProps {
  id: string;
  label?: string;
  isBacklog?: boolean;
  tasks: PlanningTask[];
  projects?: Project[];
  selectedTaskId: string | null;
  activeTask?: PlanningTask | null;
  isDragTarget?: boolean;
  onSelectTask: (taskId: string) => void;
  onSlotClick: (slotId: string) => void;
  onEdit: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onPostponeWeek?: (id: string) => void;
  onOpenAdd: () => void;
  onQuickCreate?: (title: string) => void;
}

export const MatrixSlot: React.FC<MatrixSlotProps> = ({
  id,
  label,
  isBacklog,
  tasks,
  projects = [],
  selectedTaskId,
  activeTask,
  isDragTarget = false,
  onSelectTask,
  onSlotClick,
  onEdit,
  onToggleStatus,
  onPostponeWeek: _onPostponeWeek,
  onOpenAdd,
  onQuickCreate,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id, data: { slotId: id } });
  const [isInlineAdding, setIsInlineAdding] = React.useState(false);
  const [inlineTitle, setInlineTitle] = React.useState('');
  const [showOverview, setShowOverview] = React.useState(false);
  const inlineInputRef = React.useRef<HTMLInputElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [maxFit, setMaxFit] = React.useState<number>(tasks.length);

  const isActiveDropTarget = isOver || isDragTarget;

  // Calcula dinamicamente o número máximo de demandas que cabem na altura disponível do turno
  React.useLayoutEffect(() => {
    if (isBacklog) {
      setMaxFit(tasks.length);
      return;
    }

    const el = contentRef.current;
    if (!el) return;

    const computeMaxFit = () => {
      const containerHeight = el.clientHeight;
      if (containerHeight <= 0) return;

      // Cartões com 1 ou 2 linhas têm altura média de ~29px (incluindo gap de 3px).
      // O botão de overflow (+X demandas) ocupa ~22px.
      const avgCardHeight = 29;
      const overflowBtnHeight = 22;

      // Se todas as tarefas couberem sem botão de overflow:
      if (tasks.length * avgCardHeight <= containerHeight) {
        setMaxFit(tasks.length);
        return;
      }

      // Se houver overflow, reserva espaço para o botão +X demandas
      const availableForCards = Math.max(0, containerHeight - overflowBtnHeight);
      const fit = Math.max(1, Math.floor(availableForCards / avgCardHeight));
      setMaxFit(fit);
    };

    computeMaxFit();
    const observer = new ResizeObserver(computeMaxFit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isBacklog, tasks.length]);

  React.useEffect(() => {
    if (isInlineAdding) inlineInputRef.current?.focus();
  }, [isInlineAdding]);

  const submitInlineTask = () => {
    if (inlineTitle.trim()) {
      if (onQuickCreate) onQuickCreate(inlineTitle.trim());
      else onOpenAdd();
      setInlineTitle('');
    }
    setIsInlineAdding(false);
  };

  const visibleTasks = isBacklog ? tasks : tasks.slice(0, maxFit);
  const hiddenTaskCount = Math.max(0, tasks.length - visibleTasks.length);

  return (
    <ShiftOverviewPopover
      title={label || 'Turno'}
      tasks={tasks}
      projects={projects}
      slotId={id}
      open={showOverview}
      onOpenChange={setShowOverview}
      onEdit={onEdit}
      onToggleStatus={onToggleStatus}
      onOpenAdd={() => {
        setShowOverview(false);
        onOpenAdd();
      }}
      activeTaskId={activeTask?.id}
    >
      <div
        ref={setNodeRef}
        onClick={() => {
          if (selectedTaskId) onSlotClick(id);
        }}
        style={{
          background: isActiveDropTarget
            ? 'color-mix(in srgb, var(--color-primary, #6366f1) 16%, #0c1322)'
            : isBacklog
              ? '#0c1220'
              : '#0e1526',
          borderColor: isActiveDropTarget
            ? 'rgba(129, 140, 248, 0.85)'
            : selectedTaskId
              ? 'rgba(99,102,241,0.5)'
              : 'rgba(255,255,255,0.06)',
        }}
        className={`planner-matrix-slot group/slot ${isBacklog ? 'is-backlog' : ''} ${
          isActiveDropTarget ? 'is-over' : ''
        } ${selectedTaskId ? 'is-move-target' : ''}`}
      >
        <div ref={contentRef} className="planner-matrix-slot-content">
          {tasks.length > 0 && (
            <SortableContext
              items={visibleTasks.map(task => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className={`planner-matrix-task-grid ${isBacklog ? 'is-backlog' : ''}`}>
                {visibleTasks.map(task => (
                  <MatrixTaskCard
                    key={task.id}
                    task={task}
                    project={projects.find(p => p.id === task.projectId)}
                    slotId={id}
                    previewDisabled={Boolean(activeTask)}
                    isSelected={selectedTaskId === task.id}
                    onEdit={() => onEdit(task.id)}
                    onSelectTask={onSelectTask}
                    onToggleStatus={onToggleStatus}
                  />
                ))}

                {hiddenTaskCount > 0 && (
                  <button
                    type="button"
                    className="matrix-task-overflow-btn"
                    aria-label={`Ver mais ${hiddenTaskCount} tarefas de ${label || 'este turno'}`}
                    onClick={event => {
                      event.stopPropagation();
                      setShowOverview(true);
                    }}
                  >
                    +{hiddenTaskCount} {hiddenTaskCount === 1 ? 'demanda' : 'demandas'}
                  </button>
                )}

                {/* Sombra onde a tarefa vai cair se o slot tem tarefas */}
                {isActiveDropTarget && activeTask && (
                  <div className="matrix-task-drop-shadow" aria-hidden="true">
                    <span className="matrix-task-drop-shadow-indicator" />
                    <span className="matrix-task-drop-shadow-title">{activeTask.title}</span>
                    <span className="matrix-task-drop-shadow-badge">Soltar aqui</span>
                  </div>
                )}

                {isInlineAdding && (
                  <form
                    onSubmit={event => {
                      event.preventDefault();
                      submitInlineTask();
                    }}
                    onClick={event => event.stopPropagation()}
                    className="matrix-slot-inline-form"
                  >
                    <input
                      ref={inlineInputRef}
                      type="text"
                      value={inlineTitle}
                      onChange={event => setInlineTitle(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Escape') {
                          event.stopPropagation();
                          setIsInlineAdding(false);
                          setInlineTitle('');
                        }
                      }}
                      placeholder="Nome da tarefa..."
                      aria-label="Nome da nova tarefa"
                    />
                    <div>
                      <span>Enter salva</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsInlineAdding(false);
                          onOpenAdd();
                        }}
                      >
                        Mais campos
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </SortableContext>
          )}

          {tasks.length === 0 && isInlineAdding && (
            <form
              onSubmit={event => {
                event.preventDefault();
                submitInlineTask();
              }}
              onClick={event => event.stopPropagation()}
              className="matrix-slot-inline-form is-empty-slot"
            >
              <input
                ref={inlineInputRef}
                type="text"
                value={inlineTitle}
                onChange={event => setInlineTitle(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    setIsInlineAdding(false);
                    setInlineTitle('');
                  }
                }}
                placeholder="Nome da tarefa..."
                aria-label="Nome da nova tarefa"
              />
              <div>
                <span>Enter salva</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsInlineAdding(false);
                    onOpenAdd();
                  }}
                >
                  Mais campos
                </button>
              </div>
            </form>
          )}

          {/* Sombra onde a tarefa vai cair se o slot esta vazio */}
          {tasks.length === 0 && isActiveDropTarget && activeTask && (
            <div className="planner-matrix-task-grid">
              <div className="matrix-task-drop-shadow is-empty-slot-shadow" aria-hidden="true">
                <span className="matrix-task-drop-shadow-indicator" />
                <span className="matrix-task-drop-shadow-title">{activeTask.title}</span>
                <span className="matrix-task-drop-shadow-badge">Soltar aqui</span>
              </div>
            </div>
          )}

          {tasks.length === 0 && !isInlineAdding && (!isActiveDropTarget || !activeTask) && (
            <button
              type="button"
              className="matrix-slot-empty"
              onClick={event => {
                if (!selectedTaskId) {
                  event.stopPropagation();
                  setIsInlineAdding(true);
                }
              }}
            >
              <span><Plus size={12} /></span>
              {selectedTaskId ? 'Clique para mover' : 'Criar tarefa ou arraste'}
            </button>
          )}
        </div>

        {tasks.length > 0 && !isInlineAdding && (
          <div className="matrix-slot-footer">
            <button
              type="button"
              className="matrix-slot-count"
              onClick={event => {
                event.stopPropagation();
                setShowOverview(true);
              }}
            >
              {tasks.length} {tasks.length === 1 ? 'demanda' : 'demandas'}
            </button>
            <button
              type="button"
              className="matrix-slot-add"
              onClick={event => {
                event.stopPropagation();
                setIsInlineAdding(true);
              }}
            >
              <Plus size={11} />
              <span>Nova</span>
            </button>
          </div>
        )}
      </div>
    </ShiftOverviewPopover>
  );
};
