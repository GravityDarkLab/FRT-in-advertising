import { expect, it } from 'vitest'
import { boxToPercent } from './geometry'

it('expresses a box as percentages of the image it was found in', () => {
  expect(
    boxToPercent({ x: 64, y: 48, width: 128, height: 96 }, { width: 640, height: 480 }),
  ).toEqual({ left: '10%', top: '10%', width: '20%', height: '20%' })
})

it('keeps fractions, so the overlay does not jitter on small faces', () => {
  expect(boxToPercent({ x: 1, y: 1, width: 1, height: 1 }, { width: 3, height: 8 })).toEqual({
    left: '33.33%',
    top: '12.5%',
    width: '33.33%',
    height: '12.5%',
  })
})
