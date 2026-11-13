import { describe, expect, it } from 'vitest'
import { consoleTabUrl, readConsoleTab } from './navigation'

describe('console navigation', () => {
  it('uses explicit URL tabs before the stored tab', () => {
    expect(readConsoleTab('?tab=config', 'admin')).toBe('config')
    expect(readConsoleTab('', 'admin')).toBe('admin')
    expect(readConsoleTab('?tab=unknown', 'admin')).toBe('about')
  })
  it('preserves other query parameters and the fragment', () => {
    expect(consoleTabUrl('https://example.test/?tab=about&filter=a%20b#details', 'config'))
      .toBe('/?tab=config&filter=a+b#details')
  })
})
