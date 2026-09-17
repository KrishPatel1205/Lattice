# Lattice implementation plan

Build in this repository using React, TypeScript, Vite, Zustand, and Lucide. Keep the README's `core`, `editor`, `state`, and `ui` boundaries.

1. **Vault foundation** — Markdown notes identified by vault-relative paths; nested folders; browser-persisted starter vault; browser directory access and Tauri filesystem adapters; serialized saves, conflict detection, recoverable trash, Markdown import/export.
2. **Workspace** — collapsible file tree, independently toggleable panels, persistent document tabs, favorites, breadcrumbs, keyboard shortcuts, responsive layout, light/dark themes and accent settings.
3. **Editor** — Tiptap rich text with Markdown serialization; headings, lists, tasks, quotes/callouts, code, tables, image embeds; source mode; formatting toolbar; slash commands; wikilinks and link insertion.
4. **Connected knowledge** — bidirectional wiki and Markdown links, tags, outline, full-text search, clickable graph with zoom/pan/drag, local-date daily notes.
5. **Verification and delivery** — domain/storage tests, editor round-trip checks, browser workflow tests, production build, Tauri configuration validation where the installed toolchain permits; document prerequisites and limitations.

## Data behavior

The starter vault is saved in browser storage. An explicitly opened folder uses real `.md` files, with clear save/error feedback. Never silently overwrite a file changed outside Lattice. Deleting a note moves it into a recoverable vault trash folder. Switching vaults waits for pending writes. Rich editing normalizes supported Markdown; source mode preserves arbitrary Markdown as text.

## Desktop environment

The current machine has Node 22.13.1 and npm 10.9.2. Rust/Cargo was not found on PATH during initial inspection; desktop compilation requires the Rust and native Tauri prerequisites.
