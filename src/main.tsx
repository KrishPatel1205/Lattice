import { Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import './ui/styles.css'
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <main className="empty-workspace">
        <h1>Something interrupted your workspace.</h1>
        <p>Your saved notes are still in your vault. Reload to try again.</p>
        <button className="primary" onClick={() => location.reload()}>
          Reload Lattice
        </button>
      </main>
    ) : (
      this.props.children
    )
  }
}
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
