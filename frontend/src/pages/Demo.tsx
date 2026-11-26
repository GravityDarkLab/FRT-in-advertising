import { Alert, Button, Container, Group, Stack, Text, Title } from '@mantine/core'
import { useEffect, useRef } from 'react'
import { AdCard } from '../demo/AdCard'
import { targetingReason } from '../demo/ads'
import { boxToPercent } from '../demo/geometry'
import { steadyMood } from '../demo/mood'
import { Readout } from '../demo/Readout'
import { useAnalysisLoop } from '../demo/useAnalysisLoop'
import { useCamera } from '../demo/useCamera'
import { useFaceTracking } from '../demo/useFaceTracking'
import demo from './Demo.module.css'
import classes from './pages.module.css'

/** The camera is on: show the video, the model's reading, and the ads. */
function Live({
  stream,
  intervalMs,
  trackIntervalMs,
  requestTimeoutMs,
  onStop,
}: {
  stream: MediaStream
  intervalMs: number
  trackIntervalMs: number
  requestTimeoutMs: number
  onStop: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stopRef = useRef<HTMLButtonElement>(null)
  const { result, moods, shown, error } = useAnalysisLoop(videoRef, intervalMs, requestTimeoutMs)
  const tracked = useFaceTracking(videoRef, trackIntervalMs, requestTimeoutMs)

  // The Start button the visitor pressed is gone; give its focus to its replacement.
  useEffect(() => stopRef.current?.focus(), [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    // Rejected only if the stream ends first, which stop() handles.
    video.play()?.catch(() => {})
  }, [stream])

  const attributes = result?.faces[0]?.attributes
  const mood = steadyMood(moods)
  // The box follows the fast tracker; the slower analysis is the fallback.
  const located = tracked ?? result

  return (
    <div className={demo.live}>
      <Stack gap="sm">
        <div className={demo.stage}>
          <video ref={videoRef} className={demo.video} aria-label="Your camera" muted playsInline />
          {located?.faces.map((face, index) => (
            <div
              key={index}
              data-testid={index === 0 ? 'face-box' : 'other-face-box'}
              className={index === 0 ? demo.box : demo.otherBox}
              style={boxToPercent(face.box, located.image)}
            />
          ))}
        </div>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            The box follows your face; the reading is refreshed about once a second.
          </Text>
          <Button ref={stopRef} variant="default" onClick={onStop}>
            Stop camera
          </Button>
        </Group>
      </Stack>

      <Stack gap="xl">
        {error && (
          <Alert color="red" title="Can't reach the analysis service" role="alert">
            The page will keep trying. If you are running this yourself, check that the API is up.
          </Alert>
        )}

        <section aria-labelledby="reading-title">
          <Title order={2} id="reading-title" className={demo.panelTitle}>
            What the model reads
          </Title>
          {attributes ? (
            <Readout attributes={mood ? { ...attributes, mood } : attributes} />
          ) : (
            <Text role="status" c="dimmed">
              {result ? 'No face in view. Look towards the camera.' : 'Looking for a face…'}
            </Text>
          )}
        </section>

        <section aria-labelledby="ads-title">
          <Title order={2} id="ads-title" className={demo.panelTitle}>
            What you would be shown
          </Title>
          {shown.adSet && (
            <Text size="sm" c="dimmed" mb="md">
              {targetingReason(shown.adSet, shown.mood)}
            </Text>
          )}
          {shown.ads.length > 0 ? (
            <div className={demo.ads}>
              {shown.ads.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
          ) : (
            <Text c="dimmed">Ads appear once the model has read a face.</Text>
          )}
        </section>
      </Stack>
    </div>
  )
}

const problems = {
  denied: {
    title: 'Camera access was refused',
    text: "Allow the camera for this site in your browser's address bar, then try again.",
  },
  unavailable: {
    title: 'No camera was found',
    text: 'Connect a camera and try again. Browsers only offer the camera to pages served over HTTPS or from localhost.',
  },
  lost: {
    title: 'The camera stopped',
    text: 'It was disconnected, or its permission was withdrawn. Start it again to carry on.',
  },
}

export function Demo({
  intervalMs = 1000,
  trackIntervalMs = 100,
  requestTimeoutMs = 10_000,
}: {
  /** Pause between full analyses. */
  intervalMs?: number
  /** Pause between the quick look-ups that move the box. */
  trackIntervalMs?: number
  /** How long one request may take before the page gives up on it and tries again. */
  requestTimeoutMs?: number
}) {
  const camera = useCamera()
  const startRef = useRef<HTMLButtonElement>(null)
  const wasLive = useRef(false)

  // Coming back from the live view, hand focus to Start. Not on first load.
  useEffect(() => {
    if (camera.stream) wasLive.current = true
    else if (wasLive.current) {
      wasLive.current = false
      startRef.current?.focus()
    }
  }, [camera.stream])
  const problem =
    camera.status === 'denied' || camera.status === 'unavailable' || camera.status === 'lost'
      ? problems[camera.status]
      : null

  return (
    <Container size="lg" className={classes.page}>
      <Stack gap="xl">
        <Title order={1} className={classes.title}>
          Live demo
        </Title>

        {camera.stream ? (
          <Live
            stream={camera.stream}
            intervalMs={intervalMs}
            trackIntervalMs={trackIntervalMs}
            requestTimeoutMs={requestTimeoutMs}
            onStop={camera.stop}
          />
        ) : (
          <Stack gap="lg" align="flex-start">
            <Text className={classes.lead}>
              Start your camera and a model will guess your age, gender, race and emotion about once
              a second. Beside the guess you will see the ads an advertiser would pick for it.
            </Text>
            <Text className={classes.prose}>
              Each frame is sent to the analysis service, analysed in memory and discarded. Nothing
              is saved, on your device or on the server.
            </Text>
            {problem && (
              <Alert color="red" title={problem.title} role="alert" maw="38rem">
                {problem.text}
              </Alert>
            )}
            <Button
              ref={startRef}
              size="lg"
              onClick={camera.start}
              loading={camera.status === 'starting'}
            >
              {problem ? 'Try again' : 'Start camera'}
            </Button>
          </Stack>
        )}
      </Stack>
    </Container>
  )
}
