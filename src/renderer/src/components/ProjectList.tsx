import { useState, useMemo, useEffect, useCallback } from 'react'
import { useProjects, useProjectsDir, useProjectCosts } from '../hooks/queries'
import { Badge } from './ui/badge'
import { sortProjects, getActivityLevel, formatRelativeTime } from '../utils/project-utils'
import { formatCost, getModelName } from '../utils/pricing'
import type { ProjectSortOrder } from '../../../preload/index.d'

interface Project {
  name: string
  encodedName: string
  path: string
  pathVerified: boolean
  sessionCount: number
  lastModified: number
}

interface ProjectListProps {
  onProjectSelect: (encodedName: string) => void
  themeToggle?: React.ReactNode
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

const SORT_LABELS: Record<ProjectSortOrder, string> = {
  recent: 'Recent',
  alpha: 'A-Z',
  sessions: 'Sessions'
}

const SORT_OPTIONS: ProjectSortOrder[] = ['recent', 'alpha', 'sessions']

export function ProjectList({ onProjectSelect, themeToggle }: ProjectListProps) {
  const { data: projects = [], isLoading: loading } = useProjects()
  const { data: projectsDir } = useProjectsDir()
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [pinnedProjects, setPinnedProjects] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<ProjectSortOrder>('recent')
  const [prefsReady, setPrefsReady] = useState(false)

  // Load pinned projects and sort order from preferences
  useEffect(() => {
    window.overseer.loadPreferences().then((prefs) => {
      if (prefs.pinnedProjects) setPinnedProjects(prefs.pinnedProjects)
      if (prefs.projectSortOrder) setSortOrder(prefs.projectSortOrder)
      if (prefs.selectedProject) setSelectedProject(prefs.selectedProject)
      setPrefsReady(true)
    }).catch(() => setPrefsReady(true))
  }, [])

  function handleProjectClick(encodedName: string) {
    setSelectedProject(encodedName)
    onProjectSelect(encodedName)
  }

  const togglePin = useCallback((encodedName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPinnedProjects(prev => {
      const next = prev.includes(encodedName)
        ? prev.filter(p => p !== encodedName)
        : [...prev, encodedName]
      window.overseer.savePreferences({ pinnedProjects: next })
      return next
    })
  }, [])

  const cycleSortOrder = useCallback(() => {
    setSortOrder(prev => {
      const idx = SORT_OPTIONS.indexOf(prev)
      const next = SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length]
      window.overseer.savePreferences({ projectSortOrder: next })
      return next
    })
  }, [])

