import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { fetchFromBackend } from './backend'
import { getServerEnv } from './env'
import { GET as getLiveness } from '@/app/api/actuator/health/liveness/route'

vi.mock('./env', () => ({ getServerEnv: vi.fn() }))

const request = new NextRequest('http://frontend.test/api/console/audit-logs')

beforeEach(() => {
  vi.mocked(getServerEnv).mockReturnValue({
    profile: 'stage',
    localBackendUrl: 'http://backend:8080',
    publicBackendUrl: 'https://api.example.com',
    csrfCookieName: 'XSRF-TOKEN',
    backendRequestTimeoutMs: 60_000,
  })
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('backend proxy logging', () => {
  it('keeps session cookies and CSRF headers on authenticated backend calls', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetch)
    const authenticated = new NextRequest('http://frontend.test/api/console/config', {
      headers: { cookie: 'session=existing-user' },
    })

    await fetchFromBackend(authenticated, '/console/config', {
      method: 'PUT', headers: { 'X-XSRF-TOKEN': 'csrf-token' },
    })

    const headers = fetch.mock.calls[0]![1].headers as Headers
    expect(headers.get('cookie')).toBe('session=existing-user')
    expect(headers.get('X-XSRF-TOKEN')).toBe('csrf-token')
  })

  it('checks public liveness independently of a broken browser session', async () => {
    const fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const hasSession = new Headers(init.headers).has('cookie')
      return Promise.resolve(hasSession
        ? new Response('Session could not be loaded', { status: 500 })
        : Response.json({ status: 'UP' }))
    })
    vi.stubGlobal('fetch', fetch)
    const staleSession = new NextRequest('http://frontend.test/api/actuator/health/liveness', {
      headers: { cookie: 'session=broken-user' },
    })

    const response = await getLiveness(staleSession)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'UP' })
    expect(fetch).toHaveBeenCalledWith('http://backend:8080/actuator/health/liveness',
      expect.objectContaining({ credentials: 'omit', cache: 'no-store' }))
  })

  it('logs backend server errors without logging query parameters', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))

    await fetchFromBackend(request, '/console/audit-logs?q=private-search')

    expect(console.error).toHaveBeenCalledWith('[backend-proxy] GET /console/audit-logs returned 500')
  })

  it('logs connection failures and rethrows them', async () => {
    const failure = new Error('connection refused')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure))

    await expect(fetchFromBackend(request, '/console/audit-logs')).rejects.toBe(failure)
    expect(console.error).toHaveBeenCalledWith('[backend-proxy] GET /console/audit-logs failed', failure)
  })

  it('logs timeouts and returns a gateway timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })))

    const responsePromise = fetchFromBackend(request, '/console/audit-logs', {}, 25)
    await vi.advanceTimersByTimeAsync(25)
    const response = await responsePromise

    expect(response.status).toBe(504)
    expect(console.error).toHaveBeenCalledWith(
      '[backend-proxy] GET /console/audit-logs timed out after 25ms',
      expect.objectContaining({ name: 'AbortError' }),
    )
  })
})
