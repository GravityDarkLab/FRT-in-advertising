import type { Label } from '../api'

/** Plain words for each mood the API reads off a face. */
export const moodWords: Record<string, string> = {
  up: 'happy',
  low: 'sad or worried',
  tense: 'angry or tense',
  neutral: 'neutral',
}

const WINDOW = 3

/**
 * The mood to show, given the readings so far (oldest first).
 *
 * Single frames jitter, so this is the most common reading among the last
 * three. On a tie the older reading wins: a new mood has to be seen in most of
 * the window before it replaces the one on screen. The confidence is the
 * average over the frames that agree.
 */
export function steadyMood(readings: Label[]): Label | null {
  const recent = readings.slice(-WINDOW)
  let winner: { label: string; confidences: number[] } | null = null
  const byLabel = new Map<string, number[]>()
  for (const { label, confidence } of recent) {
    const confidences = [...(byLabel.get(label) ?? []), confidence]
    byLabel.set(label, confidences)
  }
  // Map keeps insertion order, so a strict ">" lets the older reading win ties.
  for (const [label, confidences] of byLabel) {
    if (!winner || confidences.length > winner.confidences.length) winner = { label, confidences }
  }
  if (!winner) return null
  const total = winner.confidences.reduce((sum, confidence) => sum + confidence, 0)
  return { label: winner.label, confidence: total / winner.confidences.length }
}

/** Keep only as many readings as `steadyMood` looks at. */
export function remember(readings: Label[], latest: Label): Label[] {
  return [...readings, latest].slice(-WINDOW)
}
