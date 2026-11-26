import { screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { Attributes } from '../api'
import { renderAt } from '../test/render'
import { Readout } from './Readout'

const attributes: Attributes = {
  age: { estimate: 27.9, bracket: { min: 20, max: 29 }, confidence: 0.714 },
  gender: { label: 'female', confidence: 0.999 },
  race: { label: 'East Asian', confidence: 0.8 },
  emotion: { label: 'happiness', confidence: 0.384 },
  mood: { label: 'up', confidence: 0.834 },
}

const row = (term: string) => screen.getByText(term).closest('div')!

it('shows each attribute with how sure the model is', () => {
  renderAt('/', <Readout attributes={attributes} />)

  expect(row('Age')).toHaveTextContent('about 27')
  expect(row('Age')).toHaveTextContent('range 20–29')
  expect(row('Age')).toHaveTextContent('71%')
  expect(row('Gender')).toHaveTextContent('female')
  expect(row('Gender')).toHaveTextContent('99%')
  expect(row('Race')).toHaveTextContent('East Asian')
  expect(row('Race')).toHaveTextContent('80%')
  expect(row('Emotion')).toHaveTextContent('happy')
  expect(row('Emotion')).toHaveTextContent('83%')
})

it.each([
  ['low', 'sad or worried'],
  ['tense', 'angry or tense'],
  ['neutral', 'neutral'],
])('describes the %s mood in plain words', (label, words) => {
  renderAt('/', <Readout attributes={{ ...attributes, mood: { label, confidence: 0.6 } }} />)

  expect(row('Emotion')).toHaveTextContent(words)
})

it('never claims to be 100% sure of anything', () => {
  renderAt('/', <Readout attributes={attributes} />)

  expect(row('Gender')).not.toHaveTextContent('100%')
})

it('writes the open-ended oldest range as 70+', () => {
  const old = {
    ...attributes,
    age: { estimate: 74, bracket: { min: 70, max: null }, confidence: 0.9 },
  }
  renderAt('/', <Readout attributes={old} />)

  expect(row('Age')).toHaveTextContent('range 70+')
})
