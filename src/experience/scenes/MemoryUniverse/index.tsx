import { useFrame, useThree } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { create } from 'zustand'
import { birthdayConfig } from '../../../config/birthdayConfig'
import { ui, useT } from '../../../i18n/strings'
import { useExperience, useTier } from '../../../stores/experience'
import { TIERS } from '../../../utils/quality'
import { glowTexture } from '../../../utils/textures'
import { heartGeometry } from '../../../utils/heart'
import { captionOf, hasPhotos, photos, pick } from '../../../data/photos'
import { audio } from '../../../components/audio/audioDirector'
import { cameraSet, cameraTo, rig, track } from '../../camera/CinematicCamera'
import { shotFor } from '../../camera/cameraPaths'
import { PhotoFrame3D } from '../../objects/PhotoFrame3D'
import { Starfield } from '../../objects/Starfield'
import { isPortrait } from '../../../hooks/useViewport'

/** focus = slot in the 3D layout (not photo index) */
const useUni = create<{ focus: number | null; slots: number[] }>(() => ({ focus: null, slots: [] }))
const spin = { y: 0, x: 0.12, vy: 0, vx: 0, dragging: false }

function layout(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = n <= 1 ? 0 : i / (n - 1)
    const r = 3.6 + 8 * Math.sqrt(t)
    const a = i * 2.39996 // golden angle
    return new THREE.Vector3(Math.cos(a) * r, Math.sin(i * 1.7) * (0.6 + t * 1.6), Math.sin(a) * r)
  })
}

const galaxyVert = /* glsl */ `
  attribute float aSize; attribute vec3 color; uniform float uTime; uniform float uPixel; varying vec3 vC; varying float vA;
  void main(){
    vec3 p = position;
    float r = length(p.xz);
    float a = atan(p.z, p.x) + uTime * 0.02 * (8.0 / (r + 2.0));
    p.x = cos(a) * r; p.z = sin(a) * r;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixel * (70.0 / -mv.z);
    vC = color; vA = 0.85;
  }`
const galaxyFrag = /* glsl */ `
  varying vec3 vC; varying float vA;
  void main(){ float d = length(gl_PointCoord-0.5); float a = pow(smoothstep(0.5,0.0,d), 1.8); gl_FragColor = vec4(vC, a*vA); }`

function Galaxy({ count }: { count: number }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const p = new Float32Array(count * 3)
    const c = new Float32Array(count * 3)
    const s = new Float32Array(count)
    const inner = new THREE.Color('#ffe0b5')
    const mid = new THREE.Color('#e79ab4')
    const outer = new THREE.Color('#5b6bd6')
    const tmp = new THREE.Color()
    const arms = 3
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.6) * 16 + 0.6
      const arm = (i % arms) / arms * Math.PI * 2
      const curl = r * 0.42
      const rnd = (k: number) => Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * k * (0.4 + r * 0.08)
      p.set([Math.cos(arm + curl) * r + rnd(1.2), rnd(0.5), Math.sin(arm + curl) * r + rnd(1.2)], i * 3)
      const k = r / 16
      tmp.copy(inner).lerp(mid, Math.min(1, k * 2)).lerp(outer, Math.max(0, k * 1.6 - 0.6))
      c.set([tmp.r, tmp.g, tmp.b], i * 3)
      s[i] = 0.5 + Math.random() * 1.3
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('color', new THREE.BufferAttribute(c, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(s, 1))
    return g
  }, [count])
  useEffect(() => () => geo.dispose(), [geo])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixel: { value: 1 } }), [])
  useFrame((st) => {
    uniforms.uTime.value = st.clock.elapsedTime
    uniforms.uPixel.value = st.gl.getPixelRatio()
  })
  return (
    <points geometry={geo} position={[0, -1.2, 0]} frustumCulled={false}>
      <shaderMaterial vertexShader={galaxyVert} fragmentShader={galaxyFrag} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function Nebula() {
  const tex = useMemo(() => glowTexture('255,255,255'), [])
  useEffect(() => () => tex.dispose(), [tex])
  const blobs: [number, number, number, number, string][] = [
    [-8, 2, -10, 16, '#6b2e5c'], [9, -1, -8, 14, '#2c3a8a'], [0, 4, -16, 22, '#4b2a6b'], [5, 3, 6, 10, '#7a3550'],
  ]
  return (
    <>
      {blobs.map(([x, y, z, s, c], i) => (
        <sprite key={i} position={[x, y, z]} scale={[s, s * 0.7, 1]}>
          <spriteMaterial map={tex} color={c} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </>
  )
}

function CoreHeart() {
  const ref = useRef<THREE.Mesh>(null)
  const geo = useMemo(() => heartGeometry(1.6, 0.35), [])
  const tex = useMemo(() => glowTexture('255,170,200'), [])
  useEffect(() => () => { geo.dispose(); tex.dispose() }, [geo, tex])
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime
    const beat = 1 + Math.pow(Math.max(0, Math.sin(t * 2.4)), 8) * 0.08
    ref.current.scale.setScalar(beat)
    ref.current.rotation.y = t * 0.35
  })
  return (
    <group>
      <mesh ref={ref} geometry={geo}>
        <meshPhysicalMaterial color="#ff9cbc" emissive="#e0456f" emissiveIntensity={1.6} roughness={0.2} clearcoat={1} toneMapped={false} />
      </mesh>
      <sprite scale={[7, 7, 1]}>
        <spriteMaterial map={tex} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <pointLight intensity={14} distance={16} color="#ff9cbc" />
    </group>
  )
}

function Constellation({ points }: { points: THREE.Vector3[] }) {
  const geo = useMemo(() => {
    const arr: number[] = []
    for (let i = 1; i < points.length; i++) arr.push(...points[i - 1].toArray(), ...points[i].toArray())
    // a few extra cross-links for a constellation feel
    for (let i = 3; i < points.length; i += 4) arr.push(...points[i - 3].toArray(), ...points[i].toArray())
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
    return g
  }, [points])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#d8b987" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
    </lineSegments>
  )
}

/** Pointer drag → rotation with inertia (no camera orbit, so the authored camera stays in control) */
function useDragSpin() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    let lx = 0
    let ly = 0
    let id: number | null = null
    const down = (e: PointerEvent) => {
      if (useUni.getState().focus !== null) return
      id = e.pointerId
      lx = e.clientX
      ly = e.clientY
      spin.dragging = true
    }
    const move = (e: PointerEvent) => {
      if (!spin.dragging || e.pointerId !== id) return
      const dx = e.clientX - lx
      const dy = e.clientY - ly
      lx = e.clientX
      ly = e.clientY
      spin.vy = dx * 0.005
      spin.vx = dy * 0.002
      spin.y += spin.vy
      spin.x = THREE.MathUtils.clamp(spin.x + spin.vx, -0.25, 0.5)
    }
    const up = () => {
      spin.dragging = false
      id = null
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [gl])
}

