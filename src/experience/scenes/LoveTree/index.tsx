import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { create } from 'zustand'
import { ui, useT } from '../../../i18n/strings'
import { useExperience, useTier } from '../../../stores/experience'
import { TIERS } from '../../../utils/quality'
import { heartGeometry } from '../../../utils/heart'
import { glowTexture } from '../../../utils/textures'
import { reasons } from '../../../data/loveMessages'
import { altOf, forScene, photos } from '../../../data/photos'
import { audio } from '../../../components/audio/audioDirector'
import { cameraSet, cameraTo, rig, track } from '../../camera/CinematicCamera'
import { shotFor } from '../../camera/cameraPaths'
import { Fireflies } from '../../objects/Fireflies'
import { Starfield } from '../../objects/Starfield'
import { PetalParticles } from '../../effects/PetalParticles'
import { isPortrait } from '../../../hooks/useViewport'
import { celebrate } from '../../effects/celebrate'

const useTree = create<{ open: number | null }>(() => ({ open: null }))

function buildTree(seed = 7) {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const parts: THREE.BufferGeometry[] = []
  const tips: THREE.Vector3[] = []
  const up = new THREE.Vector3(0, 1, 0)
  const grow = (start: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number) => {
    const end = start.clone().add(dir.clone().multiplyScalar(len))
    const g = new THREE.CylinderGeometry(r * 0.68, r, len, 7, 1)
    g.translate(0, len / 2, 0)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir))
    g.translate(start.x, start.y, start.z)
    parts.push(g)
    if (depth === 0) {
      tips.push(end)
      return
    }
    const n = depth > 3 ? 2 : 3
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 1.2
      const tilt = 0.45 + rnd() * 0.4
      const nd = dir.clone().applyAxisAngle(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), tilt).lerp(up, 0.15).normalize()
      grow(end, nd, len * (0.68 + rnd() * 0.12), r * 0.62, depth - 1)
    }
    if (depth < 3) tips.push(end)
  }
  grow(new THREE.Vector3(0, 0, 0), up.clone(), 2.2, 0.32, 5)
  const geo = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  return { geo, tips }
}

function Heart({ i, position, color }: { i: number; position: THREE.Vector3; color: string }) {
  const ref = useRef<THREE.Group>(null)
  const read = useExperience((s) => s.heartsRead.includes(i))
  const isOpen = useTree((s) => s.open === i)
  const geo = useMemo(() => heartGeometry(0.42, 0.25), [])
  useEffect(() => () => geo.dispose(), [geo])
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime
    ref.current.rotation.z = Math.sin(t * 1.1 + i) * 0.12
    ref.current.rotation.y = isOpen ? ref.current.rotation.y * 0.9 : Math.sin(t * 0.6 + i * 2) * 0.6
  })
  useEffect(() => {
    if (!isOpen || !ref.current) return
    const tl = gsap.timeline()
    tl.to(ref.current.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.35, ease: 'back.out(3)' }).to(ref.current.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.6, ease: 'power2.out' })
    return () => {
      tl.kill()
      if (ref.current) gsap.to(ref.current.scale, { x: 1, y: 1, z: 1, duration: 0.5 })
    }
  }, [isOpen])
  const open = () => {
    audio.chime('sparkle')
    const st = useExperience.getState()
    if (!st.heartsRead.includes(i)) st.set({ heartsRead: [...st.heartsRead, i] })
    useTree.setState({ open: i })
  }
  return (
    <group position={position}>
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.5, 3]} />
        <meshStandardMaterial color="#d8b987" metalness={1} roughness={0.3} />
      </mesh>
      <group ref={ref} position={[0, -0.6, 0]}>
        <mesh geometry={geo} onClick={(e) => { e.stopPropagation(); open() }} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
          <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={read ? 0.35 : 1.1} roughness={0.25} clearcoat={1} toneMapped={!read ? false : true} />
        </mesh>
        <mesh visible={false} onClick={(e) => { e.stopPropagation(); open() }}>
          <sphereGeometry args={[0.38, 8, 6]} />
        </mesh>
      </group>
    </group>
  )
}

