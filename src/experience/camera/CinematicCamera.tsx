import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect } from 'react'
import * as THREE from 'three'
import { useExperience } from '../../stores/experience'
import type { Shot, Vec3 } from './cameraPaths'

/**
 * One camera rig shared by every scene. Scenes never touch the camera directly —
 * they call cameraTo()/cameraSet(), which GSAP-tween this rig. A single useFrame applies it.
 */
export const rig = {
  pos: new THREE.Vector3(0, 0, 8),
  target: new THREE.Vector3(),
  fov: 45,
  sway: 1,
  /** extra pointer parallax strength */
  parallax: 0.25,
}

let active: gsap.core.Timeline | null = null
const timelines = new Set<gsap.core.Animation>()

/** register any scene timeline so "Skip animation" can fast-forward it */
export function track<T extends gsap.core.Animation>(a: T): T {
  timelines.add(a)
  a.eventCallback('onComplete', () => { timelines.delete(a) })
  return a
}
export function skipAll() {
  for (const t of [...timelines]) t.progress(1)
  timelines.clear()
}
export function killAll() {
  for (const t of [...timelines]) t.kill()
  timelines.clear()
  active?.kill()
}

export function cameraSet(shot: Shot) {
  active?.kill()
  rig.pos.set(...shot.pos)
  rig.target.set(...shot.target)
  if (shot.fov) rig.fov = shot.fov
}

export function cameraTo(shot: { pos: Vec3; target: Vec3; fov?: number }, duration = 3, ease = 'power2.inOut') {
  active?.kill()
  const tl = gsap.timeline()
  tl.to(rig.pos, { x: shot.pos[0], y: shot.pos[1], z: shot.pos[2], duration, ease }, 0)
  tl.to(rig.target, { x: shot.target[0], y: shot.target[1], z: shot.target[2], duration, ease }, 0)
  if (shot.fov) tl.to(rig, { fov: shot.fov, duration, ease }, 0)
  active = tl
  return track(tl)
}

export function CinematicCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const reduced = useExperience((s) => s.reducedMotion)
  const skipToken = useExperience((s) => s.skipToken)
  const pointer = useThree((s) => s.pointer)
  const tmp = new THREE.Vector3()

  useEffect(() => {
    if (skipToken) skipAll()
  }, [skipToken])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const sway = reduced ? 0 : rig.sway
    tmp.copy(rig.pos)
    tmp.x += (Math.sin(t * 0.21) * 0.05 + pointer.x * rig.parallax) * sway
    tmp.y += (Math.sin(t * 0.17 + 1) * 0.04 + pointer.y * rig.parallax * 0.5) * sway
    camera.position.lerp(tmp, 0.12)
    camera.lookAt(rig.target)
    if (Math.abs(camera.fov - rig.fov) > 0.01) {
      camera.fov = rig.fov
      camera.updateProjectionMatrix()
    }
  })
  return null
}
