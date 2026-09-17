# Lattice

> A modern knowledge workspace that brings together the best of **Obsidian** and **Notion** — local-first, Markdown-native, and structured the way your mind actually works.

---

## What is Lattice?

Lattice is a personal knowledge management (PKM) app that blends two worlds:

- **From Obsidian** — a local vault of plain Markdown files, a hierarchical file tree, bidirectional linking, and a graph-based view of how your notes connect.
- **From Notion** — a clean, tab-based workspace, flexible block-structured documents, and a polished UI that feels great to write in every day.

The result is an app where your notes live as real files on your machine (no lock-in, no proprietary format), while still offering the structured, navigable workspace experience of a modern productivity tool.

---

## Core Features

| Feature | Description |
|---|---|
| **Local Vault** | All notes are plain `.md` files stored on disk — yours forever. |
| **File Tree Sidebar** | Browse and organise notes in a collapsible folder hierarchy. |
| **Tab Bar** | Open multiple documents at once and switch between them instantly. |
| **Left & Right Panels** | Toggle the vault navigator and the inspector/backlinks panel independently. |
| **Backlinks & Tags** | See which other notes link to the current document and explore by tag. |
| **Graph View** | Visualise how your notes relate to each other. |
| **Daily Notes** | Built-in journal-style daily note workflow. |
| **Quick Note Creation** | Hit *New Note* and start writing immediately — no friction. |

---

## Tech Stack

- **Framework** — [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build tool** — [Vite](https://vitejs.dev/)
- **State management** — [Zustand](https://zustand-demo.pmnd.rs/)
- **Icons** — [Lucide React](https://lucide.dev/)

---

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```
src/
├── core/           # Core domain logic (vault, file I/O)
├── editor/         # Editor engine and block components
├── state/          # Zustand stores (workspace layout, navigation)
├── ui/             # Top-level layout and shell components
└── main.tsx        # Application entry point
```

---

## Roadmap

- [ ] Real file I/O via Tauri (read/write vault files from disk)
- [ ] Rich block editor (headings, lists, callouts, embeds)
- [ ] Bidirectional `[[wikilink]]` support
- [ ] Interactive graph view
- [ ] Full-text search across the vault
- [ ] Themes & custom colour schemes

---

## Philosophy

Lattice is built on a simple belief: **your notes should outlast any app**. By keeping everything in plain Markdown files that live on your own machine, Lattice gives you the freedom to switch tools, version your vault with Git, or read your notes in any text editor — while still providing a workspace powerful enough that you never want to leave.
