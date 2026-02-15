import { useState, useEffect, useRef } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import { ProjectList } from './components/ProjectList'
import { SessionList } from './components/SessionList'
import { MessageStream } from './components/messages/MessageStream'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedSessionPath, setSelectedSessionPath] = useState<string | null>(null)
  const projectRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<HTMLDivElement>(null)
  const messageRef = useRef<HTMLDivElement>(null)

  function handleProjectSelect(encodedName: string) {
    setSelectedProject(encodedName)
    setSelectedSessionPath(null)
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey

      // Cmd+1/2/3 — focus panels
      if (isMeta && e.key === '1') {
        e.preventDefault()
        projectRef.current?.focus()
      } else if (isMeta && e.key === '2') {
        e.preventDefault()
        sessionRef.current?.focus()
      } else if (isMeta && e.key === '3') {
        e.preventDefault()
        messageRef.current?.focus()
      }
      // Cmd+R — refresh (handled by ProjectList internally via re-render)
      // Cmd+J — toggle raw mode (handled by MessageStream internally)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Container fluid className="vh-100 p-0">
      <Row className="h-100 g-0">
        {/* Panel 1: Projects Sidebar */}
        <Col
          xs={3}
          className="border-end bg-dark h-100 overflow-auto"
          data-testid="project-sidebar"
          ref={projectRef}
          tabIndex={-1}
        >
          <ProjectList onProjectSelect={handleProjectSelect} />
        </Col>

        {/* Panel 2: Sessions List */}
        <Col
          xs={3}
          className="border-end bg-dark h-100 overflow-auto"
          data-testid="session-list"
          ref={sessionRef}
          tabIndex={-1}
        >
          <SessionList
            projectEncodedName={selectedProject}
            onSessionSelect={setSelectedSessionPath}
          />
        </Col>

        {/* Panel 3: Message Stream */}
        <Col
          xs={6}
          className="bg-dark h-100 overflow-hidden"
          data-testid="message-stream"
          ref={messageRef}
          tabIndex={-1}
        >
          <ErrorBoundary>
            <MessageStream sessionFilePath={selectedSessionPath} />
          </ErrorBoundary>
        </Col>
      </Row>
    </Container>
  )
}

export default App
