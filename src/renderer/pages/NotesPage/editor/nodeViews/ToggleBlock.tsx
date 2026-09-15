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
    <NodeViewWrapper className="toggle-block">
      <div className="toggle-block-summary" contentEditable={false}>
        <button
          className="toggle-block-arrow"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Recolher' : 'Expandir'}
          style={{ transform: open ? 'rotate(90deg)' : 'none' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <input
          className="toggle-block-title"
          value={summary}
          placeholder="Título do bloco..."
          onChange={e => updateAttributes({ summary: e.target.value })}
          onClick={e => e.stopPropagation()}
        />
        <button
          className="toggle-block-delete"
          contentEditable={false}
          onClick={() => {
            const pos = typeof getPos === 'function' ? getPos() : null
            if (pos != null) {
              editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
            }
          }}
          title="Remover bloco"
        >
          &times;
        </button>
      </div>
      {open && (
        <div className="toggle-block-content">
          <NodeViewContent />
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
