import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { create } from 'zustand'
import { birthdayConfig } from '../../../config/birthdayConfig'
import { tr, ui, useT } from '../../../i18n/strings'
import { useExperience, useTier } from '../../../stores/experience'
import { TIERS } from '../../../utils/quality'
import { canvasTexture, wrap } from '../../../utils/textures'
import { resolveTimeline } from '../../../data/memories'
import { captionOf, photos } from '../../../data/photos'
import { audio } from '../../../components/audio/audioDirector'
import { cameraSet, cameraTo, rig, track } from '../../camera/CinematicCamera'
import { shotFor } from '../../camera/cameraPaths'
import { PhotoFrame3D } from '../../objects/PhotoFrame3D'
import { Fireflies } from '../../objects/Fireflies'
import { isPortrait } from '../../../hooks/useViewport'

const PW = 1.5 // page width
const PH = 2 // page depth
const useBook = create<{ page: number; opened: boolean }>(() => ({ page: 0, opened: false }))

function formatDate(d: string | undefined, lang: 'vi' | 'en') {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function textPage(title: string, date: string, body: string, n: string) {
  return canvasTexture(768, 1024, (g, w, h) => {
    g.fillStyle = '#fbf4e8'
    g.fillRect(0, 0, w, h)
    const grd = g.createLinearGradient(w, 0, w - 90, 0)
    grd.addColorStop(0, 'rgba(120,80,60,0.18)')
    grd.addColorStop(1, 'rgba(120,80,60,0)')
    g.fillStyle = grd
    g.fillRect(w - 90, 0, 90, h)
    g.strokeStyle = 'rgba(184,147,90,0.6)'
    g.lineWidth = 2
    g.strokeRect(44, 44, w - 88, h - 88)
    g.textAlign = 'center'
    g.fillStyle = '#b8935a'
    g.font = '500 30px "Be Vietnam Pro", sans-serif'
    g.fillText(n, w / 2, 140)
    g.fillStyle = '#4a2236'
    g.font = 'italic 600 66px "Cormorant Garamond", Georgia, serif'
    wrap(g, title, w / 2, 300, w - 160, 74)
    if (date) {
      g.font = '400 30px "Be Vietnam Pro", sans-serif'
      g.fillStyle = '#9a7a56'
      g.fillText(date, w / 2, 430)
    }
    g.font = '300 34px "Be Vietnam Pro", sans-serif'
    g.fillStyle = '#5a4250'
    wrap(g, body, w / 2, 640, w - 170, 50)
    // tiny heart
    g.fillStyle = '#d991a9'
    g.font = '40px serif'
    g.fillText('♡', w / 2, h - 110)
  })
}

function Book() {
  const lang = useExperience((s) => s.lang)
  const items = useMemo(resolveTimeline, [])
  const page = useBook((s) => s.page)
  const cover = useRef<THREE.Group>(null)
  const leaves = useRef<(THREE.Group | null)[]>([])
  const M = items.length

  // left-side text pages: index k shows milestone k
  const texts = useMemo(() => {
    const list = items.map((m, k) => textPage(tr(m.title, lang), formatDate(m.date, lang), tr(m.description, lang), `${k + 1} / ${M}`))
    list.push(textPage(lang === 'vi' ? 'Còn nhiều trang nữa...' : 'More pages to come...', '', lang === 'vi' ? 'Những trang tiếp theo, mình cùng viết nhé.' : "Let's write the next pages together.", '♡'))
    return list
  }, [items, lang, M])
  useEffect(() => () => texts.forEach((t) => t.dispose()), [texts])
  const coverTex = useMemo(
    () =>
      canvasTexture(768, 1024, (g, w, h) => {
        g.fillStyle = '#5b2238'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = '#d8b987'
        g.lineWidth = 6
        g.strokeRect(50, 50, w - 100, h - 100)
        g.lineWidth = 2
        g.strokeRect(70, 70, w - 140, h - 140)
        g.fillStyle = '#e6c993'
        g.textAlign = 'center'
        g.font = 'italic 600 84px "Cormorant Garamond", Georgia, serif'
        wrap(g, lang === 'vi' ? 'Chuyện của chúng mình' : 'Our Story', w / 2, h / 2 - 40, w - 200, 90)
        g.font = '64px "Great Vibes", cursive'
        g.fillText(birthdayConfig.girlfriendName, w / 2, h / 2 + 140)
      }),
    [lang],
  )
  useEffect(() => () => coverTex.dispose(), [coverTex])

  // open cover
  useEffect(() => {
    if (!cover.current) return
    const tl = gsap.timeline({ delay: 1.4 })
    tl.to(cover.current.rotation, { z: Math.PI, duration: 1.8, ease: 'power3.inOut', onStart: () => audio.whoosh() })
    tl.to(cover.current.position, { y: 0.05, duration: 0.2 }, '-=0.15')
    tl.call(() => useBook.setState({ opened: true }))
    track(tl)
    return () => { tl.kill() }
  }, [])

  // turn leaves to match page
  useEffect(() => {
    leaves.current.forEach((l, k) => {
      if (!l) return
      const turned = k < page
      gsap.to(l.rotation, { z: turned ? Math.PI : 0, duration: 1.2, ease: 'power2.inOut' })
      gsap.to(l.position, { y: turned ? 0.06 + k * 0.004 : 0.06 + (M - k) * 0.004, duration: 1.2 })
    })
  }, [page, M])

  const paper = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fbf4e8', roughness: 0.95 }), [])
  const leather = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#5b2238', roughness: 0.55, clearcoat: 0.3, sheen: 0.4, sheenColor: '#a0566f' }), [])
  useEffect(() => () => { paper.dispose(); leather.dispose() }, [paper, leather])

  const next = () => useBook.setState((s) => ({ page: Math.min(M - 1, s.page + 1) }))
  const prev = () => useBook.setState((s) => ({ page: Math.max(0, s.page - 1) }))

  return (
    <group rotation={[0, 0, 0]}>
      {/* back cover + page block */}
      <mesh position={[0, -0.02, 0]} material={leather} receiveShadow>
        <boxGeometry args={[PW * 2 + 0.16, 0.04, PH + 0.14]} />
      </mesh>
      <mesh position={[PW / 2 + 0.02, 0.02, 0]} material={paper}>
        <boxGeometry args={[PW, 0.05, PH]} />
      </mesh>
      <mesh position={[-PW / 2 - 0.02, 0.02, 0]} material={paper}>
        <boxGeometry args={[PW, 0.05, PH]} />
      </mesh>
      {/* leaves: front = photo of milestone k, back = text of milestone k+1 */}
      {items.map((m, k) => (
        <group key={k} ref={(el) => (leaves.current[k] = el)} position={[0.0, 0.06 + (M - k) * 0.004, 0]}>
          <group position={[PW / 2 + 0.02, 0, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} material={paper} onClick={(e) => { e.stopPropagation(); if (e.delta < 8) { audio.chime('soft'); next() } }}>
              <planeGeometry args={[PW * 0.98, PH * 0.98]} />
            </mesh>
            <group position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <PhotoFrame3D index={m.photoIndex} size={PH * 0.78} fixedAspect={(PW * 0.86) / (PH * 0.78)} style="plain" quality="src" />
            </group>
            <mesh position={[0, -0.003, 0]} rotation={[Math.PI / 2, 0, Math.PI]} onClick={(e) => { e.stopPropagation(); prev() }}>
              <planeGeometry args={[PW * 0.98, PH * 0.98]} />
              <meshStandardMaterial map={texts[k + 1]} roughness={0.95} />
            </mesh>
          </group>
        </group>
      ))}

      {/* front cover hinged at spine */}
      <group ref={cover} position={[0, 0.06 + (M + 2) * 0.004, 0]}>
        <group position={[PW / 2 + 0.06, 0, 0]}>
          <mesh material={leather}>
            <boxGeometry args={[PW + 0.1, 0.035, PH + 0.14]} />
          </mesh>
          <mesh position={[0, 0.019, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[PW + 0.06, PH + 0.1]} />
            <meshStandardMaterial map={coverTex} roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.019, 0]} rotation={[Math.PI / 2, 0, Math.PI]} onClick={(e) => { e.stopPropagation(); prev() }}>
            <planeGeometry args={[PW * 0.98, PH * 0.98]} />
            <meshStandardMaterial map={texts[0]} roughness={0.95} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function useSwipe(onLeft: () => void, onRight: () => void) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    let x0: number | null = null
    let y0 = 0
    const down = (e: PointerEvent) => { x0 = e.clientX; y0 = e.clientY }
    const up = (e: PointerEvent) => {
      if (x0 === null) return
      const dx = e.clientX - x0
      const dy = e.clientY - y0
      x0 = null
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) (dx < 0 ? onLeft : onRight)()
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', up)
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointerup', up) }
  }, [gl, onLeft, onRight])
}

