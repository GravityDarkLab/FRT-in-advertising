import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraStatus = 'idle' | 'starting' | 'live' | 'denied' | 'unavailable'

function release(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

/** Owns the webcam: asks for it, hands out the stream, and always gives it back. */
export function useCamera() {
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const held = useRef<MediaStream | null>(null)
  // Bumped by stop and unmount, so a permission prompt answered late is recognised as stale.
  const attempt = useRef(0)

  const stop = useCallback(() => {
    attempt.current += 1
    release(held.current)
    held.current = null
    setStream(null)
    setStatus('idle')
  }, [])

  const start = useCallback(async () => {
    const thisAttempt = ++attempt.current
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable')
      return
    }
    setStatus('starting')
    try {
      const granted = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      if (thisAttempt !== attempt.current) {
        release(granted)
        return
      }
      held.current = granted
      setStream(granted)
      setStatus('live')
    } catch (error) {
      if (thisAttempt !== attempt.current) return
      const refused =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'SecurityError')
      setStatus(refused ? 'denied' : 'unavailable')
    }
  }, [])

  useEffect(
    () => () => {
      attempt.current += 1
      release(held.current)
    },
    [],
  )

  return { status, stream, start, stop }
}
