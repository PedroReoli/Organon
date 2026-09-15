import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { Node as TiptapNode, mergeAttributes } from '@tiptap/core'

const SubpageBlockView = ({ node, editor, getPos }: NodeViewProps) => {
  const { noteId, noteTitle } = node.attrs as { noteId: string; noteTitle: string }

  const handleClick = () => {
    document.dispatchEvent(new CustomEvent('notes-open-note', { detail: { noteId } }))
  }

  const handleDelete = () => {
    const pos = typeof getPos === 'function' ? getPos() : null
    if (pos != null) {
      editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
    }
  }

  return (
    <NodeViewWrapper as="div" className="subpage-block" contentEditable={false}>
      <button className="subpage-block-btn" onClick={handleClick} type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14" style={{ flexShrink: 0 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span>{noteTitle || 'Nova nota'}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ flexShrink: 0, opacity: 0.4, marginLeft: 'auto' }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <button className="subpage-block-delete" onClick={handleDelete} title="Remover referência" type="button">
        &times;
      </button>
    </NodeViewWrapper>
  )
}

export const SubpageBlock = TiptapNode.create({
  name: 'subpageBlock',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      noteId: { default: '' },
      noteTitle: { default: 'Nova nota' },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-type="subpage-block"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'subpage-block' })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(SubpageBlockView)
  },
})
