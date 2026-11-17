import type { ComponentType } from 'react'
import type { StageId } from '../../stores/experience'
import { InvitationOverlay, InvitationScene } from './SecretInvitation'
import { BirthdayRoomOverlay, BirthdayRoomScene } from './BirthdayRoom'
import { LoveGardenOverlay, LoveGardenScene } from './LoveGarden'
import { MemoryUniverseOverlay, MemoryUniverseScene } from './MemoryUniverse'
import { OurTimelineOverlay, OurTimelineScene } from './OurTimeline'
import { LoveTreeOverlay, LoveTreeScene } from './LoveTree'
import { BirthdayCakeOverlay, BirthdayCakeScene } from './BirthdayCake'
import { GiftRevealOverlay, GiftRevealScene } from './GiftReveal'
import { GrandFinaleOverlay, GrandFinaleScene } from './GrandFinale'

export const SCENES: Record<StageId, { Scene: ComponentType; Overlay: ComponentType }> = {
  invitation: { Scene: InvitationScene, Overlay: InvitationOverlay },
  room: { Scene: BirthdayRoomScene, Overlay: BirthdayRoomOverlay },
  garden: { Scene: LoveGardenScene, Overlay: LoveGardenOverlay },
  universe: { Scene: MemoryUniverseScene, Overlay: MemoryUniverseOverlay },
  timeline: { Scene: OurTimelineScene, Overlay: OurTimelineOverlay },
  tree: { Scene: LoveTreeScene, Overlay: LoveTreeOverlay },
  cake: { Scene: BirthdayCakeScene, Overlay: BirthdayCakeOverlay },
  gift: { Scene: GiftRevealScene, Overlay: GiftRevealOverlay },
  finale: { Scene: GrandFinaleScene, Overlay: GrandFinaleOverlay },
}
