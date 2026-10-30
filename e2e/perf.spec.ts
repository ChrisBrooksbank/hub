import { expect, test } from '@playwright/test'

test('loads under 3s on a throttled network', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  })
  const start = Date.now()
  await page.goto('/?view=list')
  await expect(page.locator('#app')).not.toBeEmpty()
  expect(Date.now() - start).toBeLessThan(3000)
})
