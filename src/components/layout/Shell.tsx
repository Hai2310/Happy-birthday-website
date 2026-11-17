import { ui, useT } from '../../i18n/strings'
import { useExperience } from '../../stores/experience'
import { audio } from '../audio/audioDirector'
import { IconGrid, IconMenu, IconSkip, IconSound } from '../ui/icons'
import { Modal } from '../ui/Modal'
import type { Tier } from '../../utils/quality'

/** Quiet, film-like chrome: sound / language / chapters top-right, a hairline progress at the bottom edge. */
export function TopControls() {
  const t = useT()
  const muted = useExperience((s) => s.muted)
  const lang = useExperience((s) => s.lang)
  const stage = useExperience((s) => s.stage)
  const set = useExperience((s) => s.set)
  return (
    <div className="top-controls">
      {stage !== 'invitation' && (
        <button className="ctl" onClick={() => useExperience.getState().skip()} aria-label={t(ui.skip)} title={t(ui.skip)}>
          <IconSkip />
        </button>
      )}
      <button className="ctl" onClick={() => { audio.unlock(); audio.setMuted(!muted); set({ muted: !muted }) }} aria-label={muted ? t(ui.musicOn) : t(ui.musicOff)} aria-pressed={!muted}>
        <IconSound on={!muted} />
      </button>
      <button className="ctl text-[0.72rem] font-medium tracking-wider" onClick={() => set({ lang: lang === 'vi' ? 'en' : 'vi' })} aria-label={t(ui.language)}>
        {lang === 'vi' ? 'EN' : 'VI'}
      </button>
      <button className="ctl" onClick={() => set({ galleryOpen: true })} aria-label={t(ui.gallery)}>
        <IconGrid />
      </button>
      <button className="ctl" onClick={() => set({ menuOpen: true })} aria-label={t(ui.menu)}>
        <IconMenu />
      </button>
    </div>
  )
}

export function Progress() {
  const t = useT()
  const stages = useExperience((s) => s.stages)
  const stage = useExperience((s) => s.stage)
  const i = stages.indexOf(stage)
  if (stage === 'invitation') return null
  return (
    <div className="progress" aria-label={`${t(ui.chapters[stage])} · ${i + 1}/${stages.length}`}>
      <div className="progress-line"><span style={{ transform: `scaleX(${i / (stages.length - 1)})` }} /></div>
      <p className="progress-label">{String(i + 1).padStart(2, '0')} · {t(ui.chapters[stage])}</p>
    </div>
  )
}

export function ChapterMenu() {
  const t = useT()
  const open = useExperience((s) => s.menuOpen)
  const stages = useExperience((s) => s.stages)
  const stage = useExperience((s) => s.stage)
  const qualityPref = useExperience((s) => s.qualityPref)
  const set = useExperience((s) => s.set)
  if (!open) return null
  const close = () => set({ menuOpen: false })
  const qs: (Tier | 'auto')[] = ['auto', 'high', 'medium', 'low']
  return (
    <Modal onClose={close} label={t(ui.menu)}>
      <h2 className="font-display text-ivory text-3xl">{t(ui.menu)}</h2>
      <ol className="mt-4 grid gap-1">
        {stages.map((s, i) => (
          <li key={s}>
            <button
              className={`chapter-row ${s === stage ? 'is-on' : ''}`}
              onClick={() => { audio.unlock(); useExperience.getState().go(s) }}
              aria-current={s === stage ? 'step' : undefined}
            >
              <span className="tabular-nums text-gold/70 w-7">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-display text-xl">{t(ui.chapters[s])}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={() => useExperience.getState().replayScene()}>{t(ui.replayScene)}</button>
        <button className="btn-ghost" onClick={() => useExperience.getState().restart()}>{t(ui.restart)}</button>
      </div>
      <fieldset className="mt-5">
        <legend className="text-ivory/60 text-sm">{t(ui.quality)}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {qs.map((q) => (
            <button key={q} className={`chip ${qualityPref === q ? 'is-on' : ''}`} aria-pressed={qualityPref === q} onClick={() => set({ qualityPref: q, degraded: 0 })}>
              {t(ui[q])}
            </button>
          ))}
        </div>
      </fieldset>
    </Modal>
  )
}
