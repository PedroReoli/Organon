/**
 * Color extractor utils — usa node-vibrant para extrair paleta semantica
 * de uma imagem. Retorna as 6 categorias mais relevantes quando disponiveis.
 *
 * Upgrade 04.
 */

import { Vibrant } from 'node-vibrant/browser'

export interface ExtractedColor {
  hex: string
  name: string
  population: number
}

export interface ExtractedPalette {
  vibrant: ExtractedColor | null
  darkVibrant: ExtractedColor | null
  lightVibrant: ExtractedColor | null
  muted: ExtractedColor | null
  darkMuted: ExtractedColor | null
  lightMuted: ExtractedColor | null
}

/**
 * Retorna apenas as cores presentes (sem nulls) em ordem de proeminencia.
 */
export function paletteToList(palette: ExtractedPalette): ExtractedColor[] {
  return [
    palette.vibrant,
    palette.darkVibrant,
    palette.lightVibrant,
    palette.muted,
    palette.darkMuted,
    palette.lightMuted,
  ].filter((c): c is ExtractedColor => c !== null)
}

const SWATCH_LABELS: Record<string, string> = {
  Vibrant: 'Vibrante',
  DarkVibrant: 'Vibrante escuro',
  LightVibrant: 'Vibrante claro',
  Muted: 'Suave',
  DarkMuted: 'Suave escuro',
  LightMuted: 'Suave claro',
}

/**
 * Redimensiona uma imagem antes da extracao para acelerar o processo.
 * Vibrant aceita data URL, entao fazemos resize no canvas primeiro.
 */
async function resizeImageDataUrl(
  dataUrl: string,
  maxDimension = 256,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const ratio = Math.min(1, maxDimension / Math.max(img.width, img.height))
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context indisponivel'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      try {
        resolve(canvas.toDataURL('image/png'))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Falha ao carregar imagem'))
    img.src = dataUrl
  })
}

/**
 * Extrai paleta semantica de uma imagem via node-vibrant.
 * Recebe dataURL (do FileReader) e retorna 6 swatches.
 */
export async function extractPaletteFromDataUrl(
  dataUrl: string,
): Promise<ExtractedPalette> {
  const resized = await resizeImageDataUrl(dataUrl, 256)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const palette = await (Vibrant as any).from(resized).getPalette()

  const toExtracted = (swatch: unknown, name: string): ExtractedColor | null => {
    if (!swatch) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = swatch as any
    const hex =
      typeof s.getHex === 'function'
        ? s.getHex()
        : typeof s.hex === 'string'
          ? s.hex
          : null
    if (!hex) return null
    const population =
      typeof s.getPopulation === 'function'
        ? s.getPopulation()
        : typeof s.population === 'number'
          ? s.population
          : 0
    return {
      hex: hex.toUpperCase(),
      name: SWATCH_LABELS[name] ?? name,
      population,
    }
  }

  return {
    vibrant: toExtracted(palette.Vibrant, 'Vibrant'),
    darkVibrant: toExtracted(palette.DarkVibrant, 'DarkVibrant'),
    lightVibrant: toExtracted(palette.LightVibrant, 'LightVibrant'),
    muted: toExtracted(palette.Muted, 'Muted'),
    darkMuted: toExtracted(palette.DarkMuted, 'DarkMuted'),
    lightMuted: toExtracted(palette.LightMuted, 'LightMuted'),
  }
}

/**
 * Le um arquivo de imagem como data URL.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
