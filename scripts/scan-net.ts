export type Fetch = typeof fetch

const TIMEOUT_MS = 15_000

/** Resolve a Netlify site id to its primary URL via the Netlify API. Undefined on any failure. */
export async function resolveNetlifyUrl(
  siteId: string,
  token: string,
  fetchFn: Fetch = fetch,
): Promise<string | undefined> {
  try {
    const res = await fetchFn(
      `https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    )
    if (!res.ok) return undefined
    const body = (await res.json()) as { ssl_url?: string; url?: string }
    return body.ssl_url ?? body.url
  } catch {
    return undefined
  }
}

async function isOk(url: string, method: 'HEAD' | 'GET', fetchFn: Fetch): Promise<boolean> {
  try {
    const res = await fetchFn(url, {
      method,
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    await res.body?.cancel()
    return res.ok
  } catch {
    return false
  }
}

/** HEAD first, then GET for servers that reject HEAD. Live means a 2xx after redirects. */
export async function verifyUrl(url: string, fetchFn: Fetch = fetch): Promise<'live' | 'dead'> {
  if (await isOk(url, 'HEAD', fetchFn)) return 'live'
  return (await isOk(url, 'GET', fetchFn)) ? 'live' : 'dead'
}

/** Map over items with bounded concurrency, preserving order. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i] as T)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
