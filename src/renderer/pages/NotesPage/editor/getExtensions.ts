import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Typography from '@tiptap/extension-typography'
import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance as TippyInstance } from 'tippy.js'

import { HeadingIds } from './extensions/headingIds'
import { ListExit } from './extensions/listExit'
import { CopyNodeControlsExtension } from './extensions/copyNodeControls'
import { Mention } from './extensions/mention'
import { MentionList, type MentionListRef } from './MentionList'
import { ResizableImage } from './nodeViews/ResizableImage'
import { ToggleBlock } from './nodeViews/ToggleBlock'
import { PasswordBlock } from './nodeViews/PasswordBlock'
import { SubpageBlock } from './nodeViews/SubpageBlock'
import { LinkCard } from './nodeViews/LinkCard'
import { CalloutExtension } from './extensions/calloutExtension'

export const getExtensions = (
  mode: 'compact' | 'full',
  placeholderText: string,
  noteTitlesById?: Record<string, string>,
  _onNoteMentionClick?: (noteId: string) => void
) => {
  const base = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      history: {
        depth: 300,
        newGroupDelay: 300,
      },
    }),
    HeadingIds,
    ListExit,
    Placeholder.configure({ placeholder: placeholderText }),
    Underline,
    TextStyle,
    Typography,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'editor-link' },
    }),
  ]

  if (mode === 'full') {
    const fullExtensions = [
      ...base,
      CopyNodeControlsExtension,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Color,
      ToggleBlock,
      PasswordBlock,
      SubpageBlock,
      LinkCard,
      CalloutExtension,
    ]

    if (noteTitlesById) {
      fullExtensions.push(
        Mention.configure({
          HTMLAttributes: {
            class: 'mention',
          },
          suggestion: {
            items: ({ query }: { query: string }) => {
              return Object.entries(noteTitlesById)
                .map(([id, label]) => ({ id, label }))
                .filter(item => item.label.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 10)
            },
            render: () => {
              let component: ReactRenderer<MentionListRef> | null = null
              let popup: TippyInstance[] | null = null

              return {
                onStart: (props: any) => {
                  component = new ReactRenderer(MentionList, {
                    props,
                    editor: props.editor,
                  })
                  if (!props.clientRect) return
                  popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                  })
                },
                onUpdate(props: any) {
                  component?.updateProps(props)
                  if (!props.clientRect) return
                  popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect })
                },
                onKeyDown(props: any) {
                  if (props.event.key === 'Escape') {
                    popup?.[0]?.hide()
                    return true
                  }
                  return component?.ref?.onKeyDown(props) ?? false
                },
                onExit() {
                  popup?.[0]?.destroy()
                  component?.destroy()
                },
              }
            },
          },
        })
      )
    }

    return fullExtensions
  }

  return base
}
