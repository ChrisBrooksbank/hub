import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { resolveManifest } from '../src/data/manifest.ts'
import type { SiteRecord } from '../src/data/merge.ts'

function readJson(path: string): SiteRecord[] {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as SiteRecord[]) : []
}

const { visible: sites } = resolveManifest(
  readJson('data/sites.generated.json'),
  readJson('data/sites.overrides.json'),
)

test.describe('launching sites', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the manifest has sites to check', () => {
    expect(sites.length).toBeGreaterThanOrEqual(25)
  })

  test('every site opens its detail panel with the correct Launch URL', async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })

    await page.goto('/?theme=professional')
    await expect(page.locator('.scene-root canvas')).toHaveAttribute('data-rotation', /.+/)

    const panel = page.locator('.detail-panel')
    for (const site of sites) {
      await page.evaluate((id) => {
        window.location.hash = `#/site/${encodeURIComponent(id)}`
      }, site.id)
      await expect(panel, site.id).toBeVisible()
      await expect(panel.locator('h2'), site.id).toHaveText(site.name)
      const launch = panel.locator('a.launch')
      await expect(launch, site.id).toHaveAttribute('href', site.url)
      await expect(launch, site.id).toHaveAttribute('target', '_blank')
      await expect(launch, site.id).toHaveAttribute('rel', /noopener/)
      await page.keyboard.press('Escape')
      await expect(panel, site.id).toBeHidden()
    }

    expect(errors).toEqual([])
  })

  test('keyboard alone reaches the Launch link', async ({ page }) => {
    const first = sites[0]
    if (!first) throw new Error('manifest is empty')
    await page.goto('/?theme=professional')
    await expect(page.locator('.scene-root canvas')).toHaveAttribute('data-rotation', /.+/)

    await page.evaluate((id) => {
      window.location.hash = `#/site/${encodeURIComponent(id)}`
    }, first.id)
    const launch = page.locator('.detail-panel a.launch')
    await expect(launch).toBeVisible()
    await expect(launch).toBeFocused()

    // Tab cycles within the modal and never escapes it.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(() =>
        document.querySelector('.detail-panel')?.contains(document.activeElement),
      )
      expect(inside).toBe(true)
    }
  })
})
