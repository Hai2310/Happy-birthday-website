import { birthdayConfig, type TimelineMilestone } from '../config/birthdayConfig'
import { findPhoto, photos, pick } from './photos'

export interface ResolvedMilestone extends TimelineMilestone {
  photoIndex: number
}

/** Timeline entries with resolved photo indices. Unassigned milestones get evenly spread photos in manifest order. */
export function resolveTimeline(): ResolvedMilestone[] {
  const items = birthdayConfig.timeline
  const auto = pick(items.length, 0)
  const used = new Set<number>()
  return items.map((m, i) => {
    let idx = findPhoto(m.photo)
    if (idx < 0) idx = auto.find((a) => !used.has(a)) ?? (photos.length ? i % photos.length : -1)
    used.add(idx)
    return { ...m, photoIndex: idx }
  })
}
