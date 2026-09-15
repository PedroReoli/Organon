import type { ColorPalette } from '../../types'
import type { UpdateStoreFn } from './types'
import { generateId } from '../../utils'

export const createColorPaletteSlice = (updateStore: UpdateStoreFn) => {
  const addColorPalette = (name: string, colors: string[]) => {
    const now = new Date().toISOString()
    const newPalette: ColorPalette = {
      id: generateId(),
      name: name.trim(),
      colors,
      createdAt: now,
      updatedAt: now,
      order: Date.now(),
    }
    updateStore(prev => ({
      ...prev,
      colorPalettes: [...prev.colorPalettes, newPalette],
    }))
    return newPalette.id
  }

  const updateColorPalette = (paletteId: string, updates: Partial<Pick<ColorPalette, 'name' | 'colors'>>) => {
    updateStore(prev => ({
      ...prev,
      colorPalettes: prev.colorPalettes.map(palette => {
        if (palette.id !== paletteId) return palette
        return { ...palette, ...updates, updatedAt: new Date().toISOString() }
      }),
    }))
  }

  const removeColorPalette = (paletteId: string) => {
    updateStore(prev => ({
      ...prev,
      colorPalettes: prev.colorPalettes.filter(p => p.id !== paletteId),
      pendingDeletes: [...(prev.pendingDeletes ?? []), { resource: 'color_palettes', id: paletteId }],
    }))
  }

  return {
    addColorPalette,
    updateColorPalette,
    removeColorPalette,
  }
}
