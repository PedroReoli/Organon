import React from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { Info, Lightbulb, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'

const CALLOUT_CONFIGS: Record<string, { label: string; icon: React.ReactNode; bg: string; border: string; text: string; iconColor: string }> = {
  note: {
    label: 'Nota',
    icon: <Info className="w-4 h-4" />,
    bg: 'bg-blue-500/10 dark:bg-blue-950/30',
    border: 'border-blue-500/40',
    text: 'text-blue-600 dark:text-blue-400',
    iconColor: 'text-blue-500'
  },
  tip: {
    label: 'Dica',
    icon: <Lightbulb className="w-4 h-4" />,
    bg: 'bg-emerald-500/10 dark:bg-emerald-950/30',
    border: 'border-emerald-500/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    iconColor: 'text-emerald-500'
  },
  warning: {
    label: 'Atenção',
    icon: <AlertTriangle className="w-4 h-4" />,
    bg: 'bg-amber-500/10 dark:bg-amber-950/30',
    border: 'border-amber-500/40',
    text: 'text-amber-600 dark:text-amber-400',
    iconColor: 'text-amber-500'
  },
  important: {
    label: 'Importante',
    icon: <AlertCircle className="w-4 h-4" />,
    bg: 'bg-rose-500/10 dark:bg-rose-950/30',
    border: 'border-rose-500/40',
    text: 'text-rose-600 dark:text-rose-400',
    iconColor: 'text-rose-500'
  },
  success: {
    label: 'Sucesso',
    icon: <CheckCircle2 className="w-4 h-4" />,
    bg: 'bg-green-500/10 dark:bg-green-950/30',
    border: 'border-green-500/40',
    text: 'text-green-600 dark:text-green-400',
    iconColor: 'text-green-500'
  }
}

export const CalloutBlock: React.FC<NodeViewProps> = ({ node, updateAttributes }) => {
  const currentType = (node.attrs.type || 'note') as string
  const config = CALLOUT_CONFIGS[currentType] || CALLOUT_CONFIGS.note

  const cycleType = () => {
    const types = Object.keys(CALLOUT_CONFIGS)
    const nextIdx = (types.indexOf(currentType) + 1) % types.length
    updateAttributes({ type: types[nextIdx] })
  }

  return (
    <NodeViewWrapper className={`my-3 p-3.5 rounded-lg border-l-4 ${config.border} ${config.bg} transition-all`}>
      <div className="flex items-center gap-2 mb-1.5 select-none" contentEditable={false}>
        <button
          type="button"
          onClick={cycleType}
          title="Clique para alternar o tipo de callout"
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${config.text} hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer`}
        >
          <span className={config.iconColor}>{config.icon}</span>
          <span>{config.label}</span>
        </button>
      </div>
      <NodeViewContent className="callout-content text-sm leading-relaxed" />
    </NodeViewWrapper>
  )
}
