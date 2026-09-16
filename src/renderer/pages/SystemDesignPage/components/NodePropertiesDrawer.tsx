import React from 'react'
import { SystemNode, COMPONENT_CATEGORIES } from '../types/systemDesign.types'
import { SystemComponentIcon } from './SystemComponentIcon'
import { X, Trash2, Link2, Server, Cpu, Clock, Activity, FileText } from 'lucide-react'

interface NodePropertiesDrawerProps {
  node: SystemNode | null
  onClose: () => void
  onUpdateNode: (id: string, updates: Partial<SystemNode>) => void
  onDeleteNode: (id: string) => void
  onStartConnect: (id: string) => void
}

export const NodePropertiesDrawer: React.FC<NodePropertiesDrawerProps> = ({
  node,
  onClose,
  onUpdateNode,
  onDeleteNode,
  onStartConnect,
}) => {
  if (!node) return null

  const catObj = COMPONENT_CATEGORIES.find((c) => c.id === node.category)
  const catColor = catObj?.color || '#6366f1'

  return (
    <div className="w-80 min-w-[280px] max-w-[320px] h-full flex flex-col bg-[#0c1220] border-l border-white/5 select-none shrink-0 text-slate-200 shadow-2xl z-20">
      {/* Drawer Header */}
      <div className="p-3.5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            style={{
              backgroundColor: `${catColor}18`,
              borderColor: `${catColor}35`,
              color: catColor,
            }}
            className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0"
          >
            <SystemComponentIcon type={node.type} size={15} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 truncate">{node.label}</h3>
            <span
              style={{ color: catColor }}
              className="text-[10px] font-semibold uppercase tracking-wider block"
            >
              {catObj?.label || node.category}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 rounded border border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Drawer Body Forms */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Quick Connect & Delete Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onStartConnect(node.id)}
            className="py-1.5 px-2.5 rounded-lg border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Conectar</span>
          </button>

          <button
            type="button"
            onClick={() => onDeleteNode(node.id)}
            className="py-1.5 px-2.5 rounded-lg border border-red-500/30 bg-red-950/30 hover:bg-red-900/40 text-red-300 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir</span>
          </button>
        </div>

        {/* Label */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Nome / Identificador
          </label>
          <input
            type="text"
            value={node.label}
            onChange={(e) => onUpdateNode(node.id, { label: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* Tech Stack & Port */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-indigo-400" />
              <span>Tech Stack</span>
            </label>
            <input
              type="text"
              placeholder="ex: Go / Postgres"
              value={node.techStack || ''}
              onChange={(e) => onUpdateNode(node.id, { techStack: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Server className="w-3 h-3 text-slate-400" />
              <span>Porta</span>
            </label>
            <input
              type="number"
              placeholder="ex: 8080"
              value={node.port || ''}
              onChange={(e) =>
                onUpdateNode(node.id, { port: parseInt(e.target.value, 10) || undefined })
              }
              className="w-full px-3 py-1.5 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs font-mono focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Escala / Réplicas & Latência SLA */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3 text-amber-400" />
              <span>Escala / Réplicas</span>
            </label>
            <input
              type="text"
              placeholder="ex: 3x / Auto-scale"
              value={node.scale || ''}
              onChange={(e) => onUpdateNode(node.id, { scale: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Meta SLA / p99</span>
            </label>
            <input
              type="text"
              placeholder="ex: < 50ms"
              value={node.sla || ''}
              onChange={(e) => onUpdateNode(node.id, { sla: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs font-mono focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Descrição & Papel */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Papel no Sistema / Responsabilidades
          </label>
          <textarea
            rows={2}
            placeholder="Descreva a responsabilidade central deste componente..."
            value={node.description || ''}
            onChange={(e) => onUpdateNode(node.id, { description: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs focus:outline-hidden focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Notas de Estudo / Trade-offs */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3 text-indigo-400" />
            <span>Notas de Estudo & Trade-offs (CAP, Sharding, SPOF)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Ex: Teorema CAP (AP), particionamento por userId, cache-aside strategy..."
            value={node.notes || ''}
            onChange={(e) => onUpdateNode(node.id, { notes: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs focus:outline-hidden focus:border-indigo-500 resize-none font-mono text-[11px]"
          />
        </div>
      </div>
    </div>
  )
}
