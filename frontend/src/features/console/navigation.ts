const TABS = ['about', 'config', 'admin'] as const
export type TabKey = typeof TABS[number]

export function readConsoleTab(search: string, fallback: TabKey = 'about'): TabKey {
  const requested = new URLSearchParams(search).get('tab')
  return requested === null ? fallback : TABS.find(tab => tab === requested) ?? 'about'
}

export function consoleTabUrl(currentUrl: string, tab: TabKey): string {
  const url = new URL(currentUrl)
  url.searchParams.set('tab', tab)
  return `${url.pathname}${url.search}${url.hash}`
}
