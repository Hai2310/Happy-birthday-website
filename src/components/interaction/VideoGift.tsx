import { useEffect, useRef, useState } from 'react'
import { surpriseVideo } from '../../data/media'
import { altOf, captionOf, photos, pick } from '../../data/photos'
import { ui, useT } from '../../i18n/strings'
import { useExperience } from '../../stores/experience'
import { audio } from '../audio/audioDirector'
import { Modal } from '../ui/Modal'
import { IconPause, IconPlay } from '../ui/icons'

/** Personal video if supplied; otherwise a slow Ken-Burns film made from her real photos. */
export function VideoGift({ onClose }: { onClose: () => void }) {
  const t = useT()
  useEffect(() => () => audio.duck(false), [])
  return (
    <Modal onClose={onClose} label={surpriseVideo ? t(ui.gift2) : t(ui.gift2Montage)} wide>
      {surpriseVideo ? (
        <video
          className="w-full max-h-[75vh] rounded-xl bg-black"
          controls
          playsInline
          preload="metadata"
          onPlay={() => audio.duck(true)}
          onPause={() => audio.duck(false)}
          onEnded={() => audio.duck(false)}
        >
          <source src={surpriseVideo.url} type={surpriseVideo.type} />
          {surpriseVideo.subtitles && <track kind="subtitles" src={surpriseVideo.subtitles} srcLang="vi" label={t(ui.subtitles)} default />}
        </video>
      ) : (
        <Montage />
      )}
    </Modal>
  )
}

function Montage() {
  const t = useT()
  const lang = useExperience((s) => s.lang)
  const list = useRef(pick(Math.min(photos.length, 40), 3)).current
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  useEffect(() => {
    if (!playing || list.length < 2) return
    const id = setTimeout(() => setI((k) => (k + 1) % list.length), 4200)
    return () => clearTimeout(id)
  }, [i, playing, list.length])
  if (!list.length)
    return (
      <div className="p-8 text-center">
        <p className="font-display text-2xl text-ivory">{t(ui.noPhotosTitle)}</p>
        <p className="mt-2 text-ivory/70">{t(ui.noPhotosBody)}</p>
      </div>
    )
  const p = photos[list[i]]
  return (
    <div>
      <div className="relative w-full aspect-[4/5] sm:aspect-[16/10] overflow-hidden rounded-xl bg-black">
        {list.map((idx, k) => (
          <img
            key={idx}
            src={photos[idx].src}
            alt={altOf(photos[idx], lang, idx)}
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-[1400ms] ${k === i ? 'opacity-100 kenburns' : 'opacity-0'}`}
            loading={Math.abs(k - i) <= 1 ? 'eager' : 'lazy'}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="font-display italic text-ivory/90 truncate">{captionOf(p, lang) || `${i + 1} / ${list.length}`}</p>
        <button className="btn-icon" onClick={() => setPlaying((v) => !v)} aria-label={playing ? t(ui.pause) : t(ui.play)}>
          {playing ? <IconPause className="w-5 h-5" /> : <IconPlay className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}
