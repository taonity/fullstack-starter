'use client'

import { useCallback, useState } from 'react'
import { Check, X } from 'lucide-react'
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
import { consoleApi } from './api'
import { DataTab, type Column } from './DataTab'
import { RecordTimestamp } from './RecordTimestamp'
import { pageRows } from './pageRows'
import { formatExactTime } from './format'
import { DatePeriodFilter, type DatePeriod } from './DatePeriodFilter'
import type { AccessInfo, AuditLog, ConsoleRole, PendingRequest, UserSummary } from './types'

const AUDIT_COLUMNS: Column<AuditLog>[] = [
  {
    key: 'occurredAt',
    label: 'When',
    sortKey: 'occurredAt',
    initialSortDirection: 'desc',
    value: (a) => a.occurredAt,
    render: (a) => <RecordTimestamp value={a.occurredAt} />,
    cellClassName: 'whitespace-nowrap text-muted-foreground tabular-nums',
    defaultWidth: 180,
    skeleton: 'w-[85%]',
  },
  {
    key: 'action',
    mobilePrimary: true,
    label: 'Action',
    sortKey: 'action',
    value: (a) => a.action,
    cellClassName: 'truncate font-medium',
    defaultWidth: 180,
    searchKey: 'action',
  },
  {
    key: 'targetType',
    label: 'Target',
    sortKey: 'targetType',
    value: (a) => a.targetType,
    cellClassName: 'truncate',
    defaultWidth: 140,
    searchKey: 'targetType',
  },
  {
    key: 'targetId',
    label: 'Record id',
    sortKey: 'targetId',
    value: (a) => a.targetId ?? '',
    render: (a) => <span className="font-mono text-xs">{a.targetId ?? '—'}</span>,
    cellClassName: 'truncate',
    defaultWidth: 230,
    searchKey: 'targetId',
  },
  {
    key: 'actorEmail',
    label: 'Actor',
    sortKey: 'actorEmail',
    value: (a) => a.actorEmail,
    cellClassName: 'truncate',
    defaultWidth: 210,
    searchKey: 'actorEmail',
  },
]

