import { expect, test } from '@playwright/test'

test('page loads with no console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')
  await expect(page).toHaveTitle(/Hub/)
  await expect(page.locator('#app')).not.toBeEmpty()
  expect(errors).toEqual([])
})
