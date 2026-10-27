import { expect, test } from '@playwright/test'

test('professional theme mounts the 3D scene with an accessible canvas', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?theme=professional')
  const canvas = page.locator('.scene-root canvas')
  await expect(canvas).toBeVisible()
  await expect(canvas).toHaveAttribute('role', 'application')
  await expect(canvas).toHaveAttribute('data-rotation', /.+/)
  expect(errors).toEqual([])
})

async function readRotation(page: import('@playwright/test').Page): Promise<number> {
  const value = await page.locator('.scene-root canvas').getAttribute('data-rotation')
  return Number(value)
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('auto-rotation does not change the angle over 3 seconds', async ({ page }) => {
    await page.goto('/?theme=professional')
    await expect(page.locator('.scene-root canvas')).toHaveAttribute('data-rotation', /.+/)
    const before = await readRotation(page)
    await page.waitForTimeout(3000)
    expect(await readRotation(page)).toBe(before)
  })
})

test.describe('default motion', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('auto-rotation advances the angle when idle', async ({ page }) => {
    await page.goto('/?theme=professional')
    await expect(page.locator('.scene-root canvas')).toHaveAttribute('data-rotation', /.+/)
    const before = await readRotation(page)
    await expect.poll(async () => await readRotation(page), { timeout: 15000 }).not.toBe(before)
  })
})
