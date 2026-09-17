import { useEffect, useState } from 'react'
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from '@tiptap/react'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code2,
  Link2,
  ImagePlus,
  Table2,
  Undo2,
  Redo2,
  Heading2,
  Minus,
  Braces,
  Sparkles,
  X,
} from 'lucide-react'
import { editorExtensions } from './extensions'
import { usePrefs, useWorkspace, run } from '../state/workspace'
import type { Note } from '../core/notes'
import { titleOf } from '../core/notes'

const blocks = [
  {
    name: 'Heading',
    description: 'A little structure for your thoughts',
    icon: Heading2,
    action: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    name: 'Bullet list',
    description: 'Gather related ideas',
    icon: List,
    action: (e: Editor) => e.chain().focus().toggleBulletList().run(),
  },
  {
    name: 'Numbered list',
    description: 'One step at a time',
    icon: ListOrdered,
    action: (e: Editor) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    name: 'To-do list',
    description: 'Turn an idea into an action',
    icon: ListTodo,
    action: (e: Editor) => e.chain().focus().toggleTaskList().run(),
  },
  {
    name: 'Quote / callout',
    description: 'Give a thought a little space',
    icon: Quote,
    action: (e: Editor) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    name: 'Code block',
    description: 'Keep a useful snippet',
    icon: Code2,
    action: (e: Editor) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    name: 'Table',
    description: 'Make room for comparisons',
    icon: Table2,
    action: (e: Editor) =>
      e
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    name: 'Divider',
    description: 'A pause between ideas',
    icon: Minus,
    action: (e: Editor) => e.chain().focus().setHorizontalRule().run(),
  },
]
export function NoteEditor({ note }: { note: Note }) {
  const { mode, font, set: setPrefs } = usePrefs()
  const [slash, setSlash] = useState(false)
  const [slashPosition, setSlashPosition] = useState({ left: 0, top: 0 })
  const [insert, setInsert] = useState<'link' | 'image' | null>(null)
  const [value, setValue] = useState('')
  const [insertError, setInsertError] = useState('')
  const editor = useEditor(
    {
      extensions: editorExtensions(),
      content: note.content,
      contentType: 'markdown',
      editorProps: {
        attributes: {
          'aria-label': 'Note editor',
          role: 'textbox',
          'aria-multiline': 'true',
          spellcheck: 'true',
        },
        handleClick: (_view, _pos, event) => {
          const target = (event.target as HTMLElement).closest(
            '[data-wikilink]',
          )
          if (target) {
            run(
              useWorkspace
                .getState()
                .follow(target.getAttribute('data-wikilink')!, note.path),
            )
            return true
          }
          const link = (event.target as HTMLElement).closest('a')
          if (link) {
            const href = link.getAttribute('href') || ''
            if (/^https?:\/\//i.test(href))
              window.open(href, '_blank', 'noopener,noreferrer')
            else if (!/^[a-z]+:/i.test(href)) {
              try {
                run(
                  useWorkspace
                    .getState()
                    .follow(decodeURIComponent(href), note.path),
                )
              } catch {
                /* Malformed link stays inert. */
              }
            }
            return true
          }
          return false
        },
      },
      onUpdate: ({ editor }) => {
        useWorkspace.getState().edit(note.path, editor.getMarkdown())
        const isSlash = editor.state.selection.$from.parent.textContent === '/'
        setSlash(isSlash)
        if (isSlash) {
          const caret = editor.view.coordsAtPos(editor.state.selection.from)
          setSlashPosition({
            left: Math.max(12, Math.min(window.innerWidth - 292, caret.left)),
            top: Math.max(
              12,
              Math.min(window.innerHeight - 370, caret.bottom + 8),
            ),
          })
        }
      },
    },
    [note.path],
  )
  useEditorState({ editor, selector: ({ editor }) => editor?.state })
  useEffect(() => {
    if (editor && note.content !== editor.getMarkdown())
      editor.commands.setContent(note.content, {
        contentType: 'markdown',
        emitUpdate: false,
      })
  }, [note.path, mode]) // Source/rich transitions only; do not reset the cursor while typing.
  useEffect(() => {
    if (editor && !editor.isFocused && note.content !== editor.getMarkdown())
      editor.commands.setContent(note.content, {
        contentType: 'markdown',
        emitUpdate: false,
      })
  }, [note.content, editor])
  if (!editor) return null
  const button = (
    label: string,
    Icon: typeof Bold,
    action: () => void,
    active = false,
  ) => (
    <button
      type="button"
      disabled={mode === 'source'}
      title={label}
      aria-label={label}
      className={active ? 'tool active' : 'tool'}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
    >
      <Icon size={16} />
    </button>
  )
  function submitInsert() {
    if (!value.trim()) return
    if (insert === 'image') {
      try {
        const url = new URL(value)
        if (!['https:', 'http:'].includes(url.protocol)) throw new Error()
        editor!
          .chain()
          .focus()
          .setImage({ src: url.href, alt: 'Embedded image' })
          .run()
      } catch {
        setInsertError('Enter a complete http or https image URL.')
        return
      }
    } else if (/^https?:\/\//i.test(value))
      editor!
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: value,
          marks: [{ type: 'link', attrs: { href: value } }],
        })
        .run()
    else
      editor!
        .chain()
        .focus()
        .insertContent({
          type: 'wikiLink',
          attrs: { target: value.replace(/\.md$/i, ''), label: null },
        })
        .run()
    setInsert(null)
    setValue('')
    setInsertError('')
  }
  return (
    <div className={`note-editor font-${font}`}>
      <div className="format-bar">
        <div
          className={`format-tools ${mode === 'source' ? 'source-tools' : ''}`}
        >
          {button(
            'Heading',
            Heading2,
            () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            editor.isActive('heading'),
          )}
          <span className="tool-divider" />
          {button(
            'Bold',
            Bold,
            () => editor.chain().focus().toggleBold().run(),
            editor.isActive('bold'),
          )}
          {button(
            'Italic',
            Italic,
            () => editor.chain().focus().toggleItalic().run(),
            editor.isActive('italic'),
          )}
          <span className="tool-divider" />
          {button(
            'Bullet list',
            List,
            () => editor.chain().focus().toggleBulletList().run(),
            editor.isActive('bulletList'),
          )}
          {button(
            'Task list',
            ListTodo,
            () => editor.chain().focus().toggleTaskList().run(),
            editor.isActive('taskList'),
          )}
          {button(
            'Quote',
            Quote,
            () => editor.chain().focus().toggleBlockquote().run(),
            editor.isActive('blockquote'),
          )}
          {button(
            'Code block',
            Code2,
            () => editor.chain().focus().toggleCodeBlock().run(),
            editor.isActive('codeBlock'),
          )}
          <span className="tool-divider" />
          {button('Insert link', Link2, () => {
            setInsert('link')
            setValue('')
            setInsertError('')
          })}
          {button('Insert image', ImagePlus, () => {
            setInsert('image')
            setValue('')
            setInsertError('')
          })}
          {button('Insert table', Table2, () =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run(),
          )}
          <span className="tool-divider" />
          {button('Undo', Undo2, () => editor.chain().focus().undo().run())}
          {button('Redo', Redo2, () => editor.chain().focus().redo().run())}
        </div>
        <button
          className="mode-button"
          onClick={() =>
            setPrefs({ mode: mode === 'rich' ? 'source' : 'rich' })
          }
        >
          <Braces size={14} />
          {mode === 'rich' ? 'Markdown' : 'Rich text'}
        </button>
      </div>
      {insert && (
        <div className="insert-panel">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitInsert()
            }}
          >
            <Link2 size={16} />
            <input
              autoFocus
              aria-label={insert === 'link' ? 'Link target' : 'Image URL'}
              placeholder={
                insert === 'link'
                  ? 'Note name or https://…'
                  : 'https://…/image.jpg'
              }
              value={value}
              onChange={(e) => setValue(e.target.value)}
              list={insert === 'link' ? 'note-options' : undefined}
            />
            <datalist id="note-options">
              {useWorkspace.getState().notes.map((n) => (
                <option key={n.path} value={n.path.replace(/\.md$/i, '')} />
              ))}
            </datalist>
            <button className="primary small" type="submit">
              Insert
            </button>
            <button
              aria-label="Close insert panel"
              className="icon-button"
              type="button"
              onClick={() => setInsert(null)}
            >
              <X size={16} />
            </button>
          </form>
          {insertError && <p className="form-error">{insertError}</p>}
        </div>
      )}
      <div
        className="document-scroll"
        key={note.path}
        onScroll={() => setSlash(false)}
      >
        <div className="document">
          <div className="document-emblem">
            <Sparkles size={24} strokeWidth={1.4} />
          </div>
          <div className="document-eyebrow">
            {note.path.startsWith('Daily notes/')
              ? 'A MOMENT TO REFLECT'
              : 'A PLACE FOR YOUR THOUGHTS'}
            <span>MARKDOWN NOTE</span>
          </div>
          {mode === 'source' ? (
            <>
              <h1 className="source-title">{titleOf(note.path)}</h1>
              <p className="source-hint">
                Plain Markdown, exactly as you write it. Rich text mode may
                normalize formatting.
              </p>
              <textarea
                className="source-editor"
                aria-label="Markdown source"
                spellCheck={false}
                value={note.content}
                onChange={(e) =>
                  useWorkspace.getState().edit(note.path, e.target.value)
                }
              />
            </>
          ) : (
            <EditorContent
              editor={editor}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  (e.target as HTMLElement).hasAttribute('data-wikilink')
                ) {
                  e.preventDefault()
                  run(
                    useWorkspace
                      .getState()
                      .follow(
                        (e.target as HTMLElement).getAttribute(
                          'data-wikilink',
                        )!,
                        note.path,
                      ),
                  )
                }
                if (e.key === 'Escape') setSlash(false)
              }}
            />
          )}
          {slash && mode === 'rich' && (
            <div
              className="slash-menu"
              style={{ position: 'fixed', bottom: 'auto', ...slashPosition }}
              role="menu"
              aria-label="Block menu"
            >
              <div className="section-label">ADD A BLOCK</div>
              {blocks.map((b) => (
                <button
                  key={b.name}
                  role="menuitem"
                  onClick={() => {
                    const { from } = editor.state.selection
                    editor
                      .chain()
                      .focus()
                      .deleteRange({ from: from - 1, to: from })
                      .run()
                    b.action(editor)
                    setSlash(false)
                  }}
                >
                  <b.icon size={19} />
                  <span>
                    <strong>{b.name}</strong>
                    <small>{b.description}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="document-end">
            <span />A little more clarity, one note at a time.
            <span />
          </div>
        </div>
      </div>
    </div>
  )
}