export function LoveTreeScene() {
  const tier = useTier()
  const q = TIERS[tier]
  const { geo, tips } = useMemo(() => buildTree(11), [])
  const blossoms = useRef<THREE.InstancedMesh>(null)
  const glowTex = useMemo(() => glowTexture('255,200,160'), [])
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9a466', metalness: 0.9, roughness: 0.32, emissive: '#5a3a10', emissiveIntensity: 0.3 }), [])
  useEffect(() => () => { geo.dispose(); gold.dispose(); glowTex.dispose() }, [geo, gold, glowTex])

  // hearts hang from well-spread, mid-height tips
  const heartSpots = useMemo(() => {
    const cands = tips.filter((t) => t.y > 2.6 && t.y < 5.6).sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x))
    const n = Math.min(reasons.length, cands.length)
    return Array.from({ length: n }, (_, k) => cands[Math.floor((k * cands.length) / n)])
  }, [tips])

  const blossomCount = Math.round(tips.length * 6 * Math.max(0.5, q.particles))
  useEffect(() => {
    const m = blossoms.current
    if (!m) return
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    const cols = ['#f4c9d4', '#fbe3ea', '#d991a9', '#ffd7c2']
    for (let i = 0; i < blossomCount; i++) {
      const tip = tips[i % tips.length]
      o.position.set(tip.x + (Math.random() - 0.5) * 0.7, tip.y + (Math.random() - 0.5) * 0.5, tip.z + (Math.random() - 0.5) * 0.7)
      o.scale.setScalar(0.5 + Math.random() * 0.8)
      o.rotation.set(Math.random() * 3, Math.random() * 3, 0)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.set(cols[i % cols.length]))
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [tips, blossomCount])

  useEffect(() => {
    useTree.setState({ open: null })
    const portrait = isPortrait()
    cameraSet(shotFor('tree', 'start', portrait))
    rig.parallax = 0.3
    track(cameraTo(shotFor('tree', 'main', portrait), 4.5, 'power2.inOut'))
  }, [])

  return (
    <>
      <color attach="background" args={['#0c0a18']} />
      <fog attach="fog" args={['#0c0a18', 10, 32]} />
      <ambientLight intensity={0.3} color="#ffd9e3" />
      <hemisphereLight args={['#ffd6e0', '#1a1222', 0.4]} />
      <pointLight position={[0, 4, 3]} intensity={18} distance={14} color="#ffd29a" />
      <directionalLight position={[4, 8, 5]} intensity={0.8} color="#ffe8d2" />
      <Starfield count={Math.round(1500 * q.particles) + 300} radius={40} />
      <sprite position={[0, 4, -2]} scale={[12, 12, 1]}>
        <spriteMaterial map={glowTex} transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[14, 48]} />
        <meshStandardMaterial color="#1b1424" roughness={1} />
      </mesh>
      <mesh geometry={geo} material={gold} castShadow={q.shadows} />
      <instancedMesh ref={blossoms} args={[undefined, undefined, blossomCount]}>
        <icosahedronGeometry args={[0.07, 0]} />
        <meshStandardMaterial emissive="#ff9fbf" emissiveIntensity={0.35} roughness={0.6} />
      </instancedMesh>
      {heartSpots.map((p, i) => (
        <Heart key={i} i={i} position={p} color={['#e0456f', '#d991a9', '#f08aa8', '#c2385c'][i % 4]} />
      ))}
      <Fireflies count={Math.round(90 * q.particles) + 20} area={[8, 5, 8]} center={[0, 4.2, 0]} size={4} color="#ffb8d6" />
      <PetalParticles count={Math.round(70 * q.particles) + 10} area={[10, 7, 8]} center={[0, 4, 0]} speed={0.45} />
    </>
  )
}

export function LoveTreeOverlay() {
  const t = useT()
  const lang = useExperience((s) => s.lang)
  const open = useTree((s) => s.open)
  const read = useExperience((s) => s.heartsRead)
  const photoIdx = useMemo(() => forScene('tree', reasons.length, 5, ['couple', 'everyday']), [])
  const [celebrated, setCelebrated] = useState(false)
  useEffect(() => {
    if (!celebrated && read.length >= reasons.length) {
      setCelebrated(true)
      celebrate('hearts')
    }
  }, [read, celebrated])
  const p = open !== null && photos.length ? photos[photoIdx[open % photoIdx.length]] : undefined
  const openHeart = (i: number) => {
    audio.chime('sparkle')
    const st = useExperience.getState()
    if (!st.heartsRead.includes(i)) st.set({ heartsRead: [...st.heartsRead, i] })
    useTree.setState({ open: i })
  }
  return (
    <div className="ov-stack justify-between">
      <div className="ov-top text-center">
        <p className="font-display italic text-ivory text-[clamp(1.5rem,5.6vw,2.6rem)] text-glow animate-fadein">{lang === 'vi' ? 'Những lý do anh yêu em' : 'Reasons I love you'}</p>
        <p className="hint mt-1">{t(ui.treeHint)} · {read.length}/{reasons.length} {t(ui.heartsRead)}</p>
      </div>
      <div className="ov-bottom flex flex-col items-center gap-3">
        {open !== null && (
          <div key={open} className="card-note animate-rise flex items-center gap-4 text-left" role="status">
            {p && <img src={p.thumb} alt={altOf(p, lang, photoIdx[open % photoIdx.length])} className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover object-[50%_30%] shrink-0 ring-1 ring-gold/40" />}
            <div>
              <p className="font-display italic text-ivory text-[clamp(1.15rem,4.2vw,1.5rem)] leading-snug">{t(reasons[open])}</p>
              <button className="btn-link mt-1" onClick={() => useTree.setState({ open: null })}>{t(ui.close)}</button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2 max-w-sm">
          {reasons.map((_, i) => (
            <button key={i} className={`dot-btn heart ${read.includes(i) ? 'is-on' : ''}`} aria-label={`${i + 1}: ${t(reasons[i])}`} onClick={() => openHeart(i)} />
          ))}
        </div>
        <button className="btn-primary" onClick={() => useExperience.getState().next()}>{t(ui.next)} →</button>
      </div>
    </div>
  )
}
