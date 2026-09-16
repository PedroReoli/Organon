import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { SuggestionProps } from '@tiptap/suggestion'

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

interface MentionListProps extends SuggestionProps {
  items: Array<{ id: string; label: string }>
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]

    if (item) {
      props.command({ id: item.id, label: item.label })
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  if (props.items.length === 0) {
    return (
      <div className="mention-suggestions">
        <div className="mention-suggestion-empty">Nenhuma nota encontrada</div>
      </div>
    )
  }

  return (
    <div className="mention-suggestions">
      {props.items.map((item, index) => (
        <button
          className={`mention-suggestion-item ${index === selectedIndex ? 'is-selected' : ''}`}
          key={item.id}
          onClick={() => selectItem(index)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
})

MentionList.displayName = 'MentionList'
