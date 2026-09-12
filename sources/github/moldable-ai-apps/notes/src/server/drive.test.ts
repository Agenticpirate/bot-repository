import { app } from './app'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let tempHome = ''

const headers = {
  'content-type': 'application/json',
  'x-moldable-workspace': 'drive-test',
}

async function rpc(method: string, params: Record<string, unknown> = {}) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers,
    body: JSON.stringify({ method, params }),
  })
}

describe('Notes drive contract', () => {
  beforeAll(async () => {
    tempHome = await mkdtemp(path.join(tmpdir(), 'notes-drive-'))
    process.env.MOLDABLE_HOME = tempHome
    process.env.MOLDABLE_APP_ID = 'notes'
    delete process.env.MOLDABLE_APP_DATA_DIR
    delete process.env.MOLDABLE_WORKSPACE_ID
  })

  afterAll(async () => {
    await rm(tempHome, { recursive: true, force: true })
  })

  it('describes views and rejects invalid view parameters', async () => {
    const describeResponse = await rpc('notes.ui.describe')
    expect(describeResponse.status).toBe(200)
    expect(
      (await describeResponse.json()).result.views.map(
        (view: { id: string }) => view.id,
      ),
    ).toEqual(['notes', 'note'])

    const invalidResponse = await rpc('notes.ui.navigate', {
      view: 'note',
    })
    expect(invalidResponse.status).toBe(400)
    expect((await invalidResponse.json()).error.code).toBe('invalid_params')
  })

  it('opens, reads, and acknowledges an existing note', async () => {
    const createResponse = await rpc('notes.create', {
      title: 'Drive note',
      content: '# Complete markdown\n\nSpeakable note content.',
    })
    const created = await createResponse.json()
    const noteId = created.result.id as string

    const navigateResponse = await rpc('notes.ui.navigate', {
      view: 'note',
      entityId: noteId,
    })
    const navigate = await navigateResponse.json()
    expect(navigate.result.ok).toBe(true)

    const intentResponse = await app.request('/api/moldable/ui-intent', {
      headers,
    })
    const intent = await intentResponse.json()
    expect(intent).toMatchObject({
      id: navigate.result.intentId,
      view: 'note',
      entityId: noteId,
    })

    const readResponse = await rpc('notes.ui.read', {
      view: 'note',
      entityId: noteId,
    })
    expect(await readResponse.json()).toMatchObject({
      ok: true,
      result: {
        view: 'note',
        note: {
          id: noteId,
          title: 'Drive note',
          content: '# Complete markdown\n\nSpeakable note content.',
        },
      },
    })

    const openResponse = await rpc('notes.ui.openNote', { noteId })
    expect((await openResponse.json()).result.ok).toBe(true)
    const latestIntent = await (
      await app.request('/api/moldable/ui-intent', { headers })
    ).json()
    expect(latestIntent.entityId).toBe(noteId)

    const deleteResponse = await app.request(
      `/api/moldable/ui-intent?id=${encodeURIComponent(latestIntent.id)}`,
      { method: 'DELETE', headers },
    )
    expect(deleteResponse.status).toBe(200)
    expect(
      await (await app.request('/api/moldable/ui-intent', { headers })).json(),
    ).toBeNull()
  })

  it('materializes mobile home, search, and note routes from authoritative data', async () => {
    const created = await (
      await rpc('notes.create', {
        title: 'Native route proof',
        content: '# Mobile\n\nA searchable native note.',
        labels: ['mobile'],
      })
    ).json()
    const noteId = created.result.id as string

    const home = await (
      await rpc('notes.native.read', { route: 'home' })
    ).json()
    expect(home.result.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: noteId, title: 'Native route proof' }),
      ]),
    )
    expect(home.result.emptyStates).toEqual([])
    expect(home.result).toMatchObject({
      archivedCountLabel: expect.any(String),
      trashCountLabel: expect.any(String),
    })

    const results = await (
      await rpc('notes.native.read', {
        route: 'search',
        query: 'searchable native',
      })
    ).json()
    expect(results.result.notes).toEqual([
      expect.objectContaining({ id: noteId }),
    ])

    const note = await (
      await rpc('notes.native.read', { route: 'note', id: noteId })
    ).json()
    expect(note.result).toMatchObject({
      id: noteId,
      title: 'Native route proof',
      contentDisplay: '# Mobile\n\nA searchable native note.',
      truncationNotice: '',
      labelChoices: ['label-1'],
    })
    expect(note.result.labelOptionLabels).toHaveLength(8)
    expect(note.result.labelOptionLabels[0]).toBe('mobile')
    expect(home.result.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: noteId,
          canPin: true,
          canUnpin: false,
          nextPinned: true,
        }),
      ]),
    )
    expect(note.result.updatedAtLabel).toBeTruthy()

    const labelsUpdated = await rpc('notes.native.updateLabels', {
      id: noteId,
      labelChoices: [],
    })
    expect(await labelsUpdated.json()).toMatchObject({
      ok: true,
      result: { id: noteId, labels: [] },
    })
  })

  it('creates and opens a note as one voice-safe outcome', async () => {
    const createResponse = await rpc('notes.ui.createNote', {
      content: 'I love you',
    })
    expect(createResponse.status).toBe(200)

    const created = await createResponse.json()
    expect(created).toMatchObject({
      ok: true,
      result: {
        ok: true,
        content: 'I love you',
      },
    })

    const noteId = created.result.noteId as string
    const intent = await (
      await app.request('/api/moldable/ui-intent', { headers })
    ).json()
    expect(intent).toMatchObject({
      id: created.result.intentId,
      view: 'note',
      entityId: noteId,
    })

    const readResponse = await rpc('notes.get', { id: noteId })
    expect(await readResponse.json()).toMatchObject({
      ok: true,
      result: {
        id: noteId,
        content: 'I love you',
      },
    })
  })

  it('supports voice-ready read, search, update, trash, restore, and permanent deletion', async () => {
    const createResponse = await rpc('notes.create', {
      title: 'Voice RPC note',
      content: 'Original voice content',
      labels: ['demo'],
    })
    const noteId = (await createResponse.json()).result.id as string

    const listResponse = await rpc('notes.list', { includeContent: true })
    expect((await listResponse.json()).result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: noteId, title: 'Voice RPC note' }),
      ]),
    )

    const searchResponse = await rpc('notes.search', {
      query: 'original voice',
      includeContent: true,
    })
    expect((await searchResponse.json()).result).toEqual([
      expect.objectContaining({
        id: noteId,
        content: 'Original voice content',
      }),
    ])

    const updateResponse = await rpc('notes.update', {
      id: noteId,
      content: 'Updated by voice',
      isPinned: true,
    })
    expect(await updateResponse.json()).toMatchObject({
      ok: true,
      result: { id: noteId, content: 'Updated by voice', isPinned: true },
    })

    const trashResponse = await rpc('notes.delete', { id: noteId })
    expect(await trashResponse.json()).toMatchObject({
      ok: true,
      result: { id: noteId, isDeleted: true, isPinned: false },
    })

    const trash = await (
      await rpc('notes.native.read', { route: 'home', view: 'trash' })
    ).json()
    expect(trash.result.notes).toEqual([
      expect.objectContaining({ id: noteId, status: 'Trash' }),
    ])

    const restoreResponse = await rpc('notes.restore', { id: noteId })
    expect(await restoreResponse.json()).toMatchObject({
      ok: true,
      result: { id: noteId, isDeleted: false },
    })

    const permanentDeleteResponse = await rpc('notes.deletePermanently', {
      id: noteId,
    })
    expect(await permanentDeleteResponse.json()).toMatchObject({
      ok: true,
      result: { deletedId: noteId, permanent: true },
    })

    const missingResponse = await rpc('notes.get', { id: noteId })
    expect(missingResponse.status).toBe(404)
  })

  it('permanently empties only notes currently in Trash', async () => {
    const trashedId = (
      await (await rpc('notes.create', { title: 'Remove me' })).json()
    ).result.id as string
    const activeId = (
      await (await rpc('notes.create', { title: 'Keep me' })).json()
    ).result.id as string
    await rpc('notes.delete', { id: trashedId })

    const emptyResponse = await rpc('notes.emptyTrash')
    expect(await emptyResponse.json()).toMatchObject({
      ok: true,
      result: {
        deletedCount: 1,
        deletedIds: [trashedId],
        permanent: true,
      },
    })

    expect((await rpc('notes.get', { id: trashedId })).status).toBe(404)
    expect((await rpc('notes.get', { id: activeId })).status).toBe(200)
  })
})
