'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import ErrorNotification from '@/components/ErrorNotification'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminPanel } from './AdminPanel'
import { consoleApi } from './api'
import { ConfigTab } from './ConfigTab'
import { AppInfoPanel } from '@/features/info/AppInfoPanel'
import type { AccessInfo, ConsoleRole } from './types'
import { consoleTabUrl, readConsoleTab, type TabKey } from './navigation'

const LOADING_ADMIN_ACCESS: AccessInfo = {
  email: '',
  displayName: '',
  role: 'OWNER',
  accessStatus: 'APPROVED',
  requestedRole: null,
  canView: true,
  canEdit: true,
  isAdmin: true,
  isOwner: true,
}

const TAB_STORAGE_KEY = 'console.activeTab'

function storedTab(): TabKey {
  const value = localStorage.getItem(TAB_STORAGE_KEY)
  return value === 'config' || value === 'admin' ? value : 'about'
}

export default function DataConsole({
  enabled = true,
  forceLoading = false,
  onAccessChange,
}: {
  enabled?: boolean
  forceLoading?: boolean
  onAccessChange?: (access: AccessInfo) => void
}) {
  const [access, setAccess] = useState<AccessInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabKey>('about')
  const [tabRestored, setTabRestored] = useState(false)
  const [tabAnimationsReady, setTabAnimationsReady] = useState(false)
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [visited, setVisited] = useState<Set<TabKey>>(() => new Set<TabKey>(['about']))
  const [refreshKeys, setRefreshKeys] = useState<Record<TabKey, number>>({
    about: 0,
    config: 0,
    admin: 0,
  })

  const selectTab = useCallback((next: TabKey) => {
    if (next === tab) return
    setTab(next)
    localStorage.setItem(TAB_STORAGE_KEY, next)
    window.history.pushState(null, '', consoleTabUrl(window.location.href, next))
    setRefreshKeys((prev) => ({ ...prev, [next]: prev[next] + 1 }))
    setVisited((prev) => {
      if (prev.has(next)) return prev
      const updated = new Set(prev)
      updated.add(next)
      return updated
    })
  }, [tab])

  const loadAccess = useCallback(async () => {
    try {
      const next = await consoleApi.getAccess()
      setAccess(next)
      onAccessChange?.(next)
    } catch {
      setError('Failed to load access information.')
    } finally {
      setLoading(false)
    }
  }, [onAccessChange])

  useLayoutEffect(() => {
    const restored = readConsoleTab(window.location.search, storedTab())
    window.history.replaceState(null, '', consoleTabUrl(window.location.href, restored))
    setTab(restored)
    setVisited(new Set<TabKey>([restored]))
    setTabRestored(true)
    const restore = () => {
      const next = readConsoleTab(window.location.search, storedTab())
      setTab(next)
      setVisited(previous => new Set([...previous, next]))
      setRefreshKeys(previous => ({ ...previous, [next]: previous[next] + 1 }))
    }
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])

  useEffect(() => {
    if (!tabRestored) return
    const frame = requestAnimationFrame(() => setTabAnimationsReady(true))
    return () => cancelAnimationFrame(frame)
  }, [tabRestored])

  useEffect(() => {
    if (!enabled) return
    void loadAccess()
  }, [enabled, loadAccess])

  useEffect(() => {
    if (!forceLoading && !loading && access && tab === 'admin' && !access.isAdmin) {
      window.history.replaceState(null, '', consoleTabUrl(window.location.href, 'about'))
      setTab('about')
      localStorage.setItem(TAB_STORAGE_KEY, 'about')
      setVisited(previous => new Set([...previous, 'about']))
    }
  }, [access, forceLoading, loading, tab])

  // Load the pending-request count independently of the Admin tab so the tab badge is accurate
  // even before an admin opens the tab (the tab is mounted lazily).
  useEffect(() => {
    if (forceLoading || !access?.isAdmin) return
    let active = true
    consoleApi
      .listPendingRequests()
      .then((requests) => {
        if (active) setPendingCount(requests.length)
      })
      .catch(() => {
        // Non-critical: the Admin tab surfaces its own load error.
      })
    return () => {
      active = false
    }
  }, [access?.isAdmin, forceLoading])

  const isLoading = forceLoading || loading

  if (!isLoading && access && !access.canView) {
    return (
      <div className="flex flex-col gap-3">
        {error && <ErrorNotification message={error} onClose={() => setError(null)} />}
        <AccessGate access={access} onUpdated={next => { setAccess(next); onAccessChange?.(next) }} onError={setError} />
      </div>
    )
  }

  if (!isLoading && !access) {
    return error ? (
      <ErrorNotification message={error} onClose={() => setError(null)} />
    ) : null
  }

  const canView = access?.canView === true
  const showAdmin = isLoading || access?.isAdmin === true
  const selectedTab = !isLoading && tab === 'admin' && !access?.isAdmin ? 'about' : tab
  const hasPending = (pendingCount ?? 0) > 0
  const pendingLabel = hasPending
    ? `${pendingCount} pending access request${pendingCount === 1 ? '' : 's'}`
    : 'No pending access requests'
  const tabItems: Record<string, string> = {
    about: 'About',
    config: 'Config',
    ...(showAdmin ? { admin: 'Admin' } : {}),
  }

  return (
    <div className={`flex flex-col gap-3 ${tabRestored ? '' : 'invisible'}`}>
      {error && <ErrorNotification message={error} onClose={() => setError(null)} />}

      <Tabs value={selectedTab} onValueChange={(v) => selectTab((v ?? 'about') as TabKey)}>
        <div className="console-navigation flex flex-wrap items-center justify-between gap-2">
          <TabsList aria-label="Console sections" className="console-tabs grid h-auto w-full grid-cols-[repeat(auto-fit,minmax(64px,1fr))] gap-1 bg-transparent p-0 group-data-horizontal/tabs:h-auto lg:flex lg:w-fit lg:justify-start">
            {Object.entries(tabItems).map(([value, label]) => (
              <TabsTrigger key={value} value={value}
                disabled={value === 'admin' && isLoading && !forceLoading && !access?.isAdmin}
                className={`relative h-9 flex-none border-border px-2 text-xs lg:h-8 lg:border-transparent lg:text-sm lg:data-active:bg-transparent lg:group-data-[variant=default]/tabs-list:data-active:shadow-none lg:data-active:after:opacity-100 dark:lg:data-active:border-transparent dark:lg:data-active:bg-transparent ${tabAnimationsReady ? '' : 'transition-none after:transition-none'}`}>
                {label}
                {value === 'admin' && <span className={`absolute top-1 right-1 size-1.5 rounded-full bg-destructive ${hasPending ? '' : 'invisible'}`} aria-label={pendingLabel} />}
              </TabsTrigger>
            ))}
          </TabsList>
          {access?.role === 'VIEWER' && <div className="console-access flex flex-wrap items-center gap-2">
            <UpgradeAccessControl access={access} onUpdated={next => { setAccess(next); onAccessChange?.(next) }} onError={setError} />
          </div>}
        </div>

        <TabsContent value="about" className="console-inset pt-2" keepMounted>
          {visited.has('about') && (
            <AppInfoPanel forceLoading={forceLoading} refreshKey={refreshKeys.about} />
          )}
        </TabsContent>

        <TabsContent value="config" className="console-inset pt-2" keepMounted>
          {visited.has('config') && (
            <ConfigTab
              canEdit={access?.isOwner === true}
              forceLoading={isLoading || !canView}
              onError={setError}
              refreshKey={refreshKeys.config}
            />
          )}
        </TabsContent>

        {showAdmin && (
          <TabsContent value="admin" className="pt-2" keepMounted>
            {visited.has('admin') && (
              <AdminPanel
                access={access?.isAdmin ? access : LOADING_ADMIN_ACCESS}
                forceLoading={isLoading || !access?.isAdmin}
                onError={setError}
                onPendingCountChange={setPendingCount}
                refreshKey={refreshKeys.admin}
              />
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function AccessGate({
  access,
  onUpdated,
  onError,
}: {
  access: AccessInfo
  onUpdated: (info: AccessInfo) => void
  onError: (message: string) => void
}) {
  const [desiredRole, setDesiredRole] = useState<ConsoleRole>('VIEWER')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    try {
      const updated = await consoleApi.requestAccess(desiredRole)
      if (updated) onUpdated(updated)
    } catch {
      onError('Failed to submit access request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (access.accessStatus === 'PENDING') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Access pending</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Your request for <strong>{access.requestedRole ?? 'access'}</strong>{' '}is awaiting an
          admin&apos;s approval.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Request access</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          You don&apos;t have access to the data console yet.
          {access.accessStatus === 'REJECTED' && ' Your previous request was rejected.'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={{ VIEWER: 'Viewer (read-only)', EDITOR: 'Editor (read & modify)' }}
            value={desiredRole}
            onValueChange={(v) => setDesiredRole((v ?? 'VIEWER') as ConsoleRole)}
          >
            <SelectTrigger className="w-full sm:w-[220px]" aria-label="Requested access role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VIEWER">Viewer (read-only)</SelectItem>
              <SelectItem value="EDITOR">Editor (read &amp; modify)</SelectItem>
            </SelectContent>
          </Select>
          <Button disabled={submitting} onClick={submit}>
            {submitting ? 'Submittingâ€¦' : 'Request access'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Subtle inline control shown next to the role badge for a VIEWER who can read but not edit: lets
 * them request an upgrade to EDITOR, which an admin then approves. Renders nothing for
 * editors/admins/owners.
 */
function UpgradeAccessControl({
  access,
  onUpdated,
  onError,
}: {
  access: AccessInfo
  onUpdated: (info: AccessInfo) => void
  onError: (message: string) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // Only viewers (can view, cannot edit, not admin) may request an upgrade.
  if (!access.canView || access.canEdit || access.isAdmin) return null

  if (access.accessStatus === 'PENDING') {
    return <span className="text-xs text-muted-foreground">Editor request pending</span>
  }

  const requestUpgrade = async () => {
    setSubmitting(true)
    try {
      const updated = await consoleApi.requestAccess('EDITOR')
      if (updated) onUpdated(updated)
    } catch {
      onError('Failed to request upgrade.')
    } finally {
      setSubmitting(false)
      setConfirming(false)
    }
  }

  // Two-step confirm so the request can't be triggered by an accidental click.
  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Request editor access?</span>
        <Button size="xs" disabled={submitting} onClick={requestUpgrade}>
          {submitting ? 'Requestingâ€¦' : 'Confirm'}
        </Button>
        <Button
          size="xs"
          variant="ghost"
          className="text-muted-foreground"
          disabled={submitting}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Button
      size="xs"
      variant="ghost"
      className="text-muted-foreground"
      onClick={() => setConfirming(true)}
    >
      Request editor access
    </Button>
  )
}
