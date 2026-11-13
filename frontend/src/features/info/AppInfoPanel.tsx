'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  deploymentTime,
  fetchBackendInfo,
  fetchFrontendInfo,
  formatRelativeAge,
  infoRows,
  GITHUB_REPO_URL,
  type AppInfoSource,
  type InfoRow,
} from '@/lib/appInfo'

interface AppInfoPanelProps {
  /** Compact mode tightens spacing/typography for the login card. */
  compact?: boolean
  className?: string
  forceLoading?: boolean
  refreshKey?: number
}

/**
 * Remembers how many rows each source rendered last time so the skeleton reserves the same
 * height on the next mount and the layout does not jump. Seeded with the typical field counts
 * so even the very first load is close to the final size.
 */
const rowCountCache: Record<string, number> = { Backend: 5, Frontend: 5 }

const LABELS = ['Backend', 'Frontend'] as const

/**
 * Displays curated release information for the backend and frontend. Used on the login
 * screen and the About tab.
 */
export function AppInfoPanel({
  compact = false,
  className,
  forceLoading = false,
  refreshKey = 0,
}: AppInfoPanelProps) {
  const [sources, setSources] = useState<AppInfoSource[] | null>(null)

  useEffect(() => {
    if (forceLoading) return
    let active = true
    Promise.all([fetchBackendInfo(), fetchFrontendInfo()]).then(([backend, frontend]) => {
      if (!active) return
      setSources([
        { label: 'Backend', data: backend },
        { label: 'Frontend', data: frontend },
      ])
    })
    return () => {
      active = false
    }
  }, [forceLoading, refreshKey])

  const visibleSources = forceLoading ? null : sources

  return (
    <div className={`info-panel ${className ?? ''}`}>
      {!compact && <ConsoleGuide />}
      <section className="build-info space-y-3" aria-label="Build information">
        {!compact && <h2 className="build-info-heading text-sm font-semibold">Build information</h2>}
        <div className="info-sources grid gap-4 sm:grid-cols-2">
          {LABELS.map((label, index) => (
            <InfoCard
              key={label}
              label={label}
              source={visibleSources?.[index] ?? null}
              compact={compact}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function ConsoleGuide() {
  const issuesUrl = GITHUB_REPO_URL ? `${GITHUB_REPO_URL}/issues` : null

  return (
    <Card className="about-guide mb-4 text-left">
      <CardHeader className="about-intro border-b">
        <CardTitle role="heading" aria-level={2} className="text-xl font-semibold sm:text-2xl">Fullstack Starter</CardTitle>
        <p className="max-w-3xl text-sm leading-relaxed text-foreground/85">Every new web app needs sign-in, access control, and a place to manage it. Fullstack Starter puts those pieces in a Kotlin and Next.js template, so you can start building your actual idea instead of setting them up again.</p>
      </CardHeader>
      <CardContent className="about-sections grid gap-5 md:grid-cols-2 md:gap-0 md:divide-x">
        <section aria-labelledby="console-roles" className="about-section space-y-3 text-sm leading-relaxed md:pr-2.5">
          <h3 id="console-roles" className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 shrink-0 text-foreground" aria-hidden="true" />Roles and permissions</h3>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
            <dt className="font-medium">Viewer</dt>
            <dd className="text-foreground">View the console and configuration. Request Editor access from the role controls.</dd>
            <dt className="font-medium">Editor</dt>
            <dd className="text-foreground">Viewer access plus editing permission for features that support it. Runtime settings are managed by the Owner.</dd>
            <dt className="font-medium">Admin</dt>
            <dd className="text-foreground">Review access requests, manage roles up to Editor, and inspect the audit log.</dd>
            <dt className="font-medium">Owner</dt>
            <dd className="text-foreground">Admin access plus runtime configuration and management of Admin and Owner roles.</dd>
          </dl>
        </section>
        <section aria-labelledby="console-feedback" className="about-section space-y-3 text-sm leading-relaxed md:pl-2.5">
          <h3 id="console-feedback" className="flex items-center gap-2 font-semibold"><MessageSquare className="size-4 shrink-0 text-foreground" aria-hidden="true" />Feedback</h3>
          <p className="text-foreground">When reporting an issue, include the affected screen, what you expected, and what happened. Leave credentials and private data out of reports.</p>
          {issuesUrl && (
            <a href={issuesUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid">
              Report an issue on GitHub
            </a>
          )}
        </section>
      </CardContent>
    </Card>
  )
}

function InfoCard({
  label,
  source,
  compact,
}: {
  label: string
  source: AppInfoSource | null
  compact: boolean
}) {
  const loading = source === null
  const rows = loading ? [] : infoRows(source.data)
  const available = !loading && rows.length > 0
  const deployedAt = loading ? null : deploymentTime(source.data)
  const deployedAgo = formatRelativeAge(deployedAt)

  if (available) {
    rowCountCache[label] = rows.length
  }
  const skeletonRows = rowCountCache[label] ?? 10

  return (
    <Card size={compact ? 'sm' : 'default'} className="text-left">
      <CardHeader className="border-b">
        <CardTitle role="heading" aria-level={compact ? 2 : 3} className="flex items-center justify-between gap-2">
          <span>{label}</span>
          {loading ? (
            <Skeleton className="h-5 w-16 rounded-full" />
          ) : !available ? (
            <Badge variant="outline" className="font-normal">unavailable</Badge>
          ) : null}
        </CardTitle>
        {loading ? (
          <Skeleton className="mt-1 h-3 w-32" />
        ) : (
          deployedAgo && (
            <p className="text-xs text-foreground" title={deployedAt ?? undefined}>
              Built {deployedAgo}
            </p>
          )
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col">
            {Array.from({ length: skeletonRows }).map((_, index) => (
              <div key={index}>
                {index > 0 && <Separator className="my-1.5" />}
                <div className="flex items-center justify-between gap-4 py-0.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : available ? (
          <dl className="flex flex-col">
            {rows.map((row, index) => (
              <div key={row.key}>
                {index > 0 && <Separator className="my-1.5" />}
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-2">
                  <dt className="min-w-0 text-xs text-foreground wrap-anywhere">{row.label}</dt>
                  <dd className="min-w-0 break-all text-right text-xs font-medium tabular-nums">
                    <InfoValueCell row={row} />
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-xs text-foreground">Information unavailable.</p>
        )}
      </CardContent>
    </Card>
  )
}

function InfoValueCell({ row }: { row: InfoRow }) {
  if (!row.href) {
    return <>{row.value}</>
  }
  return (
    <a
      href={row.href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid"
      title="View commit on GitHub"
    >
      {row.value}
    </a>
  )
}
