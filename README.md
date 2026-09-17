# Lattice

> A quiet place for connected thinking. A local-first, Markdown-native knowledge workspace inspired by Obsidian and Notion.

Lattice is a complete React + TypeScript application with a browser workspace and a Tauri desktop shell. Your local vault is a folder of ordinary `.md` files. There is no account, backend, telemetry, or proprietary note format.

## Run the browser app

Requires Node.js 22.13 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The app starts with seven editable example notes in a persistent **browser vault**.

The project is located in the `Lattice` folder containing this README. If your terminal is in its parent directory, run `cd Lattice` first.

## What is included

| Area            | Functionality                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vault           | Browser persistence, local folder access, nested folders, note creation, rename/move, recoverable trash, external-edit conflict detection                           |
| Workspace       | Document tabs, favorites, breadcrumbs, independently toggleable sidebar and inspector, responsive layout                                                            |
| Editor          | Rich text and Markdown source modes, headings, bold/italic, lists, task checkboxes, quotes/callouts, code blocks, tables, image embeds, undo/redo, slash block menu |
| Connections     | `[[wikilinks]]`, aliases, create-on-open for missing notes, backlinks, outgoing links, note outline, tags                                                           |
| Search          | Full-text search over names and contents, multiple query terms, exact `#tag` filters, keyboard navigation                                                           |
| Graph           | Clickable notes and real link edges, local graph, filtering, drag nodes, pan, zoom, reset                                                                           |
| Daily notes     | One note per local calendar day in `Daily notes/`, with a journal template                                                                                          |
| Personalization | Light, dark, system theme, accent presets/custom colors, serif/sans writing fonts                                                                                   |
| Portability     | Import multiple Markdown files, download one note, export the entire active vault as a ZIP of Markdown files                                                        |
| Desktop         | Tauri 2 shell, native folder picker, filesystem adapter, scoped capabilities, desktop icons                                                                         |

### Work with a local vault

1. Select **Open local vault** in the sidebar.
2. Choose a folder containing Markdown notes, or an empty folder.
3. Create and edit notes. Changes are saved after a short typing pause.

In the browser, selecting a local directory needs the File System Access API available in desktop Chrome/Edge on localhost or HTTPS. Browsers without directory access can still use the browser vault, import Markdown files, and export ZIP backups. The desktop app uses a native folder picker.

**Reopen your local folder after restarting or reloading the app.** Folder permissions and connections are intentionally session-scoped. The app starts in the browser vault, so an expired folder connection is never mistaken for an active disk connection. Files already saved to your chosen folder stay there.

Browser-vault data and appearance settings are stored locally under the current origin. Clearing site data removes browser-vault notes; export a ZIP or use a local folder for durable ownership.

### Write and connect

Use the toolbar or type `/` on an empty paragraph to insert a block. Image embeds accept HTTP(S) image URLs; your browser loads those images from their host.

```markdown
# A thought worth keeping

Connect it to [[Another note]].
Use [[Projects/My idea|a friendly label]] for an alias.
Standard relative links work too: [Reading](../Resources/Reading.md).

- [ ] An action to take

> [!NOTE]
> A thought that deserves a little space.

#thinking #project
```

Click a wiki link to open its note. A missing target creates a new note. Renaming or moving a note updates existing wiki references and local Markdown references. Backlinks, tags, search, and graph edges are derived from the current note contents.

Rich mode normalizes supported Markdown when you edit. Use **Markdown source mode** for exact source text and constructs outside the rich editor's schema, such as YAML frontmatter, raw HTML, or arbitrary iframe/video embeds. Remote image URLs are supported; vault-relative attachment rendering and arbitrary embedded web pages are not currently implemented. Heading fragments are preserved in references but links currently open the target note rather than jumping to the fragment.

### Save conflicts and trash

- If a file has changed outside Lattice since it was loaded, Lattice stops the save and retains your edits in the open workspace.
- **Save copies** writes recovered notes alongside the original files, preserving both versions. **Export backup** downloads the current in-memory notes, including unsaved edits.
- Use **Note actions → Refresh vault** to load external changes when there are no pending edits. There is no background file watcher.
- **Move to trash** moves notes into the vault's hidden `.lattice-trash` folder. **Settings → Trash** restores them, including after reopening the vault. Lattice does not permanently purge trash.
- Saves are serialized inside an app session. This is not a multi-process transactional filesystem or a collaborative editor; keep one active editor per vault.

### Keyboard shortcuts

| Action             | Shortcut   |
| ------------------ | ---------- |
| Search             | `⌘/Ctrl K` |
| New note           | `⌘/Ctrl N` |
| Today's daily note | `⌘/Ctrl D` |
| Save now           | `⌘/Ctrl S` |
| Close current tab  | `Alt W`    |
| Close a dialog     | `Esc`      |

Some browser shortcuts may be reserved by the browser. The buttons provide the same actions.

## Run the desktop app

Install [Rust](https://rustup.rs/) and the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/) for your operating system. On macOS, Xcode Command Line Tools are required.

```bash
npm install
npm run desktop
```

Build an installer/package:

```bash
npm run desktop:build
```

Native output is created under `src-tauri/target/release/bundle/`. Distribution signing/notarization is not configured. The app grants filesystem access only to the directory explicitly selected through the native picker; it does not grant a global home-directory scope.

## Development and verification

```bash
npm run build          # TypeScript check and production browser build
npm test               # Domain, persistence, editor and state tests
npx playwright install chromium
npm run test:e2e        # Browser integration tests (starts Vite if needed)
npm run format:check   # Formatting validation
npm run preview        # Serve the production browser build
```

Browser integration tests use fresh browser contexts and an isolated origin-private test filesystem; they do not modify your personal vault files.

## Project structure

```text
src/
├── core/       # Note paths, link/tag/search indexing, sample notes, storage adapters
├── editor/     # Tiptap Markdown extensions and the writing surface
├── state/      # Zustand workspace, preferences, serialized saves and recovery
├── ui/         # Layout, navigator, inspector, graph, dialogs, styles
└── main.tsx    # Entry point and error boundary
src-tauri/      # Rust desktop shell, capabilities, configuration, icons
tests/          # Playwright workflows
docs/           # Original specification, implementation plan, architecture
```

**Stack:** React 19, TypeScript, Vite 6, Zustand 5, Lucide React, Tiptap 3, Tauri 2, fflate, Vitest, Playwright.

The [original README](docs/ORIGINAL_README.md) is preserved as the project specification. See the [implementation plan](docs/IMPLEMENTATION_PLAN.md) and [architecture notes](docs/ARCHITECTURE.md).

## Philosophy

Your notes should outlast any app. Keep them in plain Markdown files on your machine: read them in another editor, version them with Git, and take them with you.
