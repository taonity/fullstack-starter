import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env'

export async function GET() {
  const { localBackendUrl } = getServerEnv()
  const checks: Record<string, { status: string }> = {}

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${localBackendUrl}/actuator/health/liveness`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    checks.backend = { status: res.ok ? 'UP' : 'DOWN' }
  } catch {
    checks.backend = { status: 'DOWN' }
  }

  const overallStatus = Object.values(checks).every((c) => c.status === 'UP')
    ? 'UP'
    : 'DOWN'

  return NextResponse.json(
    { status: overallStatus, checks },
    { status: overallStatus === 'UP' ? 200 : 503 },
  )
}
