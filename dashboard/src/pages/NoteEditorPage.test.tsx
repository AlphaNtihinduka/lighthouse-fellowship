import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { AdminNote, NoteInput } from '../api/types'
import { mockApi, renderApp, signedIn } from '../test/renderApp'

const savedNote = (input: NoteInput, overrides: Partial<AdminNote> = {}): AdminNote => ({
  id: 'note-1',
  coverImageUrl: null,
  contentVersion: 1,
  publishAt: null,
  status: 'DRAFT',
  createdAt: '2026-09-10T10:00:00Z',
  updatedAt: '2026-09-10T10:00:00Z',
  ...input,
  ...overrides,
})

const existing: AdminNote = savedNote({
  title: 'Killing Giants',
  sermonDate: '2026-09-13',
  preacherName: 'Pastor Joe Benecasa',
  blocks: [
    {
      id: 'b1',
      type: 'PARAGRAPH',
      align: 'CENTER',
      segments: [{ text: 'not ' }, { blankId: 'k1', answer: 'if' }, { text: ' we face giants.' }],
    },
  ],
})

// Selects `words` inside a line's textarea, as a mouse drag would.
function selectWords(textarea: HTMLTextAreaElement, words: string) {
  const start = textarea.value.indexOf(words)
  textarea.focus()
  textarea.setSelectionRange(start, start + words.length)
  fireEvent.select(textarea)
}

