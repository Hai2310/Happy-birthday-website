import { useState } from 'react'
import { birthdayConfig } from '../../config/birthdayConfig'
import { ui, useT } from '../../i18n/strings'
import { useExperience } from '../../stores/experience'
import { store } from '../../utils/storage'

/** Romantic "lock" for the surprise. NOT security — photos are still public static files. */
export function Passcode() {
  const t = useT()
  const [v, setV] = useState('')
  const [wrong, setWrong] = useState(false)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const norm = (s: string) => s.trim().toLowerCase().replace(/[\s/.-]/g, '')
    if (norm(v) === norm(birthdayConfig.secretCode ?? '')) {
      store.set('unlocked', true)
      useExperience.getState().set({ unlocked: true })
    } else {
      setWrong(true)
    }
  }
  return (
    <div className="fixed inset-0 grid place-items-center bg-night px-4">
      <form onSubmit={submit} className="w-full max-w-sm text-center">
        <h1 className="font-display text-ivory text-3xl mt-2">{t(ui.passTitle)}</h1>
        <p className="text-ivory/60 mt-2 text-sm">{t(birthdayConfig.secretHint)}</p>
        <input
          className="pass-input mt-5"
          value={v}
          onChange={(e) => { setV(e.target.value); setWrong(false) }}
          inputMode="numeric"
          autoComplete="off"
          aria-label={t(ui.passPlaceholder)}
          placeholder={t(ui.passPlaceholder)}
          autoFocus
        />
        {wrong && <p className="text-blush mt-2 text-sm" role="alert">{t(ui.passWrong)}</p>}
        <button className="btn-primary mt-4" type="submit">{t(ui.passOpen)}</button>
      </form>
    </div>
  )
}