export function MemoryUniverseScene() {
  const tier = useTier()
  const q = TIERS[tier]
  const camera = useThree((s) => s.camera)
  const group = useRef<THREE.Group>(null)
  const frameRefs = useRef<(THREE.Group | null)[]>([])
  const focus = useUni((s) => s.focus)
  const lightbox = useExperience((s) => s.lightbox)
  useDragSpin()

  const slots = useMemo(() => (hasPhotos ? pick(Math.min(photos.length, q.maxFrames3D), 0) : Array.from({ length: 12 }, (_, i) => -1 - i)), [q.maxFrames3D])
  const positions = useMemo(() => layout(slots.length), [slots.length])

  useEffect(() => {
    useUni.setState({ focus: null, slots })
    spin.vy = 0.0015
    const portrait = isPortrait()
    cameraSet(shotFor('universe', 'start', portrait))
    rig.parallax = 0.5
    track(cameraTo(shotFor('universe', 'main', portrait), 5.5, 'power2.inOut'))
  }, [slots])

  // fly to focused memory
  useEffect(() => {
    const portrait = isPortrait()
    if (focus === null) {
      rig.parallax = 0.5
      cameraTo(shotFor('universe', 'main', portrait), 2.4, 'power2.inOut')
      return
    }
    const g = frameRefs.current[focus]
    if (!g) return
    rig.parallax = 0.08
    spin.vy = 0
    const wp = new THREE.Vector3()
    g.getWorldPosition(wp)
    const dir = wp.clone().sub(new THREE.Vector3(0, wp.y, 0)).normalize()
    const camPos = wp.clone().add(dir.multiplyScalar(portrait ? 3.6 : 2.6)).add(new THREE.Vector3(0, 0.25, 0))
    audio.whoosh()
    cameraTo({ pos: camPos.toArray() as [number, number, number], target: wp.toArray() as [number, number, number] }, 2.2, 'power3.inOut')
  }, [focus])

  // returning from the lightbox keeps focus; closing focus resumes drift
  useEffect(() => {
    if (!lightbox && focus === null) spin.vy = 0.0015
  }, [lightbox, focus])

  const inv = useMemo(() => new THREE.Quaternion(), [])
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    if (!spin.dragging && useUni.getState().focus === null) {
      spin.vy = THREE.MathUtils.lerp(spin.vy, 0.0015, 0.02)
      spin.y += spin.vy * Math.min(dt * 60, 3)
      spin.vx *= 0.9
    }
    g.rotation.y = spin.y
    g.rotation.x = spin.x
    // billboard every frame so photos always face her
    g.updateMatrixWorld()
    inv.copy(g.quaternion).invert()
    for (const f of frameRefs.current) if (f) f.quaternion.copy(inv).multiply(camera.quaternion)
  })

  return (
    <>
      <color attach="background" args={['#05060e']} />
      <fog attach="fog" args={['#05060e', 20, 60]} />
      <ambientLight intensity={0.35} color="#c9cfff" />
      <Starfield count={Math.round(3500 * q.particles) + 500} radius={70} />
      <Nebula />
      <group ref={group}>
        <Galaxy count={Math.round(9000 * q.particles) + 1500} />
        <CoreHeart />
        <Constellation points={positions} />
        {slots.map((photoIdx, slot) => (
          <group key={slot} ref={(el) => (frameRefs.current[slot] = el)} position={positions[slot]}>
            <PhotoFrame3D
              index={photoIdx}
              size={focus === slot ? 1.6 : 1.25}
              style="polaroid"
              emissive={0.15}
              onSelect={(_, e) => {
                if (e.delta > 8) return
                audio.chime('soft')
                if (useUni.getState().focus === slot && photoIdx >= 0) useExperience.getState().set({ lightbox: { index: photoIdx } })
                else useUni.setState({ focus: slot })
              }}
            />
          </group>
        ))}
      </group>
    </>
  )
}

