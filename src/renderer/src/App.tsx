import { Container, Row, Col } from 'react-bootstrap'

function App() {
  return (
    <Container fluid className="vh-100 p-0">
      <Row className="h-100 g-0">
        {/* Panel 1: Projects Sidebar */}
        <Col xs={3} className="border-end bg-dark" data-testid="project-sidebar">
          <div className="p-3">
            <h5 className="text-white">🗂️ Projects</h5>
            <p className="text-muted small">No projects loaded</p>
          </div>
        </Col>

        {/* Panel 2: Sessions List */}
        <Col xs={3} className="border-end bg-dark" data-testid="session-list">
          <div className="p-3">
            <h5 className="text-white">📄 Sessions</h5>
            <p className="text-muted small">Select a project first</p>
          </div>
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
