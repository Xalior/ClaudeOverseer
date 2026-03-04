import { useState, useEffect, useCallback } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { Switch } from './ui/switch'
import type { ThemeMode, RemoteServerConfig } from '../../../preload/index.d'

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
  const [remoteServer, setRemoteServer] = useState<RemoteServerConfig>({
    enabled: false,
    port: 19280,
    bindAddress: '0.0.0.0'
  })
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)
  const [portInput, setPortInput] = useState('19280')
  const [bindInput, setBindInput] = useState('0.0.0.0')

  // Load preferences on open
  useEffect(() => {
    if (!open) return
    window.overseer.loadPreferences().then((prefs) => {
      if (prefs.remoteServer) {
        setRemoteServer(prefs.remoteServer)
        setPortInput(String(prefs.remoteServer.port))
        setBindInput(prefs.remoteServer.bindAddress)
      }
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
      </div>
    </div>
  )
}
