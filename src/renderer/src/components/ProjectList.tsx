import { useState, useEffect } from 'react'
import { ListGroup, Badge } from 'react-bootstrap'

interface Project {
  name: string
  encodedName: string
  path: string
  sessionCount: number
}

interface ProjectListProps {
  onProjectSelect: (encodedName: string) => void
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

  if (loading) {
    return (
      <div className="p-3">
        <h5 className="text-white">🗂️ Projects</h5>
        <p className="text-muted small">Loading...</p>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="p-3">
        <h5 className="text-white">🗂️ Projects</h5>
        <p className="text-muted small">No projects found</p>
      </div>
    )
  }

  return (
    <div className="p-3">
      <h5 className="text-white mb-3">🗂️ Projects</h5>
      <ListGroup data-testid="project-list">
        {projects.map(project => (
          <ListGroup.Item
            key={project.encodedName}
            action
            active={selectedProject === project.encodedName}
            onClick={() => handleProjectClick(project.encodedName)}
            className="d-flex justify-content-between align-items-center"
            data-testid={`project-${project.encodedName}`}
          >
            <span>{project.name}</span>
            <Badge bg="secondary">{project.sessionCount}</Badge>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  )
}
