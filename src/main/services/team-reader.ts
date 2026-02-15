import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'

export interface TeamMember {
  name: string
  agentId: string
  agentType: string
}

export interface TeamConfig {
  name: string
  description?: string
  members: TeamMember[]
}

export interface TeamTask {
  id: string
  subject: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  owner?: string
  blockedBy?: string[]
}

/**
 * Read a team configuration file.
 */
export async function readTeamConfig(teamName: string, teamsDir?: string): Promise<TeamConfig | null> {
  const baseDir = teamsDir || join(homedir(), '.claude', 'teams')
  const configPath = join(baseDir, teamName, 'config.json')

  try {
    const content = await readFile(configPath, 'utf-8')
    const parsed = JSON.parse(content)
    return {
      name: teamName,
      description: parsed.description,
      members: (parsed.members || []).map((m: Record<string, string>) => ({
        name: m.name || 'unknown',
        agentId: m.agentId || '',
        agentType: m.agentType || 'general-purpose'
      }))
    }
  } catch {
    return null
  }
}

/**
 * Read all tasks for a team.
 */
export async function readTeamTasks(teamName: string, tasksDir?: string): Promise<TeamTask[]> {
  const baseDir = tasksDir || join(homedir(), '.claude', 'tasks')
  const teamTasksDir = join(baseDir, teamName)

  try {
    const entries = await readdir(teamTasksDir, { withFileTypes: true })
    const tasks: TeamTask[] = []

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const content = await readFile(join(teamTasksDir, entry.name), 'utf-8')
          const parsed = JSON.parse(content)
          tasks.push({
            id: parsed.id || entry.name.replace('.json', ''),
            subject: parsed.subject || 'Untitled',
            description: parsed.description || '',
            status: parsed.status || 'pending',
            owner: parsed.owner,
            blockedBy: parsed.blockedBy
          })
        } catch {
          // Skip malformed task files
        }
      }
    }

    return tasks
  } catch {
    return []
  }
}

/**
 * List all team names.
 */
export async function listTeams(teamsDir?: string): Promise<string[]> {
  const baseDir = teamsDir || join(homedir(), '.claude', 'teams')

  try {
    const entries = await readdir(baseDir, { withFileTypes: true })
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
  } catch {
    return []
  }
}
