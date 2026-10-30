import { expect, test } from '@playwright/test'

const DETAIL_SITE = 'arcana-veritas'

// Baselines are rendered by the local GPU/software stack and carry a platform suffix,
// so they are only compared where they were generated (not on the Linux CI runner).
test.skip(!!process.env.CI, 'screenshot baselines are platform-specific')
test.skip(({ isMobile }) => isMobile, 'baselines are captured at desktop size only')

test.use({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } })

const options = { maxDiffPixelRatio: 0.02, animations: 'disabled' } as const

test('table overview baseline', async ({ page }) => {
  await page.goto('/?back=arcana')
  await expect(page.locator('canvas.table-canvas')).toHaveAttribute('data-dealt', 'true')
  await page.waitForTimeout(1500)
  await expect(page).toHaveScreenshot('overview-table.png', options)
})

test('table detail baseline', async ({ page }) => {
  await page.goto(`/?back=arcana#/site/${DETAIL_SITE}`)
  await expect(page.locator('canvas.table-canvas')).toHaveAttribute('data-dealt', 'true')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.waitForTimeout(1500)
  await expect(page).toHaveScreenshot('detail-table.png', options)
})

test('list overview baseline', async ({ page }) => {
  await page.goto('/?view=list')
  await expect(page.locator('.list-view a').first()).toBeVisible()
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot('overview-list.png', options)
})
