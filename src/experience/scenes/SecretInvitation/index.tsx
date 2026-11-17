import { useFrame } from '@react-three/fiber'
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
import { audio } from '../../../components/audio/audioDirector'
import { cameraSet, cameraTo, rig, track } from '../../camera/CinematicCamera'
import { shotFor } from '../../camera/cameraPaths'
import { Starfield } from '../../objects/Starfield'
import { GoldBurst } from '../../effects/GoldBurst'
import { isPortrait } from '../../../hooks/useViewport'

const useInv = create<{ opened: boolean }>(() => ({ opened: false }))

function Envelope({ opened }: { opened: boolean }) {
  const root = useRef<THREE.Group>(null)
  const flap = useRef<THREE.Group>(null)
  const seal = useRef<THREE.Group>(null)
  const letter = useRef<THREE.Mesh>(null)
  const W = 2.4
  const H = 1.6
  const flapGeo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-W / 2, 0)
    s.lineTo(W / 2, 0)
    s.lineTo(0.12, -0.92)
    s.quadraticCurveTo(0, -1.0, -0.12, -0.92)
    s.closePath()
    return new THREE.ShapeGeometry(s, 12)
  }, [])
  const vGeo = useMemo(() => {
    // the front pocket "V" folds drawn as two side triangles + bottom triangle
    const s = new THREE.Shape()
    s.moveTo(-W / 2, -H / 2)
    s.lineTo(W / 2, -H / 2)
    s.lineTo(W / 2, H / 2 - 0.02)
    s.lineTo(0, -0.05)
    s.lineTo(-W / 2, H / 2 - 0.02)
    s.closePath()
    return new THREE.ShapeGeometry(s, 4)
  }, [])
  const heart = useMemo(() => heartGeometry(0.2, 0.1), [])
  useEffect(() => () => { flapGeo.dispose(); vGeo.dispose(); heart.dispose() }, [flapGeo, vGeo, heart])

  const paper = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#f6ecdc', roughness: 0.82, sheen: 0.6, sheenColor: '#fff6e8', side: THREE.DoubleSide }), [])
  const paperFront = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#f9f1e4', roughness: 0.8, sheen: 0.5, sheenColor: '#fff' }), [])
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8b987', metalness: 1, roughness: 0.3 }), [])
  useEffect(() => () => { paper.dispose(); paperFront.dispose(); gold.dispose() }, [paper, paperFront, gold])

  useFrame((s) => {
    if (!root.current) return
    const t = s.clock.elapsedTime
    if (!useInv.getState().opened) {
      root.current.rotation.y = Math.sin(t * 0.4) * 0.35
      root.current.rotation.x = Math.sin(t * 0.3) * 0.06
    }
    root.current.position.y = Math.sin(t * 0.8) * 0.06
  })

  useEffect(() => {
    if (!opened || !flap.current || !seal.current || !letter.current || !root.current) return
    const tl = gsap.timeline()
    tl.to(root.current.rotation, { x: 0, y: 0, duration: 0.8, ease: 'power2.out' })
      .to(seal.current.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.45, ease: 'back.in(2)' }, 0.3)
      .to(flap.current.rotation, { x: -Math.PI, duration: 1.3, ease: 'power3.inOut' }, 0.55)
      .to(flap.current.position, { z: -0.045, duration: 0.3, ease: 'none' }, 1.3)
      .to(letter.current.position, { y: 1.05, duration: 1.4, ease: 'power2.out' }, 1.5)
    track(tl)
    return () => { tl.kill() }
  }, [opened])

  return (
    <group ref={root}>
      {/* back of envelope */}
      <mesh position={[0, 0, -0.02]} material={paper}>
        <boxGeometry args={[W, H, 0.02]} />
      </mesh>
      {/* letter inside */}
      <mesh ref={letter} position={[0, 0, -0.005]}>
        <planeGeometry args={[W * 0.88, H * 0.85]} />
        <meshStandardMaterial color="#fffaf2" roughness={0.9} emissive="#ffe9c9" emissiveIntensity={0.25} />
      </mesh>
      {/* front pocket */}
      <mesh position={[0, 0, 0.004]} geometry={vGeo} material={paperFront} />
      {/* gold edge */}
      <mesh position={[0, -H / 2 + 0.03, 0.006]} material={gold}>
        <boxGeometry args={[W, 0.012, 0.004]} />
      </mesh>
      {/* flap hinged at top edge */}
      <group ref={flap} position={[0, H / 2, 0.01]}>
        <mesh geometry={flapGeo} material={paper} />
        <group ref={seal} position={[0, -0.86, 0.03]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.26, 0.06, 32]} />
            <meshPhysicalMaterial color="#692d46" roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.3} />
          </mesh>
          <mesh geometry={heart} position={[0, 0, 0.04]} material={gold} />
        </group>
      </group>
    </group>
  )
}

