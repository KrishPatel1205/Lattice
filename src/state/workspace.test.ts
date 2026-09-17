import { beforeEach, describe, it, expect } from 'vitest'
import { useWorkspace, usePrefs } from './workspace'
import { BrowserVault } from '../core/storage'
beforeEach(async () => {
  localStorage.clear()
  await useWorkspace.getState().init()
})
describe('workspace mutations', () => {
  it('serializes rapid edits and retains the latest content', async () => {
    const w = useWorkspace.getState()
    await w.create('Quick')
    w.edit('Quick.md', 'First')
    w.edit('Quick.md', 'Second')
    const firstSave = w.flush()
    w.edit('Quick.md', 'Latest')
    await firstSave
    await w.flush()
    expect(await new BrowserVault().read('Quick.md')).toBe('Latest')
  })
  it('refuses external overwrites and recovers both versions', async () => {
    const w = useWorkspace.getState()
    await w.create('Conflict', 'Original')
    await new BrowserVault().write('Conflict.md', 'External version')
    w.edit('Conflict.md', 'My version')
    await expect(w.flush()).rejects.toThrow('changed outside')
    expect(await new BrowserVault().read('Conflict.md')).toBe(
      'External version',
    )
    await w.saveCopies()
    expect(await new BrowserVault().read('Conflict (recovered).md')).toBe(
      'My version',
    )
    expect(await new BrowserVault().read('Conflict.md')).toBe(
      'External version',
    )
    expect(useWorkspace.getState().saveState).toBe('saved')
  })
  it('updates wiki and Markdown references while leaving code unchanged', async () => {
    const w = useWorkspace.getState()
    await w.create('Notes/Target', '# Target')
    await w.create(
      'Source',
      '[[Notes/Target|Friendly]] [Target](Notes/Target.md) `[[Notes/Target]]`',
    )
    await w.rename('Notes/Target.md', 'Projects/Renamed')
    expect(await new BrowserVault().read('Source.md')).toBe(
      '[[Projects/Renamed|Friendly]] [Target](Projects/Renamed.md) `[[Notes/Target]]`',
    )
  })
  it('recovers deleted notes after reloading the workspace', async () => {
    const w = useWorkspace.getState()
    await w.create('Notes/Keep', 'Still here')
    await w.remove('Notes/Keep.md')
    await w.init()
    const trash = useWorkspace.getState().trash
    expect(trash).toHaveLength(1)
    expect(trash[0].note.path).toBe('Notes/Keep.md')
    await w.restore(trash[0].storedPath)
    expect(await new BrowserVault().read('Notes/Keep.md')).toBe('Still here')
    expect(usePrefs.getState().active).toBe('Notes/Keep.md')
  })
})
