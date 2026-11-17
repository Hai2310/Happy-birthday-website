import { useEffect, useMemo, type CSSProperties } from 'react'
import { useExperience } from '../../stores/experience'

/** Twinkling pink stars over the whole experience — pure CSS, never intercepts input. */
export function SparkleSky() {
  const tier = useExperience((s) => s.tier())
  const reduced = useExperience((s) => s.reducedMotion)
  const n = tier === 'low' ? 14 : tier === 'medium' ? 24 : 34
  const stars = useMemo(
    () =>
      Array.from({ length: n }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        s: 6 + Math.random() * 12,
        d: 2.4 + Math.random() * 3.5,
        delay: -Math.random() * 6,
        o: 0.5 + Math.random() * 0.5,
      })),
    [n],
  )
  if (reduced) return null
  return (
    <div className="sparkle-sky" aria-hidden>
      {stars.map((s, i) => (
        <i
          key={i}
          style={{ left: `${s.left}%`, top: `${s.top}%`, '--s': `${s.s}px`, '--d': `${s.d}s`, '--delay': `${s.delay}s`, '--o': s.o } as CSSProperties}
        />
      ))}
    </div>
  )
}

/** Pink sparkles burst from every tap and trail the pointer softly. */
export function SparkleTrail() {
  const reduced = useExperience((s) => s.reducedMotion)
  useEffect(() => {
    if (reduced) return
    let live = 0
    let lastMove = 0
    const emit = (x: number, y: number, count: number, spread: number) => {
      for (let i = 0; i < count && live < 60; i++) {
        const el = document.createElement('span')
        el.className = 'spark'
        const a = Math.random() * Math.PI * 2
        const r = spread * (0.4 + Math.random() * 0.6)
        el.style.left = `${x}px`
        el.style.top = `${y}px`
        el.style.setProperty('--s', `${6 + Math.random() * 10}px`)
        el.style.setProperty('--dx', `${Math.cos(a) * r}px`)
        el.style.setProperty('--dy', `${Math.sin(a) * r + spread * 0.3}px`)
        el.style.setProperty('--rot', `${(Math.random() - 0.5) * 360}deg`)
        el.style.setProperty('--life', `${0.7 + Math.random() * 0.6}s`)
        live++
        el.addEventListener('animationend', () => { el.remove(); live-- }, { once: true })
        document.body.appendChild(el)
      }
    }
    const down = (e: PointerEvent) => emit(e.clientX, e.clientY, 10, 60)
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const now = performance.now()
      if (now - lastMove < 45) return
      lastMove = now
      emit(e.clientX, e.clientY, 1, 26)
    }
    window.addEventListener('pointerdown', down, { passive: true })
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
    }
  }, [reduced])
  return null
}
