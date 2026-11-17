import { useFrame } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { create } from 'zustand'
import { birthdayConfig } from '../../../config/birthdayConfig'
import { ui, useT } from '../../../i18n/strings'
import { useExperience, useTier } from '../../../stores/experience'
import { TIERS } from '../../../utils/quality'
import { glowTexture } from '../../../utils/textures'
import { forScene } from '../../../data/photos'
import { roseMessages } from '../../../data/loveMessages'
import { audio } from '../../../components/audio/audioDirector'
import { cameraSet, cameraTo, rig, track } from '../../camera/CinematicCamera'
import { shotFor } from '../../camera/cameraPaths'
import { PhotoFrame3D } from '../../objects/PhotoFrame3D'
import { Rose, leafGeometry, roseHeadGeometry } from '../../objects/Rose'
import { Fireflies } from '../../objects/Fireflies'
import { Starfield } from '../../objects/Starfield'
import { PetalParticles } from '../../effects/PetalParticles'
import { isPortrait } from '../../../hooks/useViewport'

type Reveal = { kind: 'rose'; i: number } | { kind: 'butterfly' } | null
const useGarden = create<{ reveal: Reveal; found: number[] }>(() => ({ reveal: null, found: [] }))

const SPECIAL: [number, number, number][] = [
  [-2.3, 0.95, 2.6],
  [2.4, 0.95, 1.8],
  [-1.6, 0.95, -1.2],
  [1.9, 0.95, -2.4],
  [-3.2, 0.95, 0.4],
]

/** many roses in two draw calls (heads + stems) */
function RoseField({ count }: { count: number }) {
  const heads = useRef<THREE.InstancedMesh>(null)
  const stems = useRef<THREE.InstancedMesh>(null)
  const leaves = useRef<THREE.InstancedMesh>(null)
  const headMat = useMemo(() => new THREE.MeshPhysicalMaterial({ roughness: 0.55, sheen: 1, sheenColor: '#ffc2d1', side: THREE.DoubleSide }), [])
  const stemMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#284d2f', roughness: 0.8 }), [])
  const stemGeo = useMemo(() => new THREE.CylinderGeometry(0.012, 0.016, 1, 5).translate(0, 0.5, 0), [])
  useEffect(() => () => { headMat.dispose(); stemMat.dispose(); stemGeo.dispose() }, [headMat, stemMat, stemGeo])
  useEffect(() => {
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    const palette = ['#b42a4e', '#c2385c', '#d991a9', '#f4c9d4', '#8e1f3d', '#e8a3b6', '#fff0f3']
    let n = 0
    let guard = 0
    while (n < count && guard++ < count * 20) {
      // beds on both sides of the winding path
      const side = Math.random() < 0.5 ? -1 : 1
      const z = 6 - Math.random() * 12
      const pathX = Math.sin(z * 0.35) * 0.8
      const x = pathX + side * (0.9 + Math.random() * 4.5)
      const h = 0.45 + Math.random() * 0.55
      const s = 0.55 + Math.random() * 0.5
      o.position.set(x, 0, z)
      o.rotation.set((Math.random() - 0.5) * 0.25, Math.random() * 6, (Math.random() - 0.5) * 0.25)
      o.scale.set(1, h, 1)
      o.updateMatrix()
      stems.current!.setMatrixAt(n, o.matrix)
      o.position.y = h
      o.scale.setScalar(s)
      o.updateMatrix()
      heads.current!.setMatrixAt(n, o.matrix)
      heads.current!.setColorAt(n, c.set(palette[Math.floor(Math.random() * palette.length)]))
      o.position.y = h * 0.45
      o.rotation.z += 1.1
      o.scale.setScalar(s * 1.2)
      o.updateMatrix()
      leaves.current!.setMatrixAt(n, o.matrix)
      n++
    }
    for (const m of [heads.current!, stems.current!, leaves.current!]) {
      m.count = n
      m.instanceMatrix.needsUpdate = true
    }
    if (heads.current!.instanceColor) heads.current!.instanceColor.needsUpdate = true
  }, [count])
  return (
    <>
      <instancedMesh ref={heads} args={[roseHeadGeometry(), headMat, count]} />
      <instancedMesh ref={stems} args={[stemGeo, stemMat, count]} />
      <instancedMesh ref={leaves} args={[leafGeometry(), stemMat, count]} />
    </>
  )
}

