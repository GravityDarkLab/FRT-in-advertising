import { describe, expect, it } from 'vitest'
import type { Ad, AnalyzeResponse, Mood } from '../api'
import { adImage, nextAds, targetingReason, type ShownAds } from './ads'

const AD_IDS = [
  'alcopop', 'beer', 'car', 'cbd', 'cigarettes', 'fastfood', 'gambling', 'hardliqueur', 'medicine',
  'mobilegame', 'sweater', 'sweets', 'tech', 'toys', 'vape', 'wine', 'workout',
] // prettier-ignore

const beer: Ad = { id: 'beer', label: 'Cold one after work?' }
const wine: Ad = { id: 'wine', label: 'Enter the weekend with style' }
const car: Ad = { id: 'car', label: 'Freedom to go wherever you please, whenever:' }
const toys: Ad = { id: 'toys', label: 'Never get bored again' }

function response(ad_set: string | null, ads: Ad[], mood: Mood | null = null): AnalyzeResponse {
  return { image: { width: 640, height: 480 }, faces: [], ad_set, mood, ads }
}

describe('adImage', () => {
  it.each(AD_IDS)('has a picture for %s', (id) => {
    expect(adImage(id)).toEqual(expect.any(String))
  })

  it('has nothing for an ad it does not know', () => {
    expect(adImage('nope')).toBeUndefined()
  })
})

it('keeps the pictures out of directories that ad blockers refuse to load', () => {
  // In dev each picture is a module import. A blocker that rejects "/ads/" URLs
  // fails those imports, and with them the whole page.
  const paths = Object.keys(import.meta.glob('../assets/**/*'))

  expect(paths.length).toBeGreaterThanOrEqual(17)
  for (const path of paths) {
    expect(path).not.toMatch(/\/(ads?|adverts?|advertising|banners?)\//i)
  }
})

describe('nextAds', () => {
  const nothing: ShownAds = { adSet: null, mood: null, ads: [], candidate: null }
  const showing: ShownAds = { adSet: '26-40', mood: 'up', ads: [beer, wine], candidate: null }

  it('adopts the first ads it is offered straight away', () => {
    expect(nextAds(nothing, response('26-40', [beer, wine], 'up'))).toEqual(showing)
  })

  it('keeps the ads on screen while the visitor stays in the same ad set and mood', () => {
    expect(nextAds(showing, response('26-40', [car, beer], 'up'))).toBe(showing)
  })

  it('does not swap on a single frame that reads differently', () => {
    const after = nextAds(showing, response('26-40', [car, toys], 'low'))

    expect(after.ads).toEqual([beer, wine])
    expect(after.mood).toBe('up')
  })

  it('swaps when the same new reading comes twice in a row', () => {
    const once = nextAds(showing, response('26-40', [car, toys], 'low'))
    const twice = nextAds(once, response('26-40', [toys, beer], 'low'))

    expect(twice).toEqual({ adSet: '26-40', mood: 'low', ads: [toys, beer], candidate: null })
  })

  it('forgets a blip when the old reading comes back', () => {
    const blip = nextAds(showing, response('26-40', [car, toys], 'low'))
    const back = nextAds(blip, response('26-40', [car, beer], 'up'))
    const again = nextAds(back, response('26-40', [car, toys], 'low'))

    expect(again.ads).toEqual([beer, wine])
  })

  it('does not swap while every frame reads something different', () => {
    const a = nextAds(showing, response('26-40', [car, toys], 'low'))
    const b = nextAds(a, response('0-10', [toys, car], null))
    const c = nextAds(b, response('26-40', [car, toys], 'tense'))

    expect(c.ads).toEqual([beer, wine])
  })

  it('treats a new ad set like a new mood: twice before it swaps', () => {
    const once = nextAds(showing, response('0-10', [toys, car], 'up'))
    const twice = nextAds(once, response('0-10', [toys, car], 'up'))

    expect(once.adSet).toBe('26-40')
    expect(twice.adSet).toBe('0-10')
  })

  it('does not count two sightings as consecutive when the face left in between', () => {
    const once = nextAds(showing, response('0-10', [toys, car], 'up'))
    const gone = nextAds(once, response(null, []))
    const again = nextAds(gone, response('0-10', [toys, car], 'up'))

    expect(gone.ads).toEqual([beer, wine])
    expect(again.adSet).toBe('26-40')
    expect(again.ads).toEqual([beer, wine])
  })

  it('keeps the ads on screen when the face drops out of view', () => {
    expect(nextAds(showing, response(null, []))).toBe(showing)
  })
})

describe('targetingReason', () => {
  it('names the age band alone when mood played no part', () => {
    expect(targetingReason('26-40', null)).toBe('Chosen for someone aged 26–40.')
  })

  it('writes the open-ended band in words', () => {
    expect(targetingReason('41+', null)).toBe('Chosen for someone aged 41 or older.')
  })

  it.each([
    ['low', 'Chosen for someone aged 16–17 who looks sad or worried.'],
    ['tense', 'Chosen for someone aged 16–17 who looks angry or tense.'],
    ['up', 'Chosen for someone aged 16–17 who looks happy.'],
  ] as const)('says which mood was targeted: %s', (mood, sentence) => {
    expect(targetingReason('16-17', mood)).toBe(sentence)
  })
})
