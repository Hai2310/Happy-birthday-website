import { useState } from 'react'
import { birthdayConfig } from '../config/birthdayConfig'
import { altOf, captionOf, heroIndex, photos } from '../data/photos'
import { reasons } from '../data/loveMessages'
import { resolveTimeline } from '../data/memories'
import { ui, useT } from '../i18n/strings'
import { useExperience } from '../stores/experience'
import { audio } from '../components/audio/audioDirector'
import { celebrate } from '../experience/effects/celebrate'

/** Polished 2D version for devices without WebGL — same photos, messages and key interactions. */
export function Fallback2D() {
  const t = useT()
  const lang = useExperience((s) => s.lang)
  const hero = photos[heroIndex()]
  const age = Math.max(1, Math.min(birthdayConfig.age ?? 7, 20))
  const [lit, setLit] = useState<boolean[]>(Array(age).fill(true))
  const [heart, setHeart] = useState<number | null>(null)
  const done = lit.every((l) => !l)
  const blow = (i: number) => {
    audio.unlock()
    const n = [...lit]
    n[i] = false
    setLit(n)
    if (n.every((l) => !l)) { audio.celebrate(); celebrate('big') }
  }
  return (
    <div className="fallback">
      <section className="fb-hero">
        {hero && <img src={hero.src} alt={altOf(hero, lang, heroIndex())} className="fb-hero-img" />}
        <div className="fb-hero-text">
          <p className="text-ivory/70 text-sm">{t(ui.fallbackNote)}</p>
          <h1 className="font-script text-gold text-[clamp(3rem,13vw,6rem)] leading-none mt-3">Happy Birthday, {birthdayConfig.girlfriendName}</h1>
          <p className="font-display italic text-ivory text-xl mt-3">{t(birthdayConfig.invitation.line2)}</p>
        </div>
      </section>
      <section className="fb-section">
        <h2 className="fb-h">{t(birthdayConfig.timelineIntro)}</h2>
        <div className="grid gap-8">
          {resolveTimeline().map((m, i) => (
            <article key={i} className="grid sm:grid-cols-2 gap-4 items-center">
              {photos[m.photoIndex] && <img src={photos[m.photoIndex].src} alt={altOf(photos[m.photoIndex], lang, m.photoIndex)} loading="lazy" className="rounded-xl w-full object-contain max-h-[70vh] bg-black/30" />}
              <div>
                <h3 className="font-display text-ivory text-2xl">{t(m.title)}</h3>
                <p className="text-ivory/75 mt-1">{t(m.description)}</p>
                {photos[m.photoIndex] && captionOf(photos[m.photoIndex], lang) && <p className="text-blush italic mt-1">{captionOf(photos[m.photoIndex], lang)}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="fb-section">
        <h2 className="fb-h">{lang === 'vi' ? 'Những lý do anh yêu em' : 'Reasons I love you'}</h2>
        <div className="flex flex-wrap gap-2 justify-center">
          {reasons.map((_, i) => <button key={i} className={`dot-btn heart ${heart === i ? 'is-on' : ''}`} onClick={() => setHeart(i)} aria-label={t(reasons[i])} />)}
        </div>
        {heart !== null && <p className="font-display italic text-ivory text-2xl text-center mt-4">{t(reasons[heart])}</p>}
      </section>
      <section className="fb-section text-center">
        <h2 className="fb-h">{done ? t(birthdayConfig.cake.afterBlow) : t(birthdayConfig.cake.wishPrompt)}</h2>
        <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto" role="group" aria-label={t(ui.blow)}>
          {lit.map((l, i) => (
            <button key={i} className={`fb-candle ${l ? '' : 'is-out'}`} onClick={() => blow(i)} aria-label={`${t(ui.blowTap)} ${i + 1}`} disabled={!l} />
          ))}
        </div>
        <p className="text-gold/80 mt-3 text-sm">{lit.filter(Boolean).length} {t(ui.candlesLeft)}</p>
      </section>
      <section className="fb-section">
        <h2 className="fb-h">{t(ui.gallery)}</h2>
        <div className="columns-2 sm:columns-3 gap-2">
          {photos.map((p, i) => (
            <button key={p.id} className="gallery-item" onClick={() => useExperience.getState().set({ lightbox: { index: i } })}>
              <img src={p.thumb} alt={altOf(p, lang, i)} loading="lazy" style={{ aspectRatio: `${p.aspect}` }} />
            </button>
          ))}
        </div>
      </section>
      <section className="fb-section text-center">
        <button className="btn-primary" onClick={() => useExperience.getState().set({ letterOpen: true })}>{t(ui.gift1)}</button>
        <div className="mt-8 font-display text-ivory text-xl space-y-2">
          {birthdayConfig.finalMessage.map((l, i) => <p key={i}>{t(l)}</p>)}
          <p className="font-script text-gold text-3xl pt-2">{t(birthdayConfig.signature)}</p>
        </div>
      </section>
    </div>
  )
}
