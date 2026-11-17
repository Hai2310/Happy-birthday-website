import { useEffect, useState } from 'react'
import { ExperienceController } from './ExperienceController'
import { Fallback2D } from './Fallback2D'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { ChapterMenu, Progress, TopControls } from '../components/layout/Shell'
import { Passcode } from '../components/layout/Passcode'
import { Gallery } from '../components/gallery/Gallery'
import { Lightbox } from '../components/gallery/Lightbox'
import { LetterView } from '../components/interaction/LetterView'
import { FireworksLayer } from '../experience/effects/Fireworks'
import { SparkleSky, SparkleTrail } from '../components/ui/Sparkles'
import { useExperience } from '../stores/experience'
import { hasWebGL } from '../utils/quality'
import { audio } from '../components/audio/audioDirector'
import { ui, useT } from '../i18n/strings'

export default function App() {
  const t = useT()
  const unlocked = useExperience((s) => s.unlocked)
  const lang = useExperience((s) => s.lang)
  const gallery = useExperience((s) => s.galleryOpen)
  const letter = useExperience((s) => s.letterOpen)
  const muted = useExperience((s) => s.muted)
  const [fontsReady, setFontsReady] = useState(false)
  const [webgl, setWebgl] = useState(() => hasWebGL() && !new URLSearchParams(location.search).has('2d'))

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  useEffect(() => {
    // fonts must be ready before canvas textures draw Vietnamese text
    const timeout = setTimeout(() => setFontsReady(true), 2500)
    Promise.all([
      document.fonts.load('600 40px "Cormorant Garamond"', 'Ấn'),
      document.fonts.load('italic 600 40px "Cormorant Garamond"', 'Ấn'),
      document.fonts.load('40px "Great Vibes"', 'Ấn'),
      document.fonts.load('300 20px "Be Vietnam Pro"', 'Ấn'),
    ]).finally(() => { clearTimeout(timeout); setFontsReady(true) })
  }, [])
  useEffect(() => {
    audio.setMuted(muted)
    const vis = () => audio.suspend(document.hidden)
    const unlock = () => audio.unlock()
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => {
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('pointerdown', unlock)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!unlocked) return <Passcode />
  if (!fontsReady) return <div className="fixed inset-0 grid place-items-center bg-[#070912]"><p className="loading-text">{t(ui.loading)}</p></div>

  return (
    <>
      {webgl ? (
        <ErrorBoundary fallback={<Fallback2D />} onError={() => setWebgl(false)}>
          <ExperienceController onWebGLFail={() => setWebgl(false)} />
          <TopControls />
          <Progress />
        </ErrorBoundary>
      ) : (
        <Fallback2D />
      )}
      <SparkleSky />
      <SparkleTrail />
      <FireworksLayer />
      <ChapterMenu />
      {gallery && <Gallery />}
      {letter && <LetterView />}
      <Lightbox />
    </>
  )
}
