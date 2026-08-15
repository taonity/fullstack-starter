export interface RuntimeConfig {
  csrfCookieName: string
  publicBackendUrl: string
}

let configCache: RuntimeConfig | null = null

export function parseRuntimeConfig(value: unknown): RuntimeConfig {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid runtime configuration response')
  }
  const config = value as Record<string, unknown>
  if (typeof config.csrfCookieName !== 'string' || !config.csrfCookieName) {
    throw new Error('Runtime configuration is missing csrfCookieName')
  }
  if (typeof config.publicBackendUrl !== 'string' || !config.publicBackendUrl) {
    throw new Error('Runtime configuration is missing publicBackendUrl')
  }
  return {
    csrfCookieName: config.csrfCookieName,
    publicBackendUrl: config.publicBackendUrl,
  }
}

export async function getRuntimeConfig() {
  if (configCache) {
    return configCache
  }
  const response = await fetch('/api/config', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to load runtime configuration (${response.status})`)
  }
  configCache = parseRuntimeConfig(await response.json())
  return configCache
}
