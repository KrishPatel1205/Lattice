import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BrowserVault, chooseVault, type VaultAdapter } from '../core/storage'
import {
  type Note,
  notePath,
  validPath,
  parentOf,
  titleOf,
  todayPath,
  uniquePath,
  resolveLink,
  linksOf,
  rewriteLinks,
} from '../core/notes'

interface Preferences {
  theme: 'light' | 'dark' | 'system'
  accent: string
  left: boolean
  right: boolean
  favorites: string[]
  tabs: string[]
  active: string
  mode: 'rich' | 'source'
  font: 'sans' | 'serif'
  set: (patch: Partial<Omit<Preferences, 'set'>>) => void
}
export const usePrefs = create<Preferences>()(
  persist(
    (set) => ({
      theme: 'light',
      accent: '#47765d',
      left: true,
      right: true,
      favorites: ['Welcome to Lattice.md'],
      tabs: ['Welcome to Lattice.md'],
      active: 'Welcome to Lattice.md',
      mode: 'rich',
      font: 'sans',
      set,
    }),
    { name: 'lattice.workspace.v1' },
  ),
)

type Modal =
  | null
  | 'search'
  | 'new'
  | 'folder'
  | 'rename'
  | 'settings'
  | 'trash'
  | 'link'
  | 'image'
