import { afterEach, describe, expect, it, vi } from 'vitest'

import { getServerEnv } from '@/lib/env'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('server environment', () => {
  it('returns validated configuration', () => {
    vi.stubEnv('LOCAL_BACKEND_URL', 'http://backend:8080/')
    vi.stubEnv('PUBLIC_BACKEND_URL', 'https://api.example.com/')
    vi.stubEnv('CSRF_COOKIE_NAME', 'XSRF-TOKEN')

    expect(getServerEnv()).toEqual({
      localBackendUrl: 'http://backend:8080',
      publicBackendUrl: 'https://api.example.com',
      csrfCookieName: 'XSRF-TOKEN',
    })
  })

  it('rejects a missing required value', () => {
    vi.stubEnv('LOCAL_BACKEND_URL', '')
    vi.stubEnv('PUBLIC_BACKEND_URL', 'https://api.example.com')
    vi.stubEnv('CSRF_COOKIE_NAME', 'XSRF-TOKEN')

    expect(() => getServerEnv()).toThrow('Missing required environment variable: LOCAL_BACKEND_URL')
  })

  it('rejects a non-HTTP backend URL', () => {
    vi.stubEnv('LOCAL_BACKEND_URL', 'backend:8080')
    vi.stubEnv('PUBLIC_BACKEND_URL', 'https://api.example.com')
    vi.stubEnv('CSRF_COOKIE_NAME', 'XSRF-TOKEN')

    expect(() => getServerEnv()).toThrow('LOCAL_BACKEND_URL must be an absolute HTTP(S) URL')
  })
})
