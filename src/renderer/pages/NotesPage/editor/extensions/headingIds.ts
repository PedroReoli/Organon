import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

function headingSlugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export const HeadingIds = Extension.create({
  name: 'headingIds',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('headingIds'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = []
            const counts = new Map<string, number>()
            state.doc.descendants((node, pos) => {
              if (node.type.name === 'heading') {
                const text = node.textContent.trim()
                const base = headingSlugify(text) || `heading-${pos}`
                const count = counts.get(base) ?? 0
                counts.set(base, count + 1)
                const id = count === 0 ? base : `${base}-${count}`
                decorations.push(Decoration.node(pos, pos + node.nodeSize, { id }))
              }
            })
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
