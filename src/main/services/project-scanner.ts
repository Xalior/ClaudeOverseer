import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { decodePath, getProjectName } from '../utils/path-encoder'
import type { Project } from '../types'

/**
 * Get the Claude projects directory path
 * Default: ~/.claude/projects/
 * Can be overridden via paths.txt in app root
 */
export async function getClaudeProjectsDir(): Promise<string> {
  // TODO: Read from paths.txt if it exists
  return join(homedir(), '.claude', 'projects')
}

/**
 * Scan the Claude projects directory and return all discovered projects
 */
export async function scanProjects(): Promise<Project[]> {
  const projectsDir = await getClaudeProjectsDir()

  try {
    const entries = await readdir(projectsDir, { withFileTypes: true })
    const projects: Project[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const encodedDirName = entry.name
      const fullPath = decodePath(encodedDirName)
      const name = getProjectName(fullPath)

      // Count JSONL files to get session count
      const projectDir = join(projectsDir, encodedDirName)
      const sessionCount = await countSessions(projectDir)

      projects.push({
        name,
        path: fullPath,
        encodedDirName,
        sessionCount
      })
    }

    // Sort by most recent activity
    return projects.sort((a, b) => b.sessionCount - a.sessionCount)
  } catch (error) {
    console.error('Error scanning projects:', error)
    return []
  }
}

/**
 * Count the number of session files in a project directory
 */
async function countSessions(projectDir: string): Promise<number> {
  try {
    const entries = await readdir(projectDir)
    return entries.filter(name => name.endsWith('.jsonl')).length
  } catch {
    return 0
  }
}
