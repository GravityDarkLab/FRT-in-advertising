import { beforeEach, describe, expect, it, vi } from 'vitest'
import { captureFrame } from './captureFrame'

function videoOf(width: number, height: number): HTMLVideoElement {
  const video = document.createElement('video')
  Object.defineProperty(video, 'videoWidth', { value: width })
  Object.defineProperty(video, 'videoHeight', { value: height })
  return video
}

const drawImage = vi.fn()
const JPEG_BYTES = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]
const jpegDataUrl = `data:image/jpeg;base64,${btoa(String.fromCharCode(...JPEG_BYTES))}`
let canvases: HTMLCanvasElement[]

beforeEach(() => {
  canvases = []
  drawImage.mockClear()
  // jsdom has no canvas; record which canvas was drawn on and hand back a fake context.
  const getContext = function (this: HTMLCanvasElement) {
    canvases.push(this)
    return { drawImage }
  } as unknown as HTMLCanvasElement['getContext']
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(getContext)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(jpegDataUrl)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob')
})

describe('captureFrame', () => {
  it('skips a video that has not produced a frame yet', async () => {
    await expect(captureFrame(videoOf(0, 0))).resolves.toBeNull()
    expect(drawImage).not.toHaveBeenCalled()
  })

  it('shrinks a large frame to 640 pixels wide, keeping its shape', async () => {
    const video = videoOf(1280, 720)

    await captureFrame(video)

    expect(canvases[0]).toMatchObject({ width: 640, height: 360 })
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 360)
  })

  it('shrinks further when asked, for the quick look-ups that move the box', async () => {
    await captureFrame(videoOf(1280, 720), 320)

    expect(canvases[0]).toMatchObject({ width: 320, height: 180 })
  })

  it('does not enlarge a small frame', async () => {
    await captureFrame(videoOf(320, 240))

    expect(canvases[0]).toMatchObject({ width: 320, height: 240 })
  })

  it('returns the frame as a JPEG with exactly the encoded bytes', async () => {
    const frame = await captureFrame(videoOf(640, 480))

    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.85)
    expect(frame?.type).toBe('image/jpeg')
    expect([...new Uint8Array(await frame!.arrayBuffer())]).toEqual(JPEG_BYTES)
  })

  it('encodes at once, not when the browser next has an idle moment', async () => {
    // toBlob and OffscreenCanvas.convertToBlob both wait for the page to be
    // idle. Under a playing video that was measured at up to 950 ms, which
    // froze the face box about once every few seconds.
    await captureFrame(videoOf(640, 480))

    expect(HTMLCanvasElement.prototype.toBlob).not.toHaveBeenCalled()
  })

  it('reports no frame when the browser cannot encode a JPEG', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:,')

    await expect(captureFrame(videoOf(640, 480))).resolves.toBeNull()
  })

  it('reports no frame when the browser falls back to another format', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,iVBORw0KGgo=',
    )

    await expect(captureFrame(videoOf(640, 480))).resolves.toBeNull()
  })
})
