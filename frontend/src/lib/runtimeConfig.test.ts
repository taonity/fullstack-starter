import { describe, expect, it } from 'vitest'

import { parseRuntimeConfig } from '@/lib/runtimeConfig'

describe('runtime configuration', () => {
  it('accepts the expected response', () => {
    expect(parseRuntimeConfig({
      csrfCookieName: 'XSRF-TOKEN',
      publicBackendUrl: 'https://api.example.com',
    })).toEqual({
      csrfCookieName: 'XSRF-TOKEN',
      publicBackendUrl: 'https://api.example.com',
    })
  })

  it('rejects missing values', () => {
    expect(() => parseRuntimeConfig({ csrfCookieName: '' }))
      .toThrow('Runtime configuration is missing csrfCookieName')
  })
})
