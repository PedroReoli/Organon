import { useState } from 'react'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { Node as TiptapNode, mergeAttributes } from '@tiptap/core'

interface ToggleNodeViewProps extends NodeViewProps {
  node: NodeViewProps['node'] & { attrs: { summary: string } }
}

const ToggleBlockView = ({ node, updateAttributes, getPos, editor }: ToggleNodeViewProps) => {
  const [open, setOpen] = useState(true)
  const summary = (node.attrs as { summary: string }).summary || 'Título do bloco'

  return (
    <NodeViewWrapper className="my-2 select-text group/toggle">
      <div className="flex items-center gap-1.5 py-0.5" contentEditable={false}>
        <button
          type="button"
          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-all cursor-pointer shrink-0"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Recolher' : 'Expandir'}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            width="12"
            height="12"
            style={{
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <input
          className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-[var(--color-text)] placeholder:text-slate-500 hover:bg-white/[0.03] focus:bg-white/[0.05] px-1.5 py-0.5 rounded transition-colors"
          value={summary}
          placeholder="Título do bloco recolhível..."
          onChange={e => updateAttributes({ summary: e.target.value })}
          onClick={e => e.stopPropagation()}
        />
        <button
          type="button"
          className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover/toggle:opacity-100 transition-all cursor-pointer shrink-0 text-sm"
          contentEditable={false}
          onClick={() => {
            const pos = typeof getPos === 'function' ? getPos() : null
            if (pos != null) {
              editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
            }
          }}
          title="Remover bloco recolhível"
        >
          &times;
        </button>
      </div>
      {open && (
        <div className="ml-2.5 pl-4 border-l border-white/10 dark:border-zinc-800 py-1 space-y-1">
          <NodeViewContent className="text-sm leading-relaxed text-[var(--color-text)] outline-none" />
        </div>
      )}
    </NodeViewWrapper>
  )
}

export const ToggleBlock = TiptapNode.create({
  name: 'toggleBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      summary: { default: 'Título do bloco' },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-type="toggle-block"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle-block' }), 0]
  },
  addNodeView() {
    return ReactNodeViewRenderer(ToggleBlockView as unknown as React.ComponentType<any>)
  },
})
