import { useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Hash,
  Network,
  Plus,
  Search,
  Settings2,
  Star,
  ArrowUpRight,
  Layers3,
  PanelLeftClose,
} from 'lucide-react'
import { usePrefs, useWorkspace, run } from '../state/workspace'
import { titleOf, parentOf, tagsOf } from '../core/notes'

export function Sidebar() {
  const w = useWorkspace()
  const p = usePrefs()
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [section, setSection] = useState<'files' | 'tags'>('files')
  const allFolders = [
    ...new Set(
      [...w.folders, ...w.notes.map((n) => parentOf(n.path))]
        .flatMap((path) =>
          path.split('/').map((_, i, parts) => parts.slice(0, i + 1).join('/')),
        )
        .filter(Boolean),
    ),
  ]
  const allTags = [...new Set(w.notes.flatMap((n) => tagsOf(n.content)))].sort()
  const toggle = (folder: string) =>
    setClosed((prev) => {
      const next = new Set(prev)
      next.has(folder) ? next.delete(folder) : next.add(folder)
      return next
    })
  const noteButton = (path: string, depth = 0) => (
    <button
      key={path}
      className={`file-row ${p.active === path && w.view === 'notes' ? 'selected' : ''}`}
      style={{ paddingLeft: 14 + depth * 16 }}
      onClick={() => w.open(path)}
      title={path}
    >
      <FileText size={15} />
      <span>{titleOf(path)}</span>
      {p.active === path && <i className="active-dot" />}
    </button>
  )
  const tree = (parent = '', depth = 0): React.ReactNode => (
    <>
      {allFolders
        .filter((f) => parentOf(f) === parent)
        .sort()
        .map((folder) => (
          <div key={folder}>
            <button
              className="folder-row"
              style={{ paddingLeft: 11 + depth * 16 }}
              onClick={() => toggle(folder)}
              aria-expanded={!closed.has(folder)}
            >
              {closed.has(folder) ? (
                <ChevronRight size={13} />
              ) : (
                <ChevronDown size={13} />
              )}
              <Folder size={15} />
              <span>{folder.split('/').pop()}</span>
              <small>
                {w.notes.filter((n) => n.path.startsWith(folder + '/')).length}
              </small>
            </button>
            {!closed.has(folder) && tree(folder, depth + 1)}
          </div>
        ))}
      {w.notes
        .filter((n) => parentOf(n.path) === parent)
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((n) => noteButton(n.path, depth))}
    </>
  )
  return (
    <aside className="sidebar">
      <div className="brand-row">
        <img src="/favicon.svg" alt="" />
        <span>
          Lattice<span className="brand-dot">.</span>
        </span>
        <button
          className="icon-button"
          title="Hide sidebar"
          aria-label="Hide sidebar"
          onClick={() => p.set({ left: false })}
        >
          <PanelLeftClose size={17} />
        </button>
      </div>
      <button className="vault-picker" onClick={() => run(w.switchVault())}>
        <span className="vault-avatar">
          <Layers3 size={18} />
        </span>
        <span>
          <strong>{w.name}</strong>
          <small>
            {w.kind === 'browser'
              ? 'Your personal workspace'
              : 'Connected local folder'}
          </small>
        </span>
        <ChevronDown size={15} />
      </button>
      <button
        className="search-button"
        onClick={() => w.set({ modal: 'search', query: '' })}
      >
        <Search size={16} />
        <span>Search anything</span>
        <kbd>⌘ K</kbd>
      </button>
      <nav className="main-nav">
        <button
          className={w.view === 'notes' ? 'nav-item current' : 'nav-item'}
          onClick={() => w.set({ view: 'notes' })}
        >
          <BookOpen size={17} />
          All notes<span>{w.notes.length}</span>
        </button>
        <button className="nav-item" onClick={() => run(w.daily())}>
          <CalendarDays size={17} />
          Daily note<span className="today-mark">Today</span>
        </button>
        <button
          className={w.view === 'graph' ? 'nav-item current' : 'nav-item'}
          onClick={() => w.set({ view: 'graph' })}
        >
          <Network size={17} />
          Graph view
          <ArrowUpRight className="muted" size={14} />
        </button>
      </nav>
      <div className="sidebar-scroll">
        <div className="section-heading">
          <span>FAVORITES</span>
          <Star size={12} />
        </div>
        <div className="favorite-list">
          {p.favorites
            .filter((f) => w.notes.some((n) => n.path === f))
            .map((path) => (
              <button
                key={path}
                className="favorite-row"
                onClick={() => w.open(path)}
              >
                <Star size={14} />
                <span>{titleOf(path)}</span>
              </button>
            ))}
          {!p.favorites.some((f) => w.notes.some((n) => n.path === f)) && (
            <p className="sidebar-hint">Star a note to keep it close.</p>
          )}
        </div>
        <div className="explorer-heading">
          <div>
            <button
              className={section === 'files' ? 'selected' : ''}
              onClick={() => setSection('files')}
            >
              Files
            </button>
            <button
              className={section === 'tags' ? 'selected' : ''}
              onClick={() => setSection('tags')}
            >
              Tags
            </button>
          </div>
          <div>
            <button
              className="icon-button"
              aria-label="New folder"
              title="New folder"
              onClick={() => w.set({ modal: 'folder' })}
            >
              <FolderPlus size={15} />
            </button>
            <button
              className="icon-button"
              aria-label="New note"
              title="New note"
              onClick={() => w.set({ modal: 'new' })}
            >
              <Plus size={17} />
            </button>
          </div>
        </div>
        <div className="file-tree">
          {section === 'files'
            ? tree()
            : allTags.map((tag) => (
                <button
                  key={tag}
                  className="file-row"
                  onClick={() => w.set({ query: '#' + tag, modal: 'search' })}
                >
                  <Hash size={15} />
                  <span>{tag}</span>
                  <small>
                    {
                      w.notes.filter((n) => tagsOf(n.content).includes(tag))
                        .length
                    }
                  </small>
                </button>
              ))}
        </div>
      </div>
      <div className="sidebar-bottom">
        <div className="local-card">
          <span className="local-icon">
            <FolderOpen size={17} />
          </span>
          <div>
            <strong>
              {w.kind === 'browser'
                ? 'Make it your own'
                : 'Your files. Your space.'}
            </strong>
            <p>
              {w.kind === 'browser'
                ? 'Bring your Markdown notes home.'
                : 'Connected to your local vault.'}
            </p>
            <button onClick={() => run(w.switchVault())}>
              {w.kind === 'browser' ? 'Open local vault' : 'Switch vault'}
              <ArrowUpRight size={12} />
            </button>
          </div>
        </div>
        <div className="sidebar-footer">
          <button onClick={() => w.set({ modal: 'settings' })}>
            <Settings2 size={16} />
            Settings
          </button>
          <span>
            <i />
            {w.kind === 'browser' ? 'Browser vault' : 'Local vault'}
          </span>
        </div>
      </div>
    </aside>
  )
}
