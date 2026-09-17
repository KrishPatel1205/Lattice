import { useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Hash,
  Link2,
  List,
  Network,
} from 'lucide-react'
import { useWorkspace, run } from '../state/workspace'
import {
  type Note,
  linksOf,
  resolveLink,
  tagsOf,
  outlineOf,
  titleOf,
} from '../core/notes'
import { Graph } from './Graph'
export function Inspector({ note }: { note?: Note }) {
  const w = useWorkspace()
  const [tab, setTab] = useState<'connections' | 'outline'>('connections')
  if (!note)
    return (
      <aside className="inspector">
        <div className="inspector-tabs">A little context</div>
        <p className="empty-context">Open a note to see its connections.</p>
      </aside>
    )
  const backlinks = w.notes.filter(
    (n) =>
      n.path !== note.path &&
      linksOf(n.content).some(
        (l) => resolveLink(l.target, n.path, w.notes)?.path === note.path,
      ),
  )
  const outgoing = linksOf(note.content).filter(
    (l, i, a) => a.findIndex((x) => x.target === l.target) === i,
  )
  const tags = tagsOf(note.content)
  const outline = outlineOf(note.content)
  return (
    <aside className="inspector">
      <div className="inspector-tabs">
        <button
          className={tab === 'connections' ? 'selected' : ''}
          onClick={() => setTab('connections')}
        >
          <Link2 size={14} />
          Connections
        </button>
        <button
          className={tab === 'outline' ? 'selected' : ''}
          onClick={() => setTab('outline')}
        >
          <List size={14} />
          Outline
        </button>
      </div>
      <div className="inspector-body">
        {tab === 'connections' ? (
          <>
            <section>
              <div className="inspector-heading">
                <span>
                  <ChevronDown size={13} />
                  <Network size={14} />
                  Local graph
                </span>
              </div>
              <Graph mini />
            </section>
            <section>
              <div className="inspector-heading">
                <span>
                  <ChevronDown size={13} />
                  <ArrowDownLeft size={14} />
                  Backlinks
                </span>
                <small>{backlinks.length}</small>
              </div>
              <p className="inspector-caption">Notes that lead here</p>
              {backlinks.length ? (
                backlinks.map((n) => (
                  <button
                    className="backlink-card"
                    key={n.path}
                    onClick={() => w.open(n.path)}
                  >
                    <span>
                      <Link2 size={13} />
                      {titleOf(n.path)}
                      <ArrowUpRight size={12} />
                    </span>
                    <p>
                      {n.content
                        .split('\n')
                        .find((line) =>
                          linksOf(line).some(
                            (l) =>
                              resolveLink(l.target, n.path, w.notes)?.path ===
                              note.path,
                          ),
                        )
                        ?.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, '$1')
                        .replace(/^[-#*> ]+/, '')
                        .slice(0, 100)}
                    </p>
                  </button>
                ))
              ) : (
                <div className="context-empty">
                  A connection starts with <code>[[a note]]</code>. Links to
                  this note will appear here.
                </div>
              )}
            </section>
            <section>
              <div className="inspector-heading">
                <span>
                  <ChevronDown size={13} />
                  <ArrowUpRight size={14} />
                  Outgoing links
                </span>
                <small>{outgoing.length}</small>
              </div>
              {outgoing.map((l) => (
                <button
                  className="outgoing-link"
                  key={l.target}
                  onClick={() => run(w.follow(l.target, note.path))}
                >
                  <Link2 size={13} />
                  <span>{l.label.split('/').pop()}</span>
                  {!resolveLink(l.target, note.path, w.notes) && (
                    <small>New</small>
                  )}
                </button>
              ))}
              {!outgoing.length && (
                <p className="inspector-caption">
                  Connect this thought to another.
                </p>
              )}
            </section>
            <section>
              <div className="inspector-heading">
                <span>
                  <ChevronDown size={13} />
                  <Hash size={14} />
                  Tags
                </span>
                <small>{tags.length}</small>
              </div>
              <div className="tags">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => w.set({ modal: 'search', query: '#' + tag })}
                  >
                    # {tag}
                  </button>
                ))}
              </div>
              {!tags.length && (
                <p className="inspector-caption">
                  Add #tags anywhere in your note.
                </p>
              )}
            </section>
          </>
        ) : (
          <section>
            <div className="section-label">ON THIS PAGE</div>
            {outline.map((h, i) => (
              <button
                key={i}
                className="outline-link"
                style={{ paddingLeft: (h.level - 1) * 12 + 8 }}
                onClick={() => {
                  const headings = document.querySelectorAll(
                    '.tiptap h1,.tiptap h2,.tiptap h3,.tiptap h4,.tiptap h5,.tiptap h6',
                  )
                  headings[i]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }}
              >
                {h.text}
              </button>
            ))}
            {!outline.length && (
              <p className="inspector-caption">
                Add headings to give your note an outline.
              </p>
            )}
          </section>
        )}
      </div>
      <div className="inspector-footer">
        <span className="mini-spark">✧</span>
        <p>
          Ideas get better
          <br />
          when they find each other.
        </p>
      </div>
    </aside>
  )
}
