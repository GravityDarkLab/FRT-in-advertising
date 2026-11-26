import type { Ad, AnalyzeResponse, Mood } from '../api'
import { moodWords } from './mood'

// One picture per ad id the API can return, named <id>.svg. The folder is not
// called "ads" on purpose: ad blockers refuse to load URLs under /ads/, and in
// dev each picture is a module import, so one refusal blanks the whole page.
const pictures = import.meta.glob<string>('../assets/creatives/*', {
  eager: true,
  query: '?url',
  import: 'default',
})
const pictureById = new Map(
  Object.entries(pictures).map(([path, url]) => [path.replace(/^.*\/|\.[^.]+$/g, ''), url]),
)

export function adImage(id: string): string | undefined {
  return pictureById.get(id)
}

/** What each picture shows, for people who cannot see it. */
const descriptions: Record<string, string> = {
  alcopop: 'Three bright bottles of alcopop',
  beer: 'A pint of beer',
  car: 'A red car',
  cbd: 'A dropper bottle of CBD oil',
  cigarettes: 'An open pack of cigarettes',
  fastfood: 'A burger and fries',
  gambling: 'A playing card, a casino chip and dice',
  hardliqueur: 'A tumbler of whisky on ice',
  medicine: 'A capsule of medicine',
  mobilegame: 'A phone showing a rocket game',
  sweater: 'A knitted sweater',
  sweets: 'A lollipop and a wrapped sweet',
  tech: 'A smartphone and a smartwatch',
  toys: 'A teddy bear',
  vape: 'A vape pen',
  wine: 'A glass of red wine',
  workout: 'A dumbbell',
}

export function adDescription(id: string): string {
  return descriptions[id] ?? 'An advertisement'
}

export type ShownAds = {
  adSet: string | null
  mood: Mood | null
  ads: Ad[]
  /** A different reading seen once, waiting to be seen again before the ads change. */
  candidate: string | null
}

/**
 * Decide what stays on screen after a new answer from the API.
 *
 * The API draws two new ads on every request, and single frames jitter, so the
 * ads change only when the visitor is read into a different ad set or mood on
 * two answers in a row. The very first ads are shown at once. An answer with
 * no face keeps the ads but breaks the run, so two sightings either side of
 * it do not count as consecutive.
 */
export function nextAds(shown: ShownAds, response: AnalyzeResponse): ShownAds {
  if (response.ad_set === null) {
    return shown.candidate === null ? shown : { ...shown, candidate: null }
  }
  if (response.ad_set === shown.adSet && response.mood === shown.mood) {
    return shown.candidate === null ? shown : { ...shown, candidate: null }
  }
  const reading = `${response.ad_set}/${response.mood}`
  if (shown.adSet === null || shown.candidate === reading) {
    return { adSet: response.ad_set, mood: response.mood, ads: response.ads, candidate: null }
  }
  return { ...shown, candidate: reading }
}

/** One sentence on who the ads were aimed at, e.g. "Chosen for someone aged 16–17 who looks happy." */
export function targetingReason(adSet: string, mood: Mood | null): string {
  const ages = adSet.endsWith('+') ? `${adSet.slice(0, -1)} or older` : adSet.replace('-', '–')
  return `Chosen for someone aged ${ages}${mood ? ` who looks ${moodWords[mood]}` : ''}.`
}
