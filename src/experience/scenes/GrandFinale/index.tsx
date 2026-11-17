import { useFrame, useThree } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { birthdayConfig } from '../../../config/birthdayConfig'
import { ui, useT } from '../../../i18n/strings'
import { useExperience, useTier } from '../../../stores/experience'
import { TIERS } from '../../../utils/quality'
import { heartPoints } from '../../../utils/heart'
import { forScene, hasPhotos } from '../../../data/photos'
import { audio } from '../../../components/audio/audioDirector'
import { cameraSet, cameraTo, rig, track } from '../../camera/CinematicCamera'
import { shotFor } from '../../camera/cameraPaths'
import { PhotoFrame3D } from '../../objects/PhotoFrame3D'
import { Starfield } from '../../objects/Starfield'
import { PetalParticles } from '../../effects/PetalParticles'
import { isPortrait } from '../../../hooks/useViewport'
import { celebrate } from '../../effects/celebrate'

const form = { current: 0 }
/** extra heartbeat from taps (decays every frame) */
const pulse = { current: 0 }

const heartVert = /* glsl */ `
  attribute vec3 aStart; attribute float aRand; uniform float uForm; uniform float uTime; uniform float uPixel; uniform float uBeat;
  varying float vA; varying vec3 vC;
  void main(){
    float k = smoothstep(aRand * 0.35, aRand * 0.35 + 0.65, uForm);
    vec3 p = mix(aStart, position * (1.0 + uBeat * 0.06), k);
    p += vec3(sin(uTime * 0.7 + aRand * 30.0), cos(uTime * 0.6 + aRand * 20.0), sin(uTime * 0.5 + aRand * 10.0)) * 0.05 * k;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.4 + aRand * 2.2) * uPixel * (40.0 / -mv.z);
    vA = 0.35 + 0.65 * k;
    vC = mix(vec3(1.0, 0.72, 0.86), vec3(1.0, 0.42, 0.68), aRand);
  }`
const heartFrag = /* glsl */ `
  varying float vA; varying vec3 vC;
  void main(){ float d = length(gl_PointCoord-0.5); float a = pow(smoothstep(0.5,0.0,d), 1.6); gl_FragColor = vec4(vC * 1.8, a * vA); }`

function ParticleHeart({ count }: { count: number }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const target = heartPoints(count, 3.1, 7)
    const start = new Float32Array(count * 3)
    const r = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const rad = 10 + Math.random() * 25
      const q = Math.sqrt(1 - u * u)
      start.set([rad * q * Math.cos(th), rad * u, rad * q * Math.sin(th)], i * 3)
      r[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(target, 3))
    g.setAttribute('aStart', new THREE.BufferAttribute(start, 3))
    g.setAttribute('aRand', new THREE.BufferAttribute(r, 1))
    return g
  }, [count])
  useEffect(() => () => geo.dispose(), [geo])
  const uniforms = useMemo(() => ({ uForm: { value: 0 }, uTime: { value: 0 }, uPixel: { value: 1 }, uBeat: { value: 0 } }), [])
  const ref = useRef<THREE.Points>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    uniforms.uForm.value = form.current
    uniforms.uTime.value = t
    uniforms.uPixel.value = s.gl.getPixelRatio()
    uniforms.uBeat.value = Math.pow(Math.max(0, Math.sin(t * 2.2)), 10) * form.current + pulse.current * 2.5
  })
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <shaderMaterial vertexShader={heartVert} fragmentShader={heartFrag} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  )
}

