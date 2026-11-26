import { useCallback, useState, type RefObject } from 'react'
import { analyze, type AnalyzeResponse, type ApiError, type Label } from '../api'
import { nextAds, type ShownAds } from './ads'
import { remember } from './mood'
import { useFrameLoop } from './useFrameLoop'

type Loop = {
  result: AnalyzeResponse | null
  /** Mood readings of the last few frames with a face, oldest first. */
  moods: Label[]
  shown: ShownAds
  error: ApiError | null
}

const initial: Loop = {
  result: null,
  moods: [],
  shown: { adSet: null, mood: null, ads: [], candidate: null },
  error: null,
}

/** About once a second: what the models read off the face, and the ads that follow. */
export function useAnalysisLoop(
  videoRef: RefObject<HTMLVideoElement | null>,
  intervalMs = 1000,
): Loop {
  const [state, setState] = useState(initial)

  const onResult = useCallback((result: AnalyzeResponse) => {
    const mood = result.faces[0]?.attributes?.mood
    setState(({ shown, moods }) => ({
      result,
      // A face that left takes its history with it.
      moods: mood ? remember(moods, mood) : [],
      shown: nextAds(shown, result),
      error: null,
    }))
  }, [])
  const onError = useCallback(
    (error: ApiError) => setState((previous) => ({ ...previous, error })),
    [],
  )

  useFrameLoop(videoRef, { intervalMs, frameWidth: 640, send: analyze, onResult, onError })
  return state
}
