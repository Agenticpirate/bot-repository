import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let dataDir: string
let previousDataDir: string | undefined
let app: (typeof import('./app'))['app']
let documentId: string

const WORKSPACE = 'scribo-drive-test'
const HEADERS = { 'x-moldable-workspace': WORKSPACE }

function rpc(method: string, params?: unknown) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })
}

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'scribo-drive-'))
  previousDataDir = process.env.MOLDABLE_APP_DATA_DIR
  process.env.MOLDABLE_APP_DATA_DIR = dataDir
  app = (await import('./app')).app

  const response = await rpc('scribo.entries.create', {
    title: 'A rainy morning',
    content: '# Morning\n\nRain tapped softly against the window.',
    translation: 'La pluie tapait doucement contre la fenêtre.',
    sourceLanguage: 'en',
    targetLanguage: 'fr',
  })
  const body = (await response.json()) as {
    result: { id: string }
  }
  documentId = body.result.id
})

afterAll(async () => {
  if (previousDataDir === undefined) delete process.env.MOLDABLE_APP_DATA_DIR
  else process.env.MOLDABLE_APP_DATA_DIR = previousDataDir
  await rm(dataDir, { recursive: true, force: true })
})

describe('scribo drive contract', () => {
  it('describes every navigable view for a language model', async () => {
    const response = await rpc('scribo.ui.describe', {})
    const body = (await response.json()) as {
      result: { views: Array<{ id: string; description: string }> }
    }
    expect(response.status).toBe(200)
    expect(body.result.views.map((view) => view.id)).toEqual([
      'documents',
      'document',
    ])
    expect(
      body.result.views.every((view) => view.description.length > 25),
    ).toBe(true)
  })

  it('queues, replaces, exposes, and acknowledges navigation', async () => {
    await rpc('scribo.ui.navigate', { view: 'documents' })
    const navigate = await rpc('scribo.ui.navigate', {
      view: 'document',
      entityId: documentId,
    })
    const navigateBody = (await navigate.json()) as {
      result: { intentId: string }
    }
    expect(navigate.status).toBe(200)

    const getResponse = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    const intent = (await getResponse.json()) as {
      id: string
      view: string
      entityId?: string
    }
    expect(intent.id).toBe(navigateBody.result.intentId)
    expect(intent.view).toBe('document')
    expect(intent.entityId).toBe(documentId)

    const ack = await app.request(
      `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
      { method: 'DELETE', headers: HEADERS },
    )
    expect(((await ack.json()) as { deleted: boolean }).deleted).toBe(true)
    const after = await app.request('/api/moldable/ui-intent', {
      headers: HEADERS,
    })
    expect(await after.json()).toBeNull()
  })

  it('opens and reads the complete document text', async () => {
    const open = await rpc('scribo.ui.openDocument', { documentId })
    expect(open.status).toBe(200)

    const read = await rpc('scribo.ui.read', {
      view: 'document',
      entityId: documentId,
    })
    const body = (await read.json()) as {
      result: {
        document: {
          title: string
          text: string
          translation: string
        }
        sourceSections: Array<{ title: string; text: string }>
        translationSections: Array<{ title: string; text: string }>
      }
    }
    expect(read.status).toBe(200)
    expect(body.result.document).toMatchObject({
      title: 'A rainy morning',
      text: '# Morning\n\nRain tapped softly against the window.',
      translation: 'La pluie tapait doucement contre la fenêtre.',
    })
    expect(body.result.sourceSections[0]?.text).toContain('Rain tapped softly')
    expect(body.result.translationSections[0]?.text).toContain(
      'La pluie tapait doucement',
    )
  })

  it('projects a compact document count into the library section', async () => {
    const read = await rpc('scribo.ui.read', { view: 'documents' })
    const body = (await read.json()) as {
      result: { documentSections: Array<{ subtitle: string }> }
    }

    expect(read.status).toBe(200)
    expect(body.result.documentSections[0]?.subtitle).toBe(
      '1 entry · Recently updated',
    )
  })

  it('rejects invalid views and missing documents', async () => {
    const invalid = await rpc('scribo.ui.navigate', { view: 'calendar' })
    expect(invalid.status).toBe(400)

    const missing = await rpc('scribo.ui.openDocument', {
      documentId: 'missing',
    })
    expect(missing.status).toBe(404)
  })

  it('uses mobile web without a per-app NativeUI package', async () => {
    const { readFile, access } = await import('node:fs/promises')
    const manifest = JSON.parse(
      await readFile(resolve(process.cwd(), 'moldable.json'), 'utf8'),
    ) as {
      nativeUI?: string
      mobile?: { type: string }
    }
    expect(manifest.nativeUI).toBeUndefined()
    expect(manifest.mobile?.type).toBe('mobile-web')
    await expect(
      access(resolve(process.cwd(), 'native-ui.json')),
    ).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects invalid native language pairs before any provider call', async () => {
    const response = await rpc('scribo.native.createTranslated', {
      title: 'Invalid pair',
      content: 'This must not be saved.',
      languagePair: ['en-en'],
    })
    expect(response.status).toBe(400)
  })

  it('updates and deletes only the disposable test entry', async () => {
    const update = await rpc('scribo.entries.update', {
      id: documentId,
      title: 'A quieter morning',
      content: 'Updated source Markdown.',
    })
    expect(update.status).toBe(200)
    expect(await update.json()).toMatchObject({
      result: {
        id: documentId,
        title: 'A quieter morning',
        content: 'Updated source Markdown.',
        translation: 'La pluie tapait doucement contre la fenêtre.',
      },
    })

    const deleted = await rpc('scribo.entries.delete', { id: documentId })
    expect(deleted.status).toBe(200)
    expect(await deleted.json()).toMatchObject({
      result: { deleted: true, id: documentId },
    })
    expect((await rpc('scribo.entries.get', { id: documentId })).status).toBe(
      404,
    )
  })
})
