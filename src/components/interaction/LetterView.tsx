import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { birthdayConfig } from '../../config/birthdayConfig'
import { useT } from '../../i18n/strings'
import { useExperience } from '../../stores/experience'
import { Modal } from '../ui/Modal'

function daysTogether() {
  const d = birthdayConfig.relationshipStartDate
  if (!d) return null
  const start = new Date(d)
  if (isNaN(start.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000))
}

/** The love letter: unfolds like paper, paragraphs arrive in readable sections. */
export function LetterView() {
  const t = useT()
  const lang = useExperience((s) => s.lang)
  const close = () => useExperience.getState().set({ letterOpen: false })
  const ref = useRef<HTMLDivElement>(null)
  const L = birthdayConfig.loveLetter
  const days = daysTogether()
  useGSAP(
    () => {
      const reduced = useExperience.getState().reducedMotion
      const tl = gsap.timeline()
      tl.from('.paper', { scaleY: 0.08, rotateX: 70, opacity: 0, duration: reduced ? 0.2 : 1.1, ease: 'power3.out', transformOrigin: '50% 0%' })
        .from('.letter-line', { opacity: 0, y: 10, duration: 0.7, stagger: reduced ? 0 : 0.35, ease: 'power2.out' }, '-=0.3')
    },
    { scope: ref },
  )
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('.paper')?.focus()
  }, [])
  return (
    <Modal onClose={close} label={t(L.greeting)} bare>
      <div ref={ref} style={{ perspective: 1200 }}>
        <article className="paper" tabIndex={-1}>
          <p className="letter-line font-script text-wine text-[clamp(2rem,8vw,2.8rem)] leading-none">{t(L.greeting)}</p>
          {L.paragraphs.map((p, i) => (
            <p key={i} className="letter-line mt-4 font-display text-[clamp(1.12rem,4.2vw,1.32rem)] leading-[1.65] text-[#3b2530]">{t(p)}</p>
          ))}
          <p className="letter-line mt-5 font-display italic text-[clamp(1.15rem,4.3vw,1.38rem)] leading-[1.6] text-wine">{t(L.closing)}</p>
          {days !== null && (
            <p className="letter-line mt-3 font-body text-sm text-[#8a6a54]">{lang === 'vi' ? `— ${days} ngày bên nhau, và còn nhiều nữa.` : `— ${days} days together, and counting.`}</p>
          )}
          <p className="letter-line mt-6 text-right font-script text-[clamp(1.7rem,6.5vw,2.3rem)] text-wine">{t(birthdayConfig.signature)}</p>
        </article>
      </div>
    </Modal>
  )
}
