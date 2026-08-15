export interface ServerEnv {
  localBackendUrl: string
  publicBackendUrl: string
  csrfCookieName: string
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function absoluteUrl(name: string): string {
  const value = required(name)
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error()
    }
    return value.replace(/\/$/, '')
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) URL`)
  }
}

export function getServerEnv(): ServerEnv {
  return {
    localBackendUrl: absoluteUrl('LOCAL_BACKEND_URL'),
    publicBackendUrl: absoluteUrl('PUBLIC_BACKEND_URL'),
    csrfCookieName: required('CSRF_COOKIE_NAME'),
  }
}