export function OurTimelineScene() {
  const tier = useTier()
  const page = useBook((s) => s.page)
  const M = birthdayConfig.timeline.length
  const next = useMemo(() => () => useBook.setState((s) => ({ page: Math.min(M - 1, s.page + 1) })), [M])
  const prev = useMemo(() => () => useBook.setState((s) => ({ page: Math.max(0, s.page - 1) })), [])
  useSwipe(next, prev)
  useEffect(() => {
    useBook.setState({ page: 0, opened: false })
    const portrait = isPortrait()
    cameraSet(shotFor('timeline', 'start', portrait))
    rig.parallax = 0.12
    track(cameraTo(shotFor('timeline', 'main', portrait), 3.2, 'power2.inOut'))
  }, [])
  // subtle camera drift between pages so each memory feels like a new shot
  useEffect(() => {
    const portrait = isPortrait()
    const s = shotFor('timeline', 'main', portrait)
    const side = page % 2 ? 0.12 : -0.12
    cameraTo({ pos: [s.pos[0] + side, s.pos[1], s.pos[2]], target: [s.target[0] + side * 0.5, s.target[1], s.target[2]] }, 1.6, 'sine.inOut')
  }, [page])
  return (
    <>
      <color attach="background" args={['#120c12']} />
      <fog attach="fog" args={['#120c12', 5, 16]} />
      <ambientLight intensity={0.35} color="#ffe4cc" />
      <spotLight position={[1.5, 5, 2.5]} angle={0.6} penumbra={0.9} intensity={55} decay={1.6} color="#ffdcb0" castShadow={TIERS[tier].shadows} />
      <pointLight position={[-3, 2, -2]} intensity={4} color="#d991a9" />
      {/* table */}
      <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2b1a1c" roughness={0.6} />
      </mesh>
      <Book />
      <Fireflies count={Math.round(70 * TIERS[tier].particles) + 10} area={[8, 3, 6]} center={[0, 1.5, -1]} size={3} color="#ffc2dc" />
    </>
  )
}

