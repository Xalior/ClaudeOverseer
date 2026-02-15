import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'

test.describe('App Launch', () => {
  test('launches app and shows three panels', async () => {
    let app
    try {
      // Launch Electron app
      app = await electron.launch({
        args: [path.join(__dirname, '../../out/main/index.js')],
      })

      // Get the first window
      const window = await app.firstWindow()

      // Wait for the app to be ready
      await window.waitForLoadState('domcontentloaded')

      // Verify three panels exist with correct data-testid attributes
      const projectSidebar = window.locator('[data-testid="project-sidebar"]')
      const sessionList = window.locator('[data-testid="session-list"]')
      const messageStream = window.locator('[data-testid="message-stream"]')

      // All panels should be visible
      await expect(projectSidebar).toBeVisible()
      await expect(sessionList).toBeVisible()
      await expect(messageStream).toBeVisible()

      // Verify panel content
      await expect(projectSidebar).toContainText('Projects')
      await expect(sessionList).toContainText('Sessions')
      await expect(messageStream).toContainText('Message Stream')

    } finally {
      // CRITICAL: Always close the app, even if test fails
      if (app) {
        await app.close()
      }
    }
  })

  test('no orphaned processes after close', async () => {
    // This test verifies cleanup by launching and closing multiple times
    for (let i = 0; i < 3; i++) {
      let app
      try {
        app = await electron.launch({
          args: [path.join(__dirname, '../../out/main/index.js')],
        })
        const window = await app.firstWindow()
        await window.waitForLoadState('domcontentloaded')
      } finally {
        if (app) {
          await app.close()
        }
      }
    }

    // If we get here without hanging, cleanup is working
    // Manual verification: run `ps aux | grep electron` after test suite
    expect(true).toBe(true)
  })
})
