import React from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { Info, Lightbulb, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'

const CALLOUT_CONFIGS: Record<string, { label: string; icon: React.ReactNode; bg: string; border: string; text: string; iconBg: string }> = {
  note: {
    label: 'Nota',
    icon: <Info className="w-4 h-4 text-blue-400" />,
    bg: 'bg-blue-500/[0.08] dark:bg-blue-950/25',
    border: 'border-blue-500/20 dark:border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-300',
    iconBg: 'bg-blue-500/15',
  },
  tip: {
    label: 'Dica',
    icon: <Lightbulb className="w-4 h-4 text-emerald-400" />,
    bg: 'bg-emerald-500/[0.08] dark:bg-emerald-950/25',
    border: 'border-emerald-500/20 dark:border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-300',
    iconBg: 'bg-emerald-500/15',
  },
  warning: {
    label: 'Atenção',
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    bg: 'bg-amber-500/[0.08] dark:bg-amber-950/25',
    border: 'border-amber-500/20 dark:border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-300',
    iconBg: 'bg-amber-500/15',
  },
  important: {
    label: 'Importante',
    icon: <AlertCircle className="w-4 h-4 text-rose-400" />,
    bg: 'bg-rose-500/[0.08] dark:bg-rose-950/25',
    border: 'border-rose-500/20 dark:border-rose-500/30',
    text: 'text-rose-600 dark:text-rose-300',
    iconBg: 'bg-rose-500/15',
  },
  success: {
    label: 'Sucesso',
    icon: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    bg: 'bg-green-500/[0.08] dark:bg-green-950/25',
    border: 'border-green-500/20 dark:border-green-500/30',
    text: 'text-green-600 dark:text-green-300',
    iconBg: 'bg-green-500/15',
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
    <NodeViewWrapper className={`my-3 p-3.5 rounded-xl border ${config.border} ${config.bg} flex items-start gap-3 transition-all select-text group/callout shadow-2xs`}>
      <button
        type="button"
        onClick={cycleType}
        contentEditable={false}
        title="Clique para alternar o tipo de callout (Nota, Dica, Atenção, Importante, Sucesso)"
        className={`w-7 h-7 rounded-lg ${config.iconBg} flex items-center justify-center shrink-0 cursor-pointer hover:scale-110 active:scale-95 transition-all mt-0.5`}
      >
        {config.icon}
      </button>
      <div className="flex-1 min-w-0">
        <NodeViewContent className="callout-content text-sm leading-relaxed text-[var(--color-text)] outline-none" />
      </div>
    </NodeViewWrapper>
  )
}
