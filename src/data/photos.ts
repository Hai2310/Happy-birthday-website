import manifestJson from './photoManifest.generated.json'
import { birthdayConfig, type L } from '../config/birthdayConfig'

export interface Photo {
  id: string
  original: string
  originalUrl: string
  src: string
  large: string
  thumb: string
  width: number
  height: number
  aspect: number
  date?: string
  category: string
  scene?: string
  caption?: string
  alt?: string
  order?: number
}

interface Manifest {
  count: number
  photos: Photo[]
}

export const photos: Photo[] = (manifestJson as unknown as Manifest).photos ?? []
export const hasPhotos = photos.length > 0

export const CATEGORY_LABELS: Record<string, L> = {
  hero: { vi: 'Chân dung', en: 'Portraits' },
  couple: { vi: 'Hai đứa', en: 'Us' },
  romantic: { vi: 'Lãng mạn', en: 'Romantic' },
  travel: { vi: 'Những chuyến đi', en: 'Travels' },
  occasion: { vi: 'Dịp đặc biệt', en: 'Special days' },
  everyday: { vi: 'Thường ngày', en: 'Everyday' },
  birthday: { vi: 'Sinh nhật', en: 'Birthdays' },
  other: { vi: 'Kỷ niệm', en: 'Memories' },
}

export function captionOf(p: Photo | undefined, lang: 'vi' | 'en'): string {
  if (!p) return ''
  const c = birthdayConfig.photoCaptions[p.original] ?? birthdayConfig.photoCaptions[p.original.split('/').pop() ?? '']
  if (c) return (lang === 'en' && c.en) || c.vi
  return p.caption ?? ''
}

export function altOf(p: Photo, lang: 'vi' | 'en', index: number): string {
  return p.alt || captionOf(p, lang) || (lang === 'en' ? `Memory photo ${index + 1}` : `Ảnh kỷ niệm ${index + 1}`)
}

export function findPhoto(ref: string | number | undefined): number {
  if (ref === undefined) return -1
  if (typeof ref === 'number') return ref >= 0 && ref < photos.length ? ref : -1
  return photos.findIndex((p) => p.original === ref || p.original.endsWith('/' + ref) || p.original === ref.replace(/^\/+/, ''))
}

export function heroIndex(): number {
  const explicit = findPhoto(birthdayConfig.heroPhoto)
  if (explicit >= 0) return explicit
  const h = photos.findIndex((p) => p.category === 'hero')
  return h >= 0 ? h : photos.length ? 0 : -1
}

/** Deterministic, evenly spread selection of `n` indices for a scene. Every scene gets a different offset so the story shows variety. */
export function pick(n: number, offset = 0): number[] {
  const N = photos.length
  if (!N) return []
  if (N <= n) return Array.from({ length: N }, (_, i) => (i + offset) % N)
  const step = N / n
  return Array.from({ length: n }, (_, i) => Math.floor((i * step + offset) % N))
}

/** photo indices preferring a scene assignment / category */
export function forScene(scene: string, n: number, offset = 0, categories: string[] = []): number[] {
  const assigned = photos.map((p, i) => (p.scene === scene ? i : -1)).filter((i) => i >= 0)
  const cat = photos.map((p, i) => (categories.includes(p.category) && p.scene !== scene ? i : -1)).filter((i) => i >= 0)
  const out = [...assigned, ...cat].slice(0, n)
  if (out.length >= n) return out
  for (const i of pick(n, offset)) if (!out.includes(i) && out.length < n) out.push(i)
  return out
}
