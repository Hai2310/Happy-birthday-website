import { useEffect, useRef } from 'react'
import { altOf, captionOf, photos } from '../../data/photos'
import { ui, useT } from '../../i18n/strings'
import { useExperience } from '../../stores/experience'
import { IconClose, IconLeft, IconRight } from '../ui/icons'

/** Full-screen photo view: never cropped, swipe / arrows / keyboard, preloads neighbours. */
export function Lightbox() {
  const t = useT()
  const lang = useExperience((s) => s.lang)
  const lb = useExperience((s) => s.lightbox)
  const x0 = useRef<number | null>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const N = photos.length
  const go = (d: number) => {
    const cur = useExperience.getState().lightbox
    if (cur && N) useExperience.getState().set({ lightbox: { index: (cur.index + d + N) % N } })
  }
  const close = () => useExperience.getState().set({ lightbox: null })
  useEffect(() => {
    if (!lb) return
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close() }
      if (e.key === 'ArrowRight') { e.stopPropagation(); go(1) }
      if (e.key === 'ArrowLeft') { e.stopPropagation(); go(-1) }
    }
    window.addEventListener('keydown', onKey, true)
    // preload neighbours
    for (const d of [1, -1]) {
      const p = photos[(lb.index + d + N) % N]
      if (p) new Image().src = p.src
    }
    return () => window.removeEventListener('keydown', onKey, true)
  }, [lb]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!lb) return null
  const p = photos[lb.index]
  if (!p) return null
  const cap = captionOf(p, lang)
  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={altOf(p, lang, lb.index)}
      onPointerDown={(e) => (x0.current = e.clientX)}
      onPointerUp={(e) => {
        if (x0.current === null) return
        const dx = e.clientX - x0.current
        x0.current = null
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <img
        key={p.id}
        className="lightbox-img animate-fadein"
        src={p.src}
        srcSet={`${p.thumb} 480w, ${p.src} 1280w, ${p.large} 2400w`}
        sizes="100vw"
        alt={altOf(p, lang, lb.index)}
        draggable={false}
      />
      <div className="lightbox-bar">
        <p className="font-display italic text-ivory text-lg truncate">{cap || ' '}</p>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-ivory/60 text-sm tabular-nums">{lb.index + 1} / {N}</span>
          <a className="btn-link text-sm" href={p.originalUrl} target="_blank" rel="noreferrer">{t(ui.original)}</a>
        </div>
      </div>
      {N > 1 && (
        <>
          <button className="lb-nav left-2 sm:left-5" onClick={() => go(-1)} aria-label={t(ui.prevMemory)}><IconLeft className="w-6 h-6" /></button>
          <button className="lb-nav right-2 sm:right-5" onClick={() => go(1)} aria-label={t(ui.nextMemory)}><IconRight className="w-6 h-6" /></button>
        </>
      )}
      <button ref={closeBtn} className="btn-close fixed top-[max(1rem,env(safe-area-inset-top))] right-4" onClick={close} aria-label={t(ui.close)}><IconClose /></button>
    </div>
  )
}
