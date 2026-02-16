import { useState, useEffect, useMemo } from 'react'
import { Badge } from 'react-bootstrap'

interface Project {
  name: string
  encodedName: string
  path: string
  pathVerified: boolean
  sessionCount: number
  lastModified: number
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Never'
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })
}

interface ProjectListProps {
  onProjectSelect: (encodedName: string) => void
}

/**
 * Generate a deterministic color from a string.
 * Returns an HSL color with consistent saturation/lightness for dark theme.
 */
function hashColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = ((hash % 360) + 360) % 360
  return `hsl(${hue}, 55%, 55%)`
}

/**
 * Generate a deterministic SVG icon from a project name.
 * Creates a unique geometric pattern based on the name hash.
 */
function generateProjectIcon(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash // Convert to 32-bit int
  }

  const color1 = hashColor(name)
  const color2 = hashColor(name + '_alt')
  const bits = Math.abs(hash)

  // Choose a shape pattern based on the hash
  const shapeType = bits % 5
  let shapes = ''

  switch (shapeType) {
    case 0: // Diamond grid
      shapes = `
        <rect x="8" y="2" width="8" height="8" rx="1" transform="rotate(45, 12, 6)" fill="${color1}" opacity="0.9"/>
        <rect x="8" y="10" width="8" height="8" rx="1" transform="rotate(45, 12, 14)" fill="${color2}" opacity="0.7"/>
      `
      break
    case 1: // Circles
      shapes = `
        <circle cx="12" cy="8" r="5" fill="${color1}" opacity="0.9"/>
        <circle cx="12" cy="8" r="2.5" fill="${color2}" opacity="0.8"/>
      `
      break
    case 2: // Stacked bars
      shapes = `
        <rect x="4" y="4" width="16" height="3" rx="1.5" fill="${color1}" opacity="0.9"/>
        <rect x="6" y="9" width="12" height="3" rx="1.5" fill="${color2}" opacity="0.7"/>
        <rect x="8" y="14" width="8" height="3" rx="1.5" fill="${color1}" opacity="0.5"/>
      `
      break
    case 3: // Hexagon-ish
      shapes = `
        <polygon points="12,3 18,7 18,14 12,18 6,14 6,7" fill="${color1}" opacity="0.85"/>
        <polygon points="12,7 15,9 15,13 12,15 9,13 9,9" fill="${color2}" opacity="0.7"/>
      `
      break
    case 4: // Triangle stack
      shapes = `
        <polygon points="12,3 19,17 5,17" fill="${color1}" opacity="0.85"/>
        <polygon points="12,8 16,17 8,17" fill="${color2}" opacity="0.6"/>
      `
      break
  }

  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 21">${shapes}</svg>`
  )}`
}

export function ProjectList({ onProjectSelect }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const projectsDir = await window.overseer.getProjectsDir()
      const discovered = await window.overseer.scanProjects(projectsDir)
      setProjects(discovered)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleProjectClick(encodedName: string) {
    setSelectedProject(encodedName)
    onProjectSelect(encodedName)
  }

  // Pre-compute icons so they're stable across renders
  const projectIcons = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of projects) {
      map[p.encodedName] = generateProjectIcon(p.name)
    }
    return map
  }, [projects])

  if (loading) {
    return (
      <div className="p-3">
        <h5 className="text-white">Projects</h5>
        <p className="text-muted small">Loading...</p>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="p-3">
        <h5 className="text-white">Projects</h5>
        <p className="text-muted small">No projects found</p>
      </div>
    )
  }

  return (
    <div className="p-3">
      <h5 className="text-white mb-3">Projects</h5>
      <div className="project-card-list" data-testid="project-list">
        {projects.map(project => {
          const isActive = selectedProject === project.encodedName
          const accentColor = hashColor(project.name)
          return (
            <div
              key={project.encodedName}
              className={`project-card ${isActive ? 'project-card--active' : ''}`}
              style={{ '--project-accent': accentColor } as React.CSSProperties}
              onClick={() => handleProjectClick(project.encodedName)}
              data-testid={`project-${project.encodedName}`}
            >
              <div className="project-card__header">
                <img
                  className={`project-card__icon ${isActive ? 'project-card__icon--active' : ''}`}
                  src={projectIcons[project.encodedName]}
                  alt=""
                  aria-hidden="true"
                />
                <div className="project-card__title">{project.name}</div>
                <Badge bg="secondary" className="project-card__badge">
                  {project.sessionCount}
                </Badge>
              </div>
              {isActive ? (
                <div className="project-card__details">
                  <div
                    className={`project-card__full-path ${!project.pathVerified ? 'project-card__full-path--unverified' : ''}`}
                    title={project.path}
                  >
                    {project.path}
                    {!project.pathVerified && <span className="project-card__unverified-tag">unverified</span>}
                  </div>
                  <div className="project-card__meta">
                    {formatRelativeTime(project.lastModified)}
                  </div>
                </div>
              ) : (
                <div className="project-card__meta">
                  {formatRelativeTime(project.lastModified)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