function Path() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const N = 46
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.42, 0.46, 0.06, 9)
    g.scale(1, 1, 0.75)
    return g
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  useEffect(() => {
    const o = new THREE.Object3D()
    for (let i = 0; i < N; i++) {
      const z = 7 - i * 0.32
      o.position.set(Math.sin(z * 0.35) * 0.8 + (i % 2 ? 0.22 : -0.22), 0.02, z)
      o.rotation.set(0, Math.random() * 3, 0)
      const s = 0.6 + Math.random() * 0.35
      o.scale.set(s, 1, s)
      o.updateMatrix()
      ref.current!.setMatrixAt(i, o.matrix)
    }
    ref.current!.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[geo, undefined, N]} receiveShadow>
      <meshStandardMaterial color="#8d8276" roughness={0.9} />
    </instancedMesh>
  )
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.12, 0.22, 2.8, 8]} />
        <meshStandardMaterial color="#2b1e1a" roughness={1} />
      </mesh>
      {[[0, 3.2, 0, 1.3], [0.8, 2.7, 0.2, 0.9], [-0.7, 2.8, -0.2, 1], [0.1, 3.9, 0.1, 0.9]].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color={i % 2 ? '#1f3a2a' : '#26442f'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Archway() {
  return (
    <group position={[0, 0, 9.5]}>
      {[-1.4, 1.4].map((x) => (
        <mesh key={x} position={[x, 1.5, 0]}>
          <boxGeometry args={[0.3, 3, 0.3]} />
          <meshStandardMaterial color="#efe4d2" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 3, 0]}>
        <torusGeometry args={[1.4, 0.15, 10, 32, Math.PI]} />
        <meshStandardMaterial color="#efe4d2" roughness={0.7} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 13) * Math.PI
        return <Rose key={i} position={[Math.cos(a) * 1.45, 3 + Math.sin(a) * 1.45, 0.18]} scale={0.5} color={i % 2 ? '#d991a9' : '#f4c9d4'} rotation={[Math.PI / 2, 0, 0]} />
      })}
    </group>
  )
}

function Pond() {
  return (
    <group position={[3.6, 0.01, -0.5]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 48]} />
        <meshStandardMaterial color="#0b1430" metalness={0.9} roughness={0.08} envMapIntensity={1.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <ringGeometry args={[1.45, 1.75, 48]} />
        <meshStandardMaterial color="#6f665d" roughness={0.95} />
      </mesh>
    </group>
  )
}

function SpecialRose({ i, position }: { i: number; position: [number, number, number] }) {
  const found = useGarden((s) => s.found.includes(i))
  const halo = useRef<THREE.Sprite>(null)
  const tex = useMemo(() => glowTexture('255,190,210'), [])
  useEffect(() => () => tex.dispose(), [tex])
  useFrame((s) => {
    if (halo.current) halo.current.scale.setScalar((found ? 0.7 : 1.1) + Math.sin(s.clock.elapsedTime * 2 + i) * 0.15)
  })
  const open = () => {
    audio.chime('soft')
    useGarden.setState((s) => ({ reveal: { kind: 'rose', i }, found: s.found.includes(i) ? s.found : [...s.found, i] }))
  }
  return (
    <group position={position}>
      <sprite ref={halo} position={[0, 0.05, 0]}>
        <spriteMaterial map={tex} transparent opacity={found ? 0.35 : 0.8} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <Rose color="#e0456f" scale={1.6} glow={found ? 0.15 : 0.55} />
      {/* generous invisible hit area for fingers */}
      <mesh visible={false} onClick={(e) => { e.stopPropagation(); open() }} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
        <sphereGeometry args={[0.45, 8, 6]} />
      </mesh>
    </group>
  )
}

