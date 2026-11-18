import { NextRequest, NextResponse } from 'next/server'
import { fetchFromBackend } from '@/lib/backend'

export async function GET(req: NextRequest) {
  // Public availability checks must not depend on a stored user session.
  const res = await fetchFromBackend(req, '/actuator/health/liveness', {
    credentials: 'omit',
    cache: 'no-store',
  })
  return new NextResponse(res.body, { status: res.status, headers: res.headers })
}
