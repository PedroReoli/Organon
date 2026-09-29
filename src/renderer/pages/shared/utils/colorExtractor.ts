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

interface ColorCandidate {
  red: number
  green: number
  blue: number
  saturation: number
  lightness: number
  population: number
}

const SWATCH_LABELS = {
  vibrant: 'Vibrante',
  darkVibrant: 'Vibrante escuro',
  lightVibrant: 'Vibrante claro',
  muted: 'Suave',
  darkMuted: 'Suave escuro',
  lightMuted: 'Suave claro',
} satisfies Record<keyof ExtractedPalette, string>

export function paletteToList(palette: ExtractedPalette): ExtractedColor[] {
  return [
    palette.vibrant,
    palette.darkVibrant,
    palette.lightVibrant,
    palette.muted,
    palette.darkMuted,
    palette.lightMuted,
  ].filter((color): color is ExtractedColor => color !== null)
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Falha ao carregar imagem'))
    image.src = dataUrl
  })
}

function toHsl(red: number, green: number, blue: number): { saturation: number; lightness: number } {
  const r = red / 255
  const g = green / 255
  const b = blue / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  if (max === min) return { saturation: 0, lightness }
  const delta = max - min
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  return { saturation, lightness }
}

function channelHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
}

function toExtracted(candidate: ColorCandidate | undefined, name: string): ExtractedColor | null {
  if (!candidate) return null
  return {
    hex: `#${channelHex(candidate.red)}${channelHex(candidate.green)}${channelHex(candidate.blue)}`.toUpperCase(),
    name,
    population: candidate.population,
  }
}

function rankCandidate(
  candidates: ColorCandidate[],
  predicate: (candidate: ColorCandidate) => boolean,
  saturationTarget: number,
  lightnessTarget: number,
): ColorCandidate | undefined {
  return candidates
    .filter(predicate)
    .sort((left, right) => {
      const score = (candidate: ColorCandidate) => (
        Math.log2(candidate.population + 1) * 2
        - Math.abs(candidate.saturation - saturationTarget) * 3
        - Math.abs(candidate.lightness - lightnessTarget) * 2
      )
      return score(right) - score(left)
    })[0]
}

async function extractCandidates(dataUrl: string): Promise<ColorCandidate[]> {
  const image = await loadImage(dataUrl)
  const ratio = Math.min(1, 256 / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas context indisponivel')
  context.drawImage(image, 0, 0, width, height)
  const pixels = context.getImageData(0, 0, width, height).data
  const buckets = new Map<string, { red: number; green: number; blue: number; population: number }>()

  for (let index = 0; index < pixels.length; index += 16) {
    const alpha = pixels[index + 3]
    if (alpha < 180) continue
    const red = pixels[index]
    const green = pixels[index + 1]
    const blue = pixels[index + 2]
    const maximum = Math.max(red, green, blue)
    const minimum = Math.min(red, green, blue)
    if (maximum < 12 || minimum > 245) continue
    const key = `${red >> 4}:${green >> 4}:${blue >> 4}`
    const bucket = buckets.get(key) ?? { red: 0, green: 0, blue: 0, population: 0 }
    bucket.red += red
    bucket.green += green
    bucket.blue += blue
    bucket.population += 1
    buckets.set(key, bucket)
  }

  return Array.from(buckets.values())
    .filter(bucket => bucket.population >= 2)
    .map(bucket => {
      const red = bucket.red / bucket.population
      const green = bucket.green / bucket.population
      const blue = bucket.blue / bucket.population
      return { red, green, blue, population: bucket.population, ...toHsl(red, green, blue) }
    })
}

export async function extractPaletteFromDataUrl(dataUrl: string): Promise<ExtractedPalette> {
  const candidates = await extractCandidates(dataUrl)
  const vibrant = (candidate: ColorCandidate) => candidate.saturation >= 0.46
  const muted = (candidate: ColorCandidate) => candidate.saturation < 0.46
  const dark = (candidate: ColorCandidate) => candidate.lightness < 0.42
  const light = (candidate: ColorCandidate) => candidate.lightness > 0.62
  return {
    vibrant: toExtracted(rankCandidate(candidates, vibrant, 0.8, 0.5), SWATCH_LABELS.vibrant),
    darkVibrant: toExtracted(rankCandidate(candidates, candidate => vibrant(candidate) && dark(candidate), 0.75, 0.28), SWATCH_LABELS.darkVibrant),
    lightVibrant: toExtracted(rankCandidate(candidates, candidate => vibrant(candidate) && light(candidate), 0.7, 0.75), SWATCH_LABELS.lightVibrant),
    muted: toExtracted(rankCandidate(candidates, muted, 0.28, 0.5), SWATCH_LABELS.muted),
    darkMuted: toExtracted(rankCandidate(candidates, candidate => muted(candidate) && dark(candidate), 0.25, 0.28), SWATCH_LABELS.darkMuted),
    lightMuted: toExtracted(rankCandidate(candidates, candidate => muted(candidate) && light(candidate), 0.2, 0.75), SWATCH_LABELS.lightMuted),
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const extractColors = extractPaletteFromDataUrl
