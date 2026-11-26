import { describe, expect, it, vi } from 'vitest'
import { analyze, ApiError, detect, type AnalyzeResponse } from './api'

const frame = new Blob(['jpeg bytes'], { type: 'image/jpeg' })
const noFace: AnalyzeResponse = {
  image: { width: 640, height: 480 },
  faces: [],
  ad_set: null,
  mood: null,
  ads: [],
}

function respondWith(status: number, body: unknown = noFace) {
  const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
    Response.json(body, { status }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('analyze', () => {
  it('posts the frame as the raw body with its own content type', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example/')
    const fetchMock = respondWith(200)

    await expect(analyze(frame)).resolves.toEqual(noFace)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.example/analyze')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(frame)
    expect(new Headers(init.headers).get('Content-Type')).toBe('image/jpeg')
  })

  it('calls /api on its own origin when no address is configured', async () => {
    // The dev server proxies /api to the local API; in production CloudFront routes it.
    vi.stubEnv('VITE_API_URL', '')
    const fetchMock = respondWith(200)

    await analyze(frame)

    expect(fetchMock.mock.calls[0]![0]).toBe('/api/analyze')
  })

  it.each([413, 415, 422])('reports %i as the frame being rejected', async (status) => {
    respondWith(status, { detail: 'nope' })

    const error = await analyze(frame).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'rejected', status })
  })

  it('reports a 500 as a server fault', async () => {
    respondWith(500, { detail: 'analysis failed' })

    await expect(analyze(frame)).rejects.toMatchObject({ kind: 'server', status: 500 })
  })

  it('reports an unreachable API as a network fault', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await analyze(frame).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'network' })
  })

  it('reports a success that is not JSON as a server fault', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>proxy page</html>')))

    await expect(analyze(frame)).rejects.toMatchObject({ kind: 'server' })
  })

  it('lets a cancellation through unchanged', async () => {
    const controller = new AbortController()
    const abortError = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        controller.abort()
        throw abortError
      }),
    )

    await expect(analyze(frame, controller.signal)).rejects.toBe(abortError)
  })
})

describe('detect', () => {
  const found = {
    image: { width: 320, height: 240 },
    faces: [{ box: { x: 1, y: 2, width: 3, height: 4 }, score: 0.9 }],
  }

  it('posts the frame to the fast detection endpoint', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example')
    const fetchMock = respondWith(200, found)

    await expect(detect(frame)).resolves.toEqual(found)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.example/detect')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(frame)
  })

  it('reports failures the same way analyze does', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(detect(frame)).rejects.toMatchObject({ kind: 'network' })
  })
})
