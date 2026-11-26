import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  analyze,
  ApiError,
  detect,
  type Ad,
  type AnalyzeResponse,
  type Box,
  type DetectResponse,
  type Face,
  type Mood,
} from '../api'
import { captureFrame } from '../demo/captureFrame'
import { renderAt } from '../test/render'
import { Demo } from './Demo'

vi.mock('../demo/captureFrame')
vi.mock('../api', async (original) => ({
  ...(await original<typeof import('../api')>()),
  analyze: vi.fn(),
  detect: vi.fn(),
}))

const beer: Ad = { id: 'beer', label: 'Cold one after work?' }
const wine: Ad = { id: 'wine', label: 'Enter the weekend with style' }
const car: Ad = { id: 'car', label: 'Freedom to go wherever you please, whenever:' }
const toys: Ad = { id: 'toys', label: 'Never get bored again' }

const face: Face = {
  box: { x: 64, y: 48, width: 128, height: 96 },
  score: 0.93,
  attributes: {
    age: { estimate: 31.2, bracket: { min: 30, max: 39 }, confidence: 0.7 },
    gender: { label: 'female', confidence: 0.98 },
    race: { label: 'East Asian', confidence: 0.81 },
    emotion: { label: 'happiness', confidence: 0.55 },
    mood: { label: 'up', confidence: 0.86 },
  },
}
/** A response whose face reads as `looks` (the mood on the face; `mood` is the one targeted). */
const seen = (
  ad_set: string,
  ads: Ad[],
  mood: Mood | null = null,
  looks = 'up',
): AnalyzeResponse => ({
  image: { width: 640, height: 480 },
  faces: [
    { ...face, attributes: { ...face.attributes!, mood: { label: looks, confidence: 0.86 } } },
  ],
  ad_set,
  mood,
  ads,
})
const nobody: AnalyzeResponse = {
  image: { width: 640, height: 480 },
  faces: [],
  ad_set: null,
  mood: null,
  ads: [],
}

/** What the fast tracking endpoint answers: where the faces are right now. */
const tracked = (...boxes: Box[]): DetectResponse => ({
  image: { width: 640, height: 480 },
  faces: boxes.map((box) => ({ box, score: 0.9 })),
})
const movedTo: Box = { x: 320, y: 240, width: 64, height: 48 }

const track = { stop: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }
/** The handler the page registered for the camera track ending on its own. */
const trackEnded = () =>
  track.addEventListener.mock.calls.find(([type]) => type === 'ended')![1] as () => void
const stream = { getTracks: () => [track] } as unknown as MediaStream
const getUserMedia = vi.fn()

function cameraError(name: string) {
  return new DOMException(name, name)
}

beforeEach(() => {
  track.stop.mockClear()
  track.addEventListener.mockClear()
  track.removeEventListener.mockClear()
  getUserMedia.mockReset().mockResolvedValue(stream)
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.mocked(captureFrame).mockResolvedValue(new Blob(['frame'], { type: 'image/jpeg' }))
  vi.mocked(analyze).mockResolvedValue(seen('26-40', [beer, wine]))
  vi.mocked(detect).mockResolvedValue(tracked(face.box))
})

const start = () => userEvent.click(screen.getByRole('button', { name: 'Start camera' }))
const renderDemo = (requestTimeoutMs?: number) =>
  renderAt('/demo', <Demo intervalMs={5} trackIntervalMs={5} requestTimeoutMs={requestTimeoutMs} />)
/** Waits until the model's reading of the face is on screen. */
async function reading() {
  await screen.findByText('about 31')
  return screen.getByRole('region', { name: /what the model reads/i })
}
const adPictures = () =>
  within(screen.getByRole('region', { name: /what you would be shown/i }))
    .getAllByRole('figure')
    .map((ad) => within(ad).getByRole('img').getAttribute('alt'))

