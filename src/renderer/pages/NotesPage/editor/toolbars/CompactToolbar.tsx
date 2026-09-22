import type { Editor } from '@tiptap/react'

export const CompactToolbar = ({ editor }: { editor: Editor }) => (
  <div className="editor-toolbar">
    {/* Desfazer / Refazer */}
    <button
      type="button"
      onClick={() => editor.chain().focus().undo().run()}
      disabled={!editor.can().undo()}
      className={`editor-toolbar-btn ${!editor.can().undo() ? 'opacity-30 cursor-not-allowed' : ''}`}
      title="Desfazer (Ctrl+Z)"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
        <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
      </svg>
    </button>
    <button
      type="button"
      onClick={() => editor.chain().focus().redo().run()}
      disabled={!editor.can().redo()}
      className={`editor-toolbar-btn ${!editor.can().redo() ? 'opacity-30 cursor-not-allowed' : ''}`}
      title="Refazer (Ctrl+Y)"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
        <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
      </svg>
    </button>

    <div className="editor-toolbar-divider" />

    <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`editor-toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`} title="Titulo 1">
      H1
    </button>
    <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`editor-toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`} title="Titulo 2">
      H2
    </button>
    <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`editor-toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`} title="Titulo 3">
      H3
    </button>

    <div className="editor-toolbar-divider" />

    <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`editor-toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`} title="Negrito (Ctrl+B)">
      <strong>B</strong>
    </button>
    <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`editor-toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`} title="Italico (Ctrl+I)">
      <em>I</em>
    </button>
    <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`editor-toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`} title="Riscado">
      <s>S</s>
    </button>
    <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={`editor-toolbar-btn ${editor.isActive('code') ? 'is-active' : ''}`} title="Codigo inline">
      {'</>'}
    </button>

    <div className="editor-toolbar-divider" />

    <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`editor-toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`} title="Lista">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
        <circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="5" cy="18" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    </button>
    <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`editor-toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`} title="Lista numerada">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
        <text x="3" y="8" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">1</text>
        <text x="3" y="14" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">2</text>
        <text x="3" y="20" fontSize="8" fill="currentColor" stroke="none" fontWeight="700">3</text>
      </svg>
    </button>

    <div className="editor-toolbar-divider" />

    <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`editor-toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`} title="Citacao">
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
        <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
      </svg>
    </button>
    <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="editor-toolbar-btn" title="Linha horizontal">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <line x1="2" y1="12" x2="22" y2="12" />
      </svg>
    </button>
    <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`editor-toolbar-btn ${editor.isActive('codeBlock') ? 'is-active' : ''}`} title="Bloco de codigo">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    </button>
  </div>
)
