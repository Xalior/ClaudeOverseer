import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { createWebOverseerAPI } from './overseer-web'
import 'highlight.js/styles/github-dark.css'
import './styles/custom.scss'

// If preload ran (Electron), window.overseer already exists.
// Otherwise we're in a browser — create a fetch+WebSocket adapter.
if (!window.overseer) {
  ;(window as { overseer: unknown }).overseer = createWebOverseerAPI()
  ;(window as { __REMOTE_CLIENT__?: boolean }).__REMOTE_CLIENT__ = true
}

declare global {
  interface Window {
    __REMOTE_CLIENT__?: boolean
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