interface Workspace {
  notes: Note[]
  folders: string[]
  name: string
  kind: VaultAdapter['kind']
  ready: boolean
  busy: boolean
  saveState: 'saved' | 'saving' | 'error'
  error: string
  toast: string
  modal: Modal
  query: string
  view: 'notes' | 'graph'
  trash: { note: Note; storedPath: string }[]
  init: () => Promise<void>
  edit: (path: string, content: string) => void
  flush: () => Promise<void>
  saveCopies: () => Promise<void>
  open: (path: string) => void
  close: (path: string) => void
  create: (name: string, content?: string) => Promise<string>
  folder: (path: string) => Promise<void>
  rename: (from: string, to: string) => Promise<void>
  remove: (path: string) => Promise<void>
  restore: (storedPath: string) => Promise<void>
  daily: () => Promise<void>
  follow: (target: string, from?: string) => Promise<void>
  switchVault: () => Promise<void>
  browserVault: () => Promise<void>
  refresh: () => Promise<void>
  importFiles: (files: FileList) => Promise<void>
  exportVault: () => Promise<void>
  notify: (message: string) => void
  showError: (e: unknown) => void
  set: (patch: Partial<Workspace>) => void
}
let adapter: VaultAdapter = new BrowserVault()
let originals = new Map<string, string>()
const pending = new Map<string, string>()
let timer: ReturnType<typeof setTimeout> | undefined
let chain: Promise<void> = Promise.resolve()
let toastTimer: ReturnType<typeof setTimeout> | undefined
function reconcile(notes: Note[], reset = false) {
  const p = usePrefs.getState()
  const tabs = reset
    ? notes.slice(0, 1).map((n) => n.path)
    : p.tabs.filter((path) => notes.some((n) => n.path === path))
  if (!tabs.length && notes.length) tabs.push(notes[0].path)
  p.set({
    tabs,
    active: tabs.includes(p.active) ? p.active : tabs[0] || '',
    ...(reset ? { favorites: [] } : {}),
  })
}
async function loadVault(next: VaultAdapter, reset = true) {
  const data = await next.load()
  adapter = next
  originals = new Map(data.notes.map((n) => [n.path, n.content]))
  pending.clear()
  reconcile(data.notes, reset)
  useWorkspace.setState({
    ...data,
    name: next.name,
    kind: next.kind,
    ready: true,
    busy: false,
    saveState: 'saved',
    error: '',
    trash: data.trash || [],
    view: 'notes',
  })
}
export const useWorkspace = create<Workspace>((set, get) => ({
  notes: [],
  folders: [],
  name: 'Personal space',
  kind: 'browser',
  ready: false,
  busy: false,
  saveState: 'saved',
  error: '',
  toast: '',
  modal: null,
  query: '',
  view: 'notes',
  trash: [],
  set,
  async init() {
    try {
      await loadVault(new BrowserVault(), false)
    } catch (e) {
      get().showError(e)
      set({ ready: true })
    }
  },
  notify(toast) {
    clearTimeout(toastTimer)
    set({ toast })
    toastTimer = setTimeout(() => set({ toast: '' }), 4000)
  },
  showError(e) {
    set({
      error: e instanceof Error ? e.message : String(e),
      saveState: pending.size ? 'error' : get().saveState,
      busy: false,
    })
  },
  edit(path, content) {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.path === path ? { ...n, content, modified: Date.now() } : n,
      ),
      saveState: 'saving',
    }))
    pending.set(path, content)
    clearTimeout(timer)
    timer = setTimeout(() => {
      void get().flush().catch(get().showError)
    }, 450)
  },
  async flush() {
    clearTimeout(timer)
    const work = async () => {
      while (pending.size) {
        const [path, content] = pending.entries().next().value!
        const actual = await adapter.read(path)
        const expected = originals.get(path) ?? null
        if (actual !== expected && actual !== content)
          throw new Error(
            `“${titleOf(path)}” changed outside Lattice. Your edits are still here. Save copies to keep your edits alongside the external version, or export a backup.`,
          )
        await adapter.write(path, content)
        originals.set(path, content)
        if (pending.get(path) === content) pending.delete(path)
      }
      set({ saveState: 'saved' })
    }
    chain = chain.catch(() => {}).then(work)
    try {
      await chain
    } catch (e) {
      set({ saveState: 'error' })
      throw e
    }
  },
  async saveCopies() {
    clearTimeout(timer)
    await chain.catch(() => {})
    const snapshot = [...pending.entries()]
    let lastPath = ''
    for (const [path, content] of snapshot) {
      const base = path.replace(/\.md$/i, ' (recovered).md')
      let copy = uniquePath(base, get().notes)
      let suffix = 2
      while ((await adapter.read(copy)) !== null)
        copy = base.replace(/\.md$/i, ` ${suffix++}.md`)
      await adapter.write(copy, content)
      lastPath = copy
      if (pending.get(path) === content) pending.delete(path)
    }
    if (pending.size)
      throw new Error(
        'More edits arrived during recovery. Save copies again to preserve them.',
      )
    await loadVault(adapter, false)
    if (lastPath) get().open(lastPath)
    get().notify(
      'Your edits were saved as recovered notes. External versions were kept.',
    )
  },
  open(path) {
    const p = usePrefs.getState()
    p.set({
      active: path,
      tabs: p.tabs.includes(path) ? p.tabs : [...p.tabs, path],
    })
    set({ view: 'notes', modal: null })
  },
  close(path) {
    const p = usePrefs.getState()
    const index = p.tabs.indexOf(path)
    const tabs = p.tabs.filter((t) => t !== path)
    p.set({
      tabs,
      active: p.active === path ? tabs[Math.max(0, index - 1)] || '' : p.active,
    })
  },
  async create(name, content) {
    await get().flush()
    const path = notePath(name)
    if (
      get().notes.some((n) => n.path.toLowerCase() === path.toLowerCase()) ||
      (await adapter.read(path)) !== null
    )
      throw new Error('A note with that name already exists.')
    const body = content ?? `# ${titleOf(path)}\n\n`
    await adapter.write(path, body)
    originals.set(path, body)
    const folder = parentOf(path)
    set((s) => ({
      notes: [...s.notes, { path, content: body, modified: Date.now() }],
      folders:
        folder && !s.folders.includes(folder)
          ? [...s.folders, folder]
          : s.folders,
    }))
    get().open(path)
    return path
  },
  async folder(name) {
    const path = validPath(name)
    if (get().folders.includes(path))
      throw new Error('That folder already exists.')
    await adapter.mkdir(path)
    set((s) => ({ folders: [...s.folders, path], modal: null }))
    get().notify('Folder created')
  },
  async rename(from, name) {
    await get().flush()
    const to = notePath(name)
    if (from === to) return
    if (get().notes.some((n) => n.path.toLowerCase() === to.toLowerCase()))
      throw new Error('A note with that name already exists.')
    if ((await adapter.read(from)) !== originals.get(from))
      throw new Error(
        'This note changed outside Lattice. Refresh the vault before renaming.',
      )
    await adapter.move(from, to)
    const body = originals.get(from)!
    originals.delete(from)
    originals.set(to, body)
    const oldNotes = get().notes
    set((s) => ({
      notes: s.notes.map((n) => (n.path === from ? { ...n, path: to } : n)),
      folders: [...new Set([...s.folders, parentOf(to)].filter(Boolean))],
    }))
    const p = usePrefs.getState()
    p.set({
      tabs: p.tabs.map((t) => (t === from ? to : t)),
      active: p.active === from ? to : p.active,
      favorites: p.favorites.map((t) => (t === from ? to : t)),
    })
    for (const n of oldNotes) {
      const updated = rewriteLinks(n.content, n.path, from, to, oldNotes)
      if (updated !== n.content)
        get().edit(n.path === from ? to : n.path, updated)
    }
    await get().flush()
    set({ modal: null })
    get().notify('Note renamed. Wiki references updated.')
  },
  async remove(path) {
    await get().flush()
    const note = get().notes.find((n) => n.path === path)
    if (!note) return
    if ((await adapter.read(path)) !== originals.get(path))
      throw new Error(
        'This note changed outside Lattice. Refresh before moving it to trash.',
      )
    const storedPath = `.lattice-trash/${Date.now()}-${crypto.randomUUID().slice(0, 8)}--${encodeURIComponent(path)}`
    await adapter.move(path, storedPath)
    originals.delete(path)
    set((s) => ({
      notes: s.notes.filter((n) => n.path !== path),
      trash: [...s.trash, { note, storedPath }],
    }))
    get().close(path)
    get().notify('Moved to trash. Restore it from Settings → Trash.')
  },
  async restore(storedPath) {
    const item = get().trash.find((t) => t.storedPath === storedPath)
    if (!item) return
    const path = uniquePath(item.note.path, get().notes)
    await adapter.move(storedPath, path)
    originals.set(path, item.note.content)
    set((s) => ({
      notes: [...s.notes, { ...item.note, path }],
      trash: s.trash.filter((t) => t.storedPath !== storedPath),
    }))
    get().open(path)
    get().notify('Note restored')
  },
  async daily() {
    const path = todayPath()
    if (get().notes.some((n) => n.path === path)) get().open(path)
    else
      await get().create(
        path,
        `# ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}\n\n## What’s on my mind\n\n\n## Today’s focus\n\n- [ ] \n\n## A little reflection\n\n\n#daily\n`,
      )
  },
  async follow(target, from) {
    const match = resolveLink(
      target.split('#')[0],
      from || usePrefs.getState().active,
      get().notes,
    )
    if (match) get().open(match.path)
    else {
      const path = target.split('#')[0]
      await get().create(path)
      get().notify('Created a note for this connection')
    }
  },
  async switchVault() {
    const next = await chooseVault()
    if (!next) return
    await get().flush()
    set({ busy: true })
    try {
      await loadVault(next)
    } finally {
      set({ busy: false })
    }
  },
  async browserVault() {
    await get().flush()
    await loadVault(new BrowserVault())
    set({ modal: null })
  },
  async refresh() {
    await get().flush()
    const data = await adapter.load()
    originals = new Map(data.notes.map((n) => [n.path, n.content]))
    reconcile(data.notes)
    set(data)
    get().notify('Vault refreshed from disk')
  },
  async importFiles(files) {
    let count = 0
    for (const file of Array.from(files)) {
      if (!/\.md$/i.test(file.name)) continue
      await get().create(
        uniquePath(notePath(file.name), get().notes),
        await file.text(),
      )
      count++
    }
    get().notify(`Imported ${count} Markdown ${count === 1 ? 'note' : 'notes'}`)
  },
  async exportVault() {
    const { zipSync, strToU8 } = await import('fflate')
    const files = Object.fromEntries(
      get().notes.map((n) => [n.path, strToU8(n.content)]),
    )
    if (!Object.keys(files).length)
      throw new Error('Create a note before exporting your vault.')
    const blob = new Blob([new Uint8Array(zipSync(files))], {
      type: 'application/zip',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${get().name.toLowerCase().replace(/\s+/g, '-')}.zip`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    get().notify('Vault exported as Markdown files')
  },
}))
export const run = (task: Promise<unknown>) => {
  void task.catch(useWorkspace.getState().showError)
}
export function activeNote() {
  return useWorkspace
    .getState()
    .notes.find((n) => n.path === usePrefs.getState().active)
}
export function linkedNotes(note: Note, notes: Note[]) {
  return linksOf(note.content).map((l) => ({
    ...l,
    note: resolveLink(l.target, note.path, notes),
  }))
}
