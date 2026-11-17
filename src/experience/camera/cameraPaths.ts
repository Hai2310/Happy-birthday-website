import type { StageId } from '../../stores/experience'

export type Vec3 = [number, number, number]
export interface Shot {
  pos: Vec3
  target: Vec3
  fov?: number
}

/** Authored establishing shots per scene ("start" is where each chapter opens, "main" where it settles). */
export const SHOTS: Record<StageId, { start: Shot; main: Shot; portrait?: Partial<Shot> }> = {
  invitation: { start: { pos: [0, 0.3, 9], target: [0, 0, 0], fov: 40 }, main: { pos: [0, 0.15, 5.4], target: [0, 0, 0], fov: 40 }, portrait: { pos: [0, 0.2, 7.6] } },
  room: { start: { pos: [0, 1.6, 7.6], target: [0, 1.5, 0], fov: 50 }, main: { pos: [0, 1.7, 5.2], target: [0, 1.6, -1], fov: 50 }, portrait: { pos: [0, 1.7, 7.4] } },
  garden: { start: { pos: [0, 1.6, 14], target: [0, 1.3, 6], fov: 48 }, main: { pos: [0, 2.2, 7.5], target: [0, 1, 0], fov: 48 }, portrait: { pos: [0, 2.6, 10.5] } },
  universe: { start: { pos: [0, 14, 30], target: [0, 0, 0], fov: 50 }, main: { pos: [0, 3.2, 15], target: [0, 0, 0], fov: 50 }, portrait: { pos: [0, 4, 22] } },
  timeline: { start: { pos: [0, 5, 6], target: [0, 0, 0], fov: 42 }, main: { pos: [0, 3.1, 3.6], target: [0, 0.05, 0.1], fov: 42 }, portrait: { pos: [0, 5.6, 6.4] } },
  tree: { start: { pos: [0, 1.5, 13], target: [0, 3, 0], fov: 46 }, main: { pos: [0, 3.6, 10.6], target: [0, 3.6, 0], fov: 46 }, portrait: { pos: [0, 3.4, 13] } },
  cake: { start: { pos: [0, 5, 8], target: [0, 1, 0], fov: 40 }, main: { pos: [0, 2.6, 5.6], target: [0, 1.15, 0], fov: 40 }, portrait: { pos: [0, 3.1, 8.2] } },
  gift: { start: { pos: [3, 2.5, 7], target: [0, 0.6, 0], fov: 42 }, main: { pos: [0, 1.9, 5.2], target: [0, 0.7, 0], fov: 42 }, portrait: { pos: [0, 2.2, 7.4] } },
  finale: { start: { pos: [0, 0, 6], target: [0, 0, 0], fov: 50 }, main: { pos: [0, 0.2, 15], target: [0, -0.7, 0], fov: 50 }, portrait: { pos: [0, 0.2, 23], target: [0, -1.8, 0] } },
}

export function shotFor(stage: StageId, which: 'start' | 'main', portrait: boolean): Shot {
  const s = SHOTS[stage][which]
  if (!portrait || !SHOTS[stage].portrait) return s
  if (which === 'start') return { ...s, pos: [s.pos[0], s.pos[1], s.pos[2] * 1.3] }
  return { ...s, ...SHOTS[stage].portrait } as Shot
}
