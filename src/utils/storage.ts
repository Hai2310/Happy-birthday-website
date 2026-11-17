/** localStorage wrapped so private mode / blocked storage never crashes the page */
export const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem('ou:' + key)
      return v == null ? fallback : (JSON.parse(v) as T)
    } catch {
      return fallback
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem('ou:' + key, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  },
}
