import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import gsap from 'gsap'
import { Suspense, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useExperience, useTier } from '../stores/experience'
import { TIERS } from '../utils/quality'
import { CinematicCamera, killAll } from '../experience/camera/CinematicCamera'
import { SCENES } from '../experience/scenes/registry'
import { audio } from '../components/audio/audioDirector'

/** One renderer, one render loop. Scenes mount/unmount inside it; R3F disposes their GPU resources on unmount. */
function World({ onLost }: { onLost: () => void }) {
  const stage = useExperience((s) => s.stage)
  const key = useExperience((s) => s.sceneKey)
  const tier = useTier()
  const q = TIERS[tier]
  const { Scene } = SCENES[stage]
  return (
    <Canvas
      className="!fixed inset-0"
      dpr={q.dpr}
      gl={{ antialias: q.antialias, powerPreference: 'high-performance', alpha: false, stencil: false }}
      shadows={q.shadows ? 'soft' : false}
      camera={{ fov: 45, near: 0.1, far: 200, position: [0, 0, 8] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onLost() })
      }}
      aria-hidden
    >
      <PerformanceMonitor
        onDecline={() => {
          const s = useExperience.getState()
          if (s.qualityPref === 'auto' && s.degraded < 2) s.set({ degraded: s.degraded + 1 })
        }}
        flipflops={2}
      />
      <AdaptiveDpr pixelated={false} />
      <CinematicCamera />
      <Suspense fallback={null}>
        <Scene key={key} />
      </Suspense>
      {q.bloom && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={tier === 'high' ? 0.9 : 0.6} luminanceThreshold={0.85} luminanceSmoothing={0.2} radius={0.7} />
          <Vignette eskil={false} offset={0.25} darkness={0.7} />
        </EffectComposer>
      )}
    </Canvas>
  )
}

/** Plays the veil transition between chapters and keeps audio in sync with the story. */
export function ExperienceController({ onWebGLFail }: { onWebGLFail: () => void }) {
  const pending = useExperience((s) => s.pending)
  const stage = useExperience((s) => s.stage)
  const key = useExperience((s) => s.sceneKey)
  const reduced = useExperience((s) => s.reducedMotion)
  const veil = useRef<HTMLDivElement>(null)
  const { Overlay } = SCENES[stage]
  const [overlayIn, setOverlayIn] = useState(true)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  useEffect(() => () => { tlRef.current?.kill() }, [])

  useEffect(() => {
    if (reduced) gsap.globalTimeline.timeScale(2.5)
  }, [reduced])

  useEffect(() => {
    if (!pending || !veil.current) return
    const toInvitationFromInvitation = stage === 'invitation' && pending === 'room'
    setOverlayIn(false)
    // commit() clears `pending`, re-running this effect — so the timeline must NOT be killed in a cleanup here
    tlRef.current?.kill()
    const tl = (tlRef.current = gsap.timeline())
    tl.to(veil.current, { opacity: 1, duration: toInvitationFromInvitation ? 0.6 : 1, ease: 'power2.inOut', backgroundColor: toInvitationFromInvitation ? '#ffe4ef' : '#12060e' })
      .call(() => {
        killAll()
        useExperience.getState().commit()
      })
      .to(veil.current, { opacity: 0, duration: 1.4, ease: 'power2.out', delay: 0.25, onStart: () => setOverlayIn(true) })
  }, [pending]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    audio.setScene(stage)
    document.body.style.cursor = ''
  }, [stage, key])

  return (
    <>
      <World onLost={onWebGLFail} />
      <div ref={veil} className="fixed inset-0 z-[15] pointer-events-none opacity-0 bg-[#05060c]" aria-hidden />
      <main className={`overlay-root ${overlayIn ? 'opacity-100' : 'opacity-0'}`} aria-live="polite">
        <Overlay key={key} />
      </main>
    </>
  )
}
