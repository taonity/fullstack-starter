import { afterEach, expect, it, vi } from 'vitest'
import { getAppIdentity } from './appIdentity'

afterEach(() => vi.unstubAllEnvs())

it('distinguishes stage from the production app at runtime', () => {
  vi.stubEnv('FRONTEND_PROFILE', 'stage')
  expect(getAppIdentity()).toEqual({ name: 'Fullstack Starter (Stage)', iconPrefix: '/icons/icon-stage', favicon: '/favicon-stage.ico' })
  vi.stubEnv('FRONTEND_PROFILE', 'prod')
  expect(getAppIdentity()).toEqual({ name: 'Fullstack Starter', iconPrefix: '/icons/icon', favicon: '/favicon.ico' })
})
