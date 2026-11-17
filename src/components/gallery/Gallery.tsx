import { useEffect, useMemo, useRef, useState } from 'react'
import { altOf, CATEGORY_LABELS, hasPhotos, photos } from '../../data/photos'
import { tr, ui, useT } from '../../i18n/strings'
import { useExperience } from '../../stores/experience'
import { Modal } from '../ui/Modal'

const PAGE = 60

/** Every valid photo, lazily loaded, paged in as she scrolls (works for 10 or 500+ photos). */
export function Gallery() {
  const t = useT()
  const lang = useExperience((s) => s.lang)
  const close = () => useExperience.getState().set({ galleryOpen: false })
  const [cat, setCat] = useState<string>('all')
  const [shown, setShown] = useState(PAGE)
  const sentinel = useRef<HTMLDivElement>(null)
  const cats = useMemo(() => Array.from(new Set(photos.map((p) => p.category))), [])
  const list = useMemo(() => photos.map((p, i) => ({ p, i })).filter(({ p }) => cat === 'all' || p.category === cat), [cat])
  useEffect(() => setShown(PAGE), [cat])
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setShown((s) => s + PAGE), { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [list.length])
  return (
    <Modal onClose={close} label={t(ui.gallery)} wide>
      <div className="flex items-baseline justify-between gap-3 pr-10">
        <h2 className="font-display text-ivory text-3xl">{t(ui.gallery)}</h2>
        <p className="text-ivory/60 text-sm tabular-nums">{photos.length} {t(ui.photosCount)}</p>
      </div>
      {!hasPhotos ? (
        <div className="py-10 text-center">
          <p className="font-display text-2xl text-ivory">{t(ui.noPhotosTitle)}</p>
          <p className="mt-2 text-ivory/70 max-w-md mx-auto">{t(ui.noPhotosBody)}</p>
        </div>
      ) : (
        <>
          {cats.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="tablist">
              {['all', ...cats].map((c) => (
                <button key={c} role="tab" aria-selected={cat === c} className={`chip ${cat === c ? 'is-on' : ''}`} onClick={() => setCat(c)}>
                  {c === 'all' ? t(ui.all) : tr(CATEGORY_LABELS[c] ?? CATEGORY_LABELS.other, lang)}
                </button>
              ))}
            </div>
          )}
          <div className="gallery-scroll mt-3">
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-2 sm:gap-3">
              {list.slice(0, shown).map(({ p, i }) => (
                <button key={p.id} className="gallery-item" onClick={() => useExperience.getState().set({ lightbox: { index: i } })}>
                  <img src={p.thumb} alt={altOf(p, lang, i)} width={p.width} height={p.height} loading="lazy" decoding="async" style={{ aspectRatio: `${p.aspect}` }} />
                </button>
              ))}
            </div>
            {shown < list.length && <div ref={sentinel} className="h-10" />}
          </div>
        </>
      )}
    </Modal>
  )
}
