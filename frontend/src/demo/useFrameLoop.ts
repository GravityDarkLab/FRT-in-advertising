import { useEffect, type RefObject } from 'react'
import { ApiError } from '../api'
import { captureFrame } from './captureFrame'

/**
 * While mounted: capture a frame, send it, hand over the answer, wait `intervalMs`, repeat.
 *
 * The wait starts when the answer arrives, so a slow API is never queued up on.
 * Errors do not stop the loop; the next tick tries again. Unmounting cancels
 * the request in flight and nothing is handed over afterwards.
 *
 * `send`, `onResult` and `onError` must keep their identity between renders
 * (module functions or `useCallback`), or the loop restarts on every render.
 */
export function useFrameLoop<T>(
  videoRef: RefObject<HTMLVideoElement | null>,
  options: {
    intervalMs: number
    /** Frames are shrunk to this width before they are sent. */
    frameWidth: number
    send: (frame: Blob, signal: AbortSignal) => Promise<T>
    onResult: (result: T) => void
    onError: (error: ApiError) => void
  },
): void {
  const { intervalMs, frameWidth, send, onResult, onError } = options

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    let timer: ReturnType<typeof setTimeout> | undefined

    async function tick() {
      try {
        const frame = videoRef.current ? await captureFrame(videoRef.current, frameWidth) : null
        if (signal.aborted) return
        if (frame) {
          const result = await send(frame, signal)
          if (signal.aborted) return
          onResult(result)
        }
      } catch (error) {
        if (signal.aborted) return
        onError(error instanceof ApiError ? error : new ApiError('server'))
      }
      timer = setTimeout(tick, intervalMs)
    }
    void tick()

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [videoRef, intervalMs, frameWidth, send, onResult, onError])
}
