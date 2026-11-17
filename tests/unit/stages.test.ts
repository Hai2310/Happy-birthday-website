import { describe, expect, it } from 'vitest'
import { ALL_STAGES, resolveStages } from '../../src/stores/experience'

describe('resolveStages', () => {
  it('keeps the full order when everything is enabled', () => {
    expect(resolveStages(ALL_STAGES, {})).toEqual([...ALL_STAGES])
  })
  it('drops disabled and duplicate scenes', () => {
    expect(resolveStages(['invitation', 'room', 'room', 'cake', 'finale'], { cake: false })).toEqual(['invitation', 'room', 'finale'])
  })
  it('always starts with the invitation', () => {
    expect(resolveStages(['garden', 'finale'], {})[0]).toBe('invitation')
  })
  it('ignores unknown ids', () => {
    expect(resolveStages(['invitation', 'nope' as never, 'finale'], {})).toEqual(['invitation', 'finale'])
  })
})
