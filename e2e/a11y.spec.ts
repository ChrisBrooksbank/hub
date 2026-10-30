import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolveManifest } from '../src/data/manifest.ts'
import type { SiteRecord } from '../src/data/merge.ts'

function readJson(path: string): SiteRecord[] {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as SiteRecord[]) : []
}

const { visible: sites } = resolveManifest(
  readJson('data/sites.generated.json'),
  readJson('data/sites.overrides.json'),
)

async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target) }))
}

test.describe('axe sweep', () => {
  test.use({ reducedMotion: 'reduce' })

  test('table view has no serious or critical violations', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('canvas.table-canvas')).toHaveAttribute('data-dealt', 'true')
    expect(await seriousViolations(page)).toEqual([])
  })

  test('detail panel has no serious or critical violations', async ({ page }) => {
    await page.goto(`/#/site/${encodeURIComponent(sites[0]!.id)}`)
    await expect(page.locator('.detail-panel')).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })
})
