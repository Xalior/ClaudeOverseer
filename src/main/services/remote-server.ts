import { createServer, request as httpRequest, type Server, type IncomingMessage, type ServerResponse } from 'http'
import { homedir } from 'os'
import { join, extname, resolve, normalize } from 'path'
import { readFileSync, existsSync } from 'fs'
import { WebSocketServer, WebSocket } from 'ws'
import { scanProjects } from './project-scanner'
import { discoverSessions } from './session-discovery'
import { parseJsonlFile } from './jsonl-parser'
import { formatMessages } from './message-formatter'
import { loadPreferences } from './preferences'
import { resumeSession } from './session-resume'
import { JsonlWatcher } from './jsonl-watcher'
import type { RemoteTarget } from './broadcaster'
import type { CostCache } from './cost-cache'
import type { Broadcaster } from './broadcaster'

// MIME type map for static files
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.webp': 'image/webp'
}

interface PerConnectionState {
  watchers: Map<string, JsonlWatcher>
}

export class RemoteServer implements RemoteTarget {
  private server: Server | null = null
  private wss: WebSocketServer | null = null
  private clients = new Set<WebSocket>()
  private clientState = new Map<WebSocket, PerConnectionState>()
  private port: number
  private bindAddress: string
  private costCache: CostCache
  private broadcaster: Broadcaster
  private rendererDir: string

  constructor(opts: {
    port: number
    bindAddress: string
    costCache: CostCache
    broadcaster: Broadcaster
  }) {
    this.port = opts.port
    this.bindAddress = opts.bindAddress
    this.costCache = opts.costCache
    this.broadcaster = opts.broadcaster
    // Renderer output directory (built files)
    this.rendererDir = join(__dirname, '../renderer')
  }

  /** Start the HTTP + WebSocket server. */
  async start(): Promise<void> {
    if (this.server) return

    this.server = createServer((req, res) => this.handleRequest(req, res))

    this.wss = new WebSocketServer({ server: this.server })
    this.wss.on('connection', (ws) => this.handleConnection(ws))

    return new Promise((resolve, reject) => {
      this.server!.listen(this.port, this.bindAddress, () => {
        console.log(`Remote server listening on ${this.bindAddress}:${this.port}`)
        this.broadcaster.setRemoteTarget(this)
        resolve()
      })
      this.server!.on('error', reject)
    })
  }

