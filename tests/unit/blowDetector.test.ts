import { describe, expect, it } from 'vitest'
import { createBlowDetector, rms } from '../../src/utils/blowDetector'

describe('createBlowDetector', () => {
  it('uses the floor when the room is silent', () => {
    expect(createBlowDetector({ baseline: 0 }).threshold).toBe(0.045)
  })
  it('scales the threshold with ambient noise', () => {
    expect(createBlowDetector({ baseline: 0.05 }).threshold).toBeCloseTo(0.15)
  })
  it('ignores short spikes (talking, clicks)', () => {
    const d = createBlowDetector({ baseline: 0.01 })
    let hits = 0
    for (let t = 0; t < 100; t += 16) hits += d.push(0.3, t)
    hits += d.push(0.01, 120)
    expect(hits).toBe(0)
  })
  it('detects a sustained blow, and harder blows put out more candles', () => {
    const soft = createBlowDetector({ baseline: 0.01 })
    let r = 0
    for (let t = 0; t <= 200 && !r; t += 16) r = soft.push(0.06, t)
    expect(r).toBe(1)
    const hard = createBlowDetector({ baseline: 0.01 })
    r = 0
    for (let t = 0; t <= 200 && !r; t += 16) r = hard.push(0.5, t)
    expect(r).toBe(3)
  })
  it('applies a cooldown after a blow', () => {
    const d = createBlowDetector({ baseline: 0.01 })
    let t = 0
    let r = 0
    for (; t <= 300 && !r; t += 16) r = d.push(0.2, t)
    expect(r).toBeGreaterThan(0)
    let again = 0
    for (let k = 0; k < 20; k++, t += 16) again += d.push(0.2, t)
    expect(again).toBe(0)
  })
  it('rms of a constant signal equals its amplitude', () => {
    expect(rms(new Float32Array(64).fill(0.5))).toBeCloseTo(0.5)
  })
})
