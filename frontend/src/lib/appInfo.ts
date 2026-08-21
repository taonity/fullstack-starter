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

/** A curated release-information row displayed in the About panel. */
export interface InfoRow {
  key: string
  label: string
  value: string
  href?: string
}

/** Base URL of the GitHub repository, used to linkify commit SHAs. */
export const GITHUB_REPO_URL = process.env.NEXT_PUBLIC_GITHUB_REPO_URL
  ?.replace(/\.git$/, '')
  .replace(/\/$/, '')

/** Fetches the frontend's own build info. */
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
const DEPLOYMENT_TIME_KEYS = ['build.time', 'git.build.time'] as const

/**
 * Returns the ISO timestamp that best represents when the artifact was deployed (its build time),
 * or null when no usable timestamp is present in the payload.
 */
export function deploymentTime(data: InfoObject | null): string | null {
  if (!data) {
    return null
  }
  for (const key of DEPLOYMENT_TIME_KEYS) {
    const value = valueAtPath(data, key)
    if (value && !Number.isNaN(new Date(value).getTime())) {
      return value
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

const INFO_FIELDS = [
  { key: 'version', label: 'Version', paths: ['app.version', 'build.version'] },
  {
    key: 'revision',
    label: 'Revision',
    paths: ['git.commit', 'git.commit.id', 'git.commit.id.full', 'git.commit.id.abbrev'],
  },
  { key: 'branch', label: 'Branch', paths: ['git.branch'] },
  { key: 'built', label: 'Built', paths: ['build.time'] },
] as const

/** Selects and labels the release metadata useful to people viewing the About panel. */
export function infoRows(data: InfoObject | null): InfoRow[] {
  if (!data) {
    return []
  }
  const rows: InfoRow[] = []
  for (const { key, label, paths } of INFO_FIELDS) {
    const value = paths.map((path) => valueAtPath(data, path)).find(isUsefulValue)
    if (!value) {
      continue
    }
    if (key === 'revision') {
      rows.push({
        key,
        label,
        value: value.slice(0, 7),
        href: commitUrl(value),
      })
    } else if (key === 'built') {
      rows.push({ key, label, value: formatBuildTime(value) })
    } else {
      rows.push({ key, label, value })
    }
  }
  return rows
}

function formatBuildTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
}

function valueAtPath(data: InfoObject, path: string): string | null {
  let value: InfoValue | undefined = data
  for (const part of path.split('.')) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null
    }
    value = value[part]
  }
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null
}

function isUsefulValue(value: string | null): value is string {
  return Boolean(value && value.toLowerCase() !== 'unknown')
}

function commitUrl(commit: string): string | undefined {
  if (!GITHUB_REPO_URL || !/^[0-9a-f]{7,40}$/i.test(commit)) {
    return undefined
  }
  return `${GITHUB_REPO_URL}/commit/${commit}`
}
