import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  FileText,
  FolderOpen,
  Monitor,
  Moon,
  Search,
  Sun,
  Trash2,
  Undo2,
  X,
  ArrowUpRight,
  Keyboard,
  HardDrive,
} from 'lucide-react'
import { usePrefs, useWorkspace, run } from '../state/workspace'
import { searchNotes, titleOf } from '../core/notes'
export function Dialogs() {
  const w = useWorkspace()
  const p = usePrefs()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const [selected, setSelected] = useState(0)
  const dialog = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setValue(w.modal === 'rename' ? p.active.replace(/\.md$/i, '') : '')
    setError('')
    setSelected(0)
    const previous = document.activeElement as HTMLElement
    const timeout = setTimeout(() => {
      const el =
        dialog.current?.querySelector<HTMLElement>('input') ||
        dialog.current?.querySelector<HTMLElement>('button')
      el?.focus()
    }, 30)
    return () => {
      clearTimeout(timeout)
      previous?.focus()
    }
  }, [w.modal])
  useEffect(() => setSelected(0), [w.query])
  if (!w.modal) return null
  const close = () => {
    if (!working) w.set({ modal: null })
  }
  const results = searchNotes(w.notes, w.query)
  async function submit() {
    setWorking(true)
    setError('')
    try {
      if (w.modal === 'new') await w.create(value)
      else if (w.modal === 'folder') await w.folder(value)
      else if (w.modal === 'rename') await w.rename(p.active, value)
      w.set({ modal: null })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setWorking(false)
    }
  }
  function trap(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
    }
    if (e.key === 'Tab') {
      const all = dialog.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]),input,select,[tabindex="0"]',
      )
      if (!all?.length) return
      const first = all[0],
        last = all[all.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={
          w.modal === 'search'
            ? 'Search notes'
            : w.modal === 'settings'
              ? 'Settings'
              : w.modal === 'trash'
                ? 'Trash'
                : w.modal === 'new'
                  ? 'New note'
                  : w.modal === 'folder'
                    ? 'New folder'
                    : 'Rename note'
        }
        className={`dialog dialog-${w.modal}`}
        onKeyDown={trap}
      >
        {w.modal === 'search' ? (
          <>
            <div className="search-input-row">
              <Search size={21} />
              <input
                ref={input}
                autoFocus
                placeholder="Find a note, an idea, a connection…"
                aria-label="Search notes"
                value={w.query}
                onChange={(e) => w.set({ query: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setSelected((s) => Math.min(results.length - 1, s + 1))
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setSelected((s) => Math.max(0, s - 1))
                  }
                  if (e.key === 'Enter' && results[selected])
                    w.open(results[selected].path)
                }}
              />
              <button className="key-button" onClick={close}>
                esc
              </button>
            </div>
            <div className="search-subtitle">
              {w.query
                ? `${results.length} ${results.length === 1 ? 'result' : 'results'}`
                : 'YOUR NOTES'}
              <span>Use #tag to explore a topic</span>
            </div>
            <div className="search-results">
              {results.slice(0, 80).map((n, i) => (
                <button
                  key={n.path}
                  className={`search-result ${i === selected ? 'selected' : ''}`}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => w.open(n.path)}
                >
                  <span className="result-icon">
                    <FileText size={19} />
                  </span>
                  <span>
                    <strong>{titleOf(n.path)}</strong>
                    <small>
                      {n.path.includes('/')
                        ? n.path
                        : n.content
                            .split('\n')
                            .find((line) => line && !line.startsWith('#'))
                            ?.replace(/[*\[\]>]/g, '')
                            .slice(0, 95)}
                    </small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              ))}
              {!results.length && (
                <div className="empty-search">
                  <Search size={28} />
                  <h3>No notes found</h3>
                  <p>Try a different phrase or a #tag.</p>
                  <button
                    className="text-button"
                    onClick={() => w.set({ modal: 'new' })}
                  >
                    Start a new note
                  </button>
                </div>
              )}
            </div>
            <div className="search-footer">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> to navigate
              </span>
              <span>
                <kbd>↵</kbd> to open
              </span>
              <span>Search across your whole vault</span>
            </div>
          </>
        ) : (
          <>
            <div className="dialog-heading">
              <div>
                <span className="section-label">YOUR WORKSPACE</span>
                <h2>
                  {w.modal === 'settings'
                    ? 'Make yourself at home.'
                    : w.modal === 'new'
                      ? 'A new place to think.'
                      : w.modal === 'folder'
                        ? 'A little room to organize.'
                        : w.modal === 'trash'
                          ? 'Nothing lost.'
                          : 'Give this note a name.'}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close dialog"
                onClick={close}
              >
                <X size={19} />
              </button>
            </div>
            {['new', 'folder', 'rename'].includes(w.modal) && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void submit()
                }}
                className="name-form"
              >
                <label htmlFor="note-name">
                  {w.modal === 'folder' ? 'Folder name' : 'Note name'}
                </label>
                <input
                  id="note-name"
                  autoFocus
                  placeholder={
                    w.modal === 'folder'
                      ? 'Projects / A new beginning'
                      : 'An idea worth keeping'
                  }
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
                <p className="field-hint">
                  {w.modal === 'rename'
                    ? 'Use a folder path to move the note. Wiki references will update automatically.'
                    : 'Use a path like Projects/My idea to place it inside a folder.'}
                </p>
                {error && (
                  <p role="alert" className="form-error">
                    {error}
                  </p>
                )}
                <div className="dialog-actions">
                  <button type="button" className="secondary" onClick={close}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!value.trim() || working}
                    className="primary"
                  >
                    {working
                      ? 'Saving…'
                      : w.modal === 'new'
                        ? 'Create note'
                        : w.modal === 'folder'
                          ? 'Create folder'
                          : 'Save name'}
                  </button>
                </div>
              </form>
            )}
            {w.modal === 'settings' && (
              <div className="settings-content">
                <section>
                  <h3>Appearance</h3>
                  <p>A space that feels like you.</p>
                  <div className="theme-options">
                    {(
                      [
                        ['light', Sun, 'Light'],
                        ['dark', Moon, 'Dark'],
                        ['system', Monitor, 'System'],
                      ] as const
                    ).map(([theme, Icon, name]) => (
                      <button
                        key={theme}
                        className={p.theme === theme ? 'selected' : ''}
                        onClick={() => p.set({ theme })}
                      >
                        <Icon size={20} />
                        {name}
                        {p.theme === theme && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                  <div className="setting-row">
                    <span>Accent color</span>
                    <div className="color-options">
                      {[
                        '#47765d',
                        '#6177b1',
                        '#9570aa',
                        '#b47848',
                        '#b66777',
                      ].map((color) => (
                        <button
                          key={color}
                          style={{ background: color }}
                          title={color}
                          aria-label={`Accent ${color}`}
                          onClick={() => p.set({ accent: color })}
                        >
                          {p.accent === color && <Check size={14} />}
                        </button>
                      ))}
                      <input
                        aria-label="Custom accent color"
                        type="color"
                        value={p.accent}
                        onChange={(e) => p.set({ accent: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="setting-row">
                    <label htmlFor="font">Writing font</label>
                    <select
                      id="font"
                      value={p.font}
                      onChange={(e) =>
                        p.set({ font: e.target.value as 'sans' | 'serif' })
                      }
                    >
                      <option value="sans">Clean sans serif</option>
                      <option value="serif">Classic serif</option>
                    </select>
                  </div>
                </section>
                <section>
                  <h3>Your vault</h3>
                  <p>
                    {w.kind === 'browser'
                      ? 'Notes are stored in this browser. Export a backup, or connect a local folder.'
                      : `Writing Markdown files directly to ${w.name}. Reopen the folder after restarting the app.`}
                  </p>
                  <div className="vault-actions">
                    <button
                      onClick={() => {
                        close()
                        run(w.switchVault())
                      }}
                    >
                      <FolderOpen size={17} />
                      <span>Open local vault</span>
                      <ArrowUpRight size={15} />
                    </button>
                    <button onClick={() => fileInput.current?.click()}>
                      <ArrowUpFromLine size={17} />
                      <span>Import Markdown files</span>
                    </button>
                    <input
                      ref={fileInput}
                      type="file"
                      multiple
                      accept=".md,text/markdown"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) run(w.importFiles(e.target.files))
                        e.target.value = ''
                      }}
                    />
                    <button onClick={() => run(w.exportVault())}>
                      <ArrowDownToLine size={17} />
                      <span>Export vault as ZIP</span>
                    </button>
                    <button onClick={() => w.set({ modal: 'trash' })}>
                      <Trash2 size={17} />
                      <span>Trash</span>
                      <small>{w.trash.length}</small>
                    </button>
                    {w.kind !== 'browser' && (
                      <button onClick={() => run(w.browserVault())}>
                        <HardDrive size={17} />
                        <span>Return to browser vault</span>
                      </button>
                    )}
                  </div>
                </section>
                <section>
                  <h3>
                    <Keyboard size={16} /> Keyboard shortcuts
                  </h3>
                  <div className="shortcut-list">
                    {[
                      ['Find anything', '⌘ / Ctrl K'],
                      ['New note', '⌘ / Ctrl N'],
                      ['Daily note', '⌘ / Ctrl D'],
                      ['Save now', '⌘ / Ctrl S'],
                      ['Close current tab', 'Alt W'],
                    ].map(([name, key]) => (
                      <div key={name}>
                        <span>{name}</span>
                        <kbd>{key}</kbd>
                      </div>
                    ))}
                  </div>
                </section>
                <p className="settings-footer">
                  Lattice 1.0 · Your notes should outlast any app.
                </p>
              </div>
            )}
            {w.modal === 'trash' && (
              <div className="trash-content">
                <p className="field-hint">
                  Deleted notes stay here until you restore them. In local
                  vaults, their Markdown files live in the hidden .lattice-trash
                  folder.
                </p>
                {w.trash.map((t) => (
                  <div className="trash-row" key={t.storedPath}>
                    <FileText size={17} />
                    <span>
                      {titleOf(t.note.path)}
                      <small>{t.note.path}</small>
                    </span>
                    <button
                      className="secondary small"
                      onClick={() => run(w.restore(t.storedPath))}
                    >
                      <Undo2 size={14} />
                      Restore
                    </button>
                  </div>
                ))}
                {!w.trash.length && (
                  <div className="empty-search">
                    <Trash2 size={28} />
                    <h3>A clean slate.</h3>
                    <p>No notes in the trash.</p>
                  </div>
                )}
                <button
                  className="text-button"
                  onClick={() => w.set({ modal: 'settings' })}
                >
                  Back to settings
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
