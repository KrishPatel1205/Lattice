import { test, expect } from '@playwright/test'
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'A little space for big ideas' }),
  ).toBeVisible()
})
test('creates, edits, persists, searches, renames and restores a note', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Create note', exact: true }).click()
  await page
    .getByLabel('Note name', { exact: true })
    .fill('Projects/Browser test')
  await page
    .getByRole('button', { name: 'Create note', exact: true })
    .last()
    .click()
  await page.getByRole('button', { name: 'Markdown', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Markdown source' })
    .fill(
      '# Browser test\n\nA persistent thought linked to [[Welcome to Lattice]].\n\n#testing',
    )
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('textbox', { name: 'Markdown source' }),
  ).toHaveValue(/A persistent thought/)
  await page.getByRole('button', { name: 'Search anything' }).click()
  await page
    .getByRole('textbox', { name: 'Search notes' })
    .fill('persistent #testing')
  await page
    .getByRole('button', { name: /Browser test Projects\/Browser test.md/ })
    .click()
  await page.getByRole('button', { name: 'Note actions' }).click()
  await page.getByRole('button', { name: 'Rename or move' }).click()
  await page
    .getByLabel('Note name', { exact: true })
    .fill('Notes/Renamed thought')
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByRole('tab', { name: 'Renamed thought' })).toBeVisible()
  await page.getByRole('button', { name: 'Note actions' }).click()
  await page.getByRole('button', { name: 'Move to trash' }).click()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: /^Trash/ }).click()
  await page.getByRole('button', { name: 'Restore', exact: true }).click()
  await expect(
    page.getByRole('textbox', { name: 'Markdown source' }),
  ).toHaveValue(/A persistent thought/)
})
test('follows wiki links, lists backlinks, opens graph, and changes theme', async ({
  page,
}) => {
  await page
    .locator('.tiptap [data-wikilink="Getting started"]')
    .first()
    .click()
  await expect(page.getByRole('tab', { name: 'Getting started' })).toBeVisible()
  await expect(
    page.locator('.backlink-card').filter({ hasText: 'Welcome to Lattice' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Graph view', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'See the bigger picture.' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByText('120%', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Close dialog' }).click()
})
test('daily notes are reused and Markdown exports download', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Daily note Today', exact: true })
    .click()
  const tabs = page.getByRole('tab')
  const count = await tabs.count()
  await page
    .getByRole('button', { name: 'Daily note Today', exact: true })
    .click()
  await expect(tabs).toHaveCount(count)
  await page.getByRole('button', { name: 'Note actions' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download Markdown' }).click()
  expect((await download).suggestedFilename()).toMatch(/\d{4}-\d{2}-\d{2}\.md/)
})
test('rich text edits survive mode changes without breaking wiki links', async ({
  page,
}) => {
  const editor = page.locator('.tiptap')
  await editor.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('A newly written thought.')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Markdown', exact: true }).click()
  await expect(
    page.getByRole('textbox', { name: 'Markdown source' }),
  ).toHaveValue(/A newly written thought/)
  await expect(
    page.getByRole('textbox', { name: 'Markdown source' }),
  ).toHaveValue(/\[\[Getting started\|link to another note\]\]/)
  await page.getByRole('button', { name: 'Rich text', exact: true }).click()
  await expect(editor).toContainText('A newly written thought.')
})
test('local folder adapter reads and writes real browser filesystem files', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.showDirectoryPicker = async () => {
      const root = await navigator.storage.getDirectory()
      const vault = await root.getDirectoryHandle('Test vault', {
        create: true,
      })
      const folder = await vault.getDirectoryHandle('Notes', { create: true })
      const file = await folder.getFileHandle('Local.md', { create: true })
      const writable = await file.createWritable()
      await writable.write('# Local file\n\nFrom the filesystem.')
      await writable.close()
      return vault
    }
  })
  await page.reload()
  await page
    .getByRole('button', { name: 'Open local vault', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Local file', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Markdown', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Markdown source' })
    .fill('# Local file\n\nUpdated on disk.')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
  const saved = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const vault = await root.getDirectoryHandle('Test vault')
    const folder = await vault.getDirectoryHandle('Notes')
    return (await (await folder.getFileHandle('Local.md')).getFile()).text()
  })
  expect(saved).toContain('Updated on disk.')
  await page.getByRole('button', { name: 'Note actions' }).click()
  await page.getByRole('button', { name: 'Move to trash' }).click()
  await expect(page.getByRole('status')).toContainText('Moved to trash')
  const trashCount = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const vault = await root.getDirectoryHandle('Test vault')
    const trash = await vault.getDirectoryHandle('.lattice-trash')
    let count = 0
    for await (const _entry of trash.values()) count++
    return count
  })
  expect(trashCount).toBe(1)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: /^Trash/ }).click()
  await page.getByRole('button', { name: 'Restore', exact: true }).click()
  await expect(
    page.getByRole('textbox', { name: 'Markdown source' }),
  ).toHaveValue(/Updated on disk/)
})
test('small screens keep the editor usable and panels can be toggled', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Show sidebar' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'A little space for big ideas' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Show sidebar' }).click()
  await expect(
    page.getByRole('button', { name: 'Open local vault', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Hide sidebar' }).click()
  await page.getByRole('button', { name: 'Toggle inspector' }).click()
  await expect(
    page.getByRole('button', { name: 'Connections', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Toggle inspector' }).click()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('slash commands insert a real heading and create-on-open links make notes', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Create note', exact: true }).click()
  await page.getByLabel('Note name', { exact: true }).fill('Blocks')
  await page
    .getByRole('button', { name: 'Create note', exact: true })
    .last()
    .click()
  await page.locator('.tiptap p').last().click()
  await page.keyboard.type('/')
  await expect(page.getByRole('menu', { name: 'Block menu' })).toBeVisible()
  await page.getByRole('menuitem', { name: /Heading/ }).click()
  await page.keyboard.type('A real heading')
  await expect(
    page.getByRole('heading', { name: 'A real heading', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Markdown', exact: true }).click()
  await expect(
    page.getByRole('textbox', { name: 'Markdown source' }),
  ).toHaveValue(/## A real heading/)
  await page
    .getByRole('textbox', { name: 'Markdown source' })
    .fill('# Blocks\n\n[[A future idea]]')
  await page.getByRole('button', { name: 'Rich text', exact: true }).click()
  await page.locator('.tiptap [data-wikilink="A future idea"]').click()
  await expect(
    page.getByRole('heading', { name: 'A future idea', exact: true }),
  ).toBeVisible()
})
