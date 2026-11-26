import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraStatus = 'idle' | 'starting' | 'live' | 'denied' | 'unavailable' | 'lost'

/** Owns the webcam: asks for it, hands out the stream, and always gives it back. */
export function useCamera() {
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [stream, setStream] = useState<MediaStream | null>(null)
  // Stops the tracks of the stream in hand and stops listening to them.
  const letGo = useRef<(() => void) | null>(null)
  // Bumped by stop and unmount, so a permission prompt answered late is recognised as stale.
  const attempt = useRef(0)

  const release = useCallback((next: CameraStatus) => {
    attempt.current += 1
    letGo.current?.()
    letGo.current = null
    setStream(null)
    setStatus(next)
  }, [])

  const stop = useCallback(() => release('idle'), [release])

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
      const tracks = granted.getTracks()
      if (thisAttempt !== attempt.current) {
        tracks.forEach((track) => track.stop())
        return
      }
      // A track ends on its own when the camera is unplugged or its permission
      // is withdrawn. Without this the page would stay "live" on a dead stream.
      const onEnded = () => release('lost')
      tracks.forEach((track) => track.addEventListener('ended', onEnded))
      letGo.current = () =>
        tracks.forEach((track) => {
          track.removeEventListener('ended', onEnded)
          track.stop()
        })
      setStream(granted)
      setStatus('live')
    } catch (error) {
      if (thisAttempt !== attempt.current) return
      const refused =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'SecurityError')
      setStatus(refused ? 'denied' : 'unavailable')
    }
  }, [release])

  useEffect(
    () => () => {
      attempt.current += 1
      letGo.current?.()
    },
    [],
  )

  return { status, stream, start, stop }
}
