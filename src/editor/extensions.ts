import { Node, nodeInputRule } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { TableKit } from '@tiptap/extension-table'
import Image from '@tiptap/extension-image'

export const WikiLink = Node.create({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return { target: { default: '' }, label: { default: null } }
  },
  parseHTML() {
    return [
      {
        tag: 'span[data-wikilink]',
        getAttrs: (element) => ({
          target: element.getAttribute('data-wikilink'),
          label: element.getAttribute('data-label'),
        }),
      },
    ]
  },
  renderHTML({ node }) {
    return [
      'span',
      {
        'data-wikilink': node.attrs.target,
        'data-label': node.attrs.label,
        class: 'wiki-link',
        role: 'link',
        tabindex: '0',
        title: `Open ${node.attrs.target}`,
      },
      node.attrs.label || node.attrs.target,
    ]
  },
  renderText({ node }) {
    return node.attrs.label || node.attrs.target
  },
  markdownTokenizer: {
    name: 'wikiLink',
    level: 'inline',
    start: (src) => src.indexOf('[['),
    tokenize: (src) => {
      const match = /^\[\[([^\]\n]+)\]\]/.exec(src)
      if (!match) return
      const [target, label] = match[1].split('|')
      return {
        type: 'wikiLink',
        raw: match[0],
        target: target.trim(),
        label: label?.trim() || null,
      }
    },
  },
  parseMarkdown: (token) => ({
    type: 'wikiLink',
    attrs: { target: token.target, label: token.label },
  }),
  renderMarkdown: (node) =>
    `[[${node.attrs?.target}${node.attrs?.label ? '|' + node.attrs.label : ''}]]`,
  addInputRules() {
    return [
      nodeInputRule({
        find: /\[\[([^\]\n]+)\]\]$/,
        type: this.type,
        getAttributes: (match) => {
          const [target, label] = match[1].split('|')
          return { target: target.trim(), label: label?.trim() || null }
        },
      }),
    ]
  },
})
export function editorExtensions() {
  return [
    StarterKit.configure({
      link: {
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      },
      underline: false,
    }),
    WikiLink,
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({ table: { resizable: true } }),
    Image.configure({ allowBase64: false }),
    Markdown.configure({ markedOptions: { gfm: true } }),
    Placeholder.configure({
      placeholder: 'Let an idea take shape… Type / for blocks.',
    }),
  ]
}
