'use client'

import { useEffect, useState } from 'react'
import { fetchAuthenticatedUserStatus, requestLogout } from '@/lib/auth'
import { getRuntimeConfig } from '@/lib/runtimeConfig'
import { getCookie } from '@/lib/cookies'
import ErrorNotification from '@/components/ErrorNotification'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import DataConsole from '@/features/console/DataConsole'
import { isDevLoadingEnabled, useDevLoading } from '@/features/console/devLoading'

interface AuthenticatedUser {
  email: string
}

export default function Home() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const forceLoading = useDevLoading()

  useEffect(() => {
    if (forceLoading || isDevLoadingEnabled()) {
      setLoading(true)
      return
    }

    async function checkAuth() {
      const result = await fetchAuthenticatedUserStatus()

      if (result.status === 'authenticated') {
        setUser(result.data)
      } else if (result.status === 'unauthenticated') {
        if (!isDevLoadingEnabled()) window.location.href = '/login'
        return
      } else {
        setError(result.message)
      }

      setLoading(false)
    }

    checkAuth()
  }, [forceLoading])

  const handleLogout = async () => {
    try {
      const config = await getRuntimeConfig()
      const xsrfToken = getCookie(config.csrfCookieName) || ''

      await requestLogout(xsrfToken)
      window.location.href = '/login'
    } catch {
      setError('Logout failed. Please try again.')
    }
  }

  return (
    <div className="console-shell px-2 py-2 sm:px-6 sm:py-4">
      <div className="mx-auto w-full min-w-0 max-w-[1200px]">
        {/* Reserve room for the fixed theme toggle until the viewport is wide enough that it
            clears the centered content (~1300px), so Log out never sits under it. */}
        <header className="console-header flex items-center justify-between gap-2 border-b pb-2 pr-12 sm:pb-3 min-[1300px]:pr-0">
          <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-2">
            <span className="shrink-0 text-base font-semibold sm:text-lg">Data console</span>
            {loading || forceLoading ? (
              <Skeleton className="h-4 w-40" />
            ) : (
              user && (
                <span className="truncate text-xs text-muted-foreground sm:text-sm" title={user.email}>{user.email}</span>
              )
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </header>

        <main className="min-w-0 pt-2 sm:pt-4">
          {error && <ErrorNotification message={error} onClose={() => setError(null)} />}
          {(loading || forceLoading || user) && (
            <DataConsole
              enabled={user !== null && !forceLoading}
              forceLoading={forceLoading}
            />
          )}
        </main>
      </div>
    </div>
  )
}
