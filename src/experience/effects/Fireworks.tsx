import { Fireworks as FW } from 'fireworks-js'
import { useEffect, useRef } from 'react'
import { onFireworks } from './celebrate'
import { useExperience } from '../../stores/experience'

/** DOM fireworks layer above the WebGL canvas (pointer-events: none). Runs only when triggered. */
export function FireworksLayer() {
  const el = useRef<HTMLDivElement>(null)
  const fw = useRef<FW | null>(null)
  const stopAt = useRef<number | null>(null)
  useEffect(() => {
    const off = onFireworks((seconds) => {
      if (!el.current) return
      const low = useExperience.getState().tier() === 'low'
      if (!fw.current) {
        fw.current = new FW(el.current, {
          hue: { min: 300, max: 355 },
          acceleration: 1.02,
          brightness: { min: 55, max: 80 },
          decay: { min: 0.015, max: 0.028 },
          delay: { min: low ? 40 : 22, max: low ? 70 : 45 },
          explosion: low ? 4 : 6,
          particles: low ? 40 : 80,
          intensity: low ? 12 : 26,
          traceLength: 3,
          flickering: 30,
          lineWidth: { explosion: { min: 1, max: 3 }, trace: { min: 0.5, max: 1.5 } },
          rocketsPoint: { min: 30, max: 70 },
          opacity: 0.55,
          sound: { enabled: false },
        })
      }
      fw.current.start()
      const until = Date.now() + seconds * 1000
      stopAt.current = until
      window.setTimeout(() => {
        if (stopAt.current === until) fw.current?.waitStop(true)
      }, seconds * 1000)
    })
    return () => {
      off()
      fw.current?.stop(true)
      fw.current = null
    }
  }, [])
  return <div ref={el} className="pointer-events-none fixed inset-0 z-[25]" aria-hidden />
}
