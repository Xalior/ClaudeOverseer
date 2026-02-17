import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'

test.describe('Theme Toggle', () => {
  test('shows theme toggle with light/system/dark buttons', async () => {
    let app
    try {
      app = await electron.launch({
        args: [path.join(__dirname, '../../out/main/index.js')],
      })

      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      // Wait for the theme toggle to appear
      const themeToggle = window.locator('[data-testid="theme-toggle"]')
      await expect(themeToggle).toBeVisible({ timeout: 5000 })

      // Should have three theme buttons
      const lightBtn = window.locator('[data-testid="theme-light"]')
      const systemBtn = window.locator('[data-testid="theme-system"]')
      const darkBtn = window.locator('[data-testid="theme-dark"]')

      await expect(lightBtn).toBeVisible()
      await expect(systemBtn).toBeVisible()
      await expect(darkBtn).toBeVisible()

      // System should be the default active mode
      await expect(systemBtn).toHaveClass(/theme-toggle__btn--active/)

    } finally {
      if (app) {
        await app.close()
      }
    }
  })

  test('switches theme and applies data-theme attribute', async () => {
    let app
    try {
      app = await electron.launch({
        args: [path.join(__dirname, '../../out/main/index.js')],
      })

      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')
      await window.waitForSelector('[data-testid="theme-toggle"]', { timeout: 5000 })

      // Click dark theme
      await window.click('[data-testid="theme-dark"]')

      // Verify data-theme attribute is set on html element
      const theme = await window.evaluate(() => document.documentElement.getAttribute('data-theme'))
      expect(theme).toBe('dark')

      // Click light theme
      await window.click('[data-testid="theme-light"]')

      const lightTheme = await window.evaluate(() => document.documentElement.getAttribute('data-theme'))
      expect(lightTheme).toBe('light')

      // Dark button should no longer be active
      const darkBtn = window.locator('[data-testid="theme-dark"]')
      await expect(darkBtn).not.toHaveClass(/theme-toggle__btn--active/)

      // Light button should be active
      const lightBtn = window.locator('[data-testid="theme-light"]')
      await expect(lightBtn).toHaveClass(/theme-toggle__btn--active/)

    } finally {
      if (app) {
        await app.close()
      }
    }
  })
})
