'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bug, LoaderCircle, LogIn, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getRuntimeConfig } from '@/lib/runtimeConfig'
import type { StubLogin } from './types'
import {
  isDevelopmentBuild,
  setDevLoadingEnabled,
  useDevLoading,
} from './devLoading'

export function DevToolsPanel() {
  const [open, setOpen] = useState(false)
  const [logins, setLogins] = useState<StubLogin[] | null>(null)
  const [backendUrl, setBackendUrl] = useState('')
  const forceLoading = useDevLoading()
  const hidden =
    process.env.NEXT_PUBLIC_HIDE_DEV_TOOLS === 'true' ||
    process.env.NEXT_PUBLIC_HIDE_DEV_LOGIN === 'true'

  const toggle = useCallback(() => setOpen((value) => !value), [])

  useEffect(() => {
    if (!isDevelopmentBuild || hidden) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.code === 'KeyD') {
        event.preventDefault()
        toggle()
      } else if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hidden, toggle])

  useEffect(() => {
    if (!open || logins || hidden) return
    let active = true
    void (async () => {
      try {
        const [response, config] = await Promise.all([
          fetch('/api/dev/stub-users', { cache: 'no-store' }),
          getRuntimeConfig(),
        ])
        if (!response.ok || !active) return
        setBackendUrl(config.publicBackendUrl)
        setLogins((await response.json()) as StubLogin[])
      } catch {
        if (active) setLogins([])
      }
    })()
    return () => {
      active = false
    }
  }, [hidden, logins, open])

  if (!isDevelopmentBuild || hidden) return null

  if (!open) {
    return (
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="fixed right-3 bottom-3 z-[60] size-8 bg-background/95 shadow-md backdrop-blur"
        onClick={() => setOpen(true)}
        aria-label="Open developer tools"
        title="Developer tools (Alt+Shift+D)"
        data-dev-tools-trigger
      >
        <Bug />
      </Button>
    )
  }

  return (
    <aside
      className="fixed right-3 bottom-3 z-[60] w-[min(22rem,calc(100vw-1.5rem))] rounded-lg border bg-card/95 p-2.5 shadow-lg backdrop-blur"
      aria-label="Developer tools"
      data-dev-tools-panel
      data-force-loading={forceLoading}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Bug className="size-4" />
          Developer tools
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => setOpen(false)}
          aria-label="Close developer tools"
          title="Close (Escape)"
        >
          <X />
        </Button>
      </div>

      <div className="mt-2 flex flex-col gap-2 border-t pt-2">
        <Button
          type="button"
          size="sm"
          variant={forceLoading ? 'default' : 'outline'}
          className="justify-start"
          onClick={() => {
            const enabled = !forceLoading
            setDevLoadingEnabled(enabled)
            if (enabled && window.location.pathname === '/login') {
              window.location.href = '/'
            }
          }}
          aria-pressed={forceLoading}
          data-dev-loading-toggle
        >
          <LoaderCircle className={forceLoading ? 'animate-spin' : ''} />
          {forceLoading ? 'Resume live UI' : 'Hold loading UI'}
        </Button>

        {logins && logins.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {logins.map((login) => (
              <Button
                key={login.registrationId}
                type="button"
                size="xs"
                variant="outline"
                onClick={() => {
                  window.location.href = `${backendUrl}/oauth2/authorization/${login.registrationId}`
                }}
              >
                <LogIn />
                {login.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
