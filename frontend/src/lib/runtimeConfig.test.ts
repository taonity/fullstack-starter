import { describe, expect, it } from 'vitest'

import { parseRuntimeConfig } from '@/lib/runtimeConfig'

describe('runtime configuration', () => {
  it('accepts the expected response', () => {
    expect(parseRuntimeConfig({
      profile: 'stage',
      csrfCookieName: 'XSRF-TOKEN',
      publicBackendUrl: 'https://api.example.com',
    })).toEqual({
      profile: 'stage',
      csrfCookieName: 'XSRF-TOKEN',
      publicBackendUrl: 'https://api.example.com',
    })
  })

  it('rejects missing values', () => {
    expect(() => parseRuntimeConfig({ profile: 'local', csrfCookieName: '' }))
      .toThrow('Runtime configuration is missing csrfCookieName')
  })

  it('rejects an invalid profile', () => {
    expect(() => parseRuntimeConfig({ profile: 'qa' }))
      .toThrow('Runtime configuration has an invalid profile')
  })
})
