import { describe, it, expect } from 'vitest'
import {
  graphOf,
  linksOf,
  notePath,
  resolveLink,
  searchNotes,
  tagsOf,
  todayPath,
  uniquePath,
  validPath,
  type Note,
} from './notes'
const notes: Note[] = [
  {
    path: 'Notes/Ideas.md',
    content: '# Ideas\n\n[[Books/Thinking|A book]] #learning',
    modified: 1,
  },
  {
    path: 'Books/Thinking.md',
    content: 'A book about clarity. #reading #learning',
    modified: 2,
  },
  { path: 'Books/Ideas.md', content: 'Another perspective', modified: 3 },
]
describe('Markdown knowledge index', () => {
  it('indexes aliases and local Markdown links but ignores code and remote links', () => {
    expect(
      linksOf(
        '[[Books/Thinking|A book]] [next](Notes/Ideas.md) [web](https://example.com) `[[not a note]]`\n```md\n[[also not a note]]\n```',
      ),
    ).toEqual([
      { target: 'Books/Thinking', label: 'A book' },
      { target: 'Notes/Ideas.md', label: 'next' },
    ])
  })
  it('prefers relative paths before ambiguous note titles', () => {
    expect(resolveLink('Ideas', 'Books/Thinking.md', notes)?.path).toBe(
      'Books/Ideas.md',
    )
    expect(
      resolveLink('../Notes/Ideas.md', 'Books/Thinking.md', notes)?.path,
    ).toBe('Notes/Ideas.md')
    expect(resolveLink('thinking', 'Notes/Ideas.md', notes)?.path).toBe(
      'Books/Thinking.md',
    )
  })
  it('does not mistake headings or code for tags', () => {
    expect(
      tagsOf(
        '# Heading\n#reading #Reading #deep-work #学习\n`#code`\n```\n#hidden\n```',
      ),
    ).toEqual(['reading', 'deep-work', '学习'])
  })
  it('builds edges only to existing notes', () => {
    expect(graphOf(notes)).toEqual([
      { source: 'Notes/Ideas.md', target: 'Books/Thinking.md' },
    ])
  })
  it('searches full text and exact tags', () => {
    expect(searchNotes(notes, '#learning clarity').map((n) => n.path)).toEqual([
      'Books/Thinking.md',
    ])
    expect(searchNotes(notes, '#learn')).toEqual([])
  })
})
describe('vault paths', () => {
  it.each([
    '../secret',
    '/tmp/file',
    'Notes/../secret',
    '.hidden',
    'Notes//A',
    'a:b',
    'A\u0000B',
  ])('rejects unsafe path %s', (path) => {
    expect(() => validPath(path)).toThrow()
  })
  it('keeps nested names and avoids duplicate extensions', () => {
    expect(notePath(' Notes/A thought ')).toBe('Notes/A thought.md')
    expect(notePath('Note.MD')).toBe('Note.MD')
  })
  it('deduplicates case-insensitively', () => {
    expect(uniquePath('books/thinking.md', notes)).toBe('books/thinking 2.md')
  })
  it('uses the local calendar day', () => {
    expect(todayPath(new Date(2026, 0, 2, 0, 1))).toBe(
      'Daily notes/2026-01-02.md',
    )
  })
})
