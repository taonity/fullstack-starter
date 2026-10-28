import { expect, it } from 'vitest'
import { formatExactTime } from './format'

it('formats an exact timestamp in UTC regardless of the source offset', () => {
  expect(formatExactTime('2026-10-28T17:46:12+02:00')).toBe('2026-10-28 15:46:12 UTC')
})

it('preserves invalid timestamps and handles absent values', () => {
  expect(formatExactTime(null)).toBe('—')
  expect(formatExactTime(undefined)).toBe('—')
  expect(formatExactTime('invalid')).toBe('invalid')
})
