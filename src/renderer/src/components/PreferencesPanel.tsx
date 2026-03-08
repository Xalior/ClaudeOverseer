import { useState, useEffect, useCallback } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { Switch } from './ui/switch'
import { useProjects } from '../hooks/queries'
import type { ThemeMode, RemoteServerConfig } from '../../../preload/index.d'

type PrefsTab = 'general' | 'hidden'

interface PreferencesPanelProps {
  open: boolean
  onClose: () => void
  themeMode: ThemeMode
  onThemeChange: (mode: ThemeMode) => void
}

interface ServerStatus {
  running: boolean
  port: number
  address: string
  clientCount: number
}

export function PreferencesPanel({ open, onClose, themeMode, onThemeChange }: PreferencesPanelProps) {
  const [activeTab, setActiveTab] = useState<PrefsTab>('general')
  const [remoteServer, setRemoteServer] = useState<RemoteServerConfig>({
    enabled: false,
    port: 19280,
    bindAddress: '0.0.0.0'
  })
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)
  const [portInput, setPortInput] = useState('19280')
  const [bindInput, setBindInput] = useState('0.0.0.0')
  const [hiddenProjects, setHiddenProjects] = useState<string[]>([])
  const { data: projects = [] } = useProjects()

  // Load preferences on open
  useEffect(() => {
    if (!open) return
    setActiveTab('general')
    window.overseer.loadPreferences().then((prefs) => {
      if (prefs.remoteServer) {
        setRemoteServer(prefs.remoteServer)
        setPortInput(String(prefs.remoteServer.port))
        setBindInput(prefs.remoteServer.bindAddress)
      }
      setHiddenProjects(prefs.hiddenProjects || [])
    })
    refreshServerStatus()
  }, [open])

  const refreshServerStatus = useCallback(() => {
    window.overseer.getRemoteServerStatus().then(setServerStatus).catch(() => {
      setServerStatus(null)
    })
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  async function handleToggleServer(enabled: boolean) {
    const port = parseInt(portInput, 10) || 19280
    const bindAddress = bindInput.trim() || '0.0.0.0'
    const config: RemoteServerConfig = { enabled, port, bindAddress }

    setRemoteServer(config)
    await window.overseer.savePreferences({ remoteServer: config })

    if (enabled) {
      await window.overseer.startRemoteServer()
    } else {
      await window.overseer.stopRemoteServer()
    }

    refreshServerStatus()
  }

  async function handleSaveServerConfig() {
    const port = parseInt(portInput, 10) || 19280
    const bindAddress = bindInput.trim() || '0.0.0.0'
    const config: RemoteServerConfig = { ...remoteServer, port, bindAddress }

    setRemoteServer(config)
    await window.overseer.savePreferences({ remoteServer: config })

    // Restart server if running with new settings
    if (config.enabled) {
      await window.overseer.stopRemoteServer()
      await window.overseer.startRemoteServer()
      refreshServerStatus()
    }
  }

  const unhideProject = useCallback((encodedName: string) => {
    setHiddenProjects(prev => {
      const next = prev.filter(p => p !== encodedName)
      window.overseer.savePreferences({ hiddenProjects: next })
      window.dispatchEvent(new CustomEvent('overseer:hidden-projects-changed', { detail: next }))
      return next
    })
  }, [])

  // Resolve hidden encoded names to display names
  const hiddenProjectDetails = hiddenProjects.map(encodedName => {
    const project = (projects as Array<{ name: string; encodedName: string }>).find(
      p => p.encodedName === encodedName
    )
    return { encodedName, name: project?.name || encodedName }
  })

  if (!open) return null

  return (
    <div className="preferences-overlay" onClick={onClose} data-testid="preferences-overlay">
      <div className="preferences-panel" onClick={(e) => e.stopPropagation()} data-testid="preferences-panel">
        <div className="preferences-panel__header">
          <h2 className="preferences-panel__title">Preferences</h2>
          <button className="preferences-panel__close" onClick={onClose} aria-label="Close preferences">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="preferences-tabs">
          <button
            className={`preferences-tabs__tab ${activeTab === 'general' ? 'preferences-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`preferences-tabs__tab ${activeTab === 'hidden' ? 'preferences-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab('hidden')}
          >
            Hidden Projects
            {hiddenProjects.length > 0 && (
              <span className="preferences-tabs__badge">{hiddenProjects.length}</span>
            )}
          </button>
        </div>

        {activeTab === 'general' && (
          <>
            {/* Appearance */}
            <div className="preferences-section">
              <h3 className="preferences-section__title">Appearance</h3>
              <div className="preferences-section__row">
                <span className="preferences-section__label">Theme</span>
                <ThemeToggle mode={themeMode} onModeChange={onThemeChange} />
              </div>
            </div>

            {/* Remote Monitoring */}
            <div className="preferences-section">
              <h3 className="preferences-section__title">Remote Monitoring</h3>
              <p className="preferences-section__desc">
                Enable an HTTP + WebSocket server for read-only remote monitoring of your sessions.
              </p>

              <div className="preferences-section__row">
                <span className="preferences-section__label">Enable Server</span>
                <Switch
                  checked={remoteServer.enabled}
                  onCheckedChange={handleToggleServer}
                  data-testid="remote-server-toggle"
                />
              </div>

              <div className="preferences-section__row">
                <span className="preferences-section__label">Port</span>
                <input
                  className="preferences-section__input"
                  type="number"
                  min="1024"
                  max="65535"
                  value={portInput}
                  onChange={(e) => setPortInput(e.target.value)}
                  onBlur={handleSaveServerConfig}
                  data-testid="remote-port-input"
                />
              </div>

              <div className="preferences-section__row">
                <span className="preferences-section__label">Bind Address</span>
                <input
                  className="preferences-section__input"
                  type="text"
                  value={bindInput}
                  onChange={(e) => setBindInput(e.target.value)}
                  onBlur={handleSaveServerConfig}
                  placeholder="0.0.0.0"
                  data-testid="remote-bind-input"
                />
              </div>

              {serverStatus && (
                <div className="preferences-section__status" data-testid="server-status">
                  <span
                    className={`preferences-section__status-dot ${
                      serverStatus.running ? 'preferences-section__status-dot--active' : ''
                    }`}
                  />
                  <span className="preferences-section__status-text">
                    {serverStatus.running
                      ? `Running on ${serverStatus.address}:${serverStatus.port} (${serverStatus.clientCount} client${serverStatus.clientCount !== 1 ? 's' : ''})`
                      : 'Stopped'}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'hidden' && (
          <div className="preferences-section">
            <p className="preferences-section__desc">
              Hidden projects are removed from the sidebar. Unhide them to make them visible again.
            </p>
            {hiddenProjectDetails.length === 0 ? (
              <div className="preferences-hidden__empty">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                  <path d="M1.5 8C2.8 6.5 5 4 8 4s5.2 2.5 6.5 4c-1.3 1.5-3.5 4-6.5 4s-5.2-2.5-6.5-4z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                  <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                </svg>
                <span>No hidden projects</span>
              </div>
            ) : (
              <div className="preferences-hidden__list" data-testid="hidden-projects-list">
                {hiddenProjectDetails.map(({ encodedName, name }) => (
                  <div key={encodedName} className="preferences-hidden__item">
                    <span className="preferences-hidden__name" title={encodedName}>{name}</span>
                    <button
                      className="preferences-hidden__unhide-btn"
                      onClick={() => unhideProject(encodedName)}
                      title="Unhide project"
                      aria-label={`Unhide ${name}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M1.5 8C2.8 6.5 5 4 8 4s5.2 2.5 6.5 4c-1.3 1.5-3.5 4-6.5 4s-5.2-2.5-6.5-4z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                      </svg>
                      Unhide
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
