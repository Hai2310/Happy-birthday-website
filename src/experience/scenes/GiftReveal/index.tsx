import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { ui, useT } from '../../../i18n/strings'
import { useExperience, useTier } from '../../../stores/experience'
import { TIERS } from '../../../utils/quality'
import { audio } from '../../../components/audio/audioDirector'
import { cameraSet, cameraTo, rig, track } from '../../camera/CinematicCamera'
import { shotFor } from '../../camera/cameraPaths'
import { GiftBox } from '../../objects/GiftBox'
import { GoldBurst } from '../../effects/GoldBurst'
import { Starfield } from '../../objects/Starfield'
import { Fireflies } from '../../objects/Fireflies'
import { isPortrait } from '../../../hooks/useViewport'
import { surpriseVideo, voiceMessage } from '../../../data/media'
import { VideoGift } from '../../../components/interaction/VideoGift'
import { IconFilm, IconLetter, IconVoice } from '../../../components/ui/icons'
import { VoiceGift } from '../../../components/interaction/VoiceGift'
import { celebrate } from '../../effects/celebrate'

export function GiftRevealScene() {
  const tier = useTier()
  const q = TIERS[tier]
  const open = useExperience((s) => s.giftOpen)
  const burst = useRef(0)
  useEffect(() => {
    const portrait = isPortrait()
    cameraSet(shotFor('gift', 'start', portrait))
    rig.parallax = 0.2
    track(cameraTo(shotFor('gift', 'main', portrait), 4, 'power2.inOut'))
  }, [])
  useEffect(() => {
    if (!open) return
    burst.current = 0
    const portrait = isPortrait()
    const tl = gsap.timeline()
    tl.to(burst, { current: 1, duration: 3.6, ease: 'none' }, 1.8)
    tl.add(cameraTo({ pos: [0, portrait ? 3.6 : 3, portrait ? 7.8 : 5.8], target: [0, 1.4, 0] }, 3, 'power2.inOut'), 1.6)
    track(tl)
    return () => { tl.kill() }
  }, [open])
  const doOpen = () => {
    if (useExperience.getState().giftOpen) return
    audio.unlock()
    audio.chime('open')
    useExperience.getState().set({ giftOpen: true })
  }
  return (
    <>
      <color attach="background" args={['#0d0b16']} />
      <fog attach="fog" args={['#0d0b16', 8, 26]} />
      <ambientLight intensity={0.3} color="#ffe6d6" />
      <spotLight position={[2, 6, 4]} angle={0.5} penumbra={0.9} intensity={60} decay={1.5} color="#fff0de" castShadow={q.shadows} />
      <pointLight position={[-3, 2, 2]} intensity={6} color="#d991a9" />
      <Starfield count={Math.round(1200 * q.particles) + 200} radius={35} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial color="#21182a" roughness={0.35} metalness={0.2} />
      </mesh>
      <GiftBox open={open} onClick={doOpen} onOpened={() => celebrate('hearts')} />
      <GoldBurst progress={burst} count={Math.round(600 * q.particles) + 120} origin={[0, 1.2, 0]} spread={2.6} upward={1.6} color="#ffc9d8" size={6} />
      <Fireflies count={Math.round(50 * q.particles) + 10} area={[8, 3, 6]} center={[0, 1.5, 0]} size={3} />
    </>
  )
}

export function GiftRevealOverlay() {
  const t = useT()
  const open = useExperience((s) => s.giftOpen)
  const [view, setView] = useState<'video' | 'voice' | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!open) return setReady(false)
    const id = setTimeout(() => setReady(true), 3400)
    return () => clearTimeout(id)
  }, [open])
  const gifts = [
    { key: 'letter', label: t(ui.gift1), icon: <IconLetter />, onClick: () => useExperience.getState().set({ letterOpen: true }) },
    { key: 'video', label: surpriseVideo ? t(ui.gift2) : t(ui.gift2Montage), icon: <IconFilm />, onClick: () => setView('video') },
    { key: 'voice', label: voiceMessage ? t(ui.gift3Voice) : t(ui.gift3), icon: <IconVoice />, onClick: () => setView('voice') },
  ]
  return (
    <div className="ov-stack justify-between">
      <div className="ov-top text-center">
        <p className="font-display italic text-ivory text-[clamp(1.4rem,5.4vw,2.4rem)] text-glow animate-fadein">{t(ui.giftHint)}</p>
      </div>
      <div className="ov-bottom flex flex-col items-center gap-3">
        {!open && (
          <button className="btn-primary" onClick={() => { audio.unlock(); audio.chime('open'); useExperience.getState().set({ giftOpen: true }) }}>
            {t(ui.openGift)}
          </button>
        )}
        {ready && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-md">
            {gifts.map((g, i) => (
              <button key={g.key} className="gift-card animate-rise" style={{ animationDelay: `${i * 0.15}s` }} onClick={() => { audio.chime('soft'); g.onClick() }}>
                <span className="text-gold text-2xl" aria-hidden>{g.icon}</span>
                <span className="font-display text-ivory text-[1.05rem] leading-tight">{g.label}</span>
              </button>
            ))}
          </div>
        )}
        {ready && <button className="btn-primary" onClick={() => useExperience.getState().next()}>{t(ui.next)} →</button>}
      </div>
      {view === 'video' && <VideoGift onClose={() => setView(null)} />}
      {view === 'voice' && <VoiceGift onClose={() => setView(null)} />}
    </div>
  )
}
