import type { Note, VaultData } from './notes'
import { parentOf, validPath, trashEntry } from './notes'
import { seedVault } from './seed'
export interface VaultAdapter {
  name: string
  kind: 'browser' | 'folder' | 'desktop'
  load(): Promise<VaultData>
  read(path: string): Promise<string | null>
  write(path: string, content: string): Promise<void>
  mkdir(path: string): Promise<void>
  move(from: string, to: string): Promise<void>
}
const key = 'lattice.vault.v1'
export class BrowserVault implements VaultAdapter {
  name = 'Personal space'
  kind = 'browser' as const
  private data(): VaultData {
    const saved = localStorage.getItem(key)
    if (saved) {
      const value = JSON.parse(saved)
      if (!Array.isArray(value.notes) || !Array.isArray(value.folders))
        throw new Error(
          'The browser vault could not be read. Export recovery data before resetting storage.',
        )
      return value
    }
    return seedVault()
  }
  private save(data: VaultData) {
    localStorage.setItem(key, JSON.stringify(data))
  }
  async load() {
    const data = this.data()
    this.save(data)
    return {
      notes: data.notes.filter((n) => !n.path.startsWith('.lattice-trash/')),
      folders: data.folders.filter((p) => !p.startsWith('.')),
      trash: data.notes
        .filter((n) => n.path.startsWith('.lattice-trash/'))
        .map(trashEntry),
    }
  }
  async read(path: string) {
    return this.data().notes.find((n) => n.path === path)?.content ?? null
  }
  async write(path: string, content: string) {
    const data = this.data()
    const old = data.notes.find((n) => n.path === path)
    if (old) {
      old.content = content
      old.modified = Date.now()
    } else data.notes.push({ path, content, modified: Date.now() })
    const folder = parentOf(path)
    if (folder && !data.folders.includes(folder)) data.folders.push(folder)
    this.save(data)
  }
  async mkdir(path: string) {
    const data = this.data()
    if (!data.folders.includes(path)) data.folders.push(path)
    this.save(data)
  }
  async move(from: string, to: string) {
    const data = this.data()
    if (data.notes.some((n) => n.path.toLowerCase() === to.toLowerCase()))
      throw new Error('A note with that name already exists.')
    const n = data.notes.find((n) => n.path === from)
    if (!n) throw new Error('The note no longer exists.')
    n.path = to
    const folder = parentOf(to)
    if (folder && !data.folders.includes(folder)) data.folders.push(folder)
    this.save(data)
  }
}
export class FolderVault implements VaultAdapter {
  kind = 'folder' as const
  constructor(private root: FileSystemDirectoryHandle) {}
  get name() {
    return this.root.name
  }
  private async directory(path: string, create = false) {
    let dir = this.root
    for (const part of path.split('/').filter(Boolean))
      dir = await dir.getDirectoryHandle(part, { create })
    return dir
  }
  async load() {
    const notes: Note[] = []
    const folders: string[] = []
    const visit = async (dir: FileSystemDirectoryHandle, base = '') => {
      for await (const [name, handle] of dir.entries()) {
        if (name.startsWith('.') || name === 'node_modules') continue
        const path = base + name
        if (handle.kind === 'directory') {
          folders.push(path)
          await visit(handle, path + '/')
        } else if (/\.md$/i.test(name)) {
          const f = await handle.getFile()
          notes.push({
            path,
            content: await f.text(),
            modified: f.lastModified,
          })
        }
      }
    }
    await visit(this.root)
    const trash: Note[] = []
    try {
      const dir = await this.root.getDirectoryHandle('.lattice-trash')
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === 'file' && /\.md$/i.test(name)) {
          const file = await handle.getFile()
          trash.push({
            path: '.lattice-trash/' + name,
            content: await file.text(),
            modified: file.lastModified,
          })
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'NotFoundError')) throw e
    }
    return { notes, folders, trash: trash.map(trashEntry) }
  }
  async read(path: string) {
    try {
      const dir = await this.directory(parentOf(path))
      return await (
        await (await dir.getFileHandle(path.split('/').pop()!)).getFile()
      ).text()
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotFoundError') return null
      throw e
    }
  }
  async write(path: string, content: string) {
    const dir = await this.directory(parentOf(path), true)
    const file = await dir.getFileHandle(path.split('/').pop()!, {
      create: true,
    })
    const stream = await file.createWritable()
    try {
      await stream.write(content)
      await stream.close()
    } catch (e) {
      await stream.abort().catch(() => {})
      throw e
    }
  }
  async mkdir(path: string) {
    await this.directory(path, true)
  }
  async move(from: string, to: string) {
    if ((await this.read(to)) !== null)
      throw new Error('A note with that name already exists.')
    const content = await this.read(from)
    if (content === null) throw new Error('The note no longer exists.')
    await this.write(to, content)
    await (
      await this.directory(parentOf(from))
    ).removeEntry(from.split('/').pop()!)
  }
}
export class DesktopVault implements VaultAdapter {
  kind = 'desktop' as const
  constructor(private root: string) {}
  get name() {
    return this.root.split(/[\\/]/).pop() || 'Local vault'
  }
  private full(path: string) {
    if (path.startsWith('.lattice-trash/'))
      validPath(path.slice('.lattice-trash/'.length))
    else validPath(path)
    return `${this.root}/${path}`
  }
  async load() {
    const fs = await import('@tauri-apps/plugin-fs')
    const notes: Note[] = []
    const folders: string[] = []
    const visit = async (base = '') => {
      for (const entry of await fs.readDir(
        base ? this.full(base) : this.root,
      )) {
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.isSymlink
        )
          continue
        const path = base ? `${base}/${entry.name}` : entry.name
        if (entry.isDirectory) {
          folders.push(path)
          await visit(path)
        } else if (/\.md$/i.test(entry.name)) {
          const info = await fs.stat(this.full(path))
          notes.push({
            path,
            content: await fs.readTextFile(this.full(path)),
            modified: info.mtime?.getTime() || Date.now(),
          })
        }
      }
    }
    await visit()
    const trash: Note[] = []
    const trashDir = `${this.root}/.lattice-trash`
    if (await fs.exists(trashDir))
      for (const entry of await fs.readDir(trashDir)) {
        if (entry.isFile && !entry.isSymlink && /\.md$/i.test(entry.name)) {
          const path = '.lattice-trash/' + entry.name
          const info = await fs.stat(this.full(path))
          trash.push({
            path,
            content: await fs.readTextFile(this.full(path)),
            modified: info.mtime?.getTime() || Date.now(),
          })
        }
      }
    return { notes, folders, trash: trash.map(trashEntry) }
  }
  async read(path: string) {
    const fs = await import('@tauri-apps/plugin-fs')
    return (await fs.exists(this.full(path)))
      ? fs.readTextFile(this.full(path))
      : null
  }
  async write(path: string, content: string) {
    const fs = await import('@tauri-apps/plugin-fs')
    const folder = parentOf(path)
    if (folder) await fs.mkdir(this.full(folder), { recursive: true })
    await fs.writeTextFile(this.full(path), content)
  }
  async mkdir(path: string) {
    const fs = await import('@tauri-apps/plugin-fs')
    await fs.mkdir(this.full(path), { recursive: true })
  }
  async move(from: string, to: string) {
    const fs = await import('@tauri-apps/plugin-fs')
    if (await fs.exists(this.full(to)))
      throw new Error('A note with that name already exists.')
    const folder = parentOf(to)
    if (folder)
      await fs.mkdir(
        folder === '.lattice-trash'
          ? `${this.root}/.lattice-trash`
          : this.full(folder),
        { recursive: true },
      )
    await fs.rename(this.full(from), this.full(to))
  }
}
export async function chooseVault(): Promise<VaultAdapter | null> {
  if ('__TAURI_INTERNALS__' in window) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const root = await open({
      directory: true,
      multiple: false,
      recursive: true,
      title: 'Open a Markdown vault',
    })
    return typeof root === 'string' ? new DesktopVault(root) : null
  }
  if (!('showDirectoryPicker' in window))
    throw new Error(
      'Opening a local folder needs Chrome or Edge, or the Lattice desktop app. You can still import Markdown files and export your vault here.',
    )
  try {
    return new FolderVault(
      await window.showDirectoryPicker({ mode: 'readwrite' }),
    )
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null
    throw e
  }
}
