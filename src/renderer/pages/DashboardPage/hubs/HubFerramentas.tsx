import type { ComponentProps } from 'react'
import { ClipboardView } from '@Clipboard/ClipboardPage'
import { ColorsView } from '@Settings/ColorsView'
import type { AppView } from '@shared/InternalNav'

type HubFerramentasProps = { activeView: AppView }
  & ComponentProps<typeof ClipboardView>
  & ComponentProps<typeof ColorsView>

export const HubFerramentas = ({
  activeView,
  // clipboard
  categories,
  items,
  onAddCategory,
  onRenameCategory,
  onRemoveCategory,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onMoveItemToCategory,
  onIncrementCopyCount,
  onToggleSnippet,
  // colors
  palettes,
  onAddPalette,
  onUpdatePalette,
  onRemovePalette,
}: HubFerramentasProps) => {
  if (activeView === 'clipboard') {
    return (
      <ClipboardView
        categories={categories}
        items={items}
        onAddCategory={onAddCategory}
        onRenameCategory={onRenameCategory}
        onRemoveCategory={onRemoveCategory}
        onAddItem={onAddItem}
        onUpdateItem={onUpdateItem}
        onRemoveItem={onRemoveItem}
        onMoveItemToCategory={onMoveItemToCategory}
        onIncrementCopyCount={onIncrementCopyCount}
        onToggleSnippet={onToggleSnippet}
      />
    )
  }

  if (activeView === 'colors') {
    return (
      <ColorsView
        palettes={palettes}
        onAddPalette={onAddPalette}
        onUpdatePalette={onUpdatePalette}
        onRemovePalette={onRemovePalette}
      />
    )
  }

  return null
}

