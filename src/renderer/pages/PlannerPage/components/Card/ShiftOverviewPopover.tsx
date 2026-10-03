import React, { useState, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import {
  ArrowUpRight,
  Calendar,
  Check,
  Clock3,
  FolderKanban,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { PRIORITY_COLORS } from '@types';
import type { Project } from '@types';
import type { PlanningTask } from '../../types/planning.types';
import { Popover } from '../../../shared/components/primitives/Popover';

interface ShiftOverviewPopoverProps {
  title: string;
  tasks: PlanningTask[];
  projects?: Project[];
  slotId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onOpenAdd?: () => void;
  activeTaskId?: string | null;
  children?: React.ReactNode;
}

interface PopoverTaskRowProps {
  task: PlanningTask;
  project?: Project;
  slotId: string;
  isDraggingActive: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
}

function PopoverTaskRow({
  task,
  project,
  slotId,
  isDraggingActive: _isDraggingActive,
  onEdit,
  onToggleStatus,
}: PopoverTaskRowProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task, slotId },
  });

  const isDone = task.status === 'done';
  const priority = task.priority || 'P3';
  const priorityColor = PRIORITY_COLORS[priority] || '#3b82f6';
  const tags = (task.tags || []).filter(Boolean).slice(0, 3);
  const description = (task.description || task.descriptionHtml || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: 'none',
        opacity: isDragging ? 0.35 : 1,
      }}
      data-planning-task-id={task.id}
      {...attributes}
      {...listeners}
      className={`matrix-shift-popover-item ${isDone ? 'is-done' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
    >
      <div className="matrix-shift-popover-item-main">
        <button
          type="button"
          className="matrix-shift-popover-check"
          aria-label={isDone ? 'Marcar como pendente' : 'Marcar como concluída'}
          aria-pressed={isDone}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus();
          }}
        >
          {isDone && <Check size={11} strokeWidth={3} />}
        </button>

        <span
          className="matrix-shift-popover-priority-pill"
          style={{
            color: priorityColor,
            borderColor: `${priorityColor}55`,
            backgroundColor: `${priorityColor}18`,
          }}
        >
          {priority}
        </span>

        <div className="matrix-shift-popover-item-details">
          <strong className="matrix-shift-popover-item-title">{task.title}</strong>
          {description && (
            <p className="matrix-shift-popover-item-desc">{description}</p>
          )}

          <div className="matrix-shift-popover-item-meta">
            {task.time && (
              <span className="matrix-shift-popover-meta-badge">
                <Clock3 size={10} />
                {task.time}
              </span>
            )}
            {project && (
              <span className="matrix-shift-popover-meta-badge" title={project.name}>
                <FolderKanban size={10} />
                {project.name}
              </span>
            )}
            {tags.map((tag) => (
              <span key={tag} className="matrix-shift-popover-tag-badge">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="matrix-shift-popover-edit-btn"
          aria-label={`Editar ${task.title}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <span>Abrir</span>
          <ArrowUpRight size={12} />
        </button>
      </div>
    </article>
  );
}

export function ShiftOverviewPopover({
  title,
  tasks,
  projects = [],
  slotId,
  open,
  onOpenChange,
  onEdit,
  onToggleStatus,
  onOpenAdd,
  activeTaskId,
  children,
}: ShiftOverviewPopoverProps) {
  const [search, setSearch] = useState('');

  const doneCount = tasks.filter((t) => t.status === 'done').length;

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLocaleLowerCase('pt-BR');
    return tasks.filter(
      (t) =>
        t.title.toLocaleLowerCase('pt-BR').includes(q) ||
        t.tags?.some((tag) => tag.toLocaleLowerCase('pt-BR').includes(q))
    );
  }, [tasks, search]);

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      {children && <Popover.Anchor asChild>{children}</Popover.Anchor>}

      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={8}
          collisionPadding={14}
          className="matrix-shift-popover"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDown={(e) => e.stopPropagation()}
          onInteractOutside={(e) => {
            if (activeTaskId) e.preventDefault();
          }}
        >
          {/* Header */}
          <div className="matrix-shift-popover-header">
            <div className="matrix-shift-popover-header-title">
              <span className="matrix-shift-popover-header-icon">
                <Calendar size={13} />
              </span>
              <div>
                <strong>{title}</strong>
                <div className="matrix-shift-popover-counts">
                  <span>{tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}</span>
                  {doneCount > 0 && <small>({doneCount} concluída{doneCount > 1 ? 's' : ''})</small>}
                </div>
              </div>
            </div>

            <div className="matrix-shift-popover-header-actions">
              {onOpenAdd && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenAdd();
                  }}
                  className="matrix-shift-popover-add-btn"
                  title="Nova tarefa neste turno"
                >
                  <Plus size={13} />
                  <span>Nova</span>
                </button>
              )}
              <Popover.Close asChild>
                <button
                  type="button"
                  className="matrix-shift-popover-close-btn"
                  aria-label="Fechar pop-up"
                >
                  <X size={14} />
                </button>
              </Popover.Close>
            </div>
          </div>

          {/* Quick Filter (if more than 4 tasks) */}
          {tasks.length > 4 && (
            <div className="matrix-shift-popover-search">
              <Search size={12} className="matrix-shift-popover-search-icon" />
              <input
                type="text"
                placeholder="Filtrar tarefas ou tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="matrix-shift-popover-search-input"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="matrix-shift-popover-search-clear"
                  aria-label="Limpar filtro"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          {/* Tasks List */}
          <div className="matrix-shift-popover-list">
            {filteredTasks.map((task) => (
              <PopoverTaskRow
                key={task.id}
                task={task}
                project={projects.find((p) => p.id === task.projectId)}
                slotId={slotId}
                isDraggingActive={Boolean(activeTaskId)}
                onEdit={() => {
                  onOpenChange(false);
                  onEdit(task.id);
                }}
                onToggleStatus={() => onToggleStatus(task.id)}
              />
            ))}

            {filteredTasks.length === 0 && (
              <div className="matrix-shift-popover-empty">
                {search ? 'Nenhuma tarefa encontrada no filtro.' : 'Nenhuma tarefa neste turno.'}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="matrix-shift-popover-footer">
            <span>Arraste uma tarefa para mover ou clique para editar</span>
          </div>

          <Popover.Arrow className="matrix-shift-popover-arrow" width={12} height={6} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
