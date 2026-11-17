import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM build script without types
import { classify, stableId } from '../../scripts/import-photos.mjs'
import { forScene, heroIndex, photos, pick } from '../../src/data/photos'

describe('classify (folder / filename → category)', () => {
  it('reads Vietnamese folder names with diacritics', () => {
    expect(classify('du lịch/đà-lạt.jpg'.replace(/ /g, '-'))).toBe('travel')
    expect(classify('sinh-nhật/2024.jpg')).toBe('birthday')
  })
  it('matches English keywords', () => {
    expect(classify('us/beach-day.jpg')).toBe('couple')
    expect(classify('hero.jpg')).toBe('hero')
  })
  it('falls back to other', () => {
    expect(classify('tu-chat/anh-05.jpg')).toBe('other')
  })
  it('makes stable ids from hashes', () => {
    expect(stableId('abcdef0123456789')).toBe('p_abcdef012345')
  })
})

describe('photo selection', () => {
  it('every imported photo has optimized variants and real dimensions', () => {
    for (const p of photos) {
      expect(p.thumb && p.src && p.large).toBeTruthy()
      expect(p.width).toBeGreaterThan(0)
      expect(p.aspect).toBeCloseTo(p.width / p.height, 2)
    }
  })
  it('pick returns n unique in-range indices', () => {
    const n = Math.min(8, photos.length)
    const out = pick(n, 3)
    expect(out).toHaveLength(n)
    expect(new Set(out).size).toBe(n)
    for (const i of out) expect(i).toBeGreaterThanOrEqual(0)
    for (const i of out) expect(i).toBeLessThan(photos.length)
  })
  it('forScene puts assigned photos first', () => {
    const assigned = photos.map((p, i) => (p.scene === 'finale' ? i : -1)).filter((i) => i >= 0)
    if (!assigned.length) return
    expect(forScene('finale', 10).slice(0, assigned.length)).toEqual(assigned)
  })
  it('the hero photo from the config is found', () => {
    expect(heroIndex()).toBeGreaterThanOrEqual(0)
  })
})
