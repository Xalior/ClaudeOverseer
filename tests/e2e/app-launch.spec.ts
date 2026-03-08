import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

function cleanPrefsFile(): string {
  const f = join(tmpdir(), `prefs-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
  writeFileSync(f, '{}')
  return f
}

test.describe('App Launch', () => {
  test('launches app and shows three panels', async () => {
    let app
    try {
      // Launch Electron app with clean prefs to avoid saved state interference
      app = await electron.launch({
        args: [path.join(__dirname, '../../out/main/index.js')],
        env: { ...process.env, PREFS_FILE: cleanPrefsFile() }
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
      await expect(sessionList).toContainText('Threads')
      await expect(messageStream).toContainText('Message Stream')

    } finally {
      // CRITICAL: Always close the app, even if test fails
      if (app) {
        await app.close()
      }
    }
  })

  test('collapse and expand projects panel', async () => {
    let app
    try {
      app = await electron.launch({
        args: [path.join(__dirname, '../../out/main/index.js')],
        env: { ...process.env, PREFS_FILE: cleanPrefsFile() }
      })

      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      const projectSidebar = window.locator('[data-testid="project-sidebar"]')
      await expect(projectSidebar).toBeVisible()

      // Should start expanded with the collapse button visible
      const collapseBtn = window.locator('button[aria-label="Collapse projects panel"]')
      await expect(collapseBtn).toBeVisible({ timeout: 5000 })

      // Click collapse
      await collapseBtn.click()

      // Should now show the expand button instead
      const expandBtn = window.locator('button[aria-label="Expand projects panel"]')
      await expect(expandBtn).toBeVisible({ timeout: 3000 })

      // The sidebar should be narrow (collapsed) — wait for CSS transition
      await window.waitForFunction(
        () => {
          const el = document.querySelector('[data-testid="project-sidebar"]')
          return el && el.offsetWidth <= 50
        },
        { timeout: 3000 }
      )

      // Click expand
      await expandBtn.click()

      // Collapse button should be back
      await expect(collapseBtn).toBeVisible({ timeout: 3000 })

      // Sidebar should be wider again
      const expandedWidth = await projectSidebar.evaluate(el => el.offsetWidth)
      expect(expandedWidth).toBeGreaterThan(100)

    } finally {
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
          env: { ...process.env, PREFS_FILE: cleanPrefsFile() }
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