describe('NoteEditorPage, new note', () => {
  it('writes a paragraph, turns words into a blank and creates the note', async () => {
    signedIn()
    let created: AdminNote | null = null
    const calls = mockApi((url, init) => {
      if (url.pathname === '/api/admin/notes' && init.method === 'POST') {
        created = savedNote(JSON.parse(String(init.body)))
        return { status: 201, body: created }
      }
      if (url.pathname === '/api/admin/notes/note-1' && created) return { status: 200, body: created }
      return { status: 200, body: [] }
    })
    const router = renderApp('/notes/new?date=2026-09-13')

    expect(await screen.findByLabelText('Sunday')).toHaveValue('2026-09-13')
    expect(screen.getByLabelText('Preacher')).toHaveValue('Pastor Joe Benecasa')
    await userEvent.type(screen.getByLabelText('Title'), 'Killing Giants')
    await userEvent.click(screen.getByRole('button', { name: '+ Paragraph' }))

    const line = screen.getByLabelText('Paragraph 1 text') as HTMLTextAreaElement
    await userEvent.type(line, 'We are going to face giants.')
    selectWords(line, 'face giants')
    await userEvent.click(screen.getByRole('button', { name: 'Make blank' }))

    expect(screen.getByText('face giants')).toHaveClass('blank-chip__answer')
    // The preview shows a line, not the answer, until "Show answers" is ticked.
    const phone = screen.getByLabelText('Phone preview')
    expect(within(phone).queryByText('face giants')).toBeNull()
    await userEvent.click(screen.getByLabelText('Show answers'))
    expect(within(phone).getByText('face giants')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Create note' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/notes/note-1'))
    const post = calls.find((call) => call.init.method === 'POST')!
    const body = JSON.parse(String(post.init.body)) as NoteInput
    expect(body.title).toBe('Killing Giants')
    expect(body.sermonDate).toBe('2026-09-13')
    expect(body.preacherName).toBe('Pastor Joe Benecasa')
    expect(body.blocks).toHaveLength(1)
    const paragraph = body.blocks[0]
    expect(paragraph.type).toBe('PARAGRAPH')
    if (paragraph.type !== 'PARAGRAPH') return
    expect(paragraph.segments).toEqual([
      { text: 'We are going to ' },
      { blankId: expect.stringMatching(/^k-[a-z0-9]{10}$/), answer: 'face giants' },
      { text: '.' },
    ])
    expect(paragraph.id).toMatch(/^b-[a-z0-9]{10}$/)
    // Saved: no "unsaved changes" prompt stood in the way of opening the new note.
    expect(await screen.findByText('All changes saved')).toBeInTheDocument()
  })

  it('refuses to make a blank of four words and says why', async () => {
    signedIn()
    mockApi(() => ({ status: 200, body: [] }))
    renderApp('/notes/new?date=2026-09-13')

    await userEvent.click(await screen.findByRole('button', { name: '+ Heading' }))
    const line = screen.getByLabelText('Heading 1 text') as HTMLTextAreaElement
    await userEvent.type(line, 'God will prepare us to fight')
    selectWords(line, 'will prepare us to')

    expect(screen.getByRole('button', { name: 'Make blank' })).toBeDisabled()
    expect(screen.getByText('A blank is 1 to 3 words (this is 4).')).toBeInTheDocument()
  })

  it('lists what is missing instead of sending an incomplete note', async () => {
    signedIn()
    const calls = mockApi(() => ({ status: 200, body: [] }))
    renderApp('/notes/new?date=2026-09-13')

    await userEvent.click(await screen.findByRole('button', { name: '+ Scripture' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create note' }))

    expect(screen.getByText('Give the note a title.')).toBeInTheDocument()
    expect(screen.getByText('Block 1 (Scripture): add the scripture text.')).toBeInTheDocument()
    expect(calls.some((call) => call.init.method === 'POST')).toBe(false)
  })

  it('shows a server rejection next to the block it names', async () => {
    signedIn()
    mockApi((_url, init) => {
      if (init.method === 'POST') {
        const body = JSON.parse(String(init.body)) as NoteInput
        return {
          status: 400,
          body: { status: 400, message: `Block 1 (${body.blocks[0].id}) REFLECTION: prompt is longer than 1000 characters` },
        }
      }
      return { status: 200, body: [] }
    })
    renderApp('/notes/new?date=2026-09-13')

    await userEvent.type(await screen.findByLabelText('Title'), 'x')
    await userEvent.click(screen.getByRole('button', { name: '+ Reflection' }))
    await userEvent.type(screen.getByLabelText('Question'), 'What?')
    await userEvent.click(screen.getByRole('button', { name: 'Create note' }))

    const block = screen.getByRole('region', { name: 'Reflection 1' })
    expect(await within(block).findByRole('alert')).toHaveTextContent('prompt is longer than 1000 characters')
  })
})

describe('NoteEditorPage, existing note', () => {
  it('saves an edit with the same block and blank ids, then schedules in Rome time', async () => {
    signedIn()
    let current = existing
    const calls = mockApi((url, init) => {
      if (url.pathname === '/api/admin/notes/note-1' && init.method === 'PUT') {
        current = savedNote(JSON.parse(String(init.body)), { contentVersion: 2 })
        return { status: 200, body: current }
      }
      if (url.pathname === '/api/admin/notes/note-1/publish') {
        current = { ...current, publishAt: JSON.parse(String(init.body)).publishAt, status: 'SCHEDULED' }
        return { status: 200, body: current }
      }
      if (url.pathname === '/api/admin/notes/note-1') return { status: 200, body: current }
      return { status: 200, body: [] }
    })
    renderApp('/notes/note-1')

    const title = await screen.findByLabelText('Title')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    await userEvent.type(title, '!')
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await screen.findByText('All changes saved')
    const put = calls.find((call) => call.init.method === 'PUT')!
    expect(JSON.parse(String(put.init.body))).toEqual({
      title: 'Killing Giants!',
      sermonDate: '2026-09-13',
      preacherName: 'Pastor Joe Benecasa',
      blocks: existing.blocks,
    })

    // Defaults to the sermon's Sunday at 09:00 Rome time = 07:00 UTC in September.
    expect(screen.getByLabelText('Or schedule (Rome time)')).toHaveValue('2026-09-13T09:00')
    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }))

    expect(await screen.findByText(/Scheduled: appears in the app on/)).toBeInTheDocument()
    const publish = calls.find((call) => call.url.pathname.endsWith('/publish'))!
    expect(JSON.parse(String(publish.init.body))).toEqual({ publishAt: '2026-09-13T07:00:00.000Z' })
  })

  it('reorders and removes blocks without changing ids', async () => {
    signedIn()
    const note: AdminNote = {
      ...existing,
      blocks: [
        { id: 'b1', type: 'REFLECTION', prompt: 'First?' },
        { id: 'b2', type: 'REFLECTION', prompt: 'Second?' },
        { id: 'b3', type: 'REFLECTION', prompt: 'Third?' },
      ],
    }
    const calls = mockApi((_url, init) =>
      init.method === 'PUT' ? { status: 200, body: savedNote(JSON.parse(String(init.body))) } : { status: 200, body: note },
    )
    renderApp('/notes/note-1')

    await userEvent.click(await screen.findByRole('button', { name: 'Move Reflection 3 up' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete Reflection 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await screen.findByText('All changes saved')
    const put = calls.find((call) => call.init.method === 'PUT')!
    expect((JSON.parse(String(put.init.body)) as NoteInput).blocks.map((block) => block.id)).toEqual(['b3', 'b2'])
  })

  it('asks before leaving with unsaved changes', async () => {
    signedIn()
    mockApi((url) => (url.pathname === '/api/admin/notes/note-1' ? { status: 200, body: existing } : { status: 200, body: [] }))
    const router = renderApp('/notes/note-1')

    await userEvent.type(await screen.findByLabelText('Title'), ' (draft)')
    await userEvent.click(screen.getByRole('link', { name: '‹ Back to sermon notes' }))

    expect(await screen.findByRole('alertdialog', { name: 'Unsaved changes' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/notes/note-1')
    await userEvent.click(screen.getByRole('button', { name: 'Leave without saving' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/notes'))
  })

  it('turns a blank back into text', async () => {
    signedIn()
    const calls = mockApi((_url, init) =>
      init.method === 'PUT' ? { status: 200, body: savedNote(JSON.parse(String(init.body))) } : { status: 200, body: existing },
    )
    renderApp('/notes/note-1')

    await userEvent.click(await screen.findByRole('button', { name: 'Turn blank "if" back into text' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await screen.findByText('All changes saved')
    const body = JSON.parse(String(calls.find((call) => call.init.method === 'PUT')!.init.body)) as NoteInput
    expect(body.blocks[0]).toEqual({ id: 'b1', type: 'PARAGRAPH', align: 'CENTER', segments: [{ text: 'not if we face giants.' }] })
  })
})
