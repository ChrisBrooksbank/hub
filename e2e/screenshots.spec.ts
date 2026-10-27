import { expect, test } from '@playwright/test'

const THEMES = ['professional', 'retro-arcade', 'calm-zen', 'moose-mode', 'basic'] as const
const DETAIL_SITE = 'arcana-veritas'

// Baselines are rendered by the local GPU/software stack and carry a platform suffix,
// so they are only compared where they were generated (not on the Linux CI runner).
test.skip(!!process.env.CI, 'screenshot baselines are platform-specific')
test.skip(({ isMobile }) => isMobile, 'baselines are captured at desktop size only')

test.use({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } })

async function settle(page: import('@playwright/test').Page, theme: string): Promise<void> {
  await page.goto(`/?theme=${theme}`)
  if (theme !== 'basic') {
    await expect(page.locator('.scene-root canvas')).toHaveAttribute('data-rotation', /.+/)
    await page.waitForTimeout(1500)
  }
  await page.evaluate(() => document.fonts.ready)
}

for (const theme of THEMES) {
  test(`overview baseline: ${theme}`, async ({ page }) => {
    await settle(page, theme)
    await expect(page).toHaveScreenshot(`overview-${theme}.png`, {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    })
  })
}

test('detail view baseline: professional', async ({ page }) => {
  await page.goto(`/?theme=professional#/site/${DETAIL_SITE}`)
  await expect(page.locator('.scene-root canvas')).toHaveAttribute('data-rotation', /.+/)
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.waitForTimeout(1500)
  await expect(page).toHaveScreenshot('detail-professional.png', {
    maxDiffPixelRatio: 0.02,
    animations: 'disabled',
  })
})