function Butterfly() {
  const root = useRef<THREE.Group>(null)
  const l = useRef<THREE.Mesh>(null)
  const r = useRef<THREE.Mesh>(null)
  const wing = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.bezierCurveTo(0.15, 0.25, 0.42, 0.3, 0.4, 0.08)
    s.bezierCurveTo(0.42, -0.05, 0.3, -0.25, 0.05, -0.12)
    s.closePath()
    return new THREE.ShapeGeometry(s, 10)
  }, [])
  useEffect(() => () => wing.dispose(), [wing])
  useFrame((st) => {
    const t = st.clock.elapsedTime
    if (root.current) {
      root.current.position.set(Math.sin(t * 0.3) * 2.2 - 0.6, 1.6 + Math.sin(t * 1.1) * 0.25, 1.2 + Math.cos(t * 0.3) * 1.6)
      root.current.rotation.y = -t * 0.3 + Math.PI / 2
    }
    const f = Math.sin(t * 12) * 0.9
    if (l.current) l.current.rotation.y = f
    if (r.current) r.current.rotation.y = Math.PI - f
  })
  return (
    <group ref={root} onClick={(e) => { e.stopPropagation(); audio.chime('sparkle'); useGarden.setState({ reveal: { kind: 'butterfly' } }) }} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')} scale={0.9}>
      <mesh ref={l} geometry={wing}>
        <meshStandardMaterial color="#ffd6e2" emissive="#ff9fbf" emissiveIntensity={1.4} side={THREE.DoubleSide} transparent opacity={0.92} toneMapped={false} />
      </mesh>
      <mesh ref={r} geometry={wing}>
        <meshStandardMaterial color="#ffd6e2" emissive="#ff9fbf" emissiveIntensity={1.4} side={THREE.DoubleSide} transparent opacity={0.92} toneMapped={false} />
      </mesh>
      <mesh visible={false}>
        <sphereGeometry args={[0.45, 8, 6]} />
      </mesh>
    </group>
  )
}

function FloatingFrame({ index }: { index: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (ref.current) {
      ref.current.position.y = 2.1 + Math.sin(s.clock.elapsedTime * 0.8) * 0.12
      ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.4) * 0.25
    }
  })
  return (
    <group ref={ref} position={[0.2, 2.1, -3.4]}>
      <PhotoFrame3D index={index} size={1.5} style="glow" quality="src" onSelect={(k) => { audio.chime('soft'); useExperience.getState().set({ lightbox: { index: k } }) }} />
    </group>
  )
}

