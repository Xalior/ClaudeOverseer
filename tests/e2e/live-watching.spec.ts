import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import { writeFileSync, appendFileSync, mkdtempSync, copyFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

test.describe('Live Watching', () => {
  test('new messages appear when JSONL file is appended', async () => {
    let app
    try {
      // Create a temporary fixture directory with a copy of the session
      const tempDir = mkdtempSync(join(tmpdir(), 'overseer-live-'))
      const projectDir = join(tempDir, '-test-project')
      mkdirSync(projectDir, { recursive: true })

      // Copy initial session file
      const sourceFile = path.join(__dirname, '../fixtures/projects/-test-project/session-test-123.jsonl')
      const targetFile = join(projectDir, 'session-test-123.jsonl')
      copyFileSync(sourceFile, targetFile)

      const tempPathsFile = join(tmpdir(), `paths-live-${Date.now()}.txt`)
      writeFileSync(tempPathsFile, `Claude Project Dir = ${tempDir}`)

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

      // Navigate to the session
      await window.waitForSelector('[data-testid="project--test-project"]', { timeout: 5000 })
      await window.click('[data-testid="project--test-project"]')
      await window.waitForSelector('[data-testid="session-list-items"]', { timeout: 5000 })
      await window.click('[data-testid="session-main-session-test-123"]')
      await window.waitForSelector('[data-testid="message-stream-content"]', { timeout: 5000 })

      // Count current messages
      const initialMessages = await window.locator('[data-testid="user-message"], [data-testid="assistant-message"]').count()

      // Append a new message to the JSONL file
      const newMessage = JSON.stringify({
        type: 'user',
        uuid: 'msg-live-001',
        parentUuid: 'msg-010',
        timestamp: new Date().toISOString(),
        sessionId: 'test-123',
        cwd: '/test/project',
        version: '2.0.80',
        message: { role: 'user', content: 'This is a LIVE message that was just appended!' }
      })

      // Small delay to let watcher initialize
      await new Promise(r => setTimeout(r, 500))
      appendFileSync(targetFile, newMessage + '\n')

      // Wait for the new message to appear
      await window.waitForFunction(
        (initial) => {
          const msgs = document.querySelectorAll('[data-testid="user-message"], [data-testid="assistant-message"]')
          return msgs.length > initial
        },
        initialMessages,
        { timeout: 5000 }
      )

      // Verify the new message count is higher
      const finalMessages = await window.locator('[data-testid="user-message"], [data-testid="assistant-message"]').count()
      expect(finalMessages).toBeGreaterThan(initialMessages)

    } finally {
      if (app) {
        await app.close()
      }
    }
  })
})
