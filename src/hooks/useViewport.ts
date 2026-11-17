import { useEffect, useState } from 'react'
export const isPortrait = () => typeof window !== 'undefined' && window.innerWidth / window.innerHeight < 0.85
export function usePortrait() {
  const [p, setP] = useState(isPortrait())
  useEffect(() => {
    const on = () => setP(isPortrait())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return p
}
