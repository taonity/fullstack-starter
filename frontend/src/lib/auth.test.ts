import { afterEach, describe, expect, it, vi } from 'vitest'

import { checkBackendLiveness, fetchAuthenticatedUserStatus, safeLocalPath } from '@/lib/auth'
import { DEFAULT_NETWORK_ERROR_MESSAGE, DEFAULT_TIMEOUT_ERROR_MESSAGE } from '@/lib/clientApi'

vi.mock('@/lib/clientApi', () => ({
  DEFAULT_NETWORK_ERROR_MESSAGE: 'Unable to connect to the server. Please check your connection.',
  DEFAULT_TIMEOUT_ERROR_MESSAGE: 'Request timed out. Please try again.',
  fetchWithTimeout: vi.fn(),
}))

import { fetchWithTimeout } from '@/lib/clientApi'

const fetchWithTimeoutMock = vi.mocked(fetchWithTimeout)

afterEach(() => {
  vi.clearAllMocks()
})

describe('auth api', () => {
  it('preserves local login destinations and rejects external or malformed URLs', () => {
    expect(safeLocalPath('/?tab=config#settings')).toBe('/?tab=config#settings')
    for (const path of [null, 'https://example.test', '//example.test/path', '/\\example.test/path', '//[invalid']) {
      expect(safeLocalPath(path)).toBeNull()
    }
  })
  it('returns authenticated status when the access endpoint succeeds', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ email: 'user@example.com' }), { status: 200 }),
    )

    const result = await fetchAuthenticatedUserStatus()
    expect(result.status).toBe('authenticated')
  })

  it('returns timeout error for 504 response', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(new Response(null, { status: 504 }))

    await expect(fetchAuthenticatedUserStatus()).resolves.toEqual({
      status: 'error',
      message: DEFAULT_TIMEOUT_ERROR_MESSAGE,
    })
  })

  it('returns unauthenticated status for non-ok response', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(new Response(null, { status: 401 }))

    await expect(fetchAuthenticatedUserStatus()).resolves.toEqual({
      status: 'unauthenticated',
      httpStatus: 401,
    })
  })

  it('returns network error when request throws', async () => {
    fetchWithTimeoutMock.mockRejectedValueOnce(new Error('boom'))

    await expect(fetchAuthenticatedUserStatus()).resolves.toEqual({
      status: 'error',
      message: DEFAULT_NETWORK_ERROR_MESSAGE,
    })
  })

  it('returns liveness success when backend is up', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'UP' }), { status: 200 }),
    )

    await expect(checkBackendLiveness()).resolves.toEqual({ ok: true })
  })

  it('returns timeout error for 504 liveness response', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(new Response(null, { status: 504 }))

    await expect(checkBackendLiveness()).resolves.toEqual({
      ok: false,
      message: DEFAULT_TIMEOUT_ERROR_MESSAGE,
    })
  })

  it('returns error when backend is not up', async () => {
    fetchWithTimeoutMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'DOWN' }), { status: 200 }),
    )

    await expect(checkBackendLiveness()).resolves.toMatchObject({
      ok: false,
      message: 'Backend server is currently unavailable. Please try again later.',
    })
  })

  it('returns network error when liveness request throws', async () => {
    fetchWithTimeoutMock.mockRejectedValueOnce(new Error('boom'))

    await expect(checkBackendLiveness()).resolves.toEqual({
      ok: false,
      message: DEFAULT_NETWORK_ERROR_MESSAGE,
    })
  })

  it.each([
    ['an empty error', new Response(null, { status: 500 })],
    ['an HTML error', new Response('<html>Internal server error</html>', { status: 500 })],
    ['an edge rejection', new Response('<html>Forbidden</html>', { status: 403 })],
  ])('reports HTTP status for %s instead of blaming the connection', async (_label, response) => {
    fetchWithTimeoutMock.mockResolvedValueOnce(response)

    await expect(checkBackendLiveness()).resolves.toEqual({
      ok: false,
      message: `The sign-in check failed (HTTP ${response.status}). Please try again later.`,
      status: response.status,
    })
  })

  it.each(['<html>Unexpected page</html>', '', 'null'])('reports an unexpected successful response without a network error (%s)', async body => {
    fetchWithTimeoutMock.mockResolvedValueOnce(new Response(body, { status: 200 }))

    const result = await checkBackendLiveness()
    expect(result).toMatchObject({
      ok: false,
      status: 200,
    })
    expect(result.message).not.toBe(DEFAULT_NETWORK_ERROR_MESSAGE)
  })
})
