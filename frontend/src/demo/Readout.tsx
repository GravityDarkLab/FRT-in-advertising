import type { Attributes } from '../api'
import { moodWords } from './mood'
import classes from './Readout.module.css'

/** Whole percent, capped at 99: a classifier is never certain, so the page never says 100%. */
function percent(confidence: number): number {
  return Math.min(99, Math.round(confidence * 100))
}

function range({ min, max }: Attributes['age']['bracket']): string {
  return max === null ? `${min}+` : `${min}–${max}`
}

/** What the model read off a face, one row per attribute, each with its confidence. */
export function Readout({ attributes }: { attributes: Attributes }) {
  const { age, gender, race, mood } = attributes
  const rows = [
    {
      term: 'Age',
      value: `about ${Math.floor(age.estimate)}`,
      note: `range ${range(age.bracket)}`,
      confidence: age.confidence,
    },
    { term: 'Gender', value: gender.label, confidence: gender.confidence },
    { term: 'Race', value: race.label, confidence: race.confidence },
    // Shown as a mood: the model mixes up neighbouring emotions far more than moods.
    { term: 'Emotion', value: moodWords[mood.label] ?? mood.label, confidence: mood.confidence },
  ]
  return (
    <dl className={classes.readout}>
      {rows.map(({ term, value, note, confidence }) => (
        <div key={term} className={classes.row}>
          <dt className={classes.term}>{term}</dt>
          <dd className={classes.value}>
            {value}
            {note && <span className={classes.note}>{note}</span>}
          </dd>
          <dd className={classes.confidence}>
            <span className={classes.track} aria-hidden="true">
              <span className={classes.bar} style={{ width: `${percent(confidence)}%` }} />
            </span>
            <span className={classes.percent}>
              {percent(confidence)}%<span className={classes.srOnly}> confident</span>
            </span>
          </dd>
        </div>
      ))}
    </dl>
  )
}
