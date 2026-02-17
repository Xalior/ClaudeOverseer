import { describe, it, expect } from 'vitest'
import { formatToolName, parseSystemReminders, getLangFromPath, TOOL_ICONS } from '@renderer/utils/tool-formatting'

describe('Tool Formatting', () => {
  describe('formatToolName', () => {
    it('returns known icon and label for built-in tools', () => {
      const result = formatToolName('Read')
      expect(result.icon).toBe('📄')
      expect(result.label).toBe('Read')
      expect(result.server).toBeUndefined()
    })

    it('returns default icon for unknown tools', () => {
      const result = formatToolName('UnknownTool')
      expect(result.icon).toBe('🔧')
      expect(result.label).toBe('UnknownTool')
    })

    it('parses MCP tool names with server prefix', () => {
      const result = formatToolName('mcp__chrome-devtools__take_screenshot')
      expect(result.server).toBe('chrome-devtools')
      expect(result.label).toBe('take screenshot')
      expect(result.icon).toBe('📸') // Known MCP tool
    })

    it('uses tool-specific icon for MCP tools when known', () => {
      const result = formatToolName('mcp__some-server__evaluate_script')
      expect(result.icon).toBe('⚡')
      expect(result.server).toBe('some-server')
    })

    it('handles MCP tools with unknown tool names', () => {
      const result = formatToolName('mcp__my-server__custom_tool')
      expect(result.server).toBe('my-server')
      expect(result.label).toBe('custom tool')
      expect(result.icon).toBe('🔧') // Fallback
    })

    it('handles double underscores in tool name portion', () => {
      const result = formatToolName('mcp__server__tool__with__extra')
      expect(result.server).toBe('server')
      // All underscores (including double) get replaced with spaces
      expect(result.label).toBe('tool  with  extra')
    })

    it('treats single __ as non-MCP if fewer than 3 parts', () => {
      const result = formatToolName('not__mcp')
      // Only 2 parts, so treated as plain tool
      expect(result.server).toBeUndefined()
      expect(result.label).toBe('not__mcp')
    })

    it('returns correct icons for all standard Claude tools', () => {
      const expectedTools = ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'WebSearch', 'WebFetch', 'Task', 'AskUserQuestion']
      for (const tool of expectedTools) {
        const result = formatToolName(tool)
        expect(TOOL_ICONS[tool]).toBeDefined()
        expect(result.label).toBe(tool)
      }
    })
  })

  describe('parseSystemReminders', () => {
    it('returns text as-is when no reminders present', () => {
      const result = parseSystemReminders('Hello world')
      expect(result.mainContent).toBe('Hello world')
      expect(result.systemReminders).toHaveLength(0)
    })

    it('extracts a single system reminder', () => {
      const input = 'Before <system-reminder>Remember this</system-reminder> After'
      const result = parseSystemReminders(input)
      expect(result.mainContent).toBe('Before  After')
      expect(result.systemReminders).toEqual(['Remember this'])
    })

    it('extracts multiple system reminders', () => {
      const input = 'Start <system-reminder>First</system-reminder> middle <system-reminder>Second</system-reminder> end'
      const result = parseSystemReminders(input)
      expect(result.mainContent).toBe('Start  middle  end')
      expect(result.systemReminders).toEqual(['First', 'Second'])
    })

    it('handles multiline reminder content', () => {
      const input = 'Text <system-reminder>\nLine 1\nLine 2\n</system-reminder> more'
      const result = parseSystemReminders(input)
      expect(result.systemReminders).toEqual(['Line 1\nLine 2'])
    })

    it('returns empty mainContent when text is only reminders', () => {
      const input = '<system-reminder>Only reminder</system-reminder>'
      const result = parseSystemReminders(input)
      expect(result.mainContent).toBe('')
      expect(result.systemReminders).toEqual(['Only reminder'])
    })

    it('handles empty string input', () => {
      const result = parseSystemReminders('')
      expect(result.mainContent).toBe('')
      expect(result.systemReminders).toHaveLength(0)
    })

    it('trims whitespace from reminder content', () => {
      const input = '<system-reminder>  spaced  </system-reminder>'
      const result = parseSystemReminders(input)
      expect(result.systemReminders).toEqual(['spaced'])
    })
  })

  describe('getLangFromPath', () => {
    it('returns typescript for .ts files', () => {
      expect(getLangFromPath('/src/main.ts')).toBe('typescript')
    })

    it('returns typescript for .tsx files', () => {
      expect(getLangFromPath('/src/App.tsx')).toBe('typescript')
    })

    it('returns javascript for .js files', () => {
      expect(getLangFromPath('/lib/index.js')).toBe('javascript')
    })

    it('returns python for .py files', () => {
      expect(getLangFromPath('/scripts/run.py')).toBe('python')
    })

    it('returns bash for shell files', () => {
      expect(getLangFromPath('/scripts/deploy.sh')).toBe('bash')
    })

    it('returns dockerfile for Dockerfile', () => {
      expect(getLangFromPath('/project/Dockerfile')).toBe('dockerfile')
    })

    it('returns makefile for Makefile', () => {
      expect(getLangFromPath('/project/Makefile')).toBe('makefile')
    })

    it('returns bash for .bashrc', () => {
      expect(getLangFromPath('/home/user/.bashrc')).toBe('bash')
    })

    it('returns null for unknown extensions', () => {
      expect(getLangFromPath('/file.xyz')).toBeNull()
    })

    it('returns null for extensionless files (non-special)', () => {
      expect(getLangFromPath('/some/randomfile')).toBeNull()
    })

    it('handles deeply nested paths', () => {
      expect(getLangFromPath('/a/b/c/d/e/component.tsx')).toBe('typescript')
    })

    it('returns json for .json files', () => {
      expect(getLangFromPath('package.json')).toBe('json')
    })

    it('returns yaml for .yml files', () => {
      expect(getLangFromPath('.github/workflows/ci.yml')).toBe('yaml')
    })

    it('returns css for .css files', () => {
      expect(getLangFromPath('styles/main.css')).toBe('css')
    })

    it('returns scss for .scss files', () => {
      expect(getLangFromPath('styles/theme.scss')).toBe('scss')
    })

    it('returns rust for .rs files', () => {
      expect(getLangFromPath('src/main.rs')).toBe('rust')
    })

    it('returns go for .go files', () => {
      expect(getLangFromPath('cmd/server/main.go')).toBe('go')
    })
  })

  describe('TOOL_ICONS', () => {
    it('has icons for all MCP chrome-devtools tools', () => {
      const mcpTools = [
        'take_screenshot', 'take_snapshot', 'navigate_page', 'click',
        'fill', 'fill_form', 'evaluate_script', 'list_pages',
        'list_network_requests', 'list_console_messages'
      ]
      for (const tool of mcpTools) {
        expect(TOOL_ICONS[tool]).toBeDefined()
      }
    })
  })
})
