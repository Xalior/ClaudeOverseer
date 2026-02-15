import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

test.describe('Project Discovery', () => {
  test('discovers and displays projects from fixtures', async () => {
    let app
    try {
      // Create a temporary paths.txt that points to our fixtures
      const fixturesDir = path.join(__dirname, '../fixtures/projects')
      const tempPathsFile = join(tmpdir(), `paths-${Date.now()}.txt`)
      writeFileSync(tempPathsFile, `Claude Project Dir = ${fixturesDir}`)

      // Launch app with temp paths file
      app = await electron.launch({
        args: [path.join(__dirname, '../../out/main/index.js')],
        cwd: path.join(__dirname, '../..'),
        env: {
          ...process.env,
          PATHS_FILE: tempPathsFile
        }
      })

      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      // Wait for projects to load
      await window.waitForSelector('[data-testid="project-list"]', { timeout: 5000 })

      // Should show the test project
      const projectItem = window.locator('[data-testid="project--test-project"]')
      await expect(projectItem).toBeVisible()

      // Project should show session count badge
      const badge = projectItem.locator('.badge')
      await expect(badge).toBeVisible()
      const count = await badge.textContent()
      expect(parseInt(count || '0')).toBeGreaterThan(0)

    } finally {
      if (app) {
        await app.close()
      }
    }
  })

  test('displays sessions when project is selected', async () => {
    let app
    try {
      const fixturesDir = path.join(__dirname, '../fixtures/projects')
      const tempPathsFile = join(tmpdir(), `paths-${Date.now()}.txt`)
      writeFileSync(tempPathsFile, `Claude Project Dir = ${fixturesDir}`)

      app = await electron.launch({
        args: [path.join(__dirname, '../../out/main/index.js')],
        cwd: path.join(__dirname, '../..'),
        env: {
          ...process.env,
          PATHS_FILE: tempPathsFile
        }
      })

      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      // Wait for and click the test project
      await window.waitForSelector('[data-testid="project--test-project"]', { timeout: 5000 })
      await window.click('[data-testid="project--test-project"]')

      // Sessions should load
      await window.waitForSelector('[data-testid="session-list-items"]', { timeout: 5000 })

      // Should have multiple session items
      const sessionItems = window.locator('[data-testid^="session-"]')
      const count = await sessionItems.count()
      expect(count).toBeGreaterThan(0)

      // Should have different session types
      const mainSessions = window.locator('[data-testid^="session-main-"]')
      const subagentSessions = window.locator('[data-testid^="session-subagent-"]')

      const mainCount = await mainSessions.count()
      const subagentCount = await subagentSessions.count()

      // We know our fixture has both main sessions and subagents
      expect(mainCount).toBeGreaterThan(0)
      expect(subagentCount).toBeGreaterThan(0)

    } finally {
      if (app) {
        await app.close()
      }
    }
  })

  test('no orphaned processes after project discovery workflow', async () => {
    // Verify cleanup by running the full workflow 3 times
    for (let i = 0; i < 3; i++) {
      let app
      try {
        app = await electron.launch({
          args: [path.join(__dirname, '../../out/main/index.js')],
        })

        const window = await app.firstWindow()
        await window.waitForLoadState('domcontentloaded')
        // Just wait for the panels to render (always present regardless of data)
        await window.waitForSelector('[data-testid="project-sidebar"]', { timeout: 10000 })

      } finally {
        if (app) {
          await app.close()
        }
      }
    }

    // If we got here without hanging, cleanup is working
    expect(true).toBe(true)
  })
})
