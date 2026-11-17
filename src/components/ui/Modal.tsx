import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './icons'
import { ui, useT } from '../../i18n/strings'

/**
 * Accessible modal: focus trap-lite, Escape to close, restores focus, scroll locked inside.
 * Portaled to <body> so it is never inside a pointer-events:none / faded scene overlay.
 */
export function Modal({ onClose, children, label, wide = false, bare = false }: { onClose: () => void; children: ReactNode; label: string; wide?: boolean; bare?: boolean }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('[data-autofocus], button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, video, audio, [tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('keydown', onKey, true); prev?.focus?.() }
  }, [onClose])
  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`${bare ? '' : 'modal-panel'} ${wide ? 'max-w-5xl' : 'max-w-xl'} w-full relative animate-rise`}>
        <button className="btn-close" onClick={onClose} aria-label={t(ui.close)}><IconClose /></button>
        {children}
      </div>
    </div>,
    document.body,
  )
}
