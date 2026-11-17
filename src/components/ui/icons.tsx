// Inline SVG icons (no emoji — consistent rendering on every phone)
type P = { className?: string }
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24', 'aria-hidden': true }
export const IconLetter = ({ className = 'w-7 h-7' }: P) => (<svg {...base} className={className}><rect x="3" y="5.5" width="18" height="13" rx="1.5" /><path d="M3.5 6.5 12 13l8.5-6.5" /></svg>)
export const IconFilm = ({ className = 'w-7 h-7' }: P) => (<svg {...base} className={className}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9.5 5 2.5-5 2.5z" /></svg>)
export const IconVoice = ({ className = 'w-7 h-7' }: P) => (<svg {...base} className={className}><path d="M5 10v4M8.5 7v10M12 4.5v15M15.5 8v8M19 10.5v3" /></svg>)
export const IconClose = ({ className = 'w-5 h-5' }: P) => (<svg {...base} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>)
export const IconLeft = ({ className = 'w-5 h-5' }: P) => (<svg {...base} className={className}><path d="M15 5l-7 7 7 7" /></svg>)
export const IconRight = ({ className = 'w-5 h-5' }: P) => (<svg {...base} className={className}><path d="M9 5l7 7-7 7" /></svg>)
export const IconSound = ({ className = 'w-5 h-5', on }: P & { on: boolean }) => (
  <svg {...base} className={className}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />{on ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5M21 9.5l-5 5" />}</svg>
)
export const IconMenu = ({ className = 'w-5 h-5' }: P) => (<svg {...base} className={className}><path d="M4 7h16M4 12h16M4 17h10" /></svg>)
export const IconPlay = ({ className = 'w-6 h-6' }: P) => (<svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor"><path d="M8 5.5v13l10.5-6.5z" /></svg>)
export const IconPause = ({ className = 'w-6 h-6' }: P) => (<svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1" /><rect x="13.5" y="5" width="4" height="14" rx="1" /></svg>)
export const IconSkip = ({ className = 'w-5 h-5' }: P) => (<svg {...base} className={className}><path d="m5 6 7 6-7 6zM13 6l7 6-7 6z" /></svg>)
export const IconGrid = ({ className = 'w-5 h-5' }: P) => (<svg {...base} className={className}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>)
