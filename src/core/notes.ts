export interface Note {
  path: string
  content: string
  modified: number
}
export interface TrashEntry {
  note: Note
  storedPath: string
}
export interface VaultData {
  notes: Note[]
  folders: string[]
  trash?: TrashEntry[]
}
export function trashEntry(note: Note): TrashEntry {
  const encoded = note.path.split('/').pop()!.split('--').slice(1).join('--')
  let original: string
  try {
    original = notePath(decodeURIComponent(encoded))
  } catch {
    original = `Recovered ${note.path.split('/').pop()}`
  }
  return { note: { ...note, path: original }, storedPath: note.path }
}
export interface NoteLink {
  target: string
  label: string
}
export const titleOf = (path: string) =>
  path.split('/').pop()!.replace(/\.md$/i, '')
export const parentOf = (path: string) => path.split('/').slice(0, -1).join('/')
export function validPath(input: string): string {
  const path = input.trim().replace(/\\/g, '/')
  if (
    !path ||
    path.startsWith('/') ||
    path
      .split('/')
      .some(
        (p) =>
          !p ||
          p === '.' ||
          p === '..' ||
          p.startsWith('.') ||
          /[<>:"|?*\x00-\x1f]/.test(p),
      )
  )
    throw new Error(
      'Use a name without hidden folders or special characters: < > : " | ? *',
    )
  return path
}
export function notePath(input: string) {
  const p = validPath(input)
  return /\.md$/i.test(p) ? p : `${p}.md`
}
export const todayPath = (date = new Date()) =>
  `Daily notes/${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.md`
// Code examples should not contribute edges or tags to the knowledge index.
export function prose(content: string) {
  return content
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '')
    .replace(/`[^`\n]*`/g, '')
}
export function linksOf(content: string): NoteLink[] {
  const result: NoteLink[] = []
  const body = prose(content)
  for (const m of body.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
    const [target, label] = m[1].split('|')
    result.push({
      target: target.trim().split('#')[0],
      label: label?.trim() || target.trim(),
    })
  }
  for (const m of body.matchAll(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g)) {
    if (!/^(?:[a-z]+:|#|\/\/)/i.test(m[2])) {
      try {
        result.push({
          target: decodeURIComponent(m[2].split('#')[0]),
          label: m[1],
        })
      } catch {
        /* Ignore malformed URLs. */
      }
    }
  }
  return result.filter((l) => l.target)
}
export function resolveLink(
  target: string,
  from: string,
  notes: Note[],
): Note | undefined {
  const clean = target.trim().replace(/\.md$/i, '').toLowerCase()
  const relative = `${parentOf(from) ? parentOf(from).toLowerCase() + '/' : ''}${clean}`
  const normalize = (p: string) => {
    const parts: string[] = []
    for (const s of p.split('/')) {
      if (s === '..') parts.pop()
      else if (s !== '.') parts.push(s)
    }
    return parts.join('/')
  }
  return (
    (clean.includes('/') && !clean.startsWith('.')
      ? notes.find((n) => n.path.replace(/\.md$/i, '').toLowerCase() === clean)
      : undefined) ||
    notes.find(
      (n) => n.path.replace(/\.md$/i, '').toLowerCase() === normalize(relative),
    ) ||
    notes.find((n) => n.path.replace(/\.md$/i, '').toLowerCase() === clean) ||
    notes.find((n) => titleOf(n.path).toLowerCase() === clean)
  )
}
export function tagsOf(content: string): string[] {
  return [
    ...new Set(
      [
        ...prose(content).matchAll(
          /(?:^|\s)#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu,
        ),
      ].map((m) => m[1].toLowerCase()),
    ),
  ]
}
export function outlineOf(content: string) {
  return [...prose(content).matchAll(/^(#{1,6})\s+(.+)$/gm)].map((m) => ({
    level: m[1].length,
    text: m[2].replace(/[*_`]/g, ''),
  }))
}
export function graphOf(notes: Note[]) {
  return notes
    .flatMap((n) =>
      linksOf(n.content).flatMap((l) => {
        const to = resolveLink(l.target, n.path, notes)
        return to && to.path !== n.path
          ? [{ source: n.path, target: to.path }]
          : []
      }),
    )
    .filter(
      (e, i, a) =>
        a.findIndex((x) => x.source === e.source && x.target === e.target) ===
        i,
    )
}
export function searchNotes(notes: Note[], query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return notes
    .filter((n) =>
      terms.every((t) =>
        t.startsWith('#')
          ? tagsOf(n.content).includes(t.slice(1))
          : `${n.path}\n${n.content}`.toLowerCase().includes(t),
      ),
    )
    .sort(
      (a, b) =>
        Number(b.path.toLowerCase().includes(query.toLowerCase())) -
          Number(a.path.toLowerCase().includes(query.toLowerCase())) ||
        b.modified - a.modified,
    )
}
export function uniquePath(path: string, notes: Note[]) {
  let next = path
  let i = 2
  while (notes.some((n) => n.path.toLowerCase() === next.toLowerCase()))
    next = path.replace(/\.md$/i, ` ${i++}.md`)
  return next
}

/** Retarget real references on rename, preserving aliases, fragments and code examples. */
export function rewriteLinks(
  content: string,
  source: string,
  from: string,
  to: string,
  notes: Note[],
) {
  return content.replace(
    /(`{3,}|~{3,})[^\n]*\n[\s\S]*?\1|`[^`\n]*`|\[\[([^\]\n]+)\]\]|(?<!!)\[([^\]]+)\]\(([^)]+)\)/g,
    (
      whole,
      code,
      wiki: string | undefined,
      label: string | undefined,
      href: string | undefined,
    ) => {
      if (code || whole.startsWith('`')) return whole
      const destination = wiki?.split('|')[0] || href || ''
      if (/^(?:[a-z]+:|#|\/\/)/i.test(destination)) return whole
      let target = destination.split('#')[0]
      if (href) {
        try {
          target = decodeURIComponent(target)
        } catch {
          return whole
        }
      }
      const resolved = resolveLink(target, source, notes)
      if (!resolved || (resolved.path !== from && source !== from)) return whole
      const nextPath = resolved.path === from ? to : resolved.path
      const fragment = destination.includes('#')
        ? '#' + destination.split('#').slice(1).join('#')
        : ''
      if (wiki) {
        const alias = wiki.includes('|')
          ? '|' + wiki.split('|').slice(1).join('|')
          : ''
        return `[[${nextPath.replace(/\.md$/i, '')}${fragment}${alias}]]`
      }
      const parts = parentOf(source === from ? to : source)
        .split('/')
        .filter(Boolean)
      const targetParts = nextPath.split('/')
      while (
        parts.length &&
        targetParts.length &&
        parts[0] === targetParts[0]
      ) {
        parts.shift()
        targetParts.shift()
      }
      const relative = [...parts.map(() => '..'), ...targetParts].join('/')
      return `[${label}](${encodeURI(relative)}${fragment})`
    },
  )
}