/** Golden sky lanterns — one instanced mesh with per-instance drift. */
function Lanterns({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const data = useMemo(() => Array.from({ length: count }, () => ({ x: (Math.random() - 0.5) * 34, y: -12 - Math.random() * 20, z: -6 - Math.random() * 18, v: 0.35 + Math.random() * 0.4, ph: Math.random() * 6, s: 0.6 + Math.random() * 0.6 })), [count])
  const o = useMemo(() => new THREE.Object3D(), [])
  const geo = useMemo(() => new THREE.CylinderGeometry(0.22, 0.16, 0.42, 10, 1, true), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffd0e2', emissive: '#ff6fa8', emissiveIntensity: 2.2, side: THREE.DoubleSide, transparent: true, opacity: 0.92, toneMapped: false }), [])
  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])
  useFrame((s, dt) => {
    const m = ref.current
    if (!m) return
    const t = s.clock.elapsedTime
    data.forEach((d, i) => {
      d.y += d.v * Math.min(dt, 0.05) * Math.min(1, form.current * 1.5)
      if (d.y > 22) d.y = -14
      o.position.set(d.x + Math.sin(t * 0.3 + d.ph) * 0.6, d.y, d.z)
      o.rotation.set(Math.sin(t + d.ph) * 0.08, t * 0.2 + d.ph, 0)
      o.scale.setScalar(d.s)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}

/** Photos orbit the heart; constellation lines tie them together. */
function PhotoRing({ indices }: { indices: number[] }) {
  const g = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera)
  const kids = useRef<(THREE.Group | null)[]>([])
  const n = indices.length
  const R = 6.2
  const pts = useMemo(() => indices.map((_, i) => {
    const a = (i / n) * Math.PI * 2
    return new THREE.Vector3(Math.cos(a) * R, Math.sin(a * 2) * 0.9, Math.sin(a) * R)
  }), [indices, n])
  const lines = useMemo(() => {
    const arr: number[] = []
    for (let i = 0; i < n; i++) arr.push(...pts[i].toArray(), ...pts[(i + 1) % n].toArray())
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
    return geo
  }, [pts, n])
  useEffect(() => () => lines.dispose(), [lines])
  const q = useMemo(() => new THREE.Quaternion(), [])
  useFrame((s) => {
    if (!g.current) return
    g.current.rotation.y = s.clock.elapsedTime * 0.08
    const sc = THREE.MathUtils.clamp((form.current - 0.4) / 0.5, 0.001, 1)
    g.current.scale.setScalar(sc)
    g.current.getWorldQuaternion(q).invert()
    for (const k of kids.current) k?.quaternion.copy(q).multiply(camera.quaternion)
  })
  return (
    <group ref={g}>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color="#d8b987" transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
      {indices.map((idx, i) => (
        <group key={i} ref={(el) => (kids.current[i] = el)} position={pts[i]}>
          <PhotoFrame3D index={idx} size={1.35} style="polaroid" emissive={0.2} onSelect={idx >= 0 ? (k, e) => { if (e.delta < 8) useExperience.getState().set({ lightbox: { index: k } }) } : undefined} />
        </group>
      ))}
    </group>
  )
}

/** Drag anywhere to spin the heart + photo ring; tap the heart to make it beat and shower hearts. */
function HeartStage({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null)
  const gl = useThree((s) => s.gl)
  const spin = useRef({ y: 0, x: 0, vy: 0.12, vx: 0, dragging: false, lx: 0, ly: 0 })
  useEffect(() => {
    const el = gl.domElement
    const s = spin.current
    const down = (e: PointerEvent) => { s.dragging = true; s.lx = e.clientX; s.ly = e.clientY }
    const move = (e: PointerEvent) => {
      if (!s.dragging) return
      const dx = e.clientX - s.lx
      const dy = e.clientY - s.ly
      s.lx = e.clientX
      s.ly = e.clientY
      s.vy = dx * 0.006
      s.vx = dy * 0.004
      s.y += s.vy
      s.x = THREE.MathUtils.clamp(s.x + s.vx, -0.6, 0.6)
    }
    const up = () => { s.dragging = false }
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
  useFrame((_, dt) => {
    const s = spin.current
    const d = Math.min(dt, 0.05)
    if (!s.dragging) {
      // ease back to a gentle idle spin
      s.vy += (0.12 * d - s.vy) * 0.04
      s.y += s.vy
      s.x += (0 - s.x) * 0.03
    }
    pulse.current = Math.max(0, pulse.current - d * 1.6)
    if (g.current) {
      g.current.rotation.y = s.y
      g.current.rotation.x = s.x
      g.current.scale.setScalar(1 + pulse.current * 0.08)
    }
  })
  return <group ref={g}>{children}</group>
}

function HeartHitArea() {
  return (
    <mesh
      position={[0, 0.3, 0]}
      onClick={(e) => {
        if (e.delta > 8 || form.current < 0.6) return
        e.stopPropagation()
        pulse.current = 1
        audio.chime('sparkle')
        celebrate('hearts')
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <sphereGeometry args={[3, 16, 12]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

/** Exposes a one-shot capture of the current WebGL frame for the "capture" button. */
export const captureRef: { current: null | (() => string) } = { current: null }
function CaptureBridge() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    captureRef.current = () => {
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/png')
    }
    return () => { captureRef.current = null }
  }, [gl, scene, camera])
  return null
}

export function GrandFinaleScene() {
  const tier = useTier()
  const q = TIERS[tier]
  const indices = useMemo(() => (hasPhotos ? forScene('finale', Math.min(12, Math.max(6, q.maxFrames3D / 3)), 7, ['couple', 'hero', 'romantic']) : [-1, -2, -3, -4, -5, -6]), [q.maxFrames3D])
  useEffect(() => {
    form.current = 0
    const portrait = isPortrait()
    cameraSet(shotFor('finale', 'start', portrait))
    rig.parallax = 0.3
    const tl = gsap.timeline()
    tl.to(form, { current: 1, duration: 7, ease: 'power2.inOut' }, 0.5)
    tl.add(cameraTo(shotFor('finale', 'main', portrait), 9, 'sine.inOut'), 0)
    tl.call(() => celebrate('fireworks'), [], 6.5)
    // final wide, quiet shot
    tl.add(cameraTo({ pos: [0, 1.2, portrait ? 30 : 19], target: [0, portrait ? -2.4 : -0.6, 0] }, 10, 'sine.inOut'), 16)
    track(tl)
    audio.chime('open')
    return () => { tl.kill() }
  }, [])
  return (
    <>
      <color attach="background" args={['#04050c']} />
      <fog attach="fog" args={['#04050c', 25, 70]} />
      <ambientLight intensity={0.4} color="#ffdfe8" />
      <pointLight position={[0, 0, 4]} intensity={12} distance={18} color="#ff9cc6" />
      <Starfield count={Math.round(4000 * q.particles) + 600} radius={70} />
      <HeartStage>
        <ParticleHeart count={Math.round(9000 * q.particles) + 1800} />
        <HeartHitArea />
        <PhotoRing indices={indices} />
      </HeartStage>
      <Lanterns count={Math.round(70 * q.particles) + 14} />
      <PetalParticles count={Math.round(120 * q.particles) + 15} area={[26, 18, 14]} center={[0, 5, 0]} speed={0.6} />
      <CaptureBridge />
    </>
  )
}

async function captureMoment(lang: 'vi' | 'en') {
  const grab = captureRef.current
  if (!grab) return false
  const shot = grab()
  const img = new Image()
  img.src = shot
  await img.decode()
  const W = 1080
  const H = 1350 // portrait 4:5 — good on phones and social
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#04050c'
  g.fillRect(0, 0, W, H)
  // cover-fit the 3D frame
  const s = Math.max(W / img.width, H / img.height)
  g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s)
  const grd = g.createLinearGradient(0, H * 0.55, 0, H)
  grd.addColorStop(0, 'rgba(4,5,12,0)')
  grd.addColorStop(1, 'rgba(4,5,12,0.9)')
  g.fillStyle = grd
  g.fillRect(0, 0, W, H)
  await document.fonts.ready
  g.textAlign = 'center'
  g.fillStyle = '#D8B987'
  g.font = '112px "Great Vibes", cursive'
  g.fillText(`Happy Birthday, ${birthdayConfig.girlfriendName}`, W / 2, H - 210, W - 80)
  g.fillStyle = 'rgba(255,248,240,0.92)'
  g.font = 'italic 500 46px "Cormorant Garamond", serif'
  g.fillText(lang === 'en' ? birthdayConfig.signature.en ?? birthdayConfig.signature.vi : birthdayConfig.signature.vi, W / 2, H - 130, W - 80)
  const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/png'))
  if (!blob) return false
  const file = new File([blob], 'our-universe.png', { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  if (nav.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await nav.share({ files: [file] })
      return true
    } catch { /* user cancelled → fall through to download */ }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'our-universe.png'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  return true
}

export function GrandFinaleOverlay() {
  const t = useT()
  const lang = useExperience((s) => s.lang)
  const ref = useRef<HTMLDivElement>(null)
  const [done, setDone] = useState(false)
  const [showMsg, setShowMsg] = useState(true)
  // once the wish has been read, let the heart take the stage (she can bring the words back)
  useEffect(() => {
    if (!done) return
    const id = setTimeout(() => setShowMsg(false), 6000)
    return () => clearTimeout(id)
  }, [done])
  const [saved, setSaved] = useState(false)
  useGSAP(
    () => {
      const tl = gsap.timeline({ delay: 5.5 })
      tl.from('.f-name', { opacity: 0, y: 20, filter: 'blur(10px)', duration: 2.4, ease: 'power3.out' })
      tl.from('.f-line', { opacity: 0, y: 10, duration: 1.4, stagger: 2.1, ease: 'power2.out' }, '+=0.4')
      tl.from('.f-sign', { opacity: 0, duration: 2 }, '+=0.6')
      tl.call(() => setDone(true), [], '+=0.8')
      track(tl)
    },
    { scope: ref },
  )
  return (
    <div ref={ref} className="ov-stack justify-between">
      <div className="ov-top text-center">
        <h1 className="f-name font-script text-gold text-[clamp(2.6rem,11vw,6rem)] leading-[1.05] text-glow-strong">Happy Birthday,{' '}<span className="whitespace-nowrap">{birthdayConfig.girlfriendName}</span></h1>
      </div>
      <div className="ov-bottom flex flex-col items-center gap-3 text-center">
        <div className={`finale-text max-w-xl ${showMsg ? '' : 'is-hidden'}`} aria-hidden={!showMsg}>
          {birthdayConfig.finalMessage.map((l, i) => (
            <p key={i} className={`f-line font-display ${i === birthdayConfig.finalMessage.length - 1 ? 'text-blush text-[clamp(1.6rem,6vw,2.4rem)] italic' : 'text-ivory/95 text-[clamp(1.08rem,4.2vw,1.45rem)]'} leading-snug mt-1.5`}>
              {t(l)}
            </p>
          ))}
          <p className="f-sign font-script text-gold/90 text-[clamp(1.6rem,6vw,2.3rem)] mt-3">{t(birthdayConfig.signature)}</p>
        </div>
        {done && (
          <>
          {!showMsg && <p className="hint animate-fadein">✨ {t(ui.heartHint)}</p>}
          <div className="flex flex-wrap justify-center gap-2 animate-fadein">
            <button className="btn-ghost" onClick={() => setShowMsg((v) => !v)} aria-pressed={showMsg}>{showMsg ? t(ui.hideWish) : t(ui.showWish)}</button>
            <button className="btn-ghost" onClick={() => useExperience.getState().restart()}>{t(ui.replay)}</button>
            <button className="btn-ghost" onClick={() => useExperience.getState().set({ galleryOpen: true })}>{t(ui.allPhotosShort)}</button>
            <button className="btn-ghost" onClick={() => useExperience.getState().set({ letterOpen: true })}>{t(ui.rereadLetter)}</button>
            <button className="btn-primary" onClick={async () => { audio.chime('sparkle'); setSaved(await captureMoment(lang)) }}>{saved ? t(ui.captured) : t(ui.capture)}</button>
          </div>
          </>
        )}
      </div>
    </div>
  )
}
