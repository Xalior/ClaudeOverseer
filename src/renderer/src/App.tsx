import { useState, useEffect, useRef, useCallback } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProjectList } from './components/ProjectList'
import { SessionList } from './components/SessionList'
import { MessageStream } from './components/messages/MessageStream'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeToggle } from './components/ThemeToggle'
import { useDirectoryWatcher, useProjectsDir } from './hooks/queries'
import { useTheme } from './hooks/useTheme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

const DEFAULT_WIDTHS: [number, number] = [240, 280] // px for panel 1 and 2; panel 3 gets the rest
const MIN_WIDTHS: [number, number] = [240, 120]
const MAX_WIDTH_FRACTION = 0.45 // no single panel > 45% of window

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

function AppContent() {
  // Start directory watcher on mount
  useDirectoryWatcher()
  const { mode: themeMode, setTheme } = useTheme()
  const { data: projectsDir } = useProjectsDir()

  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedSessionPath, setSelectedSessionPath] = useState<string | null>(null)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const projectRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<HTMLDivElement>(null)
  const messageRef = useRef<HTMLDivElement>(null)

  // Resizable panel widths (px)
  const [panelWidths, setPanelWidths] = useState<[number, number]>(DEFAULT_WIDTHS)
  const dragging = useRef<{ index: 0 | 1; startX: number; startWidths: [number, number] } | null>(null)

  // Load preferences on mount
  useEffect(() => {
    window.overseer.loadPreferences().then((prefs) => {
      if (prefs.selectedProject) setSelectedProject(prefs.selectedProject)
      if (prefs.selectedSessionPath) setSelectedSessionPath(prefs.selectedSessionPath)
      if (prefs.panelWidths) setPanelWidths(prefs.panelWidths)
      setPrefsLoaded(true)
    }).catch(() => {
      setPrefsLoaded(true)
    })
  }, [])

  // Persist panel widths (debounced)
  const panelSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!prefsLoaded) return
    if (panelSaveTimer.current) clearTimeout(panelSaveTimer.current)
    panelSaveTimer.current = setTimeout(() => {
      window.overseer.savePreferences({ panelWidths })
    }, 300)
    return () => {
      if (panelSaveTimer.current) clearTimeout(panelSaveTimer.current)
    }
  }, [panelWidths, prefsLoaded])

  const handleMouseDown = useCallback((index: 0 | 1) => (e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = { index, startX: e.clientX, startWidths: [...panelWidths] as [number, number] }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [panelWidths])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const d = dragging.current
      if (!d) return
      const delta = e.clientX - d.startX
      const maxPx = window.innerWidth * MAX_WIDTH_FRACTION
      const newWidths: [number, number] = [...d.startWidths]
      newWidths[d.index] = Math.max(MIN_WIDTHS[d.index], Math.min(maxPx, d.startWidths[d.index] + delta))
      // Ensure panel 3 keeps at least its minimum width
      const remaining = window.innerWidth - newWidths[0] - newWidths[1] - 8 // 8px for two handles
      if (remaining < MIN_WIDTHS[1]) return
      setPanelWidths(newWidths)
    }
    function onMouseUp() {
      if (dragging.current) {
        dragging.current = null
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  function handleProjectSelect(encodedName: string) {
    setSelectedProject(encodedName)
    setSelectedSessionPath(null)
    window.overseer.savePreferences({ selectedProject: encodedName, selectedSessionPath: null })
  }

  function handleSessionSelect(sessionPath: string) {
    setSelectedSessionPath(sessionPath)
    window.overseer.savePreferences({ selectedSessionPath: sessionPath })
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
    <div className="app-layout">
      {/* Panel 1: Projects Sidebar */}
      <div
        className="app-panel app-panel--surface"
        style={{ width: panelWidths[0] }}
        data-testid="project-sidebar"
        ref={projectRef}
        tabIndex={-1}
      >
        <ProjectList
          onProjectSelect={handleProjectSelect}
          themeToggle={<ThemeToggle mode={themeMode} onModeChange={setTheme} />}
        />
      </div>

      <div className="resize-handle" onMouseDown={handleMouseDown(0)} />

      {/* Panel 2: Sessions List */}
      <div
        className="app-panel app-panel--surface"
        style={{ width: panelWidths[1] }}
        data-testid="session-list"
        ref={sessionRef}
        tabIndex={-1}
      >
        <SessionList
          projectEncodedName={selectedProject}
          projectDir={selectedProject && projectsDir ? `${projectsDir.replace(/\/$/, '')}/${selectedProject}` : null}
          onSessionSelect={handleSessionSelect}
        />
      </div>

      <div className="resize-handle" onMouseDown={handleMouseDown(1)} />

      {/* Panel 3: Message Stream */}
      <div
        className="app-panel app-panel--fill app-panel--surface"
        data-testid="message-stream"
        ref={messageRef}
        tabIndex={-1}
      >
        <ErrorBoundary>
          <MessageStream sessionFilePath={selectedSessionPath} />
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default App
