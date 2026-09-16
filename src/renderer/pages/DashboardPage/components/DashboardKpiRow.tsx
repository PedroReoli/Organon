import React, { useState } from 'react'
import {
  CheckCircle2,
  TrendingUp,
  FileText,
  FolderKanban,
  ArrowUpRight,
  Sparkles,
  GitBranch
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
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const weekRate = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* KPI 1: Tasks Today & Completion (with Interactive Radial / Gauge Spark) */}
      <div
        onClick={onNavigateToTasks}
        onMouseEnter={() => setHoveredCard('tasks')}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          background: 'var(--color-surface)',
          borderColor: hoveredCard === 'tasks' ? 'var(--color-primary)' : 'var(--color-border)',
        }}
        className="group relative overflow-hidden border p-3.5 rounded-xl shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer select-none"
      >
        {/* Ambient Top Glow */}
        <div
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 70%)',
          }}
          className="absolute inset-0 pointer-events-none rounded-xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        />

        <div className="flex items-center justify-between mb-2 relative z-10">
          <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-semibold flex items-center gap-1.5">
            Tarefas & Conclusão
          </span>
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
              color: 'var(--color-primary)',
            }}
            className="p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-110"
          >
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-end justify-between relative z-10">
          <div>
            <div style={{ color: 'var(--color-text)' }} className="text-2xl font-black tracking-tight leading-none">
              {completedTasks}
              <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-normal ml-1">
                / {totalTasks} feitas
              </span>
            </div>
            <div style={{ color: 'var(--color-primary)' }} className="text-xs font-bold mt-1">
              {taskCompletionRate}% taxa de entrega
            </div>
          </div>

          {/* Micro SVG Ring Progress Sparkline */}
          <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="14"
                stroke="color-mix(in srgb, var(--color-border) 60%, transparent)"
                strokeWidth="3.5"
                fill="none"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                stroke="var(--color-primary)"
                strokeWidth="3.5"
                strokeDasharray={`${(taskCompletionRate / 100) * 88} 88`}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-700"
                style={{
                  filter: hoveredCard === 'tasks' ? 'drop-shadow(0 0 3px var(--color-primary))' : 'none',
                }}
              />
            </svg>
            <Sparkles className="w-3 h-3 absolute" style={{ color: 'var(--color-primary)' }} />
          </div>
        </div>

        {/* Progress Bar with glowing spark */}
        <div
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
          className="w-full h-1.5 rounded-full mt-3 overflow-hidden relative z-10"
        >
          <div
            style={{
              width: `${taskCompletionRate}%`,
              background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 60%, transparent), var(--color-primary))',
              boxShadow: hoveredCard === 'tasks' ? '0 0 8px var(--color-primary)' : 'none',
            }}
            className="h-full rounded-full transition-all duration-500"
          />
        </div>

        <div style={{ color: 'var(--color-text-muted)' }} className="flex items-center justify-between mt-2.5 text-[11px] relative z-10">
          <span className="truncate">{pendingTasks} pendentes hoje</span>
          <span
            style={{ color: 'var(--color-primary)' }}
            className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-semibold shrink-0"
          >
            Kanban <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* KPI 2: Weekly Performance (with SVG Sparkline Wave) */}
      <div
        onClick={onNavigateToTasks}
        onMouseEnter={() => setHoveredCard('week')}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          background: 'var(--color-surface)',
          borderColor: hoveredCard === 'week' ? 'var(--color-primary)' : 'var(--color-border)',
        }}
        className="group relative overflow-hidden border p-3.5 rounded-xl shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer select-none"
      >
        <div
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 70%)',
          }}
          className="absolute inset-0 pointer-events-none rounded-xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        />

        <div className="flex items-center justify-between mb-2 relative z-10">
          <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-semibold flex items-center gap-1.5">
            Semana Atual
          </span>
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
              color: 'var(--color-primary)',
            }}
            className="p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-110"
          >
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-end justify-between relative z-10">
          <div>
            <div style={{ color: 'var(--color-text)' }} className="text-2xl font-black tracking-tight leading-none">
              {weekCompleted}
              <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-normal ml-1">
                / {weekTotal} cards
              </span>
            </div>
            <div style={{ color: 'var(--color-primary)' }} className="text-xs font-bold mt-1">
              {weekRate}% aproveitamento
            </div>
          </div>

          {/* Micro SVG Sparkline Line Trend */}
          <div className="w-14 h-8 shrink-0">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 50 24">
              <path
                d="M 2,18 Q 12,20 20,12 T 38,8 T 48,3"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{
                  filter: hoveredCard === 'week' ? 'drop-shadow(0 0 4px var(--color-primary))' : 'none',
                }}
              />
              <circle cx="48" cy="3" r="3" fill="var(--color-primary)" />
            </svg>
          </div>
        </div>

        <div
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
          className="w-full h-1.5 rounded-full mt-3 overflow-hidden relative z-10"
        >
          <div
            style={{
              width: `${weekRate}%`,
              background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 60%, transparent), var(--color-primary))',
              boxShadow: hoveredCard === 'week' ? '0 0 8px var(--color-primary)' : 'none',
            }}
            className="h-full rounded-full transition-all duration-500"
          />
        </div>

        <div style={{ color: 'var(--color-text-muted)' }} className="flex items-center justify-between mt-2.5 text-[11px] relative z-10">
          <span className="truncate">Ritmo produtivo</span>
          <span
            style={{ color: 'var(--color-primary)' }}
            className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-semibold shrink-0"
          >
            Detalhes <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* KPI 3: Notes & Knowledge Base (with Micro Bar Frequency Sparkline) */}
      <div
        onClick={onNavigateToNotes}
        onMouseEnter={() => setHoveredCard('notes')}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          background: 'var(--color-surface)',
          borderColor: hoveredCard === 'notes' ? 'var(--color-primary)' : 'var(--color-border)',
        }}
        className="group relative overflow-hidden border p-3.5 rounded-xl shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer select-none"
      >
        <div
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 70%)',
          }}
          className="absolute inset-0 pointer-events-none rounded-xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        />

        <div className="flex items-center justify-between mb-2 relative z-10">
          <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-semibold flex items-center gap-1.5">
            Notas & Conhecimento
          </span>
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
              color: 'var(--color-primary)',
            }}
            className="p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-110"
          >
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-end justify-between relative z-10">
          <div>
            <div style={{ color: 'var(--color-text)' }} className="text-2xl font-black tracking-tight leading-none">
              {notesCount}
              <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-normal ml-1">
                docs
              </span>
            </div>
            <div style={{ color: 'var(--color-primary)' }} className="text-xs font-bold mt-1">
              Markdown & Docs
            </div>
          </div>

          {/* Micro Mini Frequency Bars */}
          <div className="flex items-end gap-1 h-6 shrink-0">
            {[40, 70, 50, 90, 60].map((h, i) => (
              <div
                key={i}
                style={{
                  height: `${h}%`,
                  background: 'var(--color-primary)',
                  opacity: hoveredCard === 'notes' ? 1 : 0.6 + i * 0.08,
                }}
                className="w-1.5 rounded-t-sm transition-all duration-300"
              />
            ))}
          </div>
        </div>

        <div
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
          className="w-full h-1.5 rounded-full mt-3 overflow-hidden relative z-10"
        >
          <div
            style={{
              width: '100%',
              background: 'var(--color-primary)',
              boxShadow: hoveredCard === 'notes' ? '0 0 8px var(--color-primary)' : 'none',
            }}
            className="h-full rounded-full transition-all duration-500"
          />
        </div>

        <div style={{ color: 'var(--color-text-muted)' }} className="flex items-center justify-between mt-2.5 text-[11px] relative z-10">
          <span className="truncate">Base indexada</span>
          <span
            style={{ color: 'var(--color-primary)' }}
            className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-semibold shrink-0"
          >
            Explorar <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* KPI 4: Projects & Git Engine (with Git Branch Pulse) */}
      <div
        onClick={onNavigateToProjects}
        onMouseEnter={() => setHoveredCard('projects')}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          background: 'var(--color-surface)',
          borderColor: hoveredCard === 'projects' ? 'var(--color-primary)' : 'var(--color-border)',
        }}
        className="group relative overflow-hidden border p-3.5 rounded-xl shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer select-none"
      >
        <div
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 70%)',
          }}
          className="absolute inset-0 pointer-events-none rounded-xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        />

        <div className="flex items-center justify-between mb-2 relative z-10">
          <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-semibold flex items-center gap-1.5">
            Projetos & Git
          </span>
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
              color: 'var(--color-primary)',
            }}
            className="p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-110"
          >
            <FolderKanban className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-end justify-between relative z-10">
          <div>
            <div style={{ color: 'var(--color-text)' }} className="text-2xl font-black tracking-tight leading-none">
              {projectsCount}
              <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-normal ml-1">
                repos
              </span>
            </div>
            <div style={{ color: 'var(--color-primary)' }} className="text-xs font-bold mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              Git Engine Ativo
            </div>
          </div>

          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
              color: 'var(--color-primary)',
              borderColor: 'color-mix(in srgb, var(--color-primary) 25%, transparent)',
            }}
            className="p-1.5 rounded-lg border flex items-center justify-center"
          >
            <GitBranch className="w-4 h-4" />
          </div>
        </div>

        <div
          style={{ background: 'color-mix(in srgb, var(--color-border) 60%, transparent)' }}
          className="w-full h-1.5 rounded-full mt-3 overflow-hidden relative z-10"
        >
          <div
            style={{
              width: '100%',
              background: 'var(--color-primary)',
              boxShadow: hoveredCard === 'projects' ? '0 0 8px var(--color-primary)' : 'none',
            }}
            className="h-full rounded-full transition-all duration-500"
          />
        </div>

        <div style={{ color: 'var(--color-text-muted)' }} className="flex items-center justify-between mt-2.5 text-[11px] relative z-10">
          <span className="truncate">Workspaces locais</span>
          <span
            style={{ color: 'var(--color-primary)' }}
            className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-semibold shrink-0"
          >
            Acessar <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  )
}
