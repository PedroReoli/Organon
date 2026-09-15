/**
 * Tipos compartilhados das extensions custom do WysiwygEditor.
 * Upgrade 10a refator.
 */

import type { Editor } from '@tiptap/react'

export interface SlashCommand {
  id: string
  label: string
  description: string
  icon: JSX.Element
  keywords: string[]
  action: (editor: Editor) => void
}

export type ImageAlign = 'left' | 'center' | 'right'
export type ImageMode = 'free' | 'frame'
export type FrameAspect = '16:9' | '4:3' | '1:1' | '3:4'

export const FRAME_ASPECTS: { label: string; value: FrameAspect; css: string }[] = [
  { label: '16:9', value: '16:9', css: '16 / 9' },
  { label: '4:3',  value: '4:3',  css: '4 / 3'  },
  { label: '1:1',  value: '1:1',  css: '1 / 1'  },
  { label: '3:4',  value: '3:4',  css: '3 / 4'  },
]

export type LinkCardDisplay = 'bookmark' | 'embed'
