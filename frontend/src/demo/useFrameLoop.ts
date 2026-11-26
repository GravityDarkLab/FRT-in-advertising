import { useEffect, type RefObject } from 'react'
import { ApiError } from '../api'
import { captureFrame } from './captureFrame'

/**
 * While mounted: capture a frame, send it, hand over the answer, wait `intervalMs`, repeat.
 *
 * The wait starts when the answer arrives, so a slow API is never queued up on.
 * Errors do not stop the loop; the next tick tries again. A request that has
 * not answered within `timeoutMs` is cancelled and reported as unreachable, so
 * a stalled connection cannot freeze the loop. Unmounting cancels the request
 * in flight and nothing is handed over afterwards.
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
    /** How long one request may take before it is given up on. */
    timeoutMs: number
    send: (frame: Blob, signal: AbortSignal) => Promise<T>
    onResult: (result: T) => void
    onError: (error: ApiError) => void
  },
): void {
  const { intervalMs, frameWidth, timeoutMs, send, onResult, onError } = options

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    let timer: ReturnType<typeof setTimeout> | undefined

    /** One request with its own deadline. The loop's lifetime signal still cancels it. */
    async function sendWithDeadline(frame: Blob): Promise<T> {
      const request = new AbortController()
      const cancel = () => request.abort()
      const deadline = setTimeout(
        () => request.abort(new DOMException('request timed out', 'TimeoutError')),
        timeoutMs,
      )
      signal.addEventListener('abort', cancel)
      try {
        // Raced against the signal as well, in case `send` ignores it.
        return await Promise.race([
          send(frame, request.signal),
          new Promise<never>((_, reject) =>
            request.signal.addEventListener('abort', () => reject(request.signal.reason)),
          ),
        ])
      } finally {
        clearTimeout(deadline)
        signal.removeEventListener('abort', cancel)
      }
    }

    async function tick() {
      try {
        const frame = videoRef.current ? await captureFrame(videoRef.current, frameWidth) : null
        if (signal.aborted) return
        if (frame) {
          const result = await sendWithDeadline(frame)
          if (signal.aborted) return
          onResult(result)
        }
      } catch (error) {
        if (signal.aborted) return
        const timedOut = error instanceof DOMException && error.name === 'TimeoutError'
        onError(error instanceof ApiError ? error : new ApiError(timedOut ? 'network' : 'server'))
      }
      timer = setTimeout(tick, intervalMs)
    }
    void tick()

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [videoRef, intervalMs, frameWidth, timeoutMs, send, onResult, onError])
}