  // Pre-compute icons so they're stable across renders
  const projectIcons = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of projects as Project[]) {
      map[p.encodedName] = generateProjectIcon(p.name)
    }
    return map
  }, [projects])

  // Split and sort projects
  const { pinned, discovered } = useMemo(() => {
    const allProjects = projects as Project[]
    const pinnedSet = new Set(pinnedProjects)
    const pinnedList: Project[] = []
    const discoveredList: Project[] = []

    for (const p of allProjects) {
      if (pinnedSet.has(p.encodedName)) {
        pinnedList.push(p)
      } else {
        discoveredList.push(p)
      }
    }

    // Pinned: maintain the order they were pinned in
    pinnedList.sort((a, b) => pinnedProjects.indexOf(a.encodedName) - pinnedProjects.indexOf(b.encodedName))

    return {
      pinned: pinnedList,
      discovered: sortProjects(discoveredList, sortOrder)
    }
  }, [projects, pinnedProjects, sortOrder])

  // Compute project directory paths for cost lookups (all projects)
  const projectDirPaths = useMemo(() => {
    if (!projectsDir) return []
    return (projects as Project[]).map(p => `${projectsDir!.replace(/\/$/, '')}/${p.encodedName}`)
  }, [projects, projectsDir])

  const { data: projectCosts = {} } = useProjectCosts(projectDirPaths)

  if (loading && !prefsReady) {
    return (
      <div className="panel-content">
        <div className="project-panel-header">
          <h5 className="panel-title">Projects</h5>
          {themeToggle}
        </div>
        <p className="panel-muted">Loading...</p>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="panel-content">
        <div className="project-panel-header">
          <h5 className="panel-title">Projects</h5>
          {themeToggle}
        </div>
        <p className="panel-muted">No projects found</p>
      </div>
    )
  }

  function renderCard(project: Project, isPinned: boolean) {
    const isActive = isPinned || selectedProject === project.encodedName
    const accentColor = hashColor(project.name)
    const activity = getActivityLevel(project.lastModified)
    const dirPath = projectsDir ? `${projectsDir.replace(/\/$/, '')}/${project.encodedName}` : null
    const rawEntry = dirPath ? projectCosts[dirPath] : undefined
    // Guard against stale number values from old cache format before restart
    const costEntry = rawEntry && typeof rawEntry === 'object' ? rawEntry : undefined
    const cost = costEntry?.total

    return (
      <div
        key={project.encodedName}
        className={`project-card ${isActive ? 'project-card--active' : ''}`}
        style={{ '--project-accent': accentColor } as React.CSSProperties}
        onClick={() => handleProjectClick(project.encodedName)}
        data-testid={`project-${project.encodedName}`}
      >
        <div className="project-card__icon-wrap">
          <img
            className="project-card__icon"
            src={projectIcons[project.encodedName]}
            alt=""
            aria-hidden="true"
          />
          <span className={`project-card__activity project-card__activity--${activity}`} />
        </div>

        <div className="project-card__title">{project.name}</div>

        <div className="project-card__actions">
          <button
            className={`project-card__pin-btn ${isPinned ? 'project-card__pin-btn--pinned' : ''}`}
            onClick={(e) => togglePin(project.encodedName, e)}
            title={isPinned ? 'Unpin project' : 'Pin project'}
            aria-label={isPinned ? 'Unpin project' : 'Pin project'}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              {isPinned ? (
                <path d="M9.828 1.114a.5.5 0 0 1 .358.143l4.557 4.557a.5.5 0 0 1-.247.843l-2.2.524-.775.776 1.535 5.26a.5.5 0 0 1-.837.476L8.5 9.973l-2.64 2.64a.5.5 0 0 1-.707-.707l2.64-2.64-3.72-3.72a.5.5 0 0 1 .477-.837l5.26 1.535.775-.775.524-2.2a.5.5 0 0 1 .485-.358l.234.003z" fill="currentColor"/>
              ) : (
                <path d="M9.828 1.114a.5.5 0 0 1 .358.143l4.557 4.557a.5.5 0 0 1-.247.843l-2.2.524-.775.776 1.535 5.26a.5.5 0 0 1-.837.476L8.5 9.973l-2.64 2.64a.5.5 0 0 1-.707-.707l2.64-2.64-3.72-3.72a.5.5 0 0 1 .477-.837l5.26 1.535.775-.775.524-2.2a.5.5 0 0 1 .485-.358l.234.003z" fill="none" stroke="currentColor" strokeWidth="1"/>
              )}
            </svg>
          </button>
          {cost != null && cost > 0 && (
            <span className="project-card__cost">{formatCost(cost)}</span>
          )}
          <Badge variant="secondary" className="project-card__badge">
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
            {isPinned && costEntry && Object.keys(costEntry.byModel).length > 0 && (
              <div className="project-card__cost-breakdown">
                {Object.entries(costEntry.byModel)
                  .sort(([, a], [, b]) => b - a)
                  .map(([modelId, modelCost]) => (
                    <div key={modelId} className="project-card__cost-line">
                      <span className="project-card__cost-model">{getModelName(modelId)}</span>
                      <span className="project-card__cost-value">{formatCost(modelCost)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="project-card__meta">
            {formatRelativeTime(project.lastModified)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="panel-content">
      <div className="project-panel-header">
        <h5 className="panel-title">Projects</h5>
        {themeToggle}
      </div>

      {/* Pinned Section */}
      <div className="project-section">
        <div className="project-section__header">
          <span className="project-section__label">
            <svg className="project-section__icon" width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M9.828 1.114a.5.5 0 0 1 .358.143l4.557 4.557a.5.5 0 0 1-.247.843l-2.2.524-.775.776 1.535 5.26a.5.5 0 0 1-.837.476L8.5 9.973l-2.64 2.64a.5.5 0 0 1-.707-.707l2.64-2.64-3.72-3.72a.5.5 0 0 1 .477-.837l5.26 1.535.775-.775.524-2.2a.5.5 0 0 1 .485-.358l.234.003z" fill="currentColor"/>
            </svg>
            Pinned
          </span>
          {pinned.length > 0 && <span className="project-section__count">{pinned.length}</span>}
        </div>
        {pinned.length > 0 ? (
          <div className="project-card-list" data-testid="pinned-project-list">
            {pinned.map(p => renderCard(p, true))}
          </div>
        ) : (
          <div className="project-section__empty">
            <svg className="project-section__empty-icon" width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M9.828 1.114a.5.5 0 0 1 .358.143l4.557 4.557a.5.5 0 0 1-.247.843l-2.2.524-.775.776 1.535 5.26a.5.5 0 0 1-.837.476L8.5 9.973l-2.64 2.64a.5.5 0 0 1-.707-.707l2.64-2.64-3.72-3.72a.5.5 0 0 1 .477-.837l5.26 1.535.775-.775.524-2.2a.5.5 0 0 1 .485-.358l.234.003z" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 1.5"/>
            </svg>
            <span className="project-section__empty-text">Pin your favourite projects for quick access</span>
          </div>
        )}
      </div>

      {/* Discovered Section */}
      <div className="project-section">
        <div className="project-section__header">
          <span className="project-section__label">
            Discovered
          </span>
          <button
            className="project-section__sort-btn"
            onClick={cycleSortOrder}
            title={`Sort by: ${SORT_LABELS[sortOrder]} (click to change)`}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M3 2v10m0 0L1 10m2 2l2-2m6-8v10m0 0l-2-2m2 2l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {SORT_LABELS[sortOrder]}
          </button>
        </div>
        <div className="project-card-list" data-testid="project-list">
          {discovered.map(p => renderCard(p, false))}
        </div>
      </div>
    </div>
  )
}
