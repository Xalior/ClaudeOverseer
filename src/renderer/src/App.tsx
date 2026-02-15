import { Container } from 'react-bootstrap'
import { ProjectList } from './components/ProjectList'
import { SessionList } from './components/SessionList'

function App(): JSX.Element {
  return (
    <div className="app-shell">
      {/* Left Panel: Projects Sidebar */}
      <div className="sidebar-panel">
        <div className="p-3 border-bottom">
          <h5 className="text-white-50 mb-0">🗂️ Projects</h5>
        </div>
        <ProjectList />
      </div>

      {/* Middle Panel: Sessions List */}
      <div className="middle-panel">
        <div className="p-3 border-bottom">
          <h5 className="text-white-50 mb-0">📄 Sessions</h5>
        </div>
        <SessionList />
      </div>

      {/* Right Panel: Message Stream */}
      <div className="content-panel">
        <Container>
          <h5 className="text-white-50 mb-3">💬 Message Stream</h5>
          <div className="text-muted">
            <small>Messages will stream here (Phase 3)...</small>
          </div>
        </Container>
      </div>
    </div>
  )
}

export default App
