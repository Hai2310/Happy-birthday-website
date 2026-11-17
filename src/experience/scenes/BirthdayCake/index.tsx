import { useFrame, useThree } from '@react-three/fiber'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { create } from 'zustand'
import { birthdayConfig } from '../../../config/birthdayConfig'
import { ui, useT } from '../../../i18n/strings'
import { useExperience, useTier } from '../../../stores/experience'
import { TIERS } from '../../../utils/quality'
import { audio } from '../../../components/audio/audioDirector'
import { cameraSet, cameraTo, rig, track } from '../../camera/CinematicCamera'
import { shotFor } from '../../camera/cameraPaths'
import { BirthdayCake3D } from '../../objects/BirthdayCake3D'
import { PetalParticles } from '../../effects/PetalParticles'
import { Starfield } from '../../objects/Starfield'
import { isPortrait } from '../../../hooks/useViewport'
import { useBlowDetection } from '../../../hooks/useBlowDetection'
import { celebrate } from '../../effects/celebrate'

const CANDLES = Math.max(1, Math.min(birthdayConfig.age ?? 7, 20))
const useCake = create<{ lit: boolean[] }>(() => ({ lit: Array(CANDLES).fill(true) }))

/** blow out `n` random lit candles (nearest-first feel) */
export function blowCandles(n: number) {
  const lit = [...useCake.getState().lit]
  const on = lit.map((l, i) => (l ? i : -1)).filter((i) => i >= 0)
  if (!on.length) return
  const start = Math.floor(Math.random() * on.length)
  for (let k = 0; k < Math.min(n, on.length); k++) lit[on[(start + k) % on.length]] = false
  useCake.setState({ lit })
}

const spin = { y: 0, v: 0, drag: false }
function useCakeDrag(group: React.RefObject<THREE.Group>) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    let lx = 0
    const down = (e: PointerEvent) => { spin.drag = true; lx = e.clientX }
    const move = (e: PointerEvent) => {
      if (!spin.drag) return
      spin.v = (e.clientX - lx) * 0.006
      spin.y += spin.v
      lx = e.clientX
    }
    const up = () => { spin.drag = false }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [gl])
  useFrame(() => {
    if (!spin.drag) {
      spin.v *= 0.94
      // ease back toward facing the camera so the slice side stays in view
      spin.y += spin.v + (Math.round(spin.y / (Math.PI * 2)) * Math.PI * 2 - spin.y) * (Math.abs(spin.v) < 0.002 ? 0.01 : 0)
    }
    if (group.current) group.current.rotation.y = spin.y
  })
}

export function BirthdayCakeScene() {
  const tier = useTier()
  const q = TIERS[tier]
  const lit = useCake((s) => s.lit)
  const candlesOut = useExperience((s) => s.candlesOut)
  const cut = useExperience((s) => s.cakeCut)
  const group = useRef<THREE.Group>(null)
  useCakeDrag(group)

  useEffect(() => {
    useCake.setState({ lit: Array(CANDLES).fill(true) })
    spin.y = 0
    spin.v = 0
    const portrait = isPortrait()
    cameraSet(shotFor('cake', 'start', portrait))
    rig.parallax = 0.15
    track(cameraTo(shotFor('cake', 'main', portrait), 3.5, 'power2.inOut'))
  }, [])

  useEffect(() => {
    if (!candlesOut) return
    const portrait = isPortrait()
    const tl = gsap.timeline()
    tl.add(cameraTo({ pos: [0, portrait ? 4.6 : 3.8, portrait ? 9.4 : 7.2], target: [0, 1.6, 0], fov: 44 }, 4, 'power2.inOut'), 0.8)
    track(tl)
    return () => { tl.kill() }
  }, [candlesOut])

  useEffect(() => {
    if (!lit.every((l) => !l) || useExperience.getState().candlesOut) return
    const id = setTimeout(() => {
      useExperience.getState().set({ candlesOut: true })
      audio.celebrate()
      celebrate('fireworks')
    }, 900)
    return () => clearTimeout(id)
  }, [lit])

  const onBlow = useCallback((i: number) => {
    const l = [...useCake.getState().lit]
    if (!l[i]) return
    l[i] = false
    useCake.setState({ lit: l })
  }, [])

  return (
    <>
      <color attach="background" args={['#0d0a14']} />
      <fog attach="fog" args={['#0d0a14', 8, 26]} />
      <ambientLight intensity={candlesOut ? 0.45 : 0.18} color="#ffe0cc" />
      <spotLight position={[3, 7, 4]} angle={0.45} penumbra={0.9} intensity={candlesOut ? 70 : 28} decay={1.4} color="#ffe6cf" castShadow={q.shadows} shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-4, 3, -3]} intensity={5} color="#d991a9" />
      <Starfield count={Math.round(1200 * q.particles) + 200} radius={35} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[12, 64]} />
        <meshStandardMaterial color="#2a1920" roughness={0.45} metalness={0.15} />
      </mesh>
      <group ref={group}>
        <BirthdayCake3D lit={lit} onBlow={onBlow} cut={cut} topper={birthdayConfig.age ? String(birthdayConfig.age) : undefined} />
      </group>
      {candlesOut && <PetalParticles count={Math.round(160 * q.particles) + 20} area={[10, 8, 8]} center={[0, 4, 0]} speed={0.8} />}
    </>
  )
}

