import { useState } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import { ProjectList } from './components/ProjectList'
import { SessionList } from './components/SessionList'
import { MessageStream } from './components/messages/MessageStream'

function App() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedSessionPath, setSelectedSessionPath] = useState<string | null>(null)

  function handleProjectSelect(encodedName: string) {
    setSelectedProject(encodedName)
    setSelectedSessionPath(null)
  }

  return (
    <Container fluid className="vh-100 p-0">
      <Row className="h-100 g-0">
        {/* Panel 1: Projects Sidebar */}
        <Col xs={3} className="border-end bg-dark overflow-auto" data-testid="project-sidebar">
          <ProjectList onProjectSelect={handleProjectSelect} />
        </Col>

        {/* Panel 2: Sessions List */}
        <Col xs={3} className="border-end bg-dark overflow-auto" data-testid="session-list">
          <SessionList
            projectEncodedName={selectedProject}
            onSessionSelect={setSelectedSessionPath}
          />
        </Col>

        {/* Panel 3: Message Stream */}
        <Col xs={6} className="bg-dark" data-testid="message-stream">
          <MessageStream sessionFilePath={selectedSessionPath} />
        </Col>
      </Row>
    </Container>
  )
}

export default App