export function OurTimelineOverlay() {
  const t = useT()
  const lang = useExperience((s) => s.lang)
  const page = useBook((s) => s.page)
  const opened = useBook((s) => s.opened)
  const items = useMemo(resolveTimeline, [])
  const m = items[page]
  const M = items.length
  const go = (d: number) => {
    audio.chime('soft')
    useBook.setState({ page: Math.max(0, Math.min(M - 1, page + d)) })
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useExperience.getState().lightbox || useExperience.getState().galleryOpen) return
      if (e.key === 'ArrowRight') useBook.setState((s) => ({ page: Math.min(M - 1, s.page + 1) }))
      if (e.key === 'ArrowLeft') useBook.setState((s) => ({ page: Math.max(0, s.page - 1) }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [M])
  const cap = m && m.photoIndex >= 0 ? captionOf(photos[m.photoIndex], lang) : ''
  return (
    <div className="ov-stack justify-between">
      <div className="ov-top text-center">
        <p className="font-display italic text-ivory/90 text-[clamp(1.3rem,5vw,2.2rem)] text-glow animate-fadein">{t(birthdayConfig.timelineIntro)}</p>
      </div>
      <div className="ov-bottom flex flex-col items-center gap-3">
        {opened && m && (
          <div key={page} className="card-note animate-rise text-center" aria-live="polite">
            <p className="text-gold/80 text-xs tracking-[0.2em] uppercase">{page + 1} / {M}{m.date ? ` · ${formatDate(m.date, lang)}` : ''}</p>
            <h3 className="font-display text-ivory text-[clamp(1.3rem,4.8vw,1.8rem)] leading-tight mt-1">{t(m.title)}</h3>
            <p className="font-body font-light text-ivory/80 text-[0.95rem] mt-1">{t(m.description)}</p>
            {cap && <p className="font-display italic text-blush/90 mt-1">{cap}</p>}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button className="btn-icon" onClick={() => go(-1)} disabled={page === 0} aria-label={t(ui.prevPage)}>‹</button>
          {page < M - 1 ? (
            <button className="btn-ghost" onClick={() => go(1)}>{t(ui.nextPage)}</button>
          ) : (
            <button className="btn-primary" onClick={() => useExperience.getState().next()}>{t(ui.next)} →</button>
          )}
          <button className="btn-icon" onClick={() => go(1)} disabled={page >= M - 1} aria-label={t(ui.nextPage)}>›</button>
        </div>
        <div className="flex gap-2">
          <button className="btn-link" onClick={() => useExperience.getState().set({ galleryOpen: true })}>{t(ui.allPhotos)}</button>
          {page < M - 1 && <button className="btn-link" onClick={() => useExperience.getState().next()}>{t(ui.next)} →</button>}
        </div>
      </div>
    </div>
  )
}
