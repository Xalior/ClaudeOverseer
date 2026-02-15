/**
 * Type definitions for ClaudeOverseer
 */

export interface Project {
  name: string              // Display name (e.g., "MyProject")
  path: string              // Full file system path (e.g., "/Volumes/McFiver/u/GIT/MyProject")
  encodedDirName: string    // Claude's directory name (e.g., "-Volumes-McFiver-u-GIT-MyProject")
  sessionCount: number      // Number of active sessions
}

export interface Session {
  id: string                // Session UUID
  type: 'main' | 'subagent' | 'background'
  filePath: string          // Full path to .jsonl file
  lastModified: number      // Timestamp of last modification
  parentId?: string         // For subagents, the parent session ID
}

export interface ParsedMessage {
  type: 'queue-operation' | 'user' | 'assistant'
  timestamp: string
  sessionId: string
  uuid?: string
  message?: any
  raw: any                  // Original parsed JSON
}

export interface TeamConfig {
  teamName: string
  members: TeamMember[]
}

export interface TeamMember {
  name: string
  agentId: string
  agentType: string
}

export interface Task {
  id: string
  subject: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  owner?: string
  blockedBy?: string[]
}

export interface SessionStatus {
  sessionId: string
  status: 'active' | 'recent' | 'stale' | 'error'
  lastActivity: number
}
