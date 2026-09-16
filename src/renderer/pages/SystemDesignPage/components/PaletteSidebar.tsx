import React, { useState, useMemo } from 'react'
import {
  COMPONENT_PALETTE,
  COMPONENT_CATEGORIES,
  SystemComponentCategory,
  SystemComponentDefinition,
} from '../types/systemDesign.types'
import { SystemComponentIcon } from './SystemComponentIcon'
import { Search, X, Plus, Layers, Sparkles } from 'lucide-react'

interface PaletteSidebarProps {
  onAddComponent: (comp: SystemComponentDefinition) => void
  onDragStartFromPalette?: (comp: SystemComponentDefinition) => void
}

export const PaletteSidebar: React.FC<PaletteSidebarProps> = ({
  onAddComponent,
  onDragStartFromPalette,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<SystemComponentCategory | 'all'>('all')

  const filteredComponents = useMemo(() => {
    return COMPONENT_PALETTE.filter((comp) => {
      const matchesCategory = selectedCategory === 'all' || comp.category === selectedCategory
      const query = searchQuery.trim().toLowerCase()
      if (!query) return matchesCategory

      const matchesSearch =
        comp.label.toLowerCase().includes(query) ||
        comp.type.toLowerCase().includes(query) ||
        comp.description.toLowerCase().includes(query) ||
        (comp.techStack && comp.techStack.toLowerCase().includes(query)) ||
        comp.category.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [searchQuery, selectedCategory])

  const handleDragStart = (e: React.DragEvent, comp: SystemComponentDefinition) => {
    e.dataTransfer.setData('application/system-design-component', JSON.stringify(comp))
    e.dataTransfer.effectAllowed = 'copy'
    onDragStartFromPalette?.(comp)
  }

  return (
    <aside className="w-72 min-w-[270px] max-w-[300px] h-full flex flex-col bg-[#0c1220] border-r border-white/5 select-none shrink-0 text-slate-200">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-white/5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Componentes & Blocos
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/5 text-slate-400 border border-white/5">
            {filteredComponents.length}/{COMPONENT_PALETTE.length}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, tech stack ou DB..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#090e1a] border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px] font-semibold">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2 py-0.5 rounded-full shrink-0 border transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-indigo-950/70 border-indigo-500/50 text-indigo-300'
                : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
            }`}
          >
            Todos
          </button>
          {COMPONENT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                borderColor: selectedCategory === cat.id ? `${cat.color}80` : 'rgba(255,255,255,0.05)',
                backgroundColor: selectedCategory === cat.id ? `${cat.color}20` : 'rgba(255,255,255,0.03)',
                color: selectedCategory === cat.id ? cat.color : undefined,
              }}
              className={`px-2 py-0.5 rounded-full shrink-0 border transition-all cursor-pointer ${
                selectedCategory === cat.id ? 'font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Component Cards List (Drag and Drop / Click to Add) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        <div className="px-1 text-[10px] text-slate-500 font-medium">
          Arraste para o canvas ou clique para adicionar:
        </div>

        {filteredComponents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 space-y-1">
            <p>Nenhum componente encontrado.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
              }}
              className="text-indigo-400 hover:underline text-[11px] cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          filteredComponents.map((comp) => {
            const catObj = COMPONENT_CATEGORIES.find((c) => c.id === comp.category)
            const catColor = catObj?.color || '#6366f1'

            return (
              <div
                key={comp.type}
                draggable
                onDragStart={(e) => handleDragStart(e, comp)}
                onClick={() => onAddComponent(comp)}
                className="group relative flex items-start gap-2.5 p-2 rounded-xl bg-[#0e1628] hover:bg-[#141f36] border border-white/5 hover:border-indigo-500/50 cursor-grab active:cursor-grabbing transition-all shadow-xs"
                title={`${comp.label} — ${comp.description}\n(Arraste para posicionar no Canvas)`}
              >
                {/* Icon Badge */}
                <div
                  style={{
                    backgroundColor: `${catColor}18`,
                    borderColor: `${catColor}35`,
                    color: catColor,
                  }}
                  className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                >
                  <SystemComponentIcon type={comp.type} size={15} />
                </div>

                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                      {comp.label}
                    </span>
                    {comp.defaultPort && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/5 text-slate-400 shrink-0">
                        :{comp.defaultPort}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400/90 truncate mt-0.5">
                    {comp.techStack || comp.description}
                  </p>
                </div>

                {/* Quick Add icon on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddComponent(comp)
                  }}
                  title="Adicionar ao centro do Canvas"
                  className="w-5 h-5 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Footer / Tip */}
      <div className="p-2.5 border-t border-white/5 bg-[#090e1a] text-[10.5px] text-slate-500 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span>Dica: Conecte nós e use o AI Reviewer para validar SPOFs e gargalos.</span>
      </div>
    </aside>
  )
}
