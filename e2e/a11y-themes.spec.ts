import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolveManifest } from '../src/data/manifest.ts'
import type { SiteRecord } from '../src/data/merge.ts'
import { THEMES } from '../src/themes/index.ts'

function readJson(path: string): SiteRecord[] {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as SiteRecord[]) : []
}

const { visible: sites } = resolveManifest(
  readJson('data/sites.generated.json'),
  readJson('data/sites.overrides.json'),
)

async function seriousViolations(page: import('@playwright/test').Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target) }))
}

test.describe('axe sweep', () => {
  test.use({ reducedMotion: 'reduce' })

  for (const theme of THEMES) {
    test(`${theme.id}: overview has no serious or critical violations`, async ({ page }) => {
      await page.goto(`/?theme=${theme.id}`)
      const ready =
        theme.presentation === 'list' ? '.list-view a' : '.scene-root canvas[data-rotation]'
      await expect(page.locator(ready).first()).toBeVisible()
      expect(await seriousViolations(page)).toEqual([])
    })

    if (theme.presentation === 'scene') {
      test(`${theme.id}: detail panel has no serious or critical violations`, async ({ page }) => {
        await page.goto(`/?theme=${theme.id}`)
        await expect(page.locator('.scene-root canvas[data-rotation]')).toBeVisible()
        await page.evaluate((id) => {
          window.location.hash = `#/site/${encodeURIComponent(id)}`
        }, sites[0].id)
        await expect(page.locator('.detail-panel')).toBeVisible()
        expect(await seriousViolations(page)).toEqual([])
      })
    }
  }
})
