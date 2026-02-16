import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { resolveEncodedPath } from '../utils/path-encoder'
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
      const fullPath = join(claudeProjectsDir, encodedName)

      // Resolve the encoded path against the filesystem
      const { path: projectPath, verified } = await resolveEncodedPath(encodedName)

      // Count sessions and find most recent modification time
      const sessionFiles = await readdir(fullPath)
      const jsonlFiles = sessionFiles.filter(f => f.endsWith('.jsonl'))

      let lastModified = 0
      for (const f of jsonlFiles) {
        try {
          const s = await stat(join(fullPath, f))
          if (s.mtimeMs > lastModified) lastModified = s.mtimeMs
        } catch { /* skip */ }
      }

      projects.push({
        name: extractProjectName(projectPath),
        encodedName,
        path: projectPath,
        pathVerified: verified,
        sessionCount: jsonlFiles.length,
        lastModified
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
