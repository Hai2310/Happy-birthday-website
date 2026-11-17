/**
 * AudioDirector — one continuous score, scene-based mood changes, smooth crossfades.
 *
 *  - Supplied music (public/assets/our-music or config.backgroundMusic) → Howler, looped, faded per scene.
 *  - No supplied music → an ORIGINAL generative piano + pad score synthesized live with Web Audio
 *    (nothing copyrighted, nothing downloaded).
 *  - Never starts before a user gesture (autoplay-safe).
 *  - duck() lowers the score while a voice message / video plays.
 */
import { Howl, Howler } from 'howler'
import type { StageId } from '../../stores/experience'
import { musicTracks } from '../../data/media'

type Mood = { chords: number[][]; bpm: number; density: number; bright: number; vol: number }

// MIDI note numbers. Warm, simple, original progressions.
const MOODS: Record<StageId | 'celebrate', Mood> = {
  invitation: { chords: [[57, 64, 69, 72], [53, 60, 65, 69], [48, 55, 64, 67], [55, 62, 67, 71]], bpm: 54, density: 0.35, bright: 900, vol: 0.55 },
  room: { chords: [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]], bpm: 66, density: 0.6, bright: 1800, vol: 0.6 },
  garden: { chords: [[53, 60, 64, 69], [55, 62, 65, 71], [52, 59, 64, 67], [57, 64, 67, 72]], bpm: 58, density: 0.45, bright: 1300, vol: 0.55 },
  universe: { chords: [[50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61]], bpm: 50, density: 0.3, bright: 1100, vol: 0.6 },
  timeline: { chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 60], [55, 59, 62, 65]], bpm: 60, density: 0.55, bright: 1500, vol: 0.55 },
  tree: { chords: [[52, 59, 64, 68], [49, 56, 61, 64], [45, 52, 57, 61], [47, 54, 59, 63]], bpm: 58, density: 0.45, bright: 1400, vol: 0.55 },
  cake: { chords: [[60, 64, 67, 72], [53, 57, 60, 65], [55, 59, 62, 67], [60, 64, 67, 72]], bpm: 70, density: 0.4, bright: 2000, vol: 0.45 },
  gift: { chords: [[53, 57, 60, 64], [52, 55, 59, 64], [50, 53, 57, 60], [55, 59, 62, 65]], bpm: 52, density: 0.35, bright: 1000, vol: 0.5 },
  finale: { chords: [[48, 55, 64, 67], [55, 62, 67, 71], [57, 64, 69, 72], [53, 60, 65, 69]], bpm: 62, density: 0.7, bright: 2400, vol: 0.7 },
  celebrate: { chords: [[60, 64, 67, 72], [65, 69, 72, 77], [67, 71, 74, 79], [60, 64, 67, 72]], bpm: 84, density: 0.85, bright: 2800, vol: 0.65 },
}

const SCENE_VOLUME: Record<StageId, number> = {
  invitation: 0.55, room: 0.65, garden: 0.6, universe: 0.7, timeline: 0.6, tree: 0.6, cake: 0.45, gift: 0.45, finale: 0.85,
}

const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

class AudioDirectorImpl {
  ctx: AudioContext | null = null
  private master!: GainNode
  private scoreBus!: GainNode
  private sfxBus!: GainNode
  private reverb!: ConvolverNode
  private filter!: BiquadFilterNode
  private howl: Howl | null = null
  private mood: Mood = MOODS.invitation
  private stage: StageId = 'invitation'
  private chordIdx = 0
  private nextBeat = 0
  private timer: number | null = null
  private padVoices: { osc: OscillatorNode[]; gain: GainNode }[] = []
  private muted = false
  private ducked = false
  private started = false

