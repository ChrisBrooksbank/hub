import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const noWebGL = () => {
  const original = HTMLCanvasElement.prototype.getContext as (
    this: HTMLCanvasElement,
    ...args: unknown[]
  ) => unknown
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: unknown[]) {
    if (String(args[0]).includes('webgl')) return null
    return original.apply(this, args)
  } as typeof HTMLCanvasElement.prototype.getContext
}

async function seriousViolations(page: import('@playwright/test').Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
}

test('list view has no serious or critical axe violations', async ({ page }) => {
  await page.goto('/?theme=basic')
  await expect(page.locator('.list-view a').first()).toBeVisible()
  expect(await seriousViolations(page)).toEqual([])
})

test('list view stays usable at 200% zoom', async ({ page }) => {
  // 200% zoom on a 1280x1024 window is a 640x512 CSS viewport.
  await page.setViewportSize({ width: 640, height: 512 })
  await page.goto('/?theme=basic')
  await expect(page.locator('.list-view a').first()).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
  expect(await seriousViolations(page)).toEqual([])
})

test('Basic initial load requests no three.js', async ({ page }) => {
  const urls: string[] = []
  page.on('request', (req) => urls.push(req.url()))
  await page.goto('/?theme=basic')
  await expect(page.locator('.list-view a').first()).toBeVisible()
  expect(urls.filter((u) => /three/i.test(u))).toEqual([])
})

test('with WebGL disabled the list renders and links work', async ({ page }) => {
  await page.addInitScript(noWebGL)
  await page.goto('/')
  const links = page.locator('.list-view a[href]')
  await expect(links.first()).toBeVisible()
  expect(await links.count()).toBeGreaterThan(0)
  for (const href of await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
    expect(href).toMatch(/^https?:\/\//)
  }
  expect(await seriousViolations(page)).toEqual([])
})
