import type { VaultData } from './notes'
const content: Record<string, string> = {
  'Welcome to Lattice.md': `# A little space for big ideas

Welcome to your new thinking space. Lattice brings your notes, ideas, and the connections between them into one quiet place.

> Your notes should outlast any app. Everything here is Markdown, and everything belongs to you.

## Make yourself at home

There’s no right way to use a notebook. Start with a fleeting thought, a question you can’t shake, or a project you’re excited about.

- **Capture an idea.** Create a note with the + button, or press ⌘/Ctrl N.
- **Connect the dots.** Type a [[Getting started|link to another note]] to build your own web of ideas.
- **Find your rhythm.** Open today’s daily note and make a little room to think.

## A few places to begin

Explore [[Projects/A slower internet|A slower internet]], collect something in [[Resources/Reading list|your reading list]], or get familiar with [[Getting started]].

### A small practice

- [x] Find a space for your ideas
- [ ] Write down one thing you’re curious about
- [ ] Connect it to something you already know

---

*Good ideas rarely arrive fully formed. Give them somewhere to grow.*

#workspace #welcome`,
  'Getting started.md': `# Getting started

Lattice is a local-first home for your knowledge. Start here, then make it your own.

## Write naturally

Use the toolbar for headings, lists, checkboxes, quotes, code, tables, and images. Type / on an empty line to choose a block. Switch to Markdown mode whenever you want to work with the source.

## Connect your notes

Add links with double brackets, like [[Welcome to Lattice]]. You can give a link a friendlier label: [[Resources/Reading list|books worth reading]]. The inspector shows backlinks and the graph reveals connections.

## Keep your notes yours

The starter vault is saved in this browser. Choose **Open local vault** to work with a folder of real Markdown files in a supported browser or the desktop app. Use **Export vault** to download a ZIP at any time.

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Search notes | ⌘/Ctrl K |
| New note | ⌘/Ctrl N |
| Daily note | ⌘/Ctrl D |
| Save now | ⌘/Ctrl S |
| Close tab | Alt W |

#guide #workspace`,
  'Projects/A slower internet.md': `# A slower internet

What would the internet look like if it invited us to pay attention?

## The idea

Build small, intentional spaces. Less feed, more garden. A place to return to rather than scroll through.

> [!NOTE]
> A digital garden is never finished. It grows alongside you.

## Things to explore

- Personal websites as living notebooks
- Thoughtful defaults and quiet interfaces
- The connection between [[Notes/Deep work|attention]] and creativity

## Next steps

- [ ] Collect five examples of thoughtful websites
- [ ] Sketch a small reading space
- [ ] Revisit [[Resources/Reading list]]

#design #project`,
  'Projects/Learning journal.md': `# Learning journal

A running collection of small discoveries.

## This week

Learning works best when I connect a new idea to an old one. That’s why [[Notes/Connected thinking]] feels so useful.

- Explain an idea in my own words
- Find a concrete example
- Leave a question for next time

#learning #project`,
  'Notes/Connected thinking.md': `# Connected thinking

A note is useful. A connection between notes can be surprising.

Instead of deciding where an idea belongs forever, give it a few paths to its neighbors. [[Notes/Deep work]] creates the space for these connections, and [[Projects/Learning journal]] helps capture them.

## Questions to keep nearby

- Where have I seen this before?
- What does this contradict?
- What becomes possible if this is true?

#thinking #learning`,
  'Notes/Deep work.md': `# Deep work

Protect a little uninterrupted time for something that matters.

## A simple ritual

1. Choose one meaningful task.
2. Put distractions out of reach.
3. Work for a focused stretch.
4. Write down where to begin next time.

This connects to [[Projects/A slower internet]] and the practice of [[Notes/Connected thinking]].

#thinking #focus`,
  'Resources/Reading list.md': `# Reading list

Books and essays to spend a little time with.

## On the shelf

- [ ] A Philosophy of Walking — Frédéric Gros
- [ ] A Room of One’s Own — Virginia Woolf
- [ ] The Creative Act — Rick Rubin
- [x] A short essay that made me see something differently

## Reading notes

Keep a thought, not just a highlight. Connect what you read to [[Notes/Connected thinking]] or a current project like [[Projects/A slower internet]].

#reading #resources`,
}
export function seedVault(): VaultData {
  return {
    notes: Object.entries(content).map(([path, content], i) => ({
      path,
      content,
      modified: Date.now() - i * 3600000,
    })),
    folders: ['Projects', 'Notes', 'Resources', 'Daily notes'],
  }
}
