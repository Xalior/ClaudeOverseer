import { useState } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import { ProjectList } from './components/ProjectList'
import { SessionList } from './components/SessionList'

function App() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  return (
    <Container fluid className="vh-100 p-0">
      <Row className="h-100 g-0">
        {/* Panel 1: Projects Sidebar */}
        <Col xs={3} className="border-end bg-dark overflow-auto" data-testid="project-sidebar">
          <ProjectList onProjectSelect={setSelectedProject} />
        </Col>

        {/* Panel 2: Sessions List */}
        <Col xs={3} className="border-end bg-dark overflow-auto" data-testid="session-list">
          <SessionList projectEncodedName={selectedProject} />
        </Col>

        {/* Panel 3: Message Stream */}
        <Col xs={6} className="bg-dark" data-testid="message-stream">
          <div className="p-3">
            <h5 className="text-white">💬 Message Stream</h5>
            <p className="text-muted small">Select a session to view messages</p>
          </div>
        </Col>
      </Row>
    </Container>
  )
}

export default App