export function MemoryUniverseOverlay() {
  const t = useT()
  const lang = useExperience((s) => s.lang)
  const focus = useUni((s) => s.focus)
  const slots = useUni((s) => s.slots)
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      const tl = gsap.timeline({ delay: 1.8 })
      tl.from('.u-t', { opacity: 0, y: 12, filter: 'blur(6px)', duration: 1.8 }).from('.u-s', { opacity: 0, y: 8, duration: 1.4 }, '-=0.8').to('.u-s', { opacity: 0, duration: 1.2, delay: 5 })
      track(tl)
    },
    { scope: ref },
  )
  const step = (d: number) => {
    const n = slots.length
    if (!n) return
    const cur = useUni.getState().focus
    useUni.setState({ focus: cur === null ? (d > 0 ? 0 : n - 1) : (cur + d + n) % n })
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useExperience.getState().lightbox || useExperience.getState().galleryOpen) return
      if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'Escape') useUni.setState({ focus: null })
      else if (e.key === 'Enter' && useUni.getState().focus !== null) {
        const p = slots[useUni.getState().focus!]
        if (p >= 0) useExperience.getState().set({ lightbox: { index: p } })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const photoIdx = focus !== null ? slots[focus] : -1
  const p = photoIdx >= 0 ? photos[photoIdx] : undefined
  const cap = captionOf(p, lang)
  return (
    <div ref={ref} className="ov-stack justify-between">
      <div className="ov-top text-center">
        <h2 className="u-t font-display text-ivory text-[clamp(1.7rem,6vw,3rem)] text-glow">{t(birthdayConfig.universe.title)}</h2>
        <p className="u-s mt-2 font-body font-light text-ivory/80 text-[clamp(0.92rem,3.3vw,1.1rem)] max-w-xl mx-auto">{t(birthdayConfig.universe.subtitle)}</p>
      </div>
      <div className="ov-bottom flex flex-col items-center gap-3">
        {focus !== null ? (
          <div className="card-note animate-rise text-center">
            <p className="font-display italic text-ivory text-lg">{cap || (p ? `${focus + 1} / ${slots.length}` : t(ui.noPhotosTitle))}</p>
            {!p && <p className="text-ivory/60 text-sm mt-1">{t(ui.noPhotosBody)}</p>}
            <div className="mt-3 flex items-center justify-center gap-2">
              <button className="btn-icon" aria-label={t(ui.prevMemory)} onClick={() => step(-1)}>‹</button>
              {p && <button className="btn-ghost" onClick={() => useExperience.getState().set({ lightbox: { index: photoIdx } })}>{t(ui.viewPhoto)}</button>}
              <button className="btn-ghost" onClick={() => useUni.setState({ focus: null })}>{t(ui.close)}</button>
              <button className="btn-icon" aria-label={t(ui.nextMemory)} onClick={() => step(1)}>›</button>
            </div>
          </div>
        ) : (
          <p className="hint">{t(ui.universeHint)}</p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {focus === null && <button className="btn-ghost" onClick={() => step(1)}>{t(ui.tour)}</button>}
          <button className="btn-ghost" onClick={() => useExperience.getState().set({ galleryOpen: true })}>{t(ui.allPhotos)}</button>
          <button className="btn-primary" onClick={() => useExperience.getState().next()}>{t(ui.next)} →</button>
        </div>
      </div>
    </div>
  )
}
