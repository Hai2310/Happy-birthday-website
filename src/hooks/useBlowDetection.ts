import { useCallback, useEffect, useRef, useState } from 'react'
import { createBlowDetector, rms } from '../utils/blowDetector'

export type MicState = 'idle' | 'requesting' | 'calibrating' | 'listening' | 'denied' | 'unsupported' | 'stopped'

/**
 * Microphone blow detection — fully local.
 * Only the loudness of low frequencies is analysed in memory; raw audio is never stored or sent.
 * Tracks are stopped on stop() and on unmount.
 */
export function useBlowDetection(onBlow: (strength: number) => void) {
  const [state, setState] = useState<MicState>('idle')
  const [level, setLevel] = useState(0)
  const stream = useRef<MediaStream | null>(null)
  const ctx = useRef<AudioContext | null>(null)
  const raf = useRef<number | null>(null)
  const cb = useRef(onBlow)
  cb.current = onBlow

  const stop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = null
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    void ctx.current?.close().catch(() => undefined)
    ctx.current = null
    setState((s) => (s === 'listening' || s === 'calibrating' ? 'stopped' : s))
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported')
      return
    }
    setState('requesting')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      stream.current = s
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const c = new AC()
      ctx.current = c
      const src = c.createMediaStreamSource(s)
      // blowing is broadband noise strongest in low frequencies → low-pass before measuring
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 900
      const an = c.createAnalyser()
      an.fftSize = 1024
      src.connect(lp).connect(an)
      const buf = new Float32Array(an.fftSize)
      setState('calibrating')
      const samples: number[] = []
      const t0 = performance.now()
      let detector: ReturnType<typeof createBlowDetector> | null = null
      let lastUi = 0
      const loop = () => {
        an.getFloatTimeDomainData(buf)
        const lv = rms(buf)
        const now = performance.now()
        if (!detector) {
          samples.push(lv)
          if (now - t0 > 800) {
            samples.sort((a, b) => a - b)
            const baseline = samples[Math.floor(samples.length * 0.8)] ?? 0.01
            detector = createBlowDetector({ baseline })
            setState('listening')
          }
        } else {
          const strength = detector.push(lv, now)
          if (strength) cb.current(strength)
        }
        if (now - lastUi > 80) {
          setLevel(Math.min(1, lv * 8))
          lastUi = now
        }
        raf.current = requestAnimationFrame(loop)
      }
      raf.current = requestAnimationFrame(loop)
    } catch {
      setState('denied')
      stop()
      setState('denied')
    }
  }, [stop])

  useEffect(() => stop, [stop])
  return { state, level, start, stop }
}
