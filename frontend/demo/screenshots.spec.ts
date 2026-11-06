import { expect, test } from '@playwright/test'
import { createScreenshotCapture } from '@taonity/demo-screenshots'

const capture = createScreenshotCapture(expect)
const scenes = [
  { name: 'admin', tab: 'admin', ready: 'Pending access requests', session: 'owner' },
  { name: 'config', tab: 'config', ready: 'Search settings', session: 'owner' },
  { name: 'about', tab: 'about', ready: 'Using the console', session: 'owner' },
  { name: 'login', ready: 'Sign in with Google', session: null },
  { name: 'request-access', ready: 'Request access', session: 'guest' },
  { name: 'access-pending', ready: 'Access pending', session: 'pending' },
] as const

for (const scene of scenes) {
  test.describe(scene.name, () => {
    test.use({ storageState: scene.session ? `test-results/demo-${scene.session}.json` : { cookies: [], origins: [] } })

    test('capture', async ({ page, baseURL }, testInfo) => {
      const failures: string[] = []
      page.on('pageerror', error => failures.push(error.message))
      page.on('response', response => {
        if (response.url().startsWith(`${baseURL}/api/`) && response.status() >= 400 && !(scene.name === 'login' && response.status() === 401)) failures.push(`${response.status()} ${response.url()}`)
      })
      await page.clock.setFixedTime(new Date('2026-06-15T10:30:00Z'))
      await page.addInitScript(({ theme, tab }) => {
        localStorage.setItem('theme', theme)
        if (tab) localStorage.setItem('console.activeTab', tab)
      }, { theme: testInfo.project.use.colorScheme === 'dark' ? 'dark' : 'light', tab: 'tab' in scene ? scene.tab : null })
      await page.route('**/api/actuator/{info,backend}', async route => {
        const response = await route.fetch()
        const data = await response.json()
        if (data.build?.time) data.build.time = '2026-06-15T10:30:00.000Z'
        if (data.runtime) data.runtime.uptime = 3600
        await route.fulfill({ response, json: data })
      })
      await page.goto(scene.name === 'login' ? '/login' : '/')
      await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' })
      if (scene.name === 'config') await expect(page.getByRole('textbox', { name: scene.ready })).toBeVisible()
      else if (scene.name === 'login' || scene.name === 'request-access') await expect(page.getByRole('button', { name: scene.ready, exact: true })).toBeVisible()
      else await expect(page.getByText(scene.ready, { exact: true })).toBeVisible()
      if (scene.name === 'admin') {
        await expect(page.getByText('James Chen', { exact: true }).first()).toBeVisible()
        await expect(page.getByText('Sophia Patel', { exact: true }).first()).toBeVisible()
        await expect(page.getByText('EDIT_CONFIG', { exact: true })).toBeVisible()
        const audit = await page.request.get('/api/console/audit-logs?page=0&size=50&sort=occurredAt&direction=desc')
        expect(audit.ok()).toBe(true)
        const records = await audit.json()
        expect(records.content).toHaveLength(5)
        expect(records.content[0].occurredAt).toContain('2026-06-15T10:24:00')
      }
      await expect(page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0)
      await expect(page.locator('.error-notification')).toHaveCount(0)
      const content = await page.locator('main, .login-card').allInnerTexts()
      expect(content.join('\n')).not.toMatch(/\p{Script=Cyrillic}|\p{Script=Han}|\p{Script=Arabic}/u)
      expect(content.join('\n')).not.toContain('artiom.diulgher@gmail.com')
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(testInfo.project.use.viewport!.width)
      expect(failures).toEqual([])
      if (testInfo.project.name.startsWith('desktop') && scene.name !== 'login') {
        const clip = await page.locator('.console-shell > div').first().evaluate(element => {
          const bounds = element.getBoundingClientRect()
          return { x: Math.floor(bounds.left) - 16, y: 0, width: Math.ceil(bounds.width) + 32, height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, innerHeight) }
        })
        await capture(page, testInfo, scene.name, { clip })
      } else {
        if (testInfo.project.name.startsWith('desktop')) await page.setViewportSize({ width: 1232, height: 1000 })
        await capture(page, testInfo, scene.name)
      }
    })
  })
}
