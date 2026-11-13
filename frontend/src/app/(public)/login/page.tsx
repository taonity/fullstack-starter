'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { checkBackendLiveness, POST_LOGIN_PATH_KEY, safeLocalPath } from '@/lib/auth'
import { getRuntimeConfig } from '@/lib/runtimeConfig'
import { getCookie, deleteCookie } from '@/lib/cookies'
import ErrorNotification from '@/components/ErrorNotification'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED_ACCOUNT: 'Your account is not authorized to access this application.',
  AUTHENTICATION_FAILED: 'Authentication failed. Please try again.',
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsChecking(false)
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  useEffect(() => {
    const authError = getCookie('auth_error')
    if (authError) {
      deleteCookie('auth_error')
      setError(AUTH_ERROR_MESSAGES[authError] ?? 'Authentication failed. Please try again.')
    }
  }, [])

  useEffect(() => {
    const requestedPath = safeLocalPath(new URLSearchParams(window.location.search).get('next'))
    if (requestedPath) sessionStorage.setItem(POST_LOGIN_PATH_KEY, requestedPath)
    // Check if already authenticated by probing an authenticated endpoint
    fetch('/api/console/access/me')
      .then((res) => {
        if (res.ok) {
          const returnPath = safeLocalPath(sessionStorage.getItem(POST_LOGIN_PATH_KEY))
          sessionStorage.removeItem(POST_LOGIN_PATH_KEY)
          window.location.href = returnPath ?? '/'
        }
      })
      .catch(() => {
        // Ignore — backend may be down, login page still renders
      })
  }, [])

  const handleLogin = async () => {
    setError(null)
    setIsChecking(true)

    const liveness = await checkBackendLiveness()

    if (!liveness.ok) {
      setError(liveness.message)
      setIsChecking(false)
      return
    }

    try {
      const config = await getRuntimeConfig()
      window.location.href = `${config.publicBackendUrl}/oauth2/authorization/google-fullstack-starter`
    } catch {
      setError('Application configuration is unavailable. Please try again later.')
      setIsChecking(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="login-container relative">
        <div className="login-card">
          <h1 className="login-title">Fullstack Starter</h1>
          <p className="login-subtitle">
            Sign in to access your application
          </p>

          {error && (
            <ErrorNotification message={error} onClose={() => setError(null)} />
          )}

          <button
            className="login-button"
            onClick={handleLogin}
            disabled={isChecking}
          >
            <Image src="/google-logo.svg" alt="" width={20} height={20} style={{ width: 20, height: 20 }} className="shrink-0 object-contain" unoptimized aria-hidden="true" />
            <span>{isChecking ? 'Checking...' : 'Sign in with Google'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
