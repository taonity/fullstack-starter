export const FRONTEND_PROFILES = ['local', 'stage', 'prod'] as const

export type FrontendProfile = (typeof FRONTEND_PROFILES)[number]

interface FrontendProfileConfig {
  localBackendUrl: string
  publicBackendUrl: string
  csrfCookieName: string
}

export const FRONTEND_PROFILE_CONFIG: Record<FrontendProfile, FrontendProfileConfig> = {
  local: {
    localBackendUrl: 'http://127.0.0.1:8080',
    publicBackendUrl: 'http://127.0.0.1:8080',
    csrfCookieName: 'XSRF-TOKEN-LOCAL',
  },
  stage: {
    localBackendUrl: 'https://fullstack-starter-api-stage.taonity.org',
    publicBackendUrl: 'https://fullstack-starter-api-stage.taonity.org',
    csrfCookieName: 'XSRF-TOKEN-FULLSTACK-STARTER-STAGE',
  },
  prod: {
    localBackendUrl: 'https://fullstack-starter-api.taonity.org',
    publicBackendUrl: 'https://fullstack-starter-api.taonity.org',
    csrfCookieName: 'XSRF-TOKEN-FULLSTACK-STARTER-PROD',
  },
}

export function isFrontendProfile(value: string): value is FrontendProfile {
  return FRONTEND_PROFILES.some((profile) => profile === value)
}