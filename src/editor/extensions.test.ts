import { describe, it, expect } from 'vitest'
import { Editor } from '@tiptap/core'
import { editorExtensions } from './extensions'
describe('Markdown editor round trips', () => {
  it('preserves wikilink targets and aliases through rich editing', () => {
    const editor = new Editor({
      extensions: editorExtensions(),
      content: '# Ideas\n\nExplore [[Notes/Thinking|a thought]] and [[Other]].',
      contentType: 'markdown',
    })
    expect(editor.getHTML()).toContain('data-wikilink="Notes/Thinking"')
    expect(editor.getMarkdown()).toContain('[[Notes/Thinking|a thought]]')
    expect(editor.getMarkdown()).toContain('[[Other]]')
    editor.destroy()
  })
  it('retains tasks, tables, code, and image embeds', () => {
    const input =
      '# Test\n\n- [x] Finished\n- [ ] Next\n\n| One | Two |\n| --- | --- |\n| A | B |\n\n```js\nconst x = 1\n```\n\n![An image](https://example.com/image.png)'
    const editor = new Editor({
      extensions: editorExtensions(),
      content: input,
      contentType: 'markdown',
    })
    const output = editor.getMarkdown()
    expect(output).toContain('[x]')
    expect(output).toContain('[ ]')
    expect(output).toContain('const x = 1')
    expect(output).toContain('https://example.com/image.png')
    expect(output).toMatch(/\|\s*One\s*\|\s*Two\s*\|/)
    editor.destroy()
  })
})
