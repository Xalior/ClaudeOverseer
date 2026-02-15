import { useEffect } from 'react'
import { ListGroup, Badge, Spinner } from 'react-bootstrap'
import { useAppStore } from '../store/useAppStore'

export function ProjectList() {
  const { projects, selectedProject, setProjects, setSessions, selectProject } = useAppStore()

  // Load projects on mount
  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const projectList = await window.overseer.getProjects()
      setProjects(projectList)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  async function handleProjectClick(project: any) {
    selectProject(project)

    // Load sessions for this project
    try {
      const sessions = await window.overseer.getSessions(project.encodedDirName)
      setSessions(sessions)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  if (projects.length === 0) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" size="sm" variant="secondary" />
        <div className="text-muted mt-2">
          <small>Scanning projects...</small>
        </div>
      </div>
    )
  }

  return (
    <ListGroup variant="flush">
      {projects.map((project) => (
        <ListGroup.Item
          key={project.encodedDirName}
          active={selectedProject?.encodedDirName === project.encodedDirName}
          action
          onClick={() => handleProjectClick(project)}
          className="d-flex justify-content-between align-items-center"
        >
          <span className="text-truncate">📁 {project.name}</span>
          {project.sessionCount > 0 && (
            <Badge bg="secondary" pill>
              {project.sessionCount}
            </Badge>
          )}
        </ListGroup.Item>
      ))}
    </ListGroup>
  )
}
