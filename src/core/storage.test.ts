import { beforeEach, describe, expect, it } from 'vitest'
import { BrowserVault } from './storage'
beforeEach(() => localStorage.clear())
describe('browser vault persistence', () => {
  it('retains edits and nested folders across adapter instances', async () => {
    const vault = new BrowserVault()
    await vault.load()
    await vault.write('Projects/Test.md', '# Hello\n\nA durable thought.')
    const reopened = new BrowserVault()
    const data = await reopened.load()
    expect(
      data.notes.find((n) => n.path === 'Projects/Test.md')?.content,
    ).toContain('A durable thought.')
    expect(data.folders).toContain('Projects')
  })
  it('does not overwrite a note when moving onto an existing path', async () => {
    const vault = new BrowserVault()
    await vault.write('One.md', 'One')
    await vault.write('Two.md', 'Two')
    await expect(vault.move('One.md', 'Two.md')).rejects.toThrow(
      'already exists',
    )
    expect(await vault.read('One.md')).toBe('One')
    expect(await vault.read('Two.md')).toBe('Two')
  })
  it('keeps trashed Markdown available for recovery', async () => {
    const vault = new BrowserVault()
    await vault.write('Keep.md', 'Keep me')
    await vault.move('Keep.md', '.lattice-trash/Keep.md')
    expect((await vault.load()).notes.some((n) => n.path === 'Keep.md')).toBe(
      false,
    )
    expect(await vault.read('.lattice-trash/Keep.md')).toBe('Keep me')
    await vault.move('.lattice-trash/Keep.md', 'Keep.md')
    expect(await vault.read('Keep.md')).toBe('Keep me')
  })
  it('does not replace malformed storage with starter content', async () => {
    localStorage.setItem('lattice.vault.v1', '{broken')
    await expect(new BrowserVault().load()).rejects.toThrow()
    expect(localStorage.getItem('lattice.vault.v1')).toBe('{broken')
  })
})
