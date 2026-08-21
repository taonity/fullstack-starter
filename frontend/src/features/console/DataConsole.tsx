'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import ErrorNotification from '@/components/ErrorNotification'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminPanel } from './AdminPanel'
import { consoleApi } from './api'
import { ConfigTab } from './ConfigTab'
import { AppInfoPanel } from '@/features/info/AppInfoPanel'
import type { AccessInfo, ConsoleRole } from './types'

const ROLE_BADGE: Record<ConsoleRole, 'default' | 'secondary' | 'outline'> = {
  OWNER: 'default',
  ADMIN: 'default',
  EDITOR: 'secondary',
  VIEWER: 'outline',
  NONE: 'outline',
}

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

type TabKey = 'about' | 'config' | 'admin'
const TAB_STORAGE_KEY = 'console.activeTab'

function storedTab(): TabKey {
  const value = localStorage.getItem(TAB_STORAGE_KEY)
  return value === 'config' || value === 'admin' ? value : 'about'
}

export default function DataConsole({
  enabled = true,
  forceLoading = false,
}: {
  enabled?: boolean
  forceLoading?: boolean
}) {
  const [access, setAccess] = useState<AccessInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabKey>('about')
  const [tabRestored, setTabRestored] = useState(false)
  const [tabAnimationsReady, setTabAnimationsReady] = useState(false)
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  // Tabs are mounted lazily on first visit and then kept mounted (see keepMounted below), so
  // switching back to an already-seen tab restores its state instantly instead of replaying the
  // skeleton load. Trade-off: a revisited tab shows data from its first load until the user hits
  // Refresh.
  const [visited, setVisited] = useState<Set<TabKey>>(() => new Set<TabKey>(['about']))

  const selectTab = useCallback((next: TabKey) => {
    setTab(next)
    localStorage.setItem(TAB_STORAGE_KEY, next)
    setVisited((prev) => {
      if (prev.has(next)) return prev
      const updated = new Set(prev)
      updated.add(next)
      return updated
    })
  }, [])

  const loadAccess = useCallback(async () => {
    try {
      setAccess(await consoleApi.getAccess())
    } catch {
      setError('Failed to load access information.')
    } finally {
      setLoading(false)
    }
  }, [])

  useLayoutEffect(() => {
    const restored = storedTab()
    setTab(restored)
    setVisited(new Set<TabKey>([restored]))
    setTabRestored(true)
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
      selectTab('about')
    }
  }, [access, forceLoading, loading, selectTab, tab])

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
        <AccessGate access={access} onUpdated={setAccess} onError={setError} />
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
        <div className="flex items-center justify-between gap-2">
          {/* Mobile: compact dropdown keeps every tab one tap away without hidden horizontal scroll. */}
          <Select
            items={tabItems}
            value={selectedTab}
            onValueChange={(v) => selectTab((v ?? 'about') as TabKey)}
          >
            <SelectTrigger size="sm" className="h-8 w-36 sm:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(tabItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Tablet and up: full tab bar. */}
          <TabsList variant="line" className="hidden h-9 min-w-48 justify-start sm:flex">
            <TabsTrigger
              value="about"
              className={tabAnimationsReady ? undefined : 'transition-none after:transition-none'}
            >
              About
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className={tabAnimationsReady ? undefined : 'transition-none after:transition-none'}
            >
              Config
            </TabsTrigger>
            {showAdmin && (
              <TabsTrigger
                value="admin"
                className={`${tabAnimationsReady ? '' : 'transition-none after:transition-none'} relative w-20 justify-center`}
                disabled={isLoading && !forceLoading && !access?.isAdmin}
              >
                <span className="text-center">Admin</span>
                <span
                  className={`pointer-events-none absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive ${hasPending ? '' : 'invisible'}`}
                  aria-label={pendingLabel}
                />
              </TabsTrigger>
            )}
          </TabsList>
          <div className="flex items-center gap-2">
            {access ? (
              <>
                <UpgradeAccessControl access={access} onUpdated={setAccess} onError={setError} />
                <Badge variant={ROLE_BADGE[access.role]}>{access.role}</Badge>
              </>
            ) : (
              <Skeleton className="h-6 w-16 rounded-full" />
            )}
          </div>
        </div>

        <TabsContent value="about" className="pt-2" keepMounted>
          {visited.has('about') && <AppInfoPanel forceLoading={forceLoading} />}
        </TabsContent>

        <TabsContent value="config" className="pt-2" keepMounted>
          {visited.has('config') && (
            <ConfigTab
              canEdit={access?.isOwner === true}
              forceLoading={isLoading || !canView}
              onError={setError}
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
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VIEWER">Viewer (read-only)</SelectItem>
              <SelectItem value="EDITOR">Editor (read &amp; modify)</SelectItem>
            </SelectContent>
          </Select>
          <Button disabled={submitting} onClick={submit}>
            {submitting ? 'Submitting…' : 'Request access'}
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
          {submitting ? 'Requesting…' : 'Confirm'}
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