export function BirthdayCakeOverlay() {
  const t = useT()
  const lit = useCake((s) => s.lit)
  const candlesOut = useExperience((s) => s.candlesOut)
  const cut = useExperience((s) => s.cakeCut)
  const [mode, setMode] = useState<'wish' | 'ask' | 'mic' | 'tap'>('wish')
  const ref = useRef<HTMLDivElement>(null)
  const mic = useBlowDetection((strength) => blowCandles(strength))
  const left = lit.filter(Boolean).length

  useEffect(() => {
    if (left === 0) mic.stop()
  }, [left]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mic.state === 'denied' || mic.state === 'unsupported') setMode('tap')
  }, [mic.state])

  useGSAP(
    () => {
      if (candlesOut) {
        const tl = gsap.timeline({ delay: 0.6 })
        tl.from('.c-done', { opacity: 0, scale: 0.92, filter: 'blur(8px)', duration: 1.8, ease: 'power3.out' }).from('.c-after', { opacity: 0, y: 10, duration: 1 }, '-=0.6')
        track(tl)
      } else {
        track(gsap.from('.c-wish', { opacity: 0, y: 12, filter: 'blur(6px)', duration: 2, delay: 1.2 }))
      }
    },
    { scope: ref, dependencies: [candlesOut] },
  )

  return (
    <div ref={ref} className="ov-stack justify-between">
      <div className="ov-top text-center">
        {!candlesOut ? (
          <p className="c-wish font-display italic text-ivory text-[clamp(1.4rem,5.4vw,2.4rem)] text-glow max-w-xl mx-auto">{t(birthdayConfig.cake.wishPrompt)}</p>
        ) : (
          <h2 className="c-done font-script text-gold text-[clamp(2.4rem,10vw,5rem)] leading-tight text-glow-strong">{t(birthdayConfig.cake.afterBlow)}</h2>
        )}
      </div>
      <div className="ov-bottom flex flex-col items-center gap-3">
        {!candlesOut && mode === 'wish' && (
          <>
            <p className="hint">{t(ui.rotateCake)}</p>
            <button className="btn-primary" onClick={() => { audio.unlock(); setMode('ask') }}>{t(ui.blow)}</button>
          </>
        )}
        {!candlesOut && mode === 'ask' && (
          <div className="card-note animate-rise text-center">
            <p className="font-body text-ivory/85 text-[0.95rem] leading-relaxed">{t(ui.micExplain)}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button className="btn-primary" onClick={() => { setMode('mic'); void mic.start() }}>{t(ui.micAllow)}</button>
              <button className="btn-ghost" onClick={() => setMode('tap')}>{t(ui.micNo)}</button>
            </div>
          </div>
        )}
        {!candlesOut && (mode === 'mic' || mode === 'tap') && (
          <div className="card-note animate-rise text-center" aria-live="polite">
            {mode === 'mic' && (
              <>
                <p className="font-body text-ivory/90">
                  {mic.state === 'calibrating' || mic.state === 'requesting' ? t(ui.micCalibrating) : mic.state === 'listening' ? t(ui.micListening) : t(ui.micDenied)}
                </p>
                <div className="mic-meter mt-2" aria-hidden><span style={{ transform: `scaleX(${mic.level})` }} /></div>
              </>
            )}
            {mode === 'tap' && mic.state === 'denied' && <p className="font-body text-ivory/80 text-sm">{t(ui.micDenied)}</p>}
            <p className="mt-2 text-gold/90 text-sm">{left} {t(ui.candlesLeft)}</p>
            <button className="btn-primary mt-3" onClick={() => { audio.whoosh(); blowCandles(Math.max(3, Math.ceil(CANDLES / 4))) }}>{t(ui.blowTap)}</button>
          </div>
        )}
        {candlesOut && (
          <div className="c-after flex flex-wrap justify-center gap-2">
            {!cut && <button className="btn-ghost" onClick={() => { audio.chime('soft'); useExperience.getState().set({ cakeCut: true }) }}>{t(ui.cutCake)}</button>}
            <button className="btn-primary" onClick={() => useExperience.getState().next()}>{t(ui.next)} →</button>
          </div>
        )}
      </div>
    </div>
  )
}
