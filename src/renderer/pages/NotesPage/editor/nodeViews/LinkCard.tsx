import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { Node as TiptapNode, mergeAttributes } from '@tiptap/core'
import { detectUrlEmbed, getFaviconUrl, getShortcutTitleFromUrl, normalizeUrl, openExternalLink } from '@utils'

type LinkCardDisplay = 'bookmark' | 'embed'

const LinkCardView = ({ node, editor, getPos, selected }: NodeViewProps) => {
  const { url, display } = node.attrs as { url: string; display: LinkCardDisplay }
  const normalizedUrl = normalizeUrl(url)
  const title = getShortcutTitleFromUrl(normalizedUrl)
  const faviconUrl = getFaviconUrl(normalizedUrl)
  const embed = detectUrlEmbed(normalizedUrl)
  const hostname = (() => {
    try {
      return new URL(normalizedUrl).hostname.replace(/^www\./i, '')
    } catch {
      return normalizedUrl
    }
  })()

  const handleDelete = () => {
    const pos = typeof getPos === 'function' ? getPos() : null
    if (pos != null) {
      editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
    }
  }

  return (
    <NodeViewWrapper
      as="div"
      className={`editor-link-card${display === 'embed' ? ' is-embed' : ''}${selected ? ' is-selected' : ''}`}
      contentEditable={false}
    >
      <div className="editor-link-card-actions">
        <button type="button" className="editor-link-card-action editor-link-card-action-drag" data-drag-handle="" title="Arrastar card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
            <circle cx="9" cy="7" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="7" r="1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="17" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="17" r="1" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <button type="button" className="editor-link-card-action" onClick={() => { void openExternalLink(normalizedUrl) }} title="Abrir link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
            <path d="M14 3h7v7" />
            <path d="M10 14 21 3" />
            <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
          </svg>
        </button>
        <button type="button" className="editor-link-card-action editor-link-card-action-danger" onClick={handleDelete} title="Remover card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>

      {display === 'embed' && embed?.type === 'youtube' ? (
        <>
          <div className="editor-link-card-embed-head">
            <span className="editor-link-card-badge">Embed</span>
            <span className="editor-link-card-meta">{hostname}</span>
          </div>
          <div className="editor-link-card-embed-shell">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${embed.videoId}?rel=0&modestbranding=1&playsinline=1`}
              title={title}
              className="editor-link-card-embed-frame"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <button
            type="button"
            className="editor-link-card-embed-footer"
            onClick={() => { void openExternalLink(normalizedUrl) }}
            title={normalizedUrl}
          >
            <span className="editor-link-card-embed-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M23.5 6.2a2.9 2.9 0 0 0-2-2.1C19.7 3.5 12 3.5 12 3.5s-7.7 0-9.5.6a2.9 2.9 0 0 0-2 2.1A31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 2.9 2.9 0 0 0 2 2.1c1.8.6 9.5.6 9.5.6s7.7 0 9.5-.6a2.9 2.9 0 0 0 2-2.1A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.8ZM9.7 15.7V8.3L16 12l-6.3 3.7Z" />
              </svg>
            </span>
            <span className="editor-link-card-copy">
              <span className="editor-link-card-title">{title}</span>
              <span className="editor-link-card-url">{normalizedUrl}</span>
            </span>
          </button>
        </>
      ) : (
        <button
          type="button"
          className="editor-link-card-main"
          onClick={() => { void openExternalLink(normalizedUrl) }}
          title={normalizedUrl}
        >
          <span className="editor-link-card-favicon" aria-hidden="true">
            {faviconUrl ? <img src={faviconUrl} alt="" loading="lazy" /> : null}
          </span>
          <span className="editor-link-card-copy">
            <span className="editor-link-card-badge">{display === 'embed' ? 'Embed' : 'Bookmark'}</span>
            <span className="editor-link-card-title">{title}</span>
            <span className="editor-link-card-url">{normalizedUrl}</span>
          </span>
        </button>
      )}
    </NodeViewWrapper>
  )
}

export const LinkCard = TiptapNode.create({
  name: 'linkCard',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      url: { default: '' },
      display: { default: 'bookmark' },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-type="link-card"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'link-card' })]
  },
  addNodeView() {
    return ReactNodeViewRenderer(LinkCardView)
  },
})
