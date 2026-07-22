export type ConsoleRole = 'NONE' | 'VIEWER' | 'EDITOR' | 'ADMIN' | 'OWNER'
export type AccessStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AccessInfo {
  email: string
  displayName: string
  role: ConsoleRole
  accessStatus: AccessStatus
  requestedRole: ConsoleRole | null
  canView: boolean
  canEdit: boolean
  isAdmin: boolean
  isOwner: boolean
}

export interface UserSummary {
  googleId: string
  email: string
  displayName: string
  role: ConsoleRole
  accessStatus: AccessStatus
  requestedRole: ConsoleRole | null
}

/** A dev-only stub login shortcut returned by /api/dev/stub-users. */
export interface StubLogin {
  registrationId: string
  label: string
}

export interface PendingRequest {
  googleId: string
  email: string
  displayName: string
  requestedRole: ConsoleRole | null
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasMore: boolean
}

export interface PageLocation {
  page: number
}

export interface AuditLog {
  id: string
  action: string
  targetType: string
  targetId: string | null
  actorEmail: string
  occurredAt: string
}

export type ConfigFieldType =
  | 'BOOL'
  | 'INT'
  | 'LONG'
  | 'DOUBLE'
  | 'STRING'
  | 'TEXT'
  | 'ENUM'
  | 'STRING_LIST'

export interface ConfigField {
  key: string
  group: string
  label: string
  type: ConfigFieldType
  min: number | null
  max: number | null
  enumValues: string[]
  defaultValue: unknown
  value: unknown
  overridden: boolean
}

export interface ConfigSchema {
  fields: ConfigField[]
}
