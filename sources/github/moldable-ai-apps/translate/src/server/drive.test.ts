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
    headers: { ...HEADERS, 'content-type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })
}

beforeAll(async () => {
  tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'translate-drive-'))
  process.env.MOLDABLE_HOME = tempHome
  process.env.MOLDABLE_APP_ID = 'translate'
})

afterAll(async () => {
  await fs.rm(tempHome, { recursive: true, force: true })
})

describe('Translate drive contract', () => {
  it('describes, navigates, reads, shows history, and acknowledges', async () => {
    const described = (await (await rpc('translate.ui.describe')).json()) as {
      result: { views: Array<{ id: string; description: string }> }
    }
    expect(described.result.views.map((view) => view.id)).toEqual([
      'translator',
      'history',
    ])

    const translated = (await (
      await rpc('translate.text', {
        text: 'Keep this local',
        from: 'en',
        to: 'en',
      })
    ).json()) as {
      result: {
        resultPanels: Array<{ translatedText: string }>
        successNotices: Array<{ title: string }>
      }
    }
    expect(translated.result.resultPanels[0]?.translatedText).toBe(
      'Keep this local',
    )
    expect(translated.result.successNotices[0]?.title).toBe('Translated')
    const history = (await (await rpc('translate.history.list')).json()) as {
      result: Array<{ id: string }>
    }

    const navigation = (await (
      await rpc('translate.ui.navigate', {
        view: 'translator',
        entityId: history.result[0]?.id,
      })
    ).json()) as { result: { intentId: string } }
    const intent = (await (
      await app.request('/api/moldable/ui-intent', { headers: HEADERS })
    ).json()) as { id: string; view: string }
    expect(intent).toMatchObject({
      id: navigation.result.intentId,
      view: 'translator',
    })

    const read = (await (await rpc('translate.ui.read')).json()) as {
      result: {
        translations: unknown[]
        countLabel: string
      }
    }
    expect(read.result.translations).toHaveLength(1)
    expect(read.result.countLabel).toBe('1 translation')

    await rpc('translate.ui.showHistory')
    const showIntent = (await (
      await app.request('/api/moldable/ui-intent', { headers: HEADERS })
    ).json()) as { id: string; view: string }
    expect(showIntent.view).toBe('history')
    expect(
      await (
        await app.request(`/api/moldable/ui-intent?id=${showIntent.id}`, {
          method: 'DELETE',
          headers: HEADERS,
        })
      ).json(),
    ).toEqual({ ok: true, deleted: true })

    expect(
      (await rpc('translate.ui.navigate', { view: 'missing' })).status,
    ).toBe(400)
  })

  it('deletes one record and clears history only in the temporary workspace', async () => {
    const before = (await (await rpc('translate.history.list')).json()) as {
      result: Array<{ id: string }>
    }
    const id = before.result[0]?.id
    expect(id).toBeTruthy()

    const deleted = await rpc('translate.history.delete', { id })
    expect(deleted.status).toBe(200)
    expect(
      ((await deleted.json()) as { result: { deleted: boolean } }).result
        .deleted,
    ).toBe(true)
    expect((await rpc('translate.history.delete', { id })).status).toBe(404)

    const add = (sourceText: string) =>
      app.request('/api/history', {
        method: 'POST',
        headers: { ...HEADERS, 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceText,
          translatedText: sourceText,
          requestedSource: 'en',
          sourceLanguage: 'en',
          targetLanguage: 'en',
        }),
      })
    expect((await add('First disposable record')).status).toBe(200)
    expect((await add('Second disposable record')).status).toBe(200)

    const cleared = (await (
      await rpc('translate.history.clear', {})
    ).json()) as { result: { cleared: number } }
    expect(cleared.result.cleared).toBe(2)
    const after = (await (
      await rpc('translate.ui.read', { view: 'history' })
    ).json()) as {
      result: { translations: unknown[]; clearActions: unknown[] }
    }
    expect(after.result.translations).toEqual([])
    expect(after.result.clearActions).toEqual([])
  })
})
