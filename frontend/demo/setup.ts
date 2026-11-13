import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

export default async function setup() {
  await mkdir('test-results', { recursive: true })
  const browser = await chromium.launch()
  try {
    for (const [registration, state, email] of [
      ['google-fullstack-starter', 'owner', 'alice.morgan@example.com'],
      ['stub-alice', 'pending', 'james.chen@example.com'],
      ['stub-guest', 'guest', 'emma.wilson@example.com'],
    ]) {
      const context = await browser.newContext()
      const page = await context.newPage()
      await page.goto(`http://127.0.0.1:8080/oauth2/authorization/${registration}`)
      // Hydration may add the selected tab before the login navigation settles.
      await expect(page).toHaveURL(url => url.origin === 'http://127.0.0.1:3000' && url.pathname === '/')
      await expect(page.getByText(email!, { exact: true })).toBeVisible()
      if (state === 'owner') await expect(page.getByRole('tab', { name: /^Admin/ })).toBeVisible()
      if (state === 'pending') await expect(page.getByText('Access pending', { exact: true })).toBeVisible()
      if (state === 'guest') await expect(page.getByRole('button', { name: 'Request access', exact: true })).toBeVisible()
      await context.storageState({ path: `test-results/demo-${state}.json` })
      await context.close()
    }
  } finally {
    await browser.close()
  }
}
