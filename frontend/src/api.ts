// Types mirror backend/src/frt_api/schemas.py. Keep the two in step.

export type Box = { x: number; y: number; width: number; height: number }
export type ImageSize = { width: number; height: number }
export type Label = { label: string; confidence: number }
export type Age = {
  estimate: number
  bracket: { min: number; max: number | null }
  confidence: number
}
export type Attributes = {
  age: Age
  gender: Label
  race: Label
  /** The single most likely emotion, with the model's own raw score. */
  emotion: Label
  /** Emotions pooled into up / low / tense / neutral; the confidence is calibrated. */
  mood: Label
}
export type Face = { box: Box; score: number; attributes: Attributes | null }
export type Ad = { id: string; label: string }
/** What an advertiser does with an emotion: comfort (low), soothe (tense), celebrate (up). */
export type Mood = 'low' | 'tense' | 'up'
export type DetectResponse = {
  image: ImageSize
  /** Largest first. */
  faces: { box: Box; score: number }[]
}
export type AnalyzeResponse = {
  image: ImageSize
  /** Largest first. Only the first has attributes. */
  faces: Face[]
  /** The age band the ads were chosen for, e.g. "26-40" or "41+". */
  ad_set: string | null
  /** The mood they were pitched at, or null when mood played no part. */
  mood: Mood | null
  ads: Ad[]
}

/**
 * Why a request failed, in terms the page can act on:
 * `network` the API could not be reached, `rejected` it refused this frame,
 * `server` it broke while answering.
 */
export class ApiError extends Error {
  readonly kind: 'network' | 'rejected' | 'server'
  readonly status?: number

  constructor(kind: ApiError['kind'], status?: number) {
    super(status ? `${kind} (${status})` : kind)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

/**
 * Where the API is. By default `/api` on the site's own origin: the dev server
 * proxies that to the local API, and in production CloudFront routes it.
 * Set VITE_API_URL at build time only if the API lives on another origin.
 */
function apiUrl(): string {
  return (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
}

/** POST one frame as the raw body. Aborting `signal` rejects with the abort error, not an ApiError. */
async function send<T>(path: string, image: Blob, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': image.type },
      body: image,
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('network')
  }
  if (!response.ok) {
    throw new ApiError(response.status >= 500 ? 'server' : 'rejected', response.status)
  }
  try {
    return (await response.json()) as T
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('server', response.status)
  }
}

/** Full analysis of one frame: faces, what the models read off the largest, and the ads. */
export function analyze(image: Blob, signal?: AbortSignal): Promise<AnalyzeResponse> {
  return send('/analyze', image, signal)
}

/** Only where the faces are. Some twenty times cheaper than `analyze`; used to follow a moving face. */
export function detect(image: Blob, signal?: AbortSignal): Promise<DetectResponse> {
  return send('/detect', image, signal)
}
