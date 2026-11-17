export type Tier = 'high' | 'medium' | 'low'

export interface TierSettings {
  dpr: [number, number]
  particles: number
  bloom: boolean
  shadows: boolean
  maxFrames3D: number
  roses: number
  antialias: boolean
}

export const TIERS: Record<Tier, TierSettings> = {
  high: { dpr: [1, 2], particles: 1, bloom: true, shadows: true, maxFrames3D: 48, roses: 260, antialias: true },
  medium: { dpr: [1, 1.5], particles: 0.55, bloom: true, shadows: false, maxFrames3D: 30, roses: 140, antialias: true },
  low: { dpr: [1, 1], particles: 0.28, bloom: false, shadows: false, maxFrames3D: 16, roses: 70, antialias: false },
}

export function detectTier(): Tier {
  if (typeof window === 'undefined') return 'medium'
  const nav = navigator as Navigator & { deviceMemory?: number }
  const coarse = matchMedia('(pointer: coarse)').matches
  const cores = nav.hardwareConcurrency || 4
  const mem = nav.deviceMemory ?? 4
  let gpu = ''
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    gpu = ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
  } catch {
    /* ignore */
  }
  if (/swiftshader|llvmpipe|software/i.test(gpu)) return 'low'
  if (coarse) {
    if (mem <= 3 || cores <= 4) return 'low'
    return 'medium'
  }
  if (cores >= 8 && mem >= 8) return 'high'
  return /intel/i.test(gpu) ? 'medium' : 'high'
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
