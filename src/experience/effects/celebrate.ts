import confetti from 'canvas-confetti'
import { useExperience } from '../../stores/experience'

const COLORS = ['#FFB6D3', '#FF8FBF', '#FFD3E2', '#FFF0F6', '#F7B2CB', '#E86FA5']
type Listener = (seconds: number) => void
const listeners = new Set<Listener>()
export function onFireworks(l: Listener) {
  listeners.add(l)
  return () => listeners.delete(l)
}

const heart = typeof window !== 'undefined' && 'shapeFromPath' in confetti
  ? confetti.shapeFromPath({ path: 'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z' })
  : undefined

export function celebrate(kind: 'soft' | 'big' | 'fireworks' | 'hearts' = 'soft') {
  const s = useExperience.getState()
  const reduced = s.reducedMotion
  const low = s.tier() === 'low'
  const scalar = low ? 0.5 : 1
  const base = { colors: COLORS, disableForReducedMotion: true, zIndex: 30, ticks: 260 }
  if (kind === 'soft') {
    confetti({ ...base, particleCount: Math.round(70 * scalar), spread: 80, startVelocity: 32, origin: { y: 0.35 }, scalar: 0.9, gravity: 0.7 })
  } else if (kind === 'hearts' && heart) {
    confetti({ ...base, shapes: [heart], particleCount: Math.round(40 * scalar), spread: 100, origin: { y: 0.5 }, scalar: 1.6, gravity: 0.5, startVelocity: 26 })
  } else {
    const end = Date.now() + (reduced ? 600 : 2600)
    const frame = () => {
      confetti({ ...base, particleCount: Math.round(4 * scalar) + 1, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } })
      confetti({ ...base, particleCount: Math.round(4 * scalar) + 1, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
    if (kind === 'fireworks' && !reduced) listeners.forEach((l) => l(low ? 5 : 9))
  }
}