  /** Stop the server and clean up all connections. */
  async stop(): Promise<void> {
    this.broadcaster.setRemoteTarget(null)

    // Clean up per-connection watchers
    for (const [ws, state] of this.clientState) {
      for (const watcher of state.watchers.values()) {
        await watcher.stop()
      }
      state.watchers.clear()
      ws.close()
    }
    this.clientState.clear()
    this.clients.clear()

    if (this.wss) {
      this.wss.close()
      this.wss = null
    }

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  /** Get server status info. */
  getStatus(): { running: boolean; port: number; address: string; clientCount: number } {
    return {
      running: this.server !== null && this.server.listening,
      port: this.port,
      address: this.bindAddress,
      clientCount: this.clients.size
    }
  }

  /** Broadcast an event to all connected WebSocket clients (RemoteTarget interface). */
  broadcast(channel: string, data?: unknown): void {
    if (this.clients.size === 0) return
    const message = JSON.stringify({ event: channel, data })
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    }
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    const pathname = url.pathname

    // CORS headers for API routes
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    // POST routes
    if (req.method === 'POST') {
      await this.handlePostRoute(pathname, req, res)
      return
    }

    // Only GET otherwise
    if (req.method !== 'GET') {
      res.writeHead(405)
      res.end('Method Not Allowed')
      return
    }

    try {
      // API routes
      if (pathname.startsWith('/api/')) {
        await this.handleApiRoute(pathname, url, res)
        return
      }

      // Static files (proxied to Vite in dev mode)
      this.serveStatic(pathname, req, res)
    } catch (err) {
      console.error('Remote server request error:', err)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  }

  private async handleApiRoute(pathname: string, url: URL, res: ServerResponse): Promise<void> {
    res.setHeader('Content-Type', 'application/json')

    // Helper to get the projects directory (same logic as ipc-handlers)
    const getProjectsDir = (): string => {
      try {
        const pathsFile = process.env.PATHS_FILE || join(process.cwd(), 'paths.txt')
        const content = readFileSync(pathsFile, 'utf-8')
        const match = content.match(/Claude Project Dir = (.+)/)
        if (match) return match[1].replace('~', homedir())
      } catch { /* fall through */ }
      return join(homedir(), '.claude', 'projects')
    }

    if (pathname === '/api/projects-dir') {
      const dir = getProjectsDir()
      res.writeHead(200)
      res.end(JSON.stringify(dir))
      return
    }

    if (pathname === '/api/projects') {
      const dir = getProjectsDir()
      const projects = await scanProjects(dir)
      res.writeHead(200)
      res.end(JSON.stringify(projects))
      return
    }

    // /api/sessions/:name
    const sessionsMatch = pathname.match(/^\/api\/sessions\/(.+)$/)
    if (sessionsMatch) {
      const projectName = decodeURIComponent(sessionsMatch[1])
      const dir = getProjectsDir()
      const projectPath = join(dir, projectName)
      const sessions = await discoverSessions(projectPath)
      res.writeHead(200)
      res.end(JSON.stringify(sessions))
      return
    }

    if (pathname === '/api/messages') {
      const filePath = url.searchParams.get('path')
      if (!filePath) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'Missing path parameter' }))
        return
      }
      const parsed = await parseJsonlFile(filePath)
      const formatted = formatMessages(parsed)
      res.writeHead(200)
      res.end(JSON.stringify(formatted))
      return
    }

    if (pathname === '/api/preferences') {
      const prefs = loadPreferences()
      res.writeHead(200)
      res.end(JSON.stringify(prefs))
      return
    }

    if (pathname === '/api/session-costs') {
      const dir = url.searchParams.get('dir')
      if (!dir) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'Missing dir parameter' }))
        return
      }
      const costs = this.costCache.getSessionCosts(dir)
      res.writeHead(200)
      res.end(JSON.stringify(costs))
      return
    }

    if (pathname === '/api/project-costs') {
      const dirsParam = url.searchParams.get('dirs')
      if (!dirsParam) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'Missing dirs parameter' }))
        return
      }
      const dirs = JSON.parse(dirsParam) as string[]
      const costs = this.costCache.getAllProjectCosts(dirs)
      res.writeHead(200)
      res.end(JSON.stringify(costs))
      return
    }

    res.writeHead(404)
    res.end(JSON.stringify({ error: 'Not found' }))
  }

  private async handlePostRoute(pathname: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader('Content-Type', 'application/json')

    if (pathname === '/api/resume-session') {
      const body = await this.readBody(req)
      const { sessionId, projectPath, prompt } = JSON.parse(body)
      if (!sessionId || !projectPath || !prompt) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'Missing sessionId, projectPath, or prompt' }))
        return
      }
      resumeSession({ sessionId, projectPath, prompt })
      res.writeHead(200)
      res.end(JSON.stringify({ ok: true }))
      return
    }

    res.writeHead(404)
    res.end(JSON.stringify({ error: 'Not found' }))
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk) => chunks.push(chunk))
      req.on('end', () => resolve(Buffer.concat(chunks).toString()))
      req.on('error', reject)
    })
  }

  private get isDev(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  private serveStatic(pathname: string, req: IncomingMessage, res: ServerResponse): void {
    // In dev mode, proxy to Vite so remote browsers get live code
    if (this.isDev) {
      this.proxyToVite(pathname, req, res)
      return
    }

    // Production: serve from built renderer directory
    let filePath = pathname === '/' ? '/index.html' : pathname

    // Path traversal protection: resolve and ensure it's under rendererDir
    const fullPath = normalize(resolve(this.rendererDir, '.' + filePath))
    if (!fullPath.startsWith(normalize(this.rendererDir))) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }

    if (!existsSync(fullPath)) {
      // SPA fallback: serve index.html for non-API, non-asset routes
      const indexPath = join(this.rendererDir, 'index.html')
      if (existsSync(indexPath)) {
        const content = readFileSync(indexPath)
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(content)
        return
      }
      res.writeHead(404)
      res.end('Not Found')
      return
    }

    const ext = extname(fullPath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    const content = readFileSync(fullPath)
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(content)
  }

  private proxyToVite(pathname: string, req: IncomingMessage, res: ServerResponse): void {
    const proxyReq = httpRequest(
      {
        hostname: 'localhost',
        port: 5173,
        path: req.url || pathname,
        method: req.method,
        headers: { ...req.headers, host: 'localhost:5173' }
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
        proxyRes.pipe(res)
      }
    )
    proxyReq.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'text/html' })
      res.end('<!DOCTYPE html><html><body><h1>502 - Vite dev server not available</h1><p>Run <code>pnpm run dev</code> to start the dev server.</p></body></html>')
    })
    req.pipe(proxyReq)
  }

  private handleConnection(ws: WebSocket): void {
    this.clients.add(ws)
    this.clientState.set(ws, { watchers: new Map() })

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        this.handleWsMessage(ws, msg)
      } catch {
        // Invalid JSON — ignore
      }
    })

    ws.on('close', () => {
      this.cleanupClient(ws)
    })

    ws.on('error', () => {
      this.cleanupClient(ws)
    })
  }

  private async handleWsMessage(ws: WebSocket, msg: { action?: string; path?: string }): Promise<void> {
    const state = this.clientState.get(ws)
    if (!state) return

    if (msg.action === 'watch' && msg.path) {
      // Stop existing watcher for this path
      const existing = state.watchers.get(msg.path)
      if (existing) {
        await existing.stop()
      }

      const filePath = msg.path
      const watcher = new JsonlWatcher(filePath, {
        onNewMessages: (messages) => {
          const formatted = formatMessages(messages)
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              event: 'overseer:new-messages',
              data: {
                filePath,
                messages: formatted.messages,
                usage: formatted.totalUsage
              }
            }))
          }
        },
        onError: (error) => {
          console.error('Remote watcher error:', error.message)
        }
      })

      state.watchers.set(filePath, watcher)
      await watcher.start()
    }

    if (msg.action === 'unwatch' && msg.path) {
      const watcher = state.watchers.get(msg.path)
      if (watcher) {
        await watcher.stop()
        state.watchers.delete(msg.path)
      }
    }
  }

  private async cleanupClient(ws: WebSocket): Promise<void> {
    this.clients.delete(ws)
    const state = this.clientState.get(ws)
    if (state) {
      for (const watcher of state.watchers.values()) {
        await watcher.stop()
      }
      state.watchers.clear()
      this.clientState.delete(ws)
    }
  }
}
