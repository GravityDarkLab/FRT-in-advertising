import { describe, expect, it } from 'vitest'
import type { Label } from '../api'
import { moodWords, steadyMood } from './mood'

const reading = (label: string, confidence = 0.8): Label => ({ label, confidence })

describe('steadyMood', () => {
  it('has nothing to say before the first reading', () => {
    expect(steadyMood([])).toBeNull()
  })

  it('takes a single reading as it is', () => {
    expect(steadyMood([reading('up', 0.9)])).toEqual(reading('up', 0.9))
  })

  it('ignores a one-frame blip', () => {
    expect(steadyMood([reading('up'), reading('low'), reading('up')])?.label).toBe('up')
    expect(steadyMood([reading('up'), reading('up'), reading('low')])?.label).toBe('up')
  })

  it('does not flip on the first disagreeing frame', () => {
    expect(steadyMood([reading('up'), reading('low')])?.label).toBe('up')
  })

  it('changes once the new mood is the majority', () => {
    expect(steadyMood([reading('up'), reading('low'), reading('low')])?.label).toBe('low')
  })

  it('only looks at the last three readings', () => {
    const readings = [reading('up'), reading('up'), reading('low'), reading('low'), reading('low')]
    expect(steadyMood(readings)?.label).toBe('low')
  })

  it('reports the average confidence of the frames that agree', () => {
    const steady = steadyMood([reading('up', 0.9), reading('low', 0.2), reading('up', 0.7)])
    expect(steady?.confidence).toBeCloseTo(0.8)
  })
})

describe('moodWords', () => {
  it('has plain words for every mood the API can send', () => {
    expect(moodWords).toEqual({
      up: 'happy',
      low: 'sad or worried',
      tense: 'angry or tense',
      neutral: 'neutral',
    })
  })
})
