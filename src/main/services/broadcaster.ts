import { BrowserWindow } from 'electron'

export interface RemoteTarget {
  broadcast(channel: string, data?: unknown): void
}

/**
 * Centralised event broadcaster — sends events to all Electron windows
 * and optionally to a connected RemoteServer (HTTP+WebSocket).
 */
export class Broadcaster {
  private remoteTarget: RemoteTarget | null = null

  /** Register a remote target (e.g. WebSocket server) to receive broadcasts. */
  setRemoteTarget(target: RemoteTarget | null): void {
    this.remoteTarget = target
  }

  /** Send an event to all Electron renderer windows + remote target. */
  send(channel: string, data?: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      try {
        if (data !== undefined) {
          win.webContents.send(channel, data)
        } else {
          win.webContents.send(channel)
        }
      } catch {
        // Window may not be ready yet during startup
      }
    }

    if (this.remoteTarget) {
      this.remoteTarget.broadcast(channel, data)
    }
  }
}
