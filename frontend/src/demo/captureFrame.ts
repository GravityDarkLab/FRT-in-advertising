const JPEG_PREFIX = 'data:image/jpeg;base64,'

/**
 * Grab the video's current frame as a JPEG no wider than `maxWidth`.
 * Resolves to null when there is no frame to grab yet, or it cannot be encoded.
 *
 * Encoding is synchronous on purpose. `canvas.toBlob` and
 * `OffscreenCanvas.convertToBlob` both wait for the page to be idle; under a
 * playing video about one capture in thirty waited close to a second (measured
 * maximum 953 ms), which froze the face box. `toDataURL` costs 5 to 12 ms on
 * the main thread and never stalls (measured maximum 12 ms at 640 px).
 */
export async function captureFrame(video: HTMLVideoElement, maxWidth = 640): Promise<Blob | null> {
  const { videoWidth, videoHeight } = video
  if (!videoWidth || !videoHeight) return null

  const scale = Math.min(1, maxWidth / videoWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(videoWidth * scale)
  canvas.height = Math.round(videoHeight * scale)
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(video, 0, 0, canvas.width, canvas.height)

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  if (!dataUrl.startsWith(JPEG_PREFIX)) return null
  const binary = atob(dataUrl.slice(JPEG_PREFIX.length))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: 'image/jpeg' })
}
