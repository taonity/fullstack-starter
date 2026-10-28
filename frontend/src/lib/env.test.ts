import { afterEach, describe, expect, it, vi } from 'vitest'

import { getServerEnv } from '@/lib/env'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('server environment', () => {
  it.each([
    ['local', 'http://127.0.0.1:8080', 'XSRF-TOKEN-LOCAL'],
    ['stage', 'https://fullstack-starter-api-stage.taonity.org', 'XSRF-TOKEN-FULLSTACK-STARTER-STAGE'],
    ['prod', 'https://fullstack-starter-api.taonity.org', 'XSRF-TOKEN-FULLSTACK-STARTER-PROD'],
  ])('returns the %s profile configuration', (profile, backendUrl, csrfCookieName) => {
    vi.stubEnv('FRONTEND_PROFILE', profile)

    expect(getServerEnv()).toEqual({
      profile,
      localBackendUrl: backendUrl,
      publicBackendUrl: backendUrl,
      csrfCookieName,
      backendRequestTimeoutMs: 60_000,
    })
  })

  it('rejects a missing profile', () => {
    vi.stubEnv('FRONTEND_PROFILE', '')

    expect(() => getServerEnv()).toThrow('Missing required environment variable: FRONTEND_PROFILE')
  })

  it('rejects an unknown profile', () => {
    vi.stubEnv('FRONTEND_PROFILE', 'qa')

    expect(() => getServerEnv()).toThrow('FRONTEND_PROFILE must be one of: local, stage, prod')
  })

  it('uses the backend URL supplied by the runtime topology', () => {
    vi.stubEnv('FRONTEND_PROFILE', 'local')
    vi.stubEnv('LOCAL_BACKEND_URL', 'http://backend:8080')

    expect(getServerEnv().localBackendUrl).toBe('http://backend:8080')
  })
  it('accepts a configured backend timeout', () => {
    vi.stubEnv('FRONTEND_PROFILE', 'local')
    vi.stubEnv('BACKEND_REQUEST_TIMEOUT_MS', '120000')
    expect(getServerEnv().backendRequestTimeoutMs).toBe(120000)
  })

  it.each(['0', '-1', 'abc', '1.5', '2147483648'])('rejects an invalid timeout: %s', (timeout) => {
    vi.stubEnv('FRONTEND_PROFILE', 'local')
    vi.stubEnv('BACKEND_REQUEST_TIMEOUT_MS', timeout)
    expect(() => getServerEnv()).toThrow('BACKEND_REQUEST_TIMEOUT_MS must be a positive integer')
  })

})
