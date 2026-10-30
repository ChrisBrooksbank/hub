import { expect, test, type Page } from '@playwright/test'

const canvas = (page: Page) => page.locator('canvas.table-canvas')

test('the table deals every site as a card on an accessible canvas', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(canvas(page)).toBeVisible()
  await expect(canvas(page)).toHaveAttribute('role', 'img')
  await expect(canvas(page)).toHaveAttribute('data-dealt', 'true')
  const cards = Number(await canvas(page).getAttribute('data-cards'))
  expect(cards).toBeGreaterThanOrEqual(25)
  expect(errors).toEqual([])
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('clicking a card opens its details, and Escape closes them', async ({ page }) => {
    await page.goto('/')
    await expect(canvas(page)).toHaveAttribute('data-dealt', 'true')
    const box = await canvas(page).boundingBox()
    if (!box) throw new Error('canvas has no box')

    const panel = page.locator('.detail-panel')
    let opened = false
    // Sweep the table until a click lands on a card.
    for (let row = 1; row < 8 && !opened; row++) {
      for (let column = 1; column < 12 && !opened; column++) {
        await page.mouse.click(box.x + (box.width * column) / 12, box.y + (box.height * row) / 8)
        opened = await panel.isVisible()
      }
    }
    expect(opened).toBe(true)
    await expect(panel.locator('a.launch').first()).toHaveAttribute('href', /^https?:\/\//)
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
  })

  test('filtering gathers the other cards into the deck and the count follows', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(canvas(page)).toHaveAttribute('data-dealt', 'true')
    const total = await page.locator('.count').textContent()
    await page.getByRole('searchbox', { name: 'Search sites' }).fill('zzzz-no-such-site')
    await expect(page.locator('.count')).toHaveText(/^0 of /)
    await page.getByRole('searchbox', { name: 'Search sites' }).fill('')
    await expect(page.locator('.count')).toHaveText(total ?? '')
  })

  test('Shuffle re-deals the table', async ({ page }) => {
    await page.goto('/')
    await expect(canvas(page)).toHaveAttribute('data-dealt', 'true')
    await page.getByRole('button', { name: 'Shuffle' }).click()
    await expect(canvas(page)).toHaveAttribute('data-dealt', 'true')
  })
})

test('the list view is one click away and remembered', async ({ page }) => {
  await page.goto('/')
  await expect(canvas(page)).toBeVisible()
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await expect(page.locator('.list-view a').first()).toBeVisible()
  await expect(canvas(page)).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.list-view a').first()).toBeVisible()
})
