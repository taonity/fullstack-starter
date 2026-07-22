'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { checkBackendLiveness } from '@/lib/auth'
import { getRuntimeConfig } from '@/lib/runtimeConfig'
import { getCookie, deleteCookie } from '@/lib/cookies'
import ErrorNotification from '@/components/ErrorNotification'
import { AppInfoPanel } from '@/features/info/AppInfoPanel'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED_ACCOUNT: 'Your account is not authorized to access this application.',
  AUTHENTICATION_FAILED: 'Authentication failed. Please try again.',
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [showScrollHint, setShowScrollHint] = useState(true)

  useEffect(() => {
    const onScroll = () => setShowScrollHint(window.scrollY < 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToAbout = () => {
    document.getElementById('login-about')?.scrollIntoView({ behavior: 'smooth' })
  }

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
    // Check if already authenticated by probing an authenticated endpoint
    fetch('/api/console/access/me')
      .then((res) => {
        if (res.ok) {
          window.location.href = '/'
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

    const config = await getRuntimeConfig()
    const loginUrl = config.publicBackendUrl
      ? `${config.publicBackendUrl}/oauth2/authorization/google-fullstack-starter`
      : '/oauth2/authorization/google-fullstack-starter'

    window.location.href = loginUrl
  }

  return (
    <div>
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
            {isChecking ? 'Checking...' : 'Sign in with Google'}
          </button>
        </div>

        <button
          type="button"
          onClick={scrollToAbout}
          aria-label="Scroll to system information"
          className={`absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-muted-foreground transition-opacity duration-300 hover:text-foreground ${
            showScrollHint ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <span className="text-xs">System information</span>
          <ChevronDown className="size-5 animate-bounce" />
        </button>
      </div>

      <div id="login-about" className="mx-auto w-full max-w-3xl px-4 pb-16">
        <AppInfoPanel compact />
      </div>
    </div>
  )
}
