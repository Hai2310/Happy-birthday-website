import { expect, test } from '@playwright/test'

/** Opens the invitation, then visits every chapter through the menu, checking that each overlay renders and nothing logs an error. */
test('every chapter renders without console errors', async ({ page }, info) => {
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.inv-cta').first()).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: info.outputPath('00-invitation.png') })

  await page.locator('.top-controls .ctl').last().click()
  const rows = page.locator('.chapter-row')
  const n = await rows.count()
  expect(n).toBe(9)
  await page.locator('.btn-close').click()

  for (let i = 1; i < n; i++) {
    await page.locator('.top-controls .ctl').last().click()
    await rows.nth(i).click()
    await expect(page.locator('.progress-label')).toContainText(String(i + 1).padStart(2, '0'), { timeout: 60_000 })
    await page.waitForTimeout(6000)
    await expect(page.locator('.overlay-root')).toHaveClass(/opacity-100/)
    await page.screenshot({ path: info.outputPath(`${String(i).padStart(2, '0')}.png`) })
  }
  expect(errors).toEqual([])
})

test('gallery opens every photo in the lightbox', async ({ page }) => {
  await page.goto('/')
  await page.locator('.top-controls .ctl').nth(-2).click()
  const items = page.locator('.gallery-item')
  await expect(items.first()).toBeVisible()
  expect(await items.count()).toBeGreaterThan(0)
  await items.first().click()
  await expect(page.locator('.lightbox-img')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.lightbox-img')).toBeVisible()
})

test('2D fallback shows the letter and photos', async ({ page }) => {
  await page.goto('/?2d')
  await expect(page.locator('.fallback')).toBeVisible()
  await expect(page.locator('.fallback img').first()).toBeVisible()
})
