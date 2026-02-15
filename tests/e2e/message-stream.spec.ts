import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

test.describe('Message Stream', () => {
  test('renders messages when session is selected', async () => {
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

      // Click the test project
      await window.waitForSelector('[data-testid="project--test-project"]', { timeout: 5000 })
      await window.click('[data-testid="project--test-project"]')

      // Wait for sessions to load and click the test session
      await window.waitForSelector('[data-testid="session-list-items"]', { timeout: 5000 })
      await window.click('[data-testid="session-main-session-test-123"]')

      // Wait for message stream to render
      await window.waitForSelector('[data-testid="message-stream-content"]', { timeout: 5000 })

      // Should show user messages
      const userMessages = window.locator('[data-testid="user-message"]')
      const userCount = await userMessages.count()
      expect(userCount).toBeGreaterThan(0)

      // Should show assistant messages
      const assistantMessages = window.locator('[data-testid="assistant-message"]')
      const assistantCount = await assistantMessages.count()
      expect(assistantCount).toBeGreaterThan(0)

      // Should show model badge on assistant messages
      const modelBadge = window.locator('[data-testid="model-badge"]').first()
      await expect(modelBadge).toBeVisible()
      const modelText = await modelBadge.textContent()
      expect(modelText).toContain('opus')

      // Should show tool call cards
      const toolCards = window.locator('[data-testid="tool-call-card"]')
      const toolCount = await toolCards.count()
      expect(toolCount).toBeGreaterThan(0)

      // Should show token usage bar
      const tokenBar = window.locator('[data-testid="token-usage-bar"]')
      await expect(tokenBar).toBeVisible()

    } finally {
      if (app) {
        await app.close()
      }
    }
  })

  test('raw toggle shows JSON view', async () => {
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

      // Navigate to session
      await window.waitForSelector('[data-testid="project--test-project"]', { timeout: 5000 })
      await window.click('[data-testid="project--test-project"]')
      await window.waitForSelector('[data-testid="session-list-items"]', { timeout: 5000 })
      await window.click('[data-testid="session-main-session-test-123"]')
      await window.waitForSelector('[data-testid="message-stream-content"]', { timeout: 5000 })

      // Click global raw toggle
      await window.click('[data-testid="global-raw-toggle"]')

      // Should show raw JSON views
      const rawViews = window.locator('[data-testid="raw-json-view"]')
      const rawCount = await rawViews.count()
      expect(rawCount).toBeGreaterThan(0)

      // Toggle back off
      await window.click('[data-testid="global-raw-toggle"]')

      // Should show formatted messages again
      const userMessages = window.locator('[data-testid="user-message"]')
      const userCount = await userMessages.count()
      expect(userCount).toBeGreaterThan(0)

    } finally {
      if (app) {
        await app.close()
      }
    }
  })

  test('tool call cards are collapsible', async () => {
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

      // Navigate to session
      await window.waitForSelector('[data-testid="project--test-project"]', { timeout: 5000 })
      await window.click('[data-testid="project--test-project"]')
      await window.waitForSelector('[data-testid="session-list-items"]', { timeout: 5000 })
      await window.click('[data-testid="session-main-session-test-123"]')
      await window.waitForSelector('[data-testid="message-stream-content"]', { timeout: 5000 })

      // Tool input should be collapsed initially
      const inputContent = window.locator('[data-testid="tool-input-content"]').first()
      await expect(inputContent).not.toBeVisible()

      // Click input toggle
      const inputToggle = window.locator('[data-testid="tool-input-toggle"]').first()
      await inputToggle.click()

      // Input should now be visible
      await expect(inputContent).toBeVisible()

      // Tool output toggle should exist
      const outputToggle = window.locator('[data-testid="tool-output-toggle"]').first()
      await expect(outputToggle).toBeVisible()

    } finally {
      if (app) {
        await app.close()
      }
    }
  })
})
