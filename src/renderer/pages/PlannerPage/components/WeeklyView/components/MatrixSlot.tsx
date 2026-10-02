import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { PlanningTask } from '../../../types/planning.types';
import { MatrixTaskCard } from '../../Card/MatrixTaskCard';
import { TurnOverviewModal } from '../../Card/TurnOverviewModal';
import { Plus } from 'lucide-react';
import type { Project } from '@types';
import './matrix-slot.css';

const MAX_MATRIX_ITEMS = 6;

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
  onPostponeWeek: (id: string) => void;
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
  onPostponeWeek,
  onOpenAdd,
  onQuickCreate,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [isInlineAdding, setIsInlineAdding] = React.useState(false);
  const [inlineTitle, setInlineTitle] = React.useState('');
  const [showOverview, setShowOverview] = React.useState(false);
  const inlineInputRef = React.useRef<HTMLInputElement>(null);

  const hasOverflow = !isBacklog && tasks.length > MAX_MATRIX_ITEMS;
  const visibleTaskLimit = hasOverflow ? MAX_MATRIX_ITEMS - 1 : MAX_MATRIX_ITEMS;
  const visibleTasks = isBacklog ? tasks : tasks.slice(0, visibleTaskLimit);
  const hiddenTaskCount = Math.max(0, tasks.length - visibleTasks.length);
  const isActiveDropTarget = isOver || isDragTarget;

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

  return (
    <div
      ref={setNodeRef}
      onClick={() => {
        if (selectedTaskId) onSlotClick(id);
      }}
      style={{
        background: isActiveDropTarget
          ? 'color-mix(in srgb, var(--color-primary, #6366f1) 18%, #0f172a)'
          : isBacklog
            ? '#0c1220'
            : '#0e1526',
        borderColor: isActiveDropTarget
          ? 'var(--color-primary, #6366f1)'
          : selectedTaskId
            ? 'rgba(99,102,241,0.5)'
            : 'rgba(255,255,255,0.06)',
      }}
      className={`planner-matrix-slot group/slot ${isBacklog ? 'is-backlog' : ''} ${
        isActiveDropTarget ? 'is-over' : ''
      } ${selectedTaskId ? 'is-move-target' : ''}`}
    >
      <div className="planner-matrix-slot-content">
        {tasks.length > 0 && (
          <SortableContext
            items={visibleTasks.map(task => task.id)}
            strategy={isBacklog ? verticalListSortingStrategy : rectSortingStrategy}
          >
            <div className={`planner-matrix-task-grid ${isBacklog ? 'is-backlog' : ''}`}>
              {visibleTasks.map(task => {
                const project = projects.find(item => item.id === task.projectId);
                return (
                  <MatrixTaskCard
                    key={task.id}
                    task={task}
                    project={project}
                    slotId={id}
                    previewDisabled={Boolean(activeTask)}
                    isSelected={selectedTaskId === task.id}
                    onEdit={() => onEdit(task.id)}
                    onSelectTask={onSelectTask}
                    onToggleStatus={onToggleStatus}
                    onPostponeWeek={onPostponeWeek}
                  />
                );
              })}

              {hiddenTaskCount > 0 && (
                <button
                  type="button"
                  className="matrix-task-overflow"
                  aria-label={`Ver as ${tasks.length} tarefas de ${label || 'este turno'}`}
                  onClick={event => {
                    event.stopPropagation();
                    setShowOverview(true);
                  }}
                >
                  <span>+{hiddenTaskCount}</span>
                  <small>{hiddenTaskCount === 1 ? 'tarefa' : 'tarefas'}</small>
                </button>
              )}

              {isActiveDropTarget && activeTask && !tasks.some(task => task.id === activeTask.id) && (
                <div className="matrix-task-drop-preview" aria-hidden="true">
                  <span />
                  <strong>{activeTask.title}</strong>
                  <small>Soltar aqui</small>
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

        {tasks.length === 0 && isActiveDropTarget && activeTask && (
          <div className="planner-matrix-task-grid is-drop-target">
            <div className="matrix-task-drop-preview" aria-hidden="true">
              <span />
              <strong>{activeTask.title}</strong>
              <small>Soltar aqui</small>
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
            <span><Plus size={13} /></span>
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
            {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
          </button>
          <button
            type="button"
            className="matrix-slot-add"
            onClick={event => {
              event.stopPropagation();
              setIsInlineAdding(true);
            }}
          >
            <Plus size={12} />
            <span>Nova</span>
          </button>
        </div>
      )}

      {showOverview && (
        <TurnOverviewModal
          title={label || 'Turno'}
          tasks={tasks}
          onClose={() => setShowOverview(false)}
          onEdit={onEdit}
        />
      )}
    </div>
  );
};
