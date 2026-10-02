import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { PlanningTask } from '../../../types/planning.types';
import { MatrixTagGroup } from '../../Card/MatrixTagGroup';
import { TurnOverviewModal } from '../../Card/TurnOverviewModal';
import { Plus } from 'lucide-react';
import type { Project } from '@types';
import './matrix-slot.css';

const MAX_MATRIX_GROUPS = 6;

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
  onPostponeWeek: _onPostponeWeek,
  onOpenAdd,
  onQuickCreate,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [isInlineAdding, setIsInlineAdding] = React.useState(false);
  const [inlineTitle, setInlineTitle] = React.useState('');
  const [showOverview, setShowOverview] = React.useState(false);
  const inlineInputRef = React.useRef<HTMLInputElement>(null);

  const taskGroups = React.useMemo(() => {
    const groups = new Map<string, { label: string; tasks: PlanningTask[] }>();
    tasks.forEach(task => {
      const sourceTag = task.tags?.find(tag => tag?.trim());
      const label = sourceTag?.trim() || 'Sem tag';
      const key = label.toLocaleLowerCase('pt-BR');
      const current = groups.get(key);
      if (current) current.tasks.push(task);
      else groups.set(key, { label, tasks: [task] });
    });
    return Array.from(groups.values());
  }, [tasks]);
  const hasOverflow = !isBacklog && taskGroups.length > MAX_MATRIX_GROUPS;
  const visibleGroupLimit = hasOverflow ? MAX_MATRIX_GROUPS - 1 : MAX_MATRIX_GROUPS;
  const visibleGroups = isBacklog ? taskGroups : taskGroups.slice(0, visibleGroupLimit);
  const hiddenGroups = taskGroups.slice(visibleGroups.length);
  const hiddenTaskCount = hiddenGroups.reduce((total, group) => total + group.tasks.length, 0);
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
            items={visibleGroups.flatMap(group => group.tasks.map(task => task.id))}
            strategy={isBacklog ? verticalListSortingStrategy : rectSortingStrategy}
          >
            <div className={`planner-matrix-task-grid ${isBacklog ? 'is-backlog' : ''}`}>
              {visibleGroups.map(group => (
                <MatrixTagGroup
                  key={group.label.toLocaleLowerCase('pt-BR')}
                  label={group.label}
                  tasks={group.tasks}
                  projects={projects}
                  slotId={id}
                  activeTask={activeTask}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={onSelectTask}
                  onEdit={onEdit}
                  onToggleStatus={onToggleStatus}
                />
              ))}

              {hiddenTaskCount > 0 && (
                <button
                  type="button"
                  className="matrix-task-overflow"
                  aria-label={`Ver as ${tasks.length} demandas de ${label || 'este turno'}`}
                  onClick={event => {
                    event.stopPropagation();
                    setShowOverview(true);
                  }}
                >
                  <span>+{hiddenGroups.length} {hiddenGroups.length === 1 ? 'tag' : 'tags'}</span>
                  <small>{hiddenTaskCount} {hiddenTaskCount === 1 ? 'demanda' : 'demandas'}</small>
                </button>
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
          <div className="matrix-slot-drop-target" aria-hidden="true">Soltar neste turno</div>
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
