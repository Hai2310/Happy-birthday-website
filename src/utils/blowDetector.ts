/**
 * Pure blow-detection logic (testable without a microphone).
 * Feed it a loudness value (RMS 0..1, low-frequency weighted) on every frame.
 */
export interface BlowDetectorOptions {
  /** ambient noise RMS measured during calibration */
  baseline: number
  /** minimum absolute RMS considered a blow */
  floor?: number
  /** multiplier over ambient baseline */
  ratio?: number
  /** ms the level must stay above threshold */
  sustainMs?: number
  /** ms to ignore after a detected blow */
  cooldownMs?: number
}

export function createBlowDetector(opts: BlowDetectorOptions) {
  const floor = opts.floor ?? 0.045
  const ratio = opts.ratio ?? 3
  const sustain = opts.sustainMs ?? 180
  const cooldown = opts.cooldownMs ?? 550
  const threshold = Math.max(floor, opts.baseline * ratio)
  let aboveSince: number | null = null
  let lastBlow = -Infinity
  let peak = 0
  return {
    threshold,
    /** returns blow strength (0 = none, 1..3 = how many candles) */
    push(level: number, t: number): number {
      if (t - lastBlow < cooldown) return 0
      if (level >= threshold) {
        if (aboveSince === null) aboveSince = t
        peak = Math.max(peak, level)
        if (t - aboveSince >= sustain) {
          lastBlow = t
          aboveSince = null
          const strength = peak / threshold
          peak = 0
          return strength > 3 ? 3 : strength > 1.8 ? 2 : 1
        }
      } else {
        aboveSince = null
        peak = 0
      }
      return 0
    },
  }
}

export function rms(buf: Float32Array): number {
  let s = 0
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
  return Math.sqrt(s / buf.length)
}
