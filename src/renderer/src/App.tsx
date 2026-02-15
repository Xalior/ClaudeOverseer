import { Container } from 'react-bootstrap'

function App(): JSX.Element {
  return (
    <div className="app-shell">
      {/* Left Panel: Projects Sidebar */}
      <div className="sidebar-panel">
        <Container className="p-3">
          <h5 className="text-white-50 mb-3">🗂️ Projects</h5>
          <div className="text-muted">
            <small>Project list will appear here...</small>
          </div>
        </Container>
      </div>

      {/* Middle Panel: Sessions List */}
      <div className="middle-panel">
        <Container className="p-3">
          <h5 className="text-white-50 mb-3">📄 Sessions</h5>
          <div className="text-muted">
            <small>Session list will appear here...</small>
          </div>
        </Container>
      </div>

      {/* Right Panel: Message Stream */}
      <div className="content-panel">
        <Container>
          <h5 className="text-white-50 mb-3">💬 Message Stream</h5>
          <div className="text-muted">
            <small>Messages will stream here...</small>
          </div>
        </Container>
      </div>
    </div>
  )
}

export default App
