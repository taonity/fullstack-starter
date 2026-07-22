import { fetchWithTimeout } from '@/lib/clientApi'

/**
 * Actuator-style info payloads are open-ended maps (app/git/build/... vary between the
 * backend Spring Boot Actuator and the frontend build metadata). We keep them as generic
 * nested records and flatten them for display so every provided field is shown.
 */
export type InfoValue = string | number | boolean | null | InfoObject | InfoValue[]
export interface InfoObject {
  [key: string]: InfoValue
}

export interface AppInfoSource {
  /** Human label shown as the section title, e.g. "Backend" / "Frontend". */
  label: string
  /** The raw info payload, or null when it could not be loaded. */
  data: InfoObject | null
}

/** A single flattened key/value row, e.g. { key: "git.commit.id.abbrev", value: "18a81dc" }. */
export interface InfoRow {
  key: string
  value: string
}

/** Base URL of the GitHub repository, used to linkify commit SHAs. */
export const GITHUB_REPO_URL = (
  process.env.NEXT_PUBLIC_GITHUB_REPO_URL || 'https://github.com/example/fullstack-starter'
).replace(/\.git$/, '').replace(/\/$/, '')

/**
 * Returns a GitHub commit URL when the row looks like a commit SHA (a `commit` key whose
 * value is a 7–40 char hex string), otherwise null. Describe values like "18a81dc-dirty"
 * are intentionally excluded since they are not addressable commits.
 */
export function commitUrl(row: InfoRow): string | null {
  if (!/commit/i.test(row.key)) {
    return null
  }
  if (!/^[0-9a-f]{7,40}$/i.test(row.value)) {
    return null
  }
  return `${GITHUB_REPO_URL}/commit/${row.value}`
}

/** Fetches the frontend's own build/runtime info. */
export async function fetchFrontendInfo(): Promise<InfoObject | null> {
  return fetchInfo('/api/actuator/info')
}

/** Fetches the backend Spring Boot Actuator info (proxied through Next.js). */
export async function fetchBackendInfo(): Promise<InfoObject | null> {
  return fetchInfo('/api/actuator/backend')
}

async function fetchInfo(url: string): Promise<InfoObject | null> {
  try {
    const res = await fetchWithTimeout(url, { timeoutMs: 8000 })
    if (!res.ok) {
      return null
    }
    return (await res.json()) as InfoObject
  } catch {
    return null
  }
}

/**
 * Ordered list of info fields that best represent when the running artifact was built/deployed.
 * The first field that parses as a valid date wins.
 */
const DEPLOYMENT_TIME_KEYS = ['build.time', 'git.build.time', 'git.commit.time'] as const

/**
 * Returns the ISO timestamp that best represents when the artifact was deployed (its build time),
 * or null when no usable timestamp is present in the payload.
 */
export function deploymentTime(data: InfoObject | null): string | null {
  if (!data) {
    return null
  }
  const rows = flattenInfo(data)
  for (const key of DEPLOYMENT_TIME_KEYS) {
    const row = rows.find((r) => r.key === key)
    if (row && !Number.isNaN(new Date(row.value).getTime())) {
      return row.value
    }
  }
  return null
}

const RELATIVE_UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 1000 * 60 * 60 * 24 * 365],
  ['month', 1000 * 60 * 60 * 24 * 30],
  ['week', 1000 * 60 * 60 * 24 * 7],
  ['day', 1000 * 60 * 60 * 24],
  ['hour', 1000 * 60 * 60],
  ['minute', 1000 * 60],
  ['second', 1000],
]

/**
 * Formats an ISO timestamp as a human-readable relative age (e.g. "3 days ago", "just now"),
 * or null when the value is missing/unparseable.
 */
export function formatRelativeAge(iso: string | null | undefined): string | null {
  if (!iso) {
    return null
  }
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) {
    return null
  }
  const diff = Date.now() - time
  const absDiff = Math.abs(diff)
  if (absDiff < 45_000) {
    return 'just now'
  }
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (absDiff >= ms || unit === 'second') {
      return rtf.format(-Math.round(diff / ms), unit)
    }
  }
  return null
}

/**
 * Flattens a nested info object into dotted-key rows so that every provided field is
 * rendered regardless of the payload's shape.
 */
export function flattenInfo(data: InfoObject | null): InfoRow[] {
  if (!data) {
    return []
  }
  const rows: InfoRow[] = []

  const walk = (value: InfoValue, path: string) => {
    if (value === null || value === undefined) {
      rows.push({ key: path, value: '—' })
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`))
      return
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value)
      if (entries.length === 0) {
        rows.push({ key: path, value: '—' })
        return
      }
      for (const [childKey, childValue] of entries) {
        walk(childValue, path ? `${path}.${childKey}` : childKey)
      }
      return
    }
    rows.push({ key: path, value: String(value) })
  }

  walk(data, '')
  return rows
}