export function AdminPanel({
  access,
  forceLoading = false,
  onError,
  onPendingCountChange,
  refreshKey = 0,
}: {
  access: AccessInfo
  forceLoading?: boolean
  onError: (message: string) => void
  onPendingCountChange?: (count: number) => void
  refreshKey?: number
}) {
  const [datePeriod, setDatePeriod] = useState<DatePeriod>({ startDate: '', endDate: '' })
  const [grantRoles, setGrantRoles] = useState<Record<string, ConsoleRole>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [accessRevision, setAccessRevision] = useState(0)
  const refreshAccess = useCallback(() => setAccessRevision(previous => previous + 1), [])
  const tableRefreshKey = refreshKey + accessRevision

  const decide = async (req: PendingRequest, approve: boolean) => {
    setBusyId(req.googleId)
    try {
      if (approve) {
        await consoleApi.approveRequest(req.googleId, grantRoles[req.googleId] ?? req.requestedRole ?? 'VIEWER')
      } else {
        await consoleApi.rejectRequest(req.googleId)
      }
      refreshAccess()
    } catch {
      onError(approve ? 'Failed to approve request.' : 'Failed to reject request.')
    } finally {
      setBusyId(null)
    }
  }

  const decisionButtons = (request: PendingRequest) => (
    <div className="flex justify-end gap-1">
      <Button size="sm" disabled={busyId !== null} onClick={() => void decide(request, true)}
        aria-label={`Approve access for ${request.displayName}`} title="Approve access">
        <Check className="lg:hidden" /><span className="hidden lg:inline">Approve</span>
      </Button>
      <Button size="sm" variant="destructive" disabled={busyId !== null} onClick={() => void decide(request, false)}
        aria-label={`Reject access for ${request.displayName}`} title="Reject access">
        <X className="lg:hidden" /><span className="hidden lg:inline">Reject</span>
      </Button>
    </div>
  )

  return (
    <div className="admin-panel flex min-w-0 flex-col gap-4 sm:gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending access requests</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTab<PendingRequest>
            columns={[
              ...REQUEST_COLUMNS,
              {
                key: 'grant', label: 'Grant', sortKey: 'grant', sortable: false,
                value: row => ROLE_LABELS[grantRoles[row.googleId] ?? row.requestedRole ?? 'VIEWER'],
                defaultWidth: 150, interactive: true, mobileCompact: true,
                render: row => (
                  <Select items={{ VIEWER: 'Viewer', EDITOR: 'Editor' }}
                    value={grantRoles[row.googleId] ?? row.requestedRole ?? 'VIEWER'}
                    onValueChange={value => value && setGrantRoles(previous => ({ ...previous, [row.googleId]: value as ConsoleRole }))}>
                    <SelectTrigger size="sm" className="w-full" aria-label={`Grant role for ${row.displayName}`} disabled={busyId !== null}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                      <SelectItem value="EDITOR">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                ),
              },
            ]}
            columnWidthsKey="pending-access-requests"
            defaultSortKey="displayName" defaultSortDirection="asc"
            rowKey={row => row.googleId}
            rowActions={decisionButtons} rowActionsWidth={180} stickyActions={false}
            load={async (page, size, q, field, sort, direction, exact) => {
              const rows = await consoleApi.listPendingRequests()
              onPendingCountChange?.(rows.length)
              return pageRows(rows, REQUEST_COLUMNS, row => row.googleId, page, size, q, field, sort, direction, exact)
            }}
            emptyLabel="No pending requests." forceLoading={forceLoading} onError={onError}
            refreshKey={tableRefreshKey}
          />
        </CardContent>
      </Card>

      <UsersCard
        access={access}
        forceLoading={forceLoading}
        onError={onError}
        refreshKey={tableRefreshKey}
        onAccessChange={refreshAccess}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit log</CardTitle>
          <p className="text-xs text-muted-foreground">
            Retained for 2 weeks. Records what changed and by whom — never the changed data.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex min-w-0 flex-col gap-3">
            <DatePeriodFilter value={datePeriod} onChange={setDatePeriod} disabled={forceLoading}
              loadRange={consoleApi.getAuditDateRange} refreshKey={tableRefreshKey} onError={onError} />
            <DataTab<AuditLog>
              columns={AUDIT_COLUMNS}
              columnWidthsKey="audit-log"
              showRowNumbers
              expandOnRowClick
              expand={row => <RecordDetails values={{ 'Record ID': row.id, When: formatExactTime(row.occurredAt), Action: row.action, Target: row.targetType, 'Target ID': row.targetId ?? '\u2014', Actor: row.actorEmail }} />}
              defaultSortKey="occurredAt"
              defaultSortDirection="desc"
              rowKey={(a) => a.id}
              filterKey={`${datePeriod.startDate}:${datePeriod.endDate}`}
              load={(page, size, q, field, sort, direction, exact) =>
                consoleApi.listAuditLogs(page, size, q, field, sort, direction, exact, datePeriod.startDate, datePeriod.endDate)
              }
              emptyLabel="No audit entries."
              forceLoading={forceLoading}
              onError={onError}
              refreshKey={tableRefreshKey}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const ROLE_LABELS: Record<ConsoleRole, string> = {
  NONE: 'No access',
  VIEWER: 'Viewer',
  EDITOR: 'Editor',
  ADMIN: 'Admin',
  OWNER: 'Owner',
}

const REQUEST_COLUMNS: Column<PendingRequest>[] = [
  { key: 'displayName', label: 'User', sortKey: 'displayName', searchKey: 'displayName', value: row => row.displayName, defaultWidth: 180, mobilePrimary: true, cellClassName: 'truncate font-medium' },
  { key: 'email', label: 'Email', sortKey: 'email', searchKey: 'email', value: row => row.email, defaultWidth: 260, cellClassName: 'truncate text-muted-foreground' },
  { key: 'requestedRole', label: 'Requested', sortKey: 'requestedRole', searchKey: 'requestedRole', value: row => row.requestedRole ? ROLE_LABELS[row.requestedRole] : '', render: row => row.requestedRole ? ROLE_LABELS[row.requestedRole] : '\u2014', defaultWidth: 140, mobileCompact: true },
]

const USER_COLUMNS: Column<UserSummary>[] = [
  ...REQUEST_COLUMNS.slice(0, 2),
  { key: 'accessStatus', label: 'Status', sortKey: 'accessStatus', searchKey: 'accessStatus', value: row => row.accessStatus, render: row => <Badge variant="secondary" className="font-normal">{row.accessStatus}</Badge>, defaultWidth: 140, mobileCompact: true },
  { key: 'role', label: 'Role', sortKey: 'role', searchKey: 'role', value: row => ROLE_LABELS[row.role], defaultWidth: 180, interactive: true, mobileTools: true },
]

function RecordDetails({ values }: { values: Record<string, string> }) {
  return <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
    {Object.entries(values).map(([label, value]) =>
      <div key={label} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="wrap-anywhere">{value}</dd></div>)}
  </dl>
}

function UsersCard({ access, forceLoading, onError, refreshKey, onAccessChange }: {
  access: AccessInfo
  forceLoading: boolean
  onError: (message: string) => void
  refreshKey: number
  onAccessChange: () => void
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  // Owners can assign any role; admins only up to EDITOR.
  const assignableRoles: ConsoleRole[] = access.isOwner
    ? ['NONE', 'VIEWER', 'EDITOR', 'ADMIN', 'OWNER']
    : ['NONE', 'VIEWER', 'EDITOR']
  const roleItems = Object.fromEntries(assignableRoles.map(role => [role, ROLE_LABELS[role]]))

  const changeRole = async (user: UserSummary, role: ConsoleRole) => {
    if (role === user.role) return
    setBusyId(user.googleId)
    try {
      await consoleApi.changeUserRole(user.googleId, role)
      onAccessChange()
    } catch {
      onError('Failed to change role. Admin roles can only be managed by the owner.')
    } finally {
      setBusyId(null)
    }
  }

  const roleControl = (user: UserSummary) => {
    const locked = user.email === access.email || (!access.isOwner && (user.role === 'ADMIN' || user.role === 'OWNER'))
    return locked ? <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge> : (
      <Select items={roleItems} value={user.role} onValueChange={value => value && void changeRole(user, value as ConsoleRole)}>
        <SelectTrigger size="sm" className="w-full min-w-0 md:w-[160px]" disabled={busyId !== null} aria-label={`Role for ${user.displayName}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {assignableRoles.map(role => <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>)}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Users</CardTitle>
        <p className="text-xs text-muted-foreground">
          {access.isOwner ? 'You can assign any role, including admins.' : 'You can manage roles up to Editor. Admin roles are managed by the owner.'}
        </p>
      </CardHeader>
      <CardContent>
        <DataTab<UserSummary>
          columns={USER_COLUMNS.map(column => column.key === 'role' ? { ...column, render: roleControl } : column)}
          columnWidthsKey="users" defaultSortKey="displayName" defaultSortDirection="asc"
          rowKey={row => row.googleId} showRowNumbers
          load={async (page, size, q, field, sort, direction, exact) =>
            pageRows(await consoleApi.listUsers(), USER_COLUMNS, row => row.googleId, page, size, q, field, sort, direction, exact)}
          emptyLabel="No users yet." forceLoading={forceLoading} onError={onError} refreshKey={refreshKey}
        />
      </CardContent>
    </Card>
  )
}
