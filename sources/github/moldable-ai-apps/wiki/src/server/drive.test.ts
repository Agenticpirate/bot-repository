import { app } from './app'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let tempHome: string
const HEADERS = { 'x-moldable-workspace': 'drive-test' }

function rpc(method: string, params?: unknown) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })
}

beforeAll(async () => {
  tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'wiki-drive-'))
  process.env.MOLDABLE_HOME = tempHome
  process.env.MOLDABLE_APP_ID = 'wiki'
})

afterAll(async () => {
  await fs.rm(tempHome, { recursive: true, force: true })
})

describe('Wiki drive contract', () => {
  it('creates, describes, opens, reads, navigates, and acknowledges a page', async () => {
    const created = (await (
      await rpc('wiki.notes.create', {
        title: 'Browser research',
        content: '# Browser research\n\nSaved from the browser demo.\n',
      })
    ).json()) as { result: { path: string } }

    const described = (await (await rpc('wiki.ui.describe')).json()) as {
      result: { views: Array<{ id: string; description: string }> }
    }
    expect(described.result.views.map((view) => view.id)).toEqual(['page'])
    expect(described.result.views[0]?.description.length).toBeGreaterThan(20)

    const opened = (await (
      await rpc('wiki.ui.openPage', { pageId: created.result.path })
    ).json()) as { result: { intentId: string; pageId: string } }
    expect(opened.result.pageId).toBe(created.result.path)
    const intent = (await (
      await app.request('/api/moldable/ui-intent', { headers: HEADERS })
    ).json()) as { id: string; view: string; entityId: string }
    expect(intent).toMatchObject({
      id: opened.result.intentId,
      view: 'page',
      entityId: created.result.path,
    })

    const read = (await (
      await rpc('wiki.ui.read', {
        view: 'page',
        entityId: created.result.path,
      })
    ).json()) as { result: { page: { content: string } } }
    expect(read.result.page.content).toContain('Saved from the browser demo.')

    expect(
      (
        await rpc('wiki.ui.navigate', {
          view: 'page',
          entityId: created.result.path,
        })
      ).status,
    ).toBe(200)
    const latestIntent = (await (
      await app.request('/api/moldable/ui-intent', { headers: HEADERS })
    ).json()) as { id: string }
    expect(
      await (
        await app.request(`/api/moldable/ui-intent?id=${latestIntent.id}`, {
          method: 'DELETE',
          headers: HEADERS,
        })
      ).json(),
    ).toEqual({ ok: true, deleted: true })

    expect(
      (
        await rpc('wiki.ui.navigate', {
          view: 'missing',
          entityId: created.result.path,
        })
      ).status,
    ).toBe(400)
  })

  it('projects bounded native home, note, search, and links routes', async () => {
    const created = (await (
      await rpc('wiki.notes.create', {
        title: 'Native knowledge',
        content: '# Native knowledge\n\nA concise mobile reading test.\n',
      })
    ).json()) as { result: { path: string } }

    const home = (await (
      await rpc('wiki.native.read', { route: 'home' })
    ).json()) as {
      result: {
        notesLabel: string
        wordsLabel: string
        todayPath: string
        trashCountLabel: string
        recent: Array<{ path: string; leadingIcon: string }>
      }
    }
    expect(
      home.result.recent.some((entry) => entry.path === created.result.path),
    ).toBe(true)
    expect(Number(home.result.notesLabel)).toBeGreaterThanOrEqual(1)
    expect(home.result.wordsLabel).toBeTruthy()
    expect(home.result.todayPath).toMatch(/^daily\/\d{4}-\d{2}-\d{2}\.md$/)
    expect(home.result.trashCountLabel).toEqual(expect.any(String))
    expect(home.result.recent[0]?.leadingIcon).toBeTruthy()

    const note = (await (
      await rpc('wiki.native.read', {
        route: 'note',
        path: created.result.path,
      })
    ).json()) as {
      result: { title: string; content: string; contentDraft: string }
    }
    expect(note.result.title).toBe('Native knowledge')
    expect(note.result.content).toContain('mobile reading test')
    expect(note.result.contentDraft).toBe(
      '# Native knowledge\n\nA concise mobile reading test.\n',
    )

    const search = (await (
      await rpc('wiki.native.read', {
        route: 'search',
        query: 'concise',
        limit: 16,
      })
    ).json()) as { result: { results: Array<{ path: string }> } }
    expect(
      search.result.results.some((entry) => entry.path === created.result.path),
    ).toBe(true)

    const related = (await (
      await rpc('wiki.native.read', {
        route: 'related',
        path: created.result.path,
      })
    ).json()) as { result: { outbound: unknown[]; inbound: unknown[] } }
    expect(related.result.outbound).toEqual([])
    expect(related.result.inbound).toEqual([])

    const create = (await (
      await rpc('wiki.native.read', { route: 'create' })
    ).json()) as {
      result: { draft: { templateChoice: string[] }; templateLabels: string[] }
    }
    expect(create.result.draft.templateChoice).toEqual(['blank'])
    expect(create.result.templateLabels).toHaveLength(5)
  })

  it('updates and trashes a temporary page through focused native-safe methods', async () => {
    const created = (await (
      await rpc('wiki.notes.create', {
        title: 'Disposable native mutation',
        content: '# Before\n',
      })
    ).json()) as { result: { path: string } }

    expect(
      await (
        await rpc('wiki.notes.update', {
          path: created.result.path,
          content: '# After\n\nSaved from NativeUI.\n',
        })
      ).json(),
    ).toMatchObject({
      ok: true,
      result: {
        path: created.result.path,
        content: '# After\n\nSaved from NativeUI.\n',
      },
    })

    expect(
      await (
        await rpc('wiki.notes.delete', { path: created.result.path })
      ).json(),
    ).toMatchObject({ ok: true, result: { ok: true } })

    const trash = (await (
      await rpc('wiki.native.read', { route: 'trash', limit: 16 })
    ).json()) as {
      result: { items: Array<{ id: string; subtitle: string; title: string }> }
    }
    const trashItem = trash.result.items.find(
      (item) => item.subtitle === created.result.path,
    )
    expect(trashItem).toBeTruthy()

    const trashDetail = await rpc('wiki.native.read', {
      route: 'trash-note',
      id: trashItem!.id,
    })
    expect(await trashDetail.json()).toMatchObject({
      result: { id: trashItem!.id, originalPath: created.result.path },
    })

    expect(
      await (await rpc('wiki.trash.restore', { id: trashItem!.id })).json(),
    ).toMatchObject({ ok: true, result: { ok: true } })

    await rpc('wiki.notes.delete', { path: created.result.path })

    expect((await rpc('wiki.read', { path: created.result.path })).status).toBe(
      400,
    )
  })
})
