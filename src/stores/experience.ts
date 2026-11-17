import { create } from 'zustand'
import { birthdayConfig } from '../config/birthdayConfig'
import { detectTier, prefersReducedMotion, type Tier } from '../utils/quality'
import { store } from '../utils/storage'

export const ALL_STAGES = ['invitation', 'room', 'garden', 'universe', 'timeline', 'tree', 'cake', 'gift', 'finale'] as const
export type StageId = (typeof ALL_STAGES)[number]

export function resolveStages(order: readonly StageId[], enabled: Partial<Record<StageId, boolean>>): StageId[] {
  const seen = new Set<StageId>()
  const out = order.filter((s) => {
    if (!ALL_STAGES.includes(s) || seen.has(s) || enabled[s] === false) return false
    seen.add(s)
    return true
  })
  // invitation always first, finale always reachable
  if (!out.includes('invitation')) out.unshift('invitation')
  return out
}

export type Lightbox = { index: number } | null

interface ExperienceState {
  stages: StageId[]
  stage: StageId
  /** stage requested — ExperienceController plays the veil transition then commits it */
  pending: StageId | null
  sceneKey: number
  unlocked: boolean
  lang: 'vi' | 'en'
  muted: boolean
  qualityPref: Tier | 'auto'
  detectedTier: Tier
  degraded: number
  reducedMotion: boolean
  galleryOpen: boolean
  lightbox: Lightbox
  letterOpen: boolean
  menuOpen: boolean
  furthest: number
  // scene progress flags
  lightsOn: boolean
  candlesOut: boolean
  cakeCut: boolean
  giftOpen: boolean
  heartsRead: number[]
  skipToken: number

  go: (id: StageId) => void
  commit: () => void
  next: () => void
  prev: () => void
  replayScene: () => void
  restart: () => void
  set: (p: Partial<ExperienceState>) => void
  skip: () => void
  tier: () => Tier
}

const stages = resolveStages(birthdayConfig.sceneOrder, birthdayConfig.enabledScenes)
const savedFurthest = Math.min(store.get<number>('furthest', 0), stages.length - 1)

export const useExperience = create<ExperienceState>((set, get) => ({
  stages,
  stage: 'invitation',
  pending: null,
  sceneKey: 0,
  unlocked: !birthdayConfig.secretCode || store.get('unlocked', false),
  lang: store.get<'vi' | 'en'>('lang', birthdayConfig.preferredLanguage),
  muted: store.get('muted', !birthdayConfig.musicEnabled),
  qualityPref: store.get<Tier | 'auto'>('quality', 'auto'),
  detectedTier: typeof window === 'undefined' ? 'medium' : detectTier(),
  degraded: 0,
  reducedMotion: prefersReducedMotion(),
  galleryOpen: false,
  lightbox: null,
  letterOpen: false,
  menuOpen: false,
  furthest: savedFurthest,
  lightsOn: false,
  candlesOut: false,
  cakeCut: false,
  giftOpen: false,
  heartsRead: [],
  skipToken: 0,

  go: (id) => {
    const s = get()
    if (!s.stages.includes(id) || s.pending) return
    set({ pending: id, menuOpen: false, lightbox: null })
  },
  commit: () => {
    const { pending, stages, furthest, sceneKey } = get()
    if (!pending) return
    const idx = stages.indexOf(pending)
    const f = Math.max(furthest, idx)
    store.set('furthest', f)
    store.set('stage', pending)
    // entering a scene resets its local progress so replays work
    const reset: Partial<ExperienceState> = {}
    if (pending === 'room') reset.lightsOn = false
    if (pending === 'cake') Object.assign(reset, { candlesOut: false, cakeCut: false })
    if (pending === 'gift') reset.giftOpen = false
    if (pending === 'tree') reset.heartsRead = []
    set({ stage: pending, pending: null, furthest: f, sceneKey: sceneKey + 1, ...reset })
  },
  next: () => {
    const { stages, stage, go } = get()
    const i = stages.indexOf(stage)
    if (i < stages.length - 1) go(stages[i + 1])
  },
  prev: () => {
    const { stages, stage, go } = get()
    const i = stages.indexOf(stage)
    if (i > 0) go(stages[i - 1])
  },
  replayScene: () => get().go(get().stage),
  restart: () => {
    store.set('furthest', 0)
    set({ furthest: 0 })
    get().go('invitation')
  },
  set: (p) => {
    if ('lang' in p) store.set('lang', p.lang)
    if ('muted' in p) store.set('muted', p.muted)
    if ('qualityPref' in p) store.set('quality', p.qualityPref)
    set(p)
  },
  skip: () => set({ skipToken: get().skipToken + 1 }),
  tier: () => {
    const { qualityPref, detectedTier, degraded } = get()
    if (qualityPref !== 'auto') return qualityPref
    const order: Tier[] = ['high', 'medium', 'low']
    return order[Math.min(order.indexOf(detectedTier) + degraded, 2)]
  },
}))

export const useTier = () =>
  useExperience((s) => {
    if (s.qualityPref !== 'auto') return s.qualityPref
    const order: Tier[] = ['high', 'medium', 'low']
    return order[Math.min(order.indexOf(s.detectedTier) + s.degraded, 2)]
  })
