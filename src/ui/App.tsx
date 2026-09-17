import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Check,
  ChevronRight,
  Download,
  FileText,
  MoreHorizontal,
  Network,
  PanelLeft,
  PanelRight,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  X,
  Leaf,
  CheckCheck,
} from 'lucide-react'
import { usePrefs, useWorkspace, run } from '../state/workspace'
import { titleOf } from '../core/notes'
import { Sidebar } from './Sidebar'
import { Inspector } from './Inspector'
import { Graph } from './Graph'
import { Dialogs } from './Dialogs'
import { NoteEditor } from '../editor/NoteEditor'
export function App() {
  const w = useWorkspace()
  const p = usePrefs()
  const [menu, setMenu] = useState(false)
  const note = w.notes.find((n) => n.path === p.active)
  useEffect(() => {
    if (window.innerWidth < 1000)
      usePrefs.getState().set({
        right: false,
        ...(window.innerWidth < 720 ? { left: false } : {}),
      })
    void useWorkspace.getState().init()
  }, [])
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme =
        p.theme === 'system' ? (media.matches ? 'dark' : 'light') : p.theme
      document.documentElement.style.setProperty('--accent', p.accent)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [p.theme, p.accent])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const w = useWorkspace.getState()
      const p = usePrefs.getState()
      if (e.key === 'Escape') setMenu(false)
      if (w.modal) return
      if (e.metaKey || e.ctrlKey) {
        if (['k', 'n', 'd', 's'].includes(e.key.toLowerCase()))
          e.preventDefault()
        if (e.key.toLowerCase() === 'k') w.set({ modal: 'search', query: '' })
        if (e.key.toLowerCase() === 'n') w.set({ modal: 'new' })
        if (e.key.toLowerCase() === 'd') run(w.daily())
        if (e.key.toLowerCase() === 's') run(w.flush())
      }
      if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        w.close(p.active)
      }
    }
    const unload = (e: BeforeUnloadEvent) => {
      if (useWorkspace.getState().saveState !== 'saved') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('keydown', handler)
    window.addEventListener('beforeunload', unload)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('beforeunload', unload)
    }
  }, [])
  useEffect(() => {
    setMenu(false)
  }, [p.active, w.view])
  const words = note?.content.trim().split(/\s+/).filter(Boolean).length || 0
  const favorite = p.favorites.includes(p.active)
  if (!w.ready)
    return (
      <div className="loading">
        <img src="/favicon.svg" alt="" />
        <span>Opening your thinking space…</span>
      </div>
    )
  return (
    <div
      className={`app-shell ${p.left ? '' : 'left-hidden'} ${p.right ? '' : 'right-hidden'}`}
    >
      {p.left && <Sidebar />}
      <div className="main-shell">
        <header className="tab-bar">
          {!p.left && (
            <button
              className="icon-button show-sidebar"
              aria-label="Show sidebar"
              title="Show sidebar"
              onClick={() => p.set({ left: true })}
            >
              <PanelLeft size={18} />
            </button>
          )}
          <div className="tabs" role="tablist" aria-label="Open notes">
            {p.tabs.map((path) => (
              <div
                className={`tab ${p.active === path && w.view === 'notes' ? 'active' : ''}`}
                key={path}
              >
                <button
                  role="tab"
                  aria-selected={p.active === path && w.view === 'notes'}
                  onClick={() => w.open(path)}
                >
                  <FileText size={14} />
                  <span>{titleOf(path)}</span>
                </button>
                <button
                  className="tab-close"
                  aria-label={`Close ${titleOf(path)}`}
                  onClick={() => w.close(path)}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            {w.view === 'graph' && (
              <div className="tab active">
                <button role="tab" aria-selected="true">
                  <Network size={14} />
                  Graph view
                </button>
                <button
                  className="tab-close"
                  aria-label="Close graph"
                  onClick={() => w.set({ view: 'notes' })}
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
          <button
            className="icon-button new-tab"
            aria-label="Create note"
            title="New note"
            onClick={() => w.set({ modal: 'new' })}
          >
            <Plus size={18} />
          </button>
          <div className="tab-spacer" />
          <button
            className="icon-button panel-toggle"
            title="Toggle inspector"
            aria-label="Toggle inspector"
            onClick={() => p.set({ right: !p.right })}
          >
            <PanelRight size={17} />
          </button>
        </header>
        <div className="workspace-body">
          <main className="main-content">
            <div className="breadcrumb-bar">
              <div className="breadcrumbs">
                <span>{w.name}</span>
                <ChevronRight size={13} />
                {w.view === 'graph' ? (
                  <strong>Graph view</strong>
                ) : note ? (
                  <>
                    {note.path
                      .split('/')
                      .slice(0, -1)
                      .map((part) => (
                        <span className="breadcrumb-folder" key={part}>
                          {part}
                          <ChevronRight size={13} />
                        </span>
                      ))}
                    <FileText size={13} />
                    <strong>{titleOf(note.path)}</strong>
                  </>
                ) : (
                  <strong>Your workspace</strong>
                )}
              </div>
              <div className="note-actions">
                {note && w.view === 'notes' && (
                  <>
                    <span className="save-indicator">
                      <span
                        className={
                          w.saveState === 'error'
                            ? 'save-dot error'
                            : 'save-dot'
                        }
                      />
                      {w.saveState === 'saved'
                        ? 'Saved'
                        : w.saveState === 'saving'
                          ? 'Saving…'
                          : 'Not saved'}
                    </span>
                    <button
                      className={`icon-button ${favorite ? 'is-favorite' : ''}`}
                      aria-label={
                        favorite ? 'Remove from favorites' : 'Add to favorites'
                      }
                      title={
                        favorite ? 'Remove from favorites' : 'Add to favorites'
                      }
                      onClick={() =>
                        p.set({
                          favorites: favorite
                            ? p.favorites.filter((f) => f !== p.active)
                            : [...p.favorites, p.active],
                        })
                      }
                    >
                      <Star
                        size={17}
                        fill={favorite ? 'currentColor' : 'none'}
                      />
                    </button>
                    <div className="note-menu-wrap">
                      <button
                        className="icon-button"
                        aria-label="Note actions"
                        aria-expanded={menu}
                        onClick={() => setMenu((m) => !m)}
                      >
                        <MoreHorizontal size={19} />
                      </button>
                      {menu && (
                        <>
                          <div
                            className="menu-dismiss"
                            onClick={() => setMenu(false)}
                          />
                          <div className="note-menu">
                            <button
                              onClick={() => {
                                setMenu(false)
                                w.set({ modal: 'rename' })
                              }}
                            >
                              <Pencil size={15} />
                              Rename or move
                            </button>
                            <button
                              onClick={() => {
                                const blob = new Blob([note.content], {
                                  type: 'text/markdown;charset=utf-8',
                                })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = titleOf(note.path) + '.md'
                                a.click()
                                setTimeout(() => URL.revokeObjectURL(url), 1000)
                                setMenu(false)
                              }}
                            >
                              <Download size={15} />
                              Download Markdown
                            </button>
                            <button
                              onClick={() => {
                                setMenu(false)
                                run(w.refresh())
                              }}
                            >
                              <RefreshCw size={15} />
                              Refresh vault
                            </button>
                            <hr />
                            <button
                              className="danger-text"
                              onClick={() => {
                                setMenu(false)
                                run(w.remove(note.path))
                              }}
                            >
                              <Trash2 size={15} />
                              Move to trash
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            {w.error && (
              <div className="error-banner" role="alert">
                <AlertCircle size={18} />
                <span>{w.error}</span>
                {w.saveState === 'error' && (
                  <>
                    <button onClick={() => run(w.flush())}>Retry save</button>
                    <button onClick={() => run(w.saveCopies())}>
                      Save copies
                    </button>
                    <button onClick={() => run(w.exportVault())}>
                      Export backup
                    </button>
                  </>
                )}
                <button
                  aria-label="Dismiss error"
                  onClick={() => w.set({ error: '' })}
                >
                  <X size={15} />
                </button>
              </div>
            )}
            {w.busy ? (
              <div className="empty-workspace">
                <RefreshCw className="spin" size={28} />
                <h2>Opening your vault…</h2>
                <p>Reading your Markdown files.</p>
              </div>
            ) : w.view === 'graph' ? (
              <Graph />
            ) : note ? (
              <NoteEditor note={note} key={note.path} />
            ) : (
              <div className="empty-workspace">
                <div className="empty-emblem">
                  <Leaf size={35} />
                </div>
                <span className="section-label">ROOM FOR SOMETHING NEW</span>
                <h1>Every thought starts somewhere.</h1>
                <p>Open a note from the sidebar, or give a new idea a home.</p>
                <button
                  className="primary"
                  onClick={() => w.set({ modal: 'new' })}
                >
                  <Plus size={16} />
                  Create a note
                </button>
                <button
                  className="text-button"
                  onClick={() => w.set({ modal: 'search', query: '' })}
                >
                  Find an existing note
                </button>
              </div>
            )}
          </main>
          {p.right && <Inspector note={note} />}
        </div>
        <footer className="status-bar">
          <div>
            <span>
              <span className="status-dot" />
              {w.saveState === 'error'
                ? 'Unsaved changes'
                : w.saveState === 'saving'
                  ? 'Saving changes…'
                  : w.kind === 'browser'
                    ? 'Saved in this browser'
                    : 'Local vault connected'}
            </span>
            <span className="status-separator" />
            <span>{w.notes.length} notes</span>
          </div>
          <div>
            {note && (
              <>
                <span>{words} words</span>
                <span>{note.content.length} characters</span>
                <span className="status-separator" />
              </>
            )}
            <span>Markdown</span>
            <CheckCheck size={13} />
          </div>
        </footer>
      </div>
      <Dialogs />
      {w.toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {w.toast}
        </div>
      )}
    </div>
  )
}
