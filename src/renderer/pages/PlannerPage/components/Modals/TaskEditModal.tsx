import { useState, useEffect } from 'react';
import { PlanningTask } from '../../types/planning.types';
import type { Project } from '@types';

interface TaskEditModalProps {
  task: PlanningTask | null;
  projects?: Project[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<PlanningTask>) => void;
}

export const TaskEditModal = ({ task, projects = [], isOpen, onClose, onSave }: TaskEditModalProps) => {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<PlanningTask['status']>('todo');
  const [priority, setPriority] = useState<PlanningTask['priority']>('P3');
  const [projectId, setProjectId] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [storyPoints, setStoryPoints] = useState<number>(0);
  const [date, setDate] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStatus(task.status || 'todo');
      setPriority(task.priority || 'P3');
      setProjectId(task.projectId || '');
      setTime(task.time || '');
      setStoryPoints(task.storyPoints || 0);
      setDate(task.date || '');
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    onSave(task.id, {
      title: title.trim() || task.title,
      status,
      priority,
      projectId: projectId || null,
      time: time.trim() || null,
      storyPoints: storyPoints || undefined,
      date: date || null,
      hasDate: !!date,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0e1628',
          padding: '24px',
          borderRadius: '12px',
          width: '500px',
          maxWidth: '92vw',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          color: '#f8fafc',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>
          Editar Card de Tarefa
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
              Título
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da tarefa"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#131d33',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#ffffff',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: '#131d33',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                <option value="todo">A Fazer</option>
                <option value="in_progress">Em Progresso</option>
                <option value="blocked">Bloqueado</option>
                <option value="done">Concluído</option>
                <option value="postponed">Adiado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Prioridade
              </label>
              <select
                value={priority || 'P3'}
                onChange={(e) => setPriority((e.target.value as any) || null)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: '#131d33',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                <option value="P1">P1 (Crítico - Vermelho)</option>
                <option value="P2">P2 (Alto - Laranja)</option>
                <option value="P3">P3 (Médio - Azul)</option>
                <option value="P4">P4 (Baixo - Cinza)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Projeto Vinculado
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: '#131d33',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  outline: 'none',
                }}
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
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Horário (HH:mm)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: '#131d33',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Story Points
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={storyPoints}
                onChange={(e) => setStoryPoints(parseInt(e.target.value, 10) || 0)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: '#131d33',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: '#131d33',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 14px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#94a3b8',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '7px 16px',
              background: 'var(--color-primary, #6366f1)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};
