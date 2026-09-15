import { useState } from 'react'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { Node as TiptapNode, mergeAttributes } from '@tiptap/core'

const PasswordBlockView = ({ node, getPos, editor }: NodeViewProps) => {
  const [revealed, setRevealed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState((node.attrs as { text: string }).text || '')

  const saveText = () => {
    const pos = typeof getPos === 'function' ? getPos() : null
    if (pos != null) {
      editor.chain().focus().command(({ tr }) => {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, text })
        return true
      }).run()
    }
    setEditing(false)
  }

  return (
    <NodeViewWrapper className="password-block" contentEditable={false}>
      <span className="password-block-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
      {editing ? (
        <input
          className="password-block-edit-input"
          autoFocus
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={saveText}
          onKeyDown={e => { if (e.key === 'Enter') saveText(); if (e.key === 'Escape') { setText((node.attrs as { text: string }).text || ''); setEditing(false) } }}
        />
      ) : (
        <span
          className="password-block-text"
          onClick={() => revealed && setEditing(true)}
          title={revealed ? 'Clique para editar' : 'Clique no olho para revelar'}
        >
          {revealed ? (text || '(vazio)') : '●'.repeat(Math.max(6, text.length || 8))}
        </span>
      )}
      <button
        className="password-block-toggle"
        onClick={() => setRevealed(r => !r)}
        title={revealed ? 'Ocultar' : 'Revelar'}
      >
        {revealed ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
      <button
        className="toggle-block-delete"
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
    </NodeViewWrapper>
  )
}

export const PasswordBlock = TiptapNode.create({
  name: 'passwordBlock',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      text: { default: '' },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-type="password-block"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'password-block' })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(PasswordBlockView)
  },
})
