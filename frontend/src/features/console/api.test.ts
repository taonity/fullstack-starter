import { afterEach, expect, it, vi } from 'vitest'
import { consoleApi } from './api'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('combines search, exact match, date bounds, sorting and pagination in the proxy URL', async () => {
  const fetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>().mockResolvedValue(Response.json({ content: [] }))
  vi.stubGlobal('fetch', fetch)
  await consoleApi.listAuditLogs(2, 20, ' audit@example.com ', 'actorEmail', 'occurredAt', 'asc', true, '2026-09-08', '2026-10-28')
  const url = new URL(String(fetch.mock.calls[0]![0]), 'http://frontend.test')
  expect(url.pathname).toBe('/api/console/audit-logs')
  expect(Object.fromEntries(url.searchParams)).toEqual({
    page: '2', size: '20', q: 'audit@example.com', field: 'actorEmail',
    sort: 'occurredAt', direction: 'asc', exact: 'true', startDate: '2026-09-08', endDate: '2026-10-28',
  })
})

it('omits cleared filters instead of sending empty date parameters', async () => {
  const fetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>().mockResolvedValue(Response.json({ content: [] }))
  vi.stubGlobal('fetch', fetch)
  await consoleApi.listAuditLogs(0, 50, '', 'all', undefined, undefined, false, '', '')
  expect(fetch.mock.calls[0]![0]).toBe('/api/console/audit-logs?page=0&size=50')
})

it('surfaces the backend validation message for a rejected date period', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ errorMessage: 'Invalid date period' }, { status: 400 })))
  await expect(consoleApi.listAuditLogs(0, 50)).rejects.toThrow('Invalid date period')
})

it('explains a gateway timeout', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 504 })))
  await expect(consoleApi.listAuditLogs(0, 50)).rejects.toThrow('Request timed out. Please try again.')
})

it('allows console reads to run for sixty seconds before timing out', async () => {
  vi.useFakeTimers()
  const aborted = vi.fn()
  vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => {
      aborted()
      reject(new DOMException('aborted', 'AbortError'))
    })
  })))
  const pending = consoleApi.listAuditLogs(0, 50)
  const assertion = expect(pending).rejects.toThrow('Request timed out. Please try again.')
  await vi.advanceTimersByTimeAsync(10_000)
  expect(aborted).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(50_000)
  await assertion
  expect(aborted).toHaveBeenCalledOnce()
})
