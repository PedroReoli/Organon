import React from 'react'
import {
  CheckCircle2,
  TrendingUp,
  FileText,
  FolderKanban,
  ArrowUpRight
} from 'lucide-react'

interface DashboardKpiRowProps {
  totalTasks: number
  pendingTasks: number
  completedTasks: number
  weekCompleted: number
  weekTotal: number
  notesCount: number
  projectsCount?: number
  onNavigateToTasks?: () => void
  onNavigateToNotes?: () => void
  onNavigateToProjects?: () => void
}

export const DashboardKpiRow: React.FC<DashboardKpiRowProps> = ({
  totalTasks,
  pendingTasks,
  completedTasks,
  weekCompleted,
  weekTotal,
  notesCount,
  projectsCount = 0,
  onNavigateToTasks,
  onNavigateToNotes,
  onNavigateToProjects,
}) => {
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const weekRate = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* KPI 1: Tasks Today & Completion (Theme Primary Accent) */}
      <div
        onClick={onNavigateToTasks}
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
        className="group relative overflow-hidden border p-3.5 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
      >
        <div className="flex items-center justify-between mb-2">
          <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-semibold">Tarefas & Conclusão</span>
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary)',
            }}
            className="p-1.5 rounded-lg"
          >
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <div style={{ color: 'var(--color-text)' }} className="text-xl font-bold">
            {completedTasks} <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-normal">/ {totalTasks} feitas</span>
          </div>
          <span style={{ color: 'var(--color-primary)' }} className="text-xs font-bold">
            {taskCompletionRate}%
          </span>
        </div>
        <div
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
          className="w-full h-1.5 rounded-full mt-2.5 overflow-hidden"
        >
          <div
            style={{
              width: `${taskCompletionRate}%`,
              background: 'var(--color-primary)',
            }}
            className="h-full rounded-full transition-all duration-500"
          />
        </div>
        <div style={{ color: 'var(--color-text-muted)' }} className="flex items-center justify-between mt-2 text-[11px]">
          <span>{pendingTasks} pendentes hoje</span>
          <span
            style={{ color: 'var(--color-primary)' }}
            className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium"
          >
            Ver Kanban <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* KPI 2: Weekly Performance */}
      <div
        onClick={onNavigateToTasks}
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
        className="group relative overflow-hidden border p-3.5 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
      >
        <div className="flex items-center justify-between mb-2">
          <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-semibold">Semana Atual</span>
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary)',
            }}
            className="p-1.5 rounded-lg"
          >
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <div style={{ color: 'var(--color-text)' }} className="text-xl font-bold">
            {weekCompleted} <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-normal">/ {weekTotal} cards</span>
          </div>
          <span style={{ color: 'var(--color-primary)' }} className="text-xs font-bold">
            {weekRate}%
          </span>
        </div>
        <div
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
          className="w-full h-1.5 rounded-full mt-2.5 overflow-hidden"
        >
          <div
            style={{
              width: `${weekRate}%`,
              background: 'var(--color-primary)',
            }}
            className="h-full rounded-full transition-all duration-500"
          />
        </div>
        <div style={{ color: 'var(--color-text-muted)' }} className="flex items-center justify-between mt-2 text-[11px]">
          <span>Produtividade semanal</span>
          <span
            style={{ color: 'var(--color-primary)' }}
            className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium"
          >
            Detalhes <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* KPI 3: Notes & Knowledge Base */}
      <div
        onClick={onNavigateToNotes}
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
        className="group relative overflow-hidden border p-3.5 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
      >
        <div className="flex items-center justify-between mb-2">
          <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-semibold">Notas & Conhecimento</span>
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary)',
            }}
            className="p-1.5 rounded-lg"
          >
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <div style={{ color: 'var(--color-text)' }} className="text-xl font-bold">
            {notesCount} <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-normal">documentos</span>
          </div>
          <span style={{ color: 'var(--color-primary)' }} className="text-xs font-semibold">
            Markdown
          </span>
        </div>
        <div
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
          className="w-full h-1.5 rounded-full mt-2.5 overflow-hidden"
        >
          <div
            style={{
              width: '100%',
              background: 'var(--color-primary)',
            }}
            className="h-full rounded-full"
          />
        </div>
        <div style={{ color: 'var(--color-text-muted)' }} className="flex items-center justify-between mt-2 text-[11px]">
          <span>Base sincronizada</span>
          <span
            style={{ color: 'var(--color-primary)' }}
            className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium"
          >
            Explorar <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* KPI 4: Projects & Git */}
      <div
        onClick={onNavigateToProjects}
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
        className="group relative overflow-hidden border p-3.5 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
      >
        <div className="flex items-center justify-between mb-2">
          <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-semibold">Projetos & Git</span>
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary)',
            }}
            className="p-1.5 rounded-lg"
          >
            <FolderKanban className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <div style={{ color: 'var(--color-text)' }} className="text-xl font-bold">
            {projectsCount} <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-normal">repositórios</span>
          </div>
          <span style={{ color: 'var(--color-primary)' }} className="text-xs font-bold">
            Ativos
          </span>
        </div>
        <div
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
          className="w-full h-1.5 rounded-full mt-2.5 overflow-hidden"
        >
          <div
            style={{
              width: '100%',
              background: 'var(--color-primary)',
            }}
            className="h-full rounded-full"
          />
        </div>
        <div style={{ color: 'var(--color-text-muted)' }} className="flex items-center justify-between mt-2 text-[11px]">
          <span>Organon Git Engine</span>
          <span
            style={{ color: 'var(--color-primary)' }}
            className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium"
          >
            Acessar <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  )
}