  /** Call from a user gesture. Safe to call repeatedly. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
      const c = this.ctx
      this.master = c.createGain()
      this.master.gain.value = this.muted ? 0 : 1
      this.master.connect(c.destination)
      this.reverb = c.createConvolver()
      this.reverb.buffer = this.impulse(3.2)
      const wet = c.createGain()
      wet.gain.value = 0.55
      this.reverb.connect(wet).connect(this.master)
      this.filter = c.createBiquadFilter()
      this.filter.type = 'lowpass'
      this.filter.frequency.value = 1200
      this.scoreBus = c.createGain()
      this.scoreBus.gain.value = 0
      this.scoreBus.connect(this.filter)
      this.filter.connect(this.master)
      this.filter.connect(this.reverb)
      this.sfxBus = c.createGain()
      this.sfxBus.gain.value = 0.5
      this.sfxBus.connect(this.master)
      this.sfxBus.connect(this.reverb)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    if (!this.started) {
      this.started = true
      this.startScore()
    }
  }

  private impulse(seconds: number) {
    const c = this.ctx!
    const len = Math.floor(c.sampleRate * seconds)
    const buf = c.createBuffer(2, len, c.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
    }
    return buf
  }

  private startScore() {
    if (musicTracks.length) {
      this.howl = new Howl({
        src: [musicTracks[0].url],
        loop: true,
        html5: true,
        volume: 0,
        onloaderror: () => {
          this.howl = null
          this.startGenerative()
        },
        onplayerror: () => this.howl?.once('unlock', () => this.howl?.play()),
      })
      this.howl.play()
      this.howl.fade(0, this.muted ? 0 : SCENE_VOLUME[this.stage], 2500)
      return
    }
    this.startGenerative()
  }

  private startGenerative() {
    const c = this.ctx!
    this.nextBeat = c.currentTime + 0.2
    this.scoreBus.gain.setTargetAtTime(this.mood.vol, c.currentTime, 1.5)
    this.playPad()
    this.timer = window.setInterval(() => this.schedule(), 120)
  }

  private schedule() {
    const c = this.ctx
    if (!c || c.state !== 'running') return
    const beat = 60 / this.mood.bpm
    while (this.nextBeat < c.currentTime + 0.4) {
      const t = this.nextBeat
      const beatInBar = Math.round(t / beat) % 8
      if (beatInBar === 0) {
        this.chordIdx = (this.chordIdx + 1) % this.mood.chords.length
        this.playPad(t)
      }
      if (Math.random() < this.mood.density) {
        const chord = this.mood.chords[this.chordIdx]
        const note = chord[Math.floor(Math.random() * chord.length)] + (Math.random() < 0.6 ? 12 : 24)
        this.piano(note, t, 0.07 + Math.random() * 0.05)
      }
      if (beatInBar === 0) this.piano(this.mood.chords[this.chordIdx][0] - 12, t, 0.09, 4)
      this.nextBeat += beat
    }
  }

  private playPad(at?: number) {
    const c = this.ctx!
    const t = at ?? c.currentTime
    for (const v of this.padVoices) {
      v.gain.gain.cancelScheduledValues(t)
      v.gain.gain.setTargetAtTime(0, t, 1.2)
      v.osc.forEach((o) => o.stop(t + 6))
    }
    this.padVoices = []
    const chord = this.mood.chords[this.chordIdx]
    const g = c.createGain()
    g.gain.value = 0
    g.gain.setTargetAtTime(0.035, t, 1.4)
    g.connect(this.scoreBus)
    const oscs = chord.map((n, i) => {
      const o = c.createOscillator()
      o.type = i % 2 ? 'triangle' : 'sine'
      o.frequency.value = freq(n)
      o.detune.value = (i - 1.5) * 4
      o.connect(g)
      o.start(t)
      return o
    })
    this.padVoices.push({ osc: oscs, gain: g })
  }

  /** soft felt-piano-ish tone: sine + few harmonics with fast attack and long decay */
  private piano(note: number, t: number, vel: number, decay = 2.6, bus?: AudioNode) {
    const c = this.ctx!
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vel, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    g.connect(bus ?? this.scoreBus)
    ;[1, 2, 3].forEach((h, i) => {
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq(note) * h
      const hg = c.createGain()
      hg.gain.value = [1, 0.28, 0.09][i]
      o.connect(hg).connect(g)
      o.start(t)
      o.stop(t + decay + 0.1)
    })
  }

  setScene(stage: StageId) {
    this.stage = stage
    this.mood = MOODS[stage]
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.filter.frequency.setTargetAtTime(this.mood.bright, t, 2)
    if (!this.ducked) this.scoreBus.gain.setTargetAtTime(this.mood.vol, t, 2)
    if (this.howl && !this.muted && !this.ducked) this.howl.fade(this.howl.volume(), SCENE_VOLUME[stage], 2000)
  }

  celebrate() {
    this.mood = MOODS.celebrate
    if (this.ctx) this.filter.frequency.setTargetAtTime(this.mood.bright, this.ctx.currentTime, 1)
    this.birthdayTune()
    window.setTimeout(() => this.setScene(this.stage), 16000)
  }

  /** "Happy Birthday to You" melody (public domain) in a music-box timbre */
  birthdayTune() {
    const c = this.ctx
    if (!c) return
    const N: [number, number][] = [
      [67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2],
      [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2],
      [67, 0.75], [67, 0.25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
      [77, 0.75], [77, 0.25], [76, 1], [72, 1], [74, 1], [72, 3],
    ]
    const beat = 0.48
    let t = c.currentTime + 0.3
    for (const [n, d] of N) {
      this.piano(n + 12, t, 0.12, 1.8, this.sfxBus)
      t += d * beat
    }
  }

  chime(kind: 'soft' | 'sparkle' | 'open' = 'soft') {
    const c = this.ctx
    if (!c) return
    const t = c.currentTime
    const sets = { soft: [76, 83], sparkle: [79, 84, 88, 91], open: [72, 76, 79, 84, 88] }
    sets[kind].forEach((n, i) => this.piano(n + 12, t + i * 0.07, 0.09, 2.2, this.sfxBus))
  }

  whoosh() {
    const c = this.ctx
    if (!c) return
    const t = c.currentTime
    const len = c.sampleRate * 1.4
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource()
    src.buffer = buf
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 0.8
    f.frequency.setValueAtTime(300, t)
    f.frequency.exponentialRampToValueAtTime(2200, t + 0.7)
    f.frequency.exponentialRampToValueAtTime(400, t + 1.4)
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.18, t + 0.5)
    g.gain.linearRampToValueAtTime(0, t + 1.4)
    src.connect(f).connect(g).connect(this.sfxBus)
    src.start(t)
  }

  setMuted(m: boolean) {
    this.muted = m
    if (!this.ctx) return
    this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.3)
    if (this.howl) this.howl.fade(this.howl.volume(), m || this.ducked ? 0 : SCENE_VOLUME[this.stage], 600)
  }

  duck(on: boolean) {
    this.ducked = on
    if (!this.ctx) return
    this.scoreBus.gain.setTargetAtTime(on ? 0.06 : this.mood.vol, this.ctx.currentTime, 0.5)
    if (this.howl && !this.muted) this.howl.fade(this.howl.volume(), on ? 0.06 : SCENE_VOLUME[this.stage], 800)
  }

  suspend(hidden: boolean) {
    if (!this.ctx) return
    if (hidden) void this.ctx.suspend()
    else void this.ctx.resume()
    if (this.howl) {
      if (hidden) this.howl.pause()
      else if (!this.howl.playing()) this.howl.play()
    }
  }

  dispose() {
    if (this.timer) clearInterval(this.timer)
    this.howl?.unload()
    Howler.unload()
    void this.ctx?.close()
  }
}

export const audio = new AudioDirectorImpl()