describe('demo', () => {
  it('does nothing with the camera until asked, and says what will happen to the frames', () => {
    renderDemo()

    expect(screen.getByRole('button', { name: 'Start camera' })).toBeInTheDocument()
    expect(screen.getByText(/analysed in memory and discarded/i)).toBeInTheDocument()
    expect(getUserMedia).not.toHaveBeenCalled()
    expect(analyze).not.toHaveBeenCalled()
  })

  it('shows what the model read, where the face is, and the ads that follow', async () => {
    renderDemo()
    await start()

    const panel = await reading()
    expect(panel).toHaveTextContent('female')
    expect(panel).toHaveTextContent('East Asian')
    expect(panel).toHaveTextContent('happy')
    expect(panel).toHaveTextContent('86%')
    expect(adPictures()).toEqual(['A pint of beer', 'A glass of red wine'])
    expect(screen.getByText('Cold one after work?')).toBeInTheDocument()
    expect(screen.getByTestId('face-box')).toHaveStyle({
      left: '10%',
      top: '10%',
      width: '20%',
      height: '20%',
    })
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'user' }, audio: false })
  })

  it('keeps keyboard focus on the control that replaces the one just pressed', async () => {
    renderDemo()
    await start()

    const stop = await screen.findByRole('button', { name: 'Stop camera' })
    expect(stop).toHaveFocus()

    await userEvent.click(stop)

    expect(screen.getByRole('button', { name: 'Start camera' })).toHaveFocus()
  })

  it('does not grab focus when the page first opens', () => {
    renderDemo()

    expect(screen.getByRole('button', { name: 'Start camera' })).not.toHaveFocus()
  })

  it('names the video for people who cannot see it', async () => {
    renderDemo()
    await start()

    expect(await screen.findByLabelText('Your camera')).toBeInstanceOf(HTMLVideoElement)
  })

  it('explains a refused camera and lets the visitor try again', async () => {
    getUserMedia.mockRejectedValueOnce(cameraError('NotAllowedError'))
    renderDemo()
    await start()

    expect(await screen.findByRole('alert')).toHaveTextContent(/camera access was refused/i)
    expect(analyze).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await reading()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('says so when there is no camera', async () => {
    getUserMedia.mockRejectedValueOnce(cameraError('NotFoundError'))
    renderDemo()
    await start()

    expect(await screen.findByRole('alert')).toHaveTextContent(/no camera was found/i)
  })

  it('says so when the browser offers no camera access at all', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    renderDemo()
    await start()

    expect(await screen.findByRole('alert')).toHaveTextContent(/no camera was found/i)
  })

  it('reports an unreachable analysis service, keeps trying, and recovers', async () => {
    vi.mocked(analyze).mockRejectedValueOnce(new ApiError('network'))
    renderDemo()
    await start()

    expect(await screen.findByRole('alert')).toHaveTextContent(/can't reach the analysis service/i)

    await reading()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('says when no face is in view, and leaves the last ads up', async () => {
    vi.mocked(analyze)
      .mockResolvedValueOnce(seen('26-40', [beer, wine]))
      .mockResolvedValue(nobody)
    vi.mocked(detect).mockResolvedValue(tracked())
    renderDemo()
    await start()

    expect(await screen.findByText(/no face in view/i)).toBeInTheDocument()
    expect(screen.queryByTestId('face-box')).toBeNull()
    expect(adPictures()).toEqual(['A pint of beer', 'A glass of red wine'])
  })

  it('holds the ads steady while the visitor stays in the same ad set', async () => {
    vi.mocked(analyze)
      .mockResolvedValueOnce(seen('26-40', [beer, wine]))
      .mockResolvedValue(seen('26-40', [car, beer]))
    renderDemo()
    await start()

    await waitFor(() => expect(vi.mocked(analyze).mock.calls.length).toBeGreaterThanOrEqual(3))
    expect(adPictures()).toEqual(['A pint of beer', 'A glass of red wine'])
  })

  it('swaps the ads when the visitor is read into another ad set', async () => {
    vi.mocked(analyze)
      .mockResolvedValueOnce(seen('26-40', [beer, wine]))
      .mockResolvedValue(seen('0-10', [toys, car]))
    renderDemo()
    await start()

    await waitFor(() => expect(adPictures()).toEqual(['A teddy bear', 'A red car']))
  })

  it('swaps the ads and says why when the mood it reads changes', async () => {
    vi.mocked(analyze)
      .mockResolvedValueOnce(seen('26-40', [beer, wine], 'up'))
      .mockResolvedValue(seen('26-40', [car, toys], 'low'))
    renderDemo()
    await start()

    expect(
      await screen.findByText('Chosen for someone aged 26–40 who looks sad or worried.'),
    ).toBeInTheDocument()
    expect(adPictures()).toEqual(['A red car', 'A teddy bear'])
  })

  it('rides out a single frame that reads differently', async () => {
    vi.mocked(analyze)
      .mockResolvedValueOnce(seen('26-40', [beer, wine], 'up', 'up'))
      .mockResolvedValueOnce(seen('26-40', [car, toys], 'low', 'low'))
      .mockResolvedValue(seen('26-40', [toys, car], 'up', 'up'))
    renderDemo()
    await start()
    await waitFor(() => expect(vi.mocked(analyze).mock.calls.length).toBeGreaterThanOrEqual(4))

    expect(await reading()).toHaveTextContent('happy')
    expect(adPictures()).toEqual(['A pint of beer', 'A glass of red wine'])
    expect(screen.queryByText(/sad or worried/)).toBeNull()
  })

  it('moves the box with the face between analyses', async () => {
    vi.mocked(detect).mockResolvedValue(tracked(movedTo))
    renderDemo()
    await start()
    await reading()

    await waitFor(() =>
      expect(screen.getByTestId('face-box')).toHaveStyle({
        left: '50%',
        top: '50%',
        width: '10%',
        height: '10%',
      }),
    )
  })

  it('tracks on small frames, to keep each request cheap', async () => {
    renderDemo()
    await start()
    await reading()

    await waitFor(() => expect(detect).toHaveBeenCalled())
    expect(vi.mocked(captureFrame).mock.calls.some(([, maxWidth]) => maxWidth === 320)).toBe(true)
  })

  it('takes the box away as soon as the face leaves, without waiting for the next analysis', async () => {
    vi.mocked(detect).mockResolvedValueOnce(tracked(face.box)).mockResolvedValue(tracked())
    renderDemo()
    await start()
    await reading()

    await waitFor(() => expect(screen.queryByTestId('face-box')).toBeNull())
  })

  it('falls back to the analysed position when tracking is unavailable, without complaint', async () => {
    vi.mocked(detect).mockRejectedValue(new ApiError('network'))
    renderDemo()
    await start()
    await reading()

    expect(screen.getByTestId('face-box')).toHaveStyle({ left: '10%', top: '10%' })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('stops tracking when the camera stops', async () => {
    renderDemo()
    await start()
    await waitFor(() => expect(detect).toHaveBeenCalled())

    await userEvent.click(screen.getByRole('button', { name: 'Stop camera' }))
    const calls = vi.mocked(detect).mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(vi.mocked(detect).mock.calls.length).toBe(calls)
  })

  it('leaves the live view when the camera is unplugged or its permission withdrawn', async () => {
    renderDemo()
    await start()
    await reading()

    act(() => trackEnded()())

    expect(await screen.findByRole('alert')).toHaveTextContent(/the camera stopped/i)
    expect(track.stop).toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: /what the model reads/i })).toBeNull()
    const calls = vi.mocked(analyze).mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(vi.mocked(analyze).mock.calls.length).toBe(calls)

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await reading()
  })

  it('stops listening to the camera track once the camera is stopped', async () => {
    renderDemo()
    await start()
    await reading()
    const handler = trackEnded()

    await userEvent.click(screen.getByRole('button', { name: 'Stop camera' }))

    expect(track.removeEventListener).toHaveBeenCalledWith('ended', handler)
  })

  it('gives up on an analysis that never answers, says so, and tries again', async () => {
    vi.mocked(analyze)
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValue(seen('26-40', [beer, wine]))
    renderDemo(30)
    await start()

    expect(await screen.findByRole('alert')).toHaveTextContent(/can't reach the analysis service/i)
    expect(vi.mocked(analyze).mock.calls[0]![1]!.aborted).toBe(true)

    await reading()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('gives up on a tracking request that never answers and carries on tracking', async () => {
    vi.mocked(detect)
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValue(tracked(movedTo))
    renderDemo(30)
    await start()
    await reading()

    await waitFor(() => expect(screen.getByTestId('face-box')).toHaveStyle({ left: '50%' }))
    expect(vi.mocked(detect).mock.calls[0]![1]!.aborted).toBe(true)
  })

  it('says who the ads were chosen for', async () => {
    renderDemo()
    await start()

    expect(await screen.findByText('Chosen for someone aged 26–40.')).toBeInTheDocument()
  })

  it('skips a tick when the video has no frame yet, then carries on', async () => {
    vi.mocked(captureFrame).mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    renderDemo()
    await start()

    await reading()
    expect(vi.mocked(captureFrame).mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(vi.mocked(analyze).mock.calls.length).toBeLessThan(
      vi.mocked(captureFrame).mock.calls.length - 1,
    )
  })

  it('releases the camera on stop and ignores an answer that arrives afterwards', async () => {
    let answer!: (response: AnalyzeResponse) => void
    vi.mocked(analyze).mockReturnValue(new Promise((resolve) => (answer = resolve)))
    renderDemo()
    await start()
    await waitFor(() => expect(analyze).toHaveBeenCalledTimes(1))

    await userEvent.click(screen.getByRole('button', { name: 'Stop camera' }))

    expect(track.stop).toHaveBeenCalledTimes(1)
    expect(vi.mocked(analyze).mock.calls[0]![1]!.aborted).toBe(true)
    await act(async () => answer(seen('26-40', [beer, wine])))
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(screen.queryByText('about 31')).toBeNull()
    expect(analyze).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Start camera' })).toBeInTheDocument()
  })

  it('releases the camera when the visitor leaves the page', async () => {
    const { unmount } = renderDemo()
    await start()
    await reading()

    unmount()

    expect(track.stop).toHaveBeenCalledTimes(1)
    const calls = vi.mocked(analyze).mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(vi.mocked(analyze).mock.calls.length).toBe(calls)
  })

  it('releases a camera that is only granted after the visitor has left', async () => {
    let grant!: (stream: MediaStream) => void
    getUserMedia.mockReturnValue(new Promise((resolve) => (grant = resolve)))
    const { unmount } = renderDemo()
    await start()

    unmount()
    await act(async () => grant(stream))

    expect(track.stop).toHaveBeenCalledTimes(1)
    expect(analyze).not.toHaveBeenCalled()
  })
})
