/**
 * CopyNodeControlsExtension — adiciona botoes "copiar" decorativos em blocos
 * de codigo (<pre>) e blockquote, via ProseMirror Decorations.
 *
 * Extraido de WysiwygEditor.tsx no refator do Upgrade 10a.
 */

import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Plugin } from '@tiptap/pm/state'
import { copyTextToClipboard } from '@utils'

const COPY_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
const CHECK_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>'

const getCopyTextFromNode = (container: HTMLElement, kind: 'code' | 'quote'): string => {
  const clone = container.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.editor-copy-node-btn').forEach((node) => node.remove())
  if (kind === 'code') {
    return (clone.querySelector('code')?.textContent ?? clone.textContent ?? '').trim()
  }
  return (clone.textContent ?? '').trim()
}

const createCopyWidgetButton = (kind: 'code' | 'quote') => {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `editor-copy-node-btn editor-copy-node-btn-${kind}`
  button.innerHTML = COPY_ICON_SVG
  button.setAttribute('aria-label', 'Copiar')
  button.dataset.copyKind = kind
  button.setAttribute('contenteditable', 'false')

  button.addEventListener('mousedown', (event) => {
    event.preventDefault()
    event.stopPropagation()
  })

  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()

    const source = kind === 'code' ? button.closest('pre') : button.closest('blockquote')
    if (!(source instanceof HTMLElement)) return

    const text = getCopyTextFromNode(source, kind)
    if (!text) return

    void copyTextToClipboard(text).then((success) => {
      button.classList.toggle('is-copied', success)
      button.innerHTML = success ? CHECK_ICON_SVG : COPY_ICON_SVG
      button.setAttribute('aria-label', success ? 'Copiado' : 'Copiar')
      window.setTimeout(() => {
        button.classList.remove('is-copied')
        button.innerHTML = COPY_ICON_SVG
        button.setAttribute('aria-label', 'Copiar')
      }, 1200)
    })
  })

  return button
}

export const CopyNodeControlsExtension = Extension.create({
  name: 'copyNodeControls',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (node.type.name === 'codeBlock') {
                decorations.push(
                  Decoration.widget(pos + 1, () => createCopyWidgetButton('code'), {
                    side: -1,
                    ignoreSelection: true,
                  }),
                )
              }
              if (node.type.name === 'blockquote') {
                decorations.push(
                  Decoration.widget(pos + 1, () => createCopyWidgetButton('quote'), {
                    side: -1,
                    ignoreSelection: true,
                  }),
                )
              }
              return true
            })
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