export function InvitationScene() {
  const tier = useTier()
  const opened = useInv((s) => s.opened)
  const reveal = useRef(0)
  const burst = useRef(0)
  const glow = useRef<THREE.Sprite>(null)
  const glowTex = useMemo(() => glowTexture('255,214,160'), [])
  useEffect(() => () => glowTex.dispose(), [glowTex])

  useEffect(() => {
    useInv.setState({ opened: false })
    const portrait = isPortrait()
    cameraSet(shotFor('invitation', 'start', portrait))
    rig.parallax = 0.3
    const tl = gsap.timeline()
    tl.to(reveal, { current: 1, duration: 5, ease: 'sine.inOut' }, 0)
    tl.add(cameraTo(shotFor('invitation', 'main', portrait), 5, 'power2.out'), 0)
    track(tl)
    return () => { tl.kill() }
  }, [])

  useEffect(() => {
    if (!opened) return
    const tl = gsap.timeline()
    tl.to(burst, { current: 1, duration: 3.2, ease: 'none' }, 1.6)
    if (glow.current) tl.to(glow.current.scale, { x: 14, y: 14, duration: 2.5, ease: 'power2.in' }, 2.2)
    tl.add(cameraTo({ pos: [0, 0.55, 0.9], target: [0, 0.6, -1], fov: 55 }, 2.6, 'power3.in'), 2.4)
    tl.call(() => useExperience.getState().go('room'), [], 4.6)
    track(tl)
    return () => { tl.kill() }
  }, [opened])

  const n = Math.round(3000 * TIERS[tier].particles) + 600
  return (
    <>
      <color attach="background" args={['#070912']} />
      <fog attach="fog" args={['#070912', 12, 70]} />
      <ambientLight intensity={0.25} color="#c9d6ff" />
      <pointLight position={[0, 0.2, 2]} intensity={6} distance={8} color="#ffd9a8" />
      <directionalLight position={[3, 4, 5]} intensity={0.7} color="#ffe8cf" />
      <Starfield count={n} radius={50} revealRef={reveal} />
      <sprite ref={glow} position={[0, 0, -1.5]} scale={[6, 6, 1]}>
        <spriteMaterial map={glowTex} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <Envelope opened={opened} />
      <GoldBurst progress={burst} count={Math.round(700 * TIERS[tier].particles) + 150} origin={[0, 0.4, 0.1]} spread={3.2} />
    </>
  )
}

export function InvitationOverlay() {
  const t = useT()
  const opened = useInv((s) => s.opened)
  const furthest = useExperience((s) => s.furthest)
  const stages = useExperience((s) => s.stages)
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      const tl = gsap.timeline({ delay: 0.8 })
      tl.from('.inv-l1', { opacity: 0, y: 14, filter: 'blur(6px)', duration: 2, ease: 'power2.out' })
        .from('.inv-l2', { opacity: 0, y: 10, duration: 1.6, ease: 'power2.out' }, '-=0.9')
        .from('.inv-cta', { opacity: 0, y: 10, duration: 1.2, ease: 'power2.out' }, '-=0.6')
      track(tl)
    },
    { scope: ref },
  )
  useGSAP(() => {
    if (opened) gsap.to(ref.current, { opacity: 0, duration: 0.9, ease: 'power2.out' })
  }, [opened])

  const open = () => {
    audio.unlock()
    audio.chime('open')
    setTimeout(() => audio.whoosh(), 2300)
    useInv.setState({ opened: true })
  }
  return (
    <div ref={ref} className="ov-stack justify-between">
      <div className="ov-top text-center">
        <p className="inv-l1 font-display italic text-ivory text-[clamp(1.7rem,6vw,3.2rem)] leading-tight text-glow">{t(birthdayConfig.invitation.line1)}</p>
        <p className="inv-l2 mt-3 font-body font-light text-ivory/75 text-[clamp(0.95rem,3.4vw,1.15rem)] max-w-md mx-auto">{t(birthdayConfig.invitation.line2)}</p>
      </div>
      <div className="ov-bottom flex flex-col items-center gap-3">
        <button className="inv-cta btn-primary" onClick={open} disabled={opened} autoFocus>
          {t(birthdayConfig.invitation.cta)}
        </button>
        {furthest > 0 && !opened && (
          <button
            className="inv-cta btn-link"
            onClick={() => {
              audio.unlock()
              useExperience.getState().go(stages[furthest])
            }}
          >
            {t(ui.resume)} · {t(ui.chapters[stages[furthest]])}
          </button>
        )}
      </div>
    </div>
  )
}
