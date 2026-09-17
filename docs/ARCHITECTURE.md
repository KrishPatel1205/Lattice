# Architecture

## Domain model

A note is `{ path, content, modified }`. `path` is a vault-relative Markdown path and acts as its identifier; no proprietary note IDs are embedded in files. Directory names are tracked separately so empty folders can appear in the tree.

`core/notes.ts` derives links, tags, outlines, search results, and graph edges from Markdown. Code fences and inline code are excluded from the link/tag index. Link resolution is case-insensitive; folder-qualified vault paths are preferred when supplied, followed by relative paths and title matches. Ambiguous bare titles resolve to the current folder first, then the first matching note. Aliases and heading fragments are retained when retargeting links during a rename.

## Storage adapters

Every adapter exposes `load`, `read`, `write`, `mkdir`, and `move`.

- `BrowserVault` stores notes in `localStorage` under `lattice.vault.v1` and populates a starter vault only when the storage key is absent. Invalid existing JSON produces an error instead of resetting user data.
- `FolderVault` uses a user-selected `FileSystemDirectoryHandle`. Markdown is read and written using real file handles. Browser moves use copy-then-remove; failed removal can leave a recoverable duplicate.
- `DesktopVault` uses Tauri's dialog and filesystem plugins. The directory picker extends filesystem scope for the selected folder and its children. Native symlink entries are skipped while indexing. Dotfile access is enabled within that selected scope for the app's trash folder; ordinary hidden directories and `node_modules` are excluded from the note index.

Trash files contain a timestamp, random suffix, and URL-encoded original relative path in the filename. Adapters reconstruct restore metadata on load. A restore chooses a new filename if another note already uses the original path.

## State and saves

`usePrefs` persists layout, tabs, favorites, theme, accent, editor mode, and font with Zustand middleware. `useWorkspace` holds active vault data, dialogs, errors, and mutation commands. Opening another vault reconciles tabs and clears favorites to avoid confusing notes with the same relative path in different vaults.

Edits update the in-memory note immediately and enter a pending map. A 450 ms debounce schedules a serialized write queue. Before writing, the adapter's current file content is compared to the last successfully loaded/saved content. A mismatch stops the write. Recovery copies preserve local edits alongside the externally changed version. Pending edits are not discarded when a write fails, and the app warns before unloading while changes remain unsaved.

There is a small filesystem race between reading the external version and writing, and no cross-process file lock. Sudden process termination before a write completes can lose an unsaved in-memory edit. This is a single-user application, not a transactional sync engine. Export backups remain useful, especially with browser storage.

## Editing

Tiptap stores a rich document in memory and serializes changes with its Markdown extension. `WikiLink` adds inline parsing, serialization, clickable rendering, and a typing input rule for `[[target|alias]]`. The rich schema supports standard text blocks, task lists, tables, and image URLs. Source mode edits Markdown directly, avoiding serialization changes for unsupported formats.

Editor content is not written merely because a note was opened. Mode changes and external refreshes synchronize the rendered document while ordinary typing preserves the cursor and undo history. Raw HTML is not mounted through `dangerouslySetInnerHTML`.

## Interface

The app shell contains the navigator, tab bar, editor, independently controlled inspector, and status bar. Dialogs trap focus and restore the previous focused element. Keyboard shortcuts use one top-level event listener. Narrow screens start with panels closed; both remain available through toggle buttons.

The graph is an SVG view built from real note-link edges with deterministic initial positions. It supports filtering, note selection, zoom, pan, and per-node dragging; it is not a force-directed simulation. The local graph filters neighbors of the current note.

## Verification

Vitest covers path validation, link resolution, code exclusion, tags, search, graph edges, local-date daily note names, persistence, collision protection, Markdown round-tripping, serialized edits, external-conflict recovery, rename references, and trash restoration after reload.

Playwright covers the main browser journeys, settings, panel toggles, downloads, and local-folder adapter operations against a fresh origin-private filesystem. Native platform packaging and OS dialogs require the Tauri toolchain and a platform-specific smoke test.