export function LoveGardenScene() {
  const tier = useTier()
  const q = TIERS[tier]
  const framePhoto = useMemo(() => forScene('garden', 1, 2, ['romantic', 'couple'])[0] ?? -1, [])
  useEffect(() => {
    useGarden.setState({ reveal: null, found: [] })
    const portrait = isPortrait()
    cameraSet(shotFor('garden', 'start', portrait))
    rig.parallax = 0.35
    // pass through the arch, then settle
    track(cameraTo(shotFor('garden', 'main', portrait), 6, 'power2.inOut'))
  }, [])
  return (
    <>
      <color attach="background" args={['#0a1022']} />
      <fog attach="fog" args={['#0d1428', 8, 30]} />
      <ambientLight intensity={0.22} color="#b7c6ff" />
      <hemisphereLight args={['#9fb2ff', '#1b2a1c', 0.35]} />
      <directionalLight position={[-6, 10, -6]} intensity={1.1} color="#cfdcff" castShadow={q.shadows} />
      <pointLight position={[0, 2.5, 0]} intensity={6} distance={10} color="#ffb3c6" />
      <Starfield count={Math.round(1500 * q.particles) + 300} radius={45} />
      <mesh position={[-12, 14, -22]}>
        <circleGeometry args={[1.6, 40]} />
        <meshBasicMaterial color="#f3f5ff" toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[18, 48]} />
        <meshStandardMaterial color="#17281b" roughness={1} />
      </mesh>
      <Path />
      <RoseField count={q.roses} />
      <Archway />
      <Pond />
      <Tree position={[-5.5, 0, -4]} scale={1.2} />
      <Tree position={[5.8, 0, -5]} scale={1.4} />
      <Tree position={[-6.5, 0, 3]} />
      <Tree position={[6.8, 0, 3.5]} scale={1.1} />
      {SPECIAL.map((p, i) => (i < roseMessages.length ? <SpecialRose key={i} i={i} position={p} /> : null))}
      <Butterfly />
      <FloatingFrame index={framePhoto} />
      <Fireflies count={Math.round(120 * q.particles) + 20} area={[16, 3.5, 16]} center={[0, 1.6, 0]} />
      <PetalParticles count={Math.round(110 * q.particles) + 15} area={[14, 7, 14]} center={[0, 3.5, 0]} speed={0.6} />
    </>
  )
}

export function LoveGardenOverlay() {
  const t = useT()
  const reveal = useGarden((s) => s.reveal)
  const found = useGarden((s) => s.found)
  const ref = useRef<HTMLDivElement>(null)
  const [hint, setHint] = useState(false)
  useGSAP(
    () => {
      const tl = gsap.timeline({ delay: 1.5 })
      tl.from('.g-l1', { opacity: 0, y: 12, filter: 'blur(6px)', duration: 2 })
        .from('.g-l2', { opacity: 0, y: 10, duration: 1.6 }, '-=0.8')
        .call(() => setHint(true))
      track(tl)
    },
    { scope: ref },
  )
  const msg = reveal?.kind === 'rose' ? t(roseMessages[reveal.i]) : reveal?.kind === 'butterfly' ? t(birthdayConfig.garden.butterflySurprise) : ''
  return (
    <div ref={ref} className="ov-stack justify-between">
      <div className="ov-top text-center">
        <p className="g-l1 font-display italic text-ivory text-[clamp(1.6rem,6vw,2.8rem)] text-glow">{t(birthdayConfig.garden.line1)}</p>
        <p className="g-l2 mt-2 font-body font-light text-ivory/80 text-[clamp(0.95rem,3.4vw,1.15rem)] max-w-lg mx-auto">{t(birthdayConfig.garden.line2)}</p>
      </div>
      <div className="ov-bottom flex flex-col items-center gap-3">
        {reveal ? (
          <div key={msg} className="card-note animate-rise" role="status">
            <p className="font-display italic text-[clamp(1.15rem,4.2vw,1.5rem)] leading-snug text-ivory">{msg}</p>
            <button className="btn-link mt-2" onClick={() => useGarden.setState({ reveal: null })}>{t(ui.close)}</button>
          </div>
        ) : (
          hint && <p className="hint animate-fadein">{t(ui.roseHint)} · {found.length}/{Math.min(SPECIAL.length, roseMessages.length)}</p>
        )}
        <div className="flex flex-wrap justify-center gap-2" aria-label="Hoa hồng">
          {SPECIAL.slice(0, roseMessages.length).map((_, i) => (
            <button key={i} className={`dot-btn ${found.includes(i) ? 'is-on' : ''}`} aria-label={`${t(ui.roseHint)} ${i + 1}`} onClick={() => { audio.chime('soft'); useGarden.setState((s) => ({ reveal: { kind: 'rose', i }, found: s.found.includes(i) ? s.found : [...s.found, i] })) }} />
          ))}
        </div>
        <button className="btn-primary" onClick={() => useExperience.getState().next()}>{t(ui.next)} →</button>
      </div>
    </div>
  )
}
