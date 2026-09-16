import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CalloutBlock } from '../nodeViews/CalloutBlock'

export type CalloutType = 'note' | 'tip' | 'warning' | 'important' | 'success'

export interface CalloutOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { type?: CalloutType }) => ReturnType
      toggleCallout: (attributes?: { type?: CalloutType }) => ReturnType
    }
  }
}

export const CalloutExtension = Node.create<CalloutOptions>({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'note',
        parseHTML: element => element.getAttribute('data-callout-type') || 'note',
        renderHTML: attributes => ({
          'data-callout-type': attributes.type,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout-type]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'organon-callout-block' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutBlock)
  },

  addCommands() {
    return {
      setCallout:
        attributes =>
        ({ commands }) => {
          return commands.setNode(this.name, attributes)
        },
      toggleCallout:
        attributes =>
        ({ commands }) => {
          return commands.toggleNode(this.name, 'paragraph', attributes)
        },
    }
  },
})
