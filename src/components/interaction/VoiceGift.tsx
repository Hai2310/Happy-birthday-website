import { useEffect, useRef, useState } from 'react'
import { birthdayConfig } from '../../config/birthdayConfig'
import { voiceMessage } from '../../data/media'
import { ui, useT } from '../../i18n/strings'
import { audio } from '../audio/audioDirector'
import { Modal } from '../ui/Modal'
import { IconPause, IconPlay } from '../ui/icons'

export function VoiceGift({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <Modal onClose={onClose} label={voiceMessage ? t(ui.gift3Voice) : t(ui.gift3)}>
      {voiceMessage ? <VoicePlayer src={voiceMessage} /> : (
        <div className="p-2 sm:p-4">
          <p className="font-script text-gold text-4xl">{t(ui.gift3)}</p>
          <p className="mt-3 font-display italic text-ivory text-[clamp(1.15rem,4.4vw,1.4rem)] leading-relaxed">{t(birthdayConfig.voiceFallback)}</p>
        </div>
      )}
    </Modal>
  )
}

/** Audio player with a live waveform; ducks the background score while playing. */
function VoicePlayer({ src }: { src: string }) {
  const t = useT()
  const el = useRef<HTMLAudioElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const graph = useRef<{ ctx: AudioContext; an: AnalyserNode } | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    let raf = 0
    const draw = () => {
      const c = canvas.current
      const g = c?.getContext('2d')
      if (c && g) {
        const w = (c.width = c.clientWidth * devicePixelRatio)
        const h = (c.height = c.clientHeight * devicePixelRatio)
        g.clearRect(0, 0, w, h)
        const bars = 40
        const data = new Uint8Array(64)
        graph.current?.an.getByteFrequencyData(data)
        for (let i = 0; i < bars; i++) {
          const v = graph.current && playing ? data[(i * 1.4) | 0] / 255 : 0.08 + 0.05 * Math.sin(performance.now() / 600 + i)
          const bh = Math.max(3, v * h * 0.9)
          g.fillStyle = i / bars < time / (dur || 1) ? '#D8B987' : 'rgba(255,248,240,0.35)'
          g.fillRect((i * w) / bars + 2, (h - bh) / 2, w / bars - 4, bh)
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [playing, time, dur])

  useEffect(() => () => {
    audio.duck(false)
    void graph.current?.ctx.close()
  }, [])

  const toggle = async () => {
    const a = el.current
    if (!a) return
    if (!graph.current) {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new AC()
        const an = ctx.createAnalyser()
        an.fftSize = 128
        ctx.createMediaElementSource(a).connect(an)
        an.connect(ctx.destination)
        graph.current = { ctx, an }
      } catch { /* waveform is decorative; playback still works */ }
    }
    if (a.paused) {
      await graph.current?.ctx.resume()
      await a.play().catch(() => setError(true))
    } else a.pause()
  }
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  return (
    <div className="p-1 sm:p-3">
      <p className="font-script text-gold text-4xl">{t(ui.gift3Voice)}</p>
      <audio
        ref={el}
        src={src}
        preload="metadata"
        onPlay={() => { setPlaying(true); audio.duck(true) }}
        onPause={() => { setPlaying(false); audio.duck(false) }}
        onEnded={() => { setPlaying(false); audio.duck(false) }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onError={() => setError(true)}
      />
      {error ? (
        <p className="mt-3 text-ivory/80">{t(birthdayConfig.voiceFallback)}</p>
      ) : (
        <div className="mt-4 flex items-center gap-4">
          <button className="btn-round" onClick={toggle} aria-label={playing ? t(ui.pause) : t(ui.play)}>
            {playing ? <IconPause /> : <IconPlay />}
          </button>
          <div className="flex-1">
            <canvas ref={canvas} className="w-full h-14" aria-hidden />
            <input
              type="range" min={0} max={dur || 0} step={0.1} value={time}
              onChange={(e) => { if (el.current) el.current.currentTime = +e.target.value }}
              className="range w-full" aria-label="Seek"
            />
            <p className="text-xs text-ivory/60 tabular-nums">{fmt(time)} / {fmt(dur)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
