import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { decodePath } from '../utils/path-encoder'
import type { Project } from '../types'

/**
 * Scans a directory for Claude project subdirectories
 * Each subdirectory represents a project, encoded with dashes instead of slashes
 */
export async function scanProjects(claudeProjectsDir: string): Promise<Project[]> {
  try {
    const entries = await readdir(claudeProjectsDir, { withFileTypes: true })
    const projects: Project[] = []

    for (const entry of entries) {
      // Skip files and special directories
      if (!entry.isDirectory() || entry.name === 'memory' || entry.name.startsWith('.')) {
        continue
      }

      const encodedName = entry.name
      const projectPath = decodePath(encodedName)
      const fullPath = join(claudeProjectsDir, encodedName)

      // Count sessions in this project directory
      const sessionFiles = await readdir(fullPath)
      const jsonlFiles = sessionFiles.filter(f => f.endsWith('.jsonl'))

      projects.push({
        name: extractProjectName(projectPath),
        encodedName,
        path: projectPath,
        sessionCount: jsonlFiles.length
      })
    }

    return projects.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Failed to scan projects:', error)
    return []
  }
}

/**
 * Extract a readable project name from a path
 * Example: /Volumes/McFiver/u/GIT/ClaudeOverseer -> ClaudeOverseer
 */
function extractProjectName(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments[segments.length - 1] || path
}
