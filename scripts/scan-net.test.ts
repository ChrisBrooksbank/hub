import { describe, expect, it, vi } from 'vitest'
import { mapLimit, resolveNetlifyUrl, verifyUrl, type Fetch } from './scan-net.ts'

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  return vi.fn(impl)
}

describe('resolveNetlifyUrl', () => {
  it('returns ssl_url and sends the token as a bearer header', async () => {
    const fetchFn = mockFetch(async () => response(200, { ssl_url: 'https://a.netlify.app' }))
    expect(await resolveNetlifyUrl('id1', 'tok', fetchFn as unknown as Fetch)).toBe(
      'https://a.netlify.app',
    )
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/sites/id1')
    expect(init.headers).toEqual({ Authorization: 'Bearer tok' })
  })

  it('returns undefined on HTTP errors and network failures', async () => {
    const notFound = mockFetch(async () => response(404))
    expect(await resolveNetlifyUrl('x', 't', notFound as unknown as Fetch)).toBeUndefined()
    const boom = mockFetch(async () => {
      throw new Error('offline')
    })
    expect(await resolveNetlifyUrl('x', 't', boom as unknown as Fetch)).toBeUndefined()
  })
})

describe('verifyUrl', () => {
  it('is live on a 2xx HEAD', async () => {
    const fetchFn = mockFetch(async () => response(200))
    expect(await verifyUrl('https://a.test', fetchFn as unknown as Fetch)).toBe('live')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('falls back to GET when HEAD is rejected', async () => {
    const fetchFn = mockFetch(async (_url, init) => response(init?.method === 'HEAD' ? 405 : 200))
    expect(await verifyUrl('https://a.test', fetchFn as unknown as Fetch)).toBe('live')
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('is dead on non-2xx or network errors', async () => {
    const gone = mockFetch(async () => response(404))
    expect(await verifyUrl('https://a.test', gone as unknown as Fetch)).toBe('dead')
    const boom = mockFetch(async () => {
      throw new Error('dns')
    })
    expect(await verifyUrl('https://a.test', boom as unknown as Fetch)).toBe('dead')
  })
})

describe('mapLimit', () => {
  it('preserves order and bounds concurrency', async () => {
    let active = 0
    let peak = 0
    const out = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
      active++
      peak = Math.max(peak, active)
      await new Promise((r) => setTimeout(r, 5))
      active--
      return n * 2
    })
    expect(out).toEqual([2, 4, 6, 8, 10])
    expect(peak).toBeLessThanOrEqual(2)
  })
})
