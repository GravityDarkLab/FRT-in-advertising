import { useCallback, useState, type RefObject } from 'react'
import { detect, type DetectResponse } from '../api'
import { useFrameLoop } from './useFrameLoop'

/**
 * Several times a second: only where the faces are, so the box can follow a
 * moving face between the slower full analyses. Null until the first answer,
 * and again whenever tracking fails, so the caller can fall back.
 */
export function useFaceTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  intervalMs = 100,
  timeoutMs = 10_000,
): DetectResponse | null {
  const [tracked, setTracked] = useState<DetectResponse | null>(null)
  const onError = useCallback(() => setTracked(null), [])

  // 320 px is plenty for the detector and keeps each frame around 20 KB.
  useFrameLoop(videoRef, {
    intervalMs,
    frameWidth: 320,
    timeoutMs,
    send: detect,
    onResult: setTracked,
    onError,
  })
  return tracked
}
