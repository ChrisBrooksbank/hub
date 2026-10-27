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
