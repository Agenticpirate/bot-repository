import {
  ensureDir,
  getAppDataDir,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import type { GeneratedExploration } from '../shared/types'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let temporaryHome: string
let previousHome: string | undefined
let previousAppId: string | undefined
let app: (typeof import('./app'))['app']

const WORKSPACE = 'drive-test'
const HEADERS = { 'x-moldable-workspace': WORKSPACE }
const ENTRY_ID = 'entry-proof'
const MUTATION_ENTRY_ID = 'entry-mutation-proof'

function rpc(method: string, params?: unknown) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })
}

beforeAll(async () => {
  temporaryHome = await mkdtemp(path.join(tmpdir(), 'microscope-drive-'))
  previousHome = process.env.HOME
  previousAppId = process.env.MOLDABLE_APP_ID
  process.env.HOME = temporaryHome
  process.env.MOLDABLE_APP_ID = 'microscope'
  const dataDir = getAppDataDir(WORKSPACE)
  await ensureDir(dataDir)
  await writeJson(safePath(dataDir, 'microscope-explorations.json'), [
    {
      id: ENTRY_ID,
      source: 'generated',
      title: 'Leaf cross-section',
      subtitle: 'Inside a leaf',
      description: 'A structured view of photosynthetic leaf tissue.',
      prompt: 'Show a leaf cross-section',
      categoryId: 'plants-fungi',
      scale: 'microscopic',
      visualStyle: 'educational',
      status: 'ready',
      backgroundStatus: 'ready',
      modelStatus: 'skipped',
      imageFileName: 'microscope-layer.png',
      imageUrl: null,
      model: {
        kind: 'image-relief',
        seed: 1,
        palette: ['#228833'],
        density: 1,
        layers: 3,
        complexity: 2,
      },
      quality: 'medium',
      createdAt: '2026-07-27T10:00:00.000Z',
      updatedAt: '2026-07-27T10:00:00.000Z',
      observations: ['Palisade cells cluster near the upper surface.'],
      details: [{ label: 'Tissue', value: 'Palisade mesophyll' }],
      prompts: ['Compare it with a pine needle.'],
    } satisfies GeneratedExploration,
    {
      id: MUTATION_ENTRY_ID,
      source: 'generated',
      title: 'Movable crystal',
      subtitle: 'Chemistry & Matter',
      description: 'A disposable generated crystal used for mutation tests.',
      prompt: 'Show a crystal lattice',
      categoryId: 'chemistry-matter',
      scale: 'molecular',
      visualStyle: 'educational',
      status: 'ready',
      backgroundStatus: 'ready',
      modelStatus: 'skipped',
      imageUrl: null,
      model: {
        kind: 'image-relief',
        seed: 2,
        palette: ['#7755cc'],
        density: 1,
        layers: 3,
        complexity: 2,
      },
      quality: 'medium',
      createdAt: '2026-07-27T11:00:00.000Z',
      updatedAt: '2026-07-27T11:00:00.000Z',
      observations: ['The repeating lattice is visible.'],
      details: [{ label: 'Structure', value: 'Crystal lattice' }],
      prompts: ['Compare it with salt.'],
    } satisfies GeneratedExploration,
  ])
  app = (await import('./app')).app
})

afterAll(async () => {
  if (previousHome === undefined) delete process.env.HOME
  else process.env.HOME = previousHome
  if (previousAppId === undefined) delete process.env.MOLDABLE_APP_ID
  else process.env.MOLDABLE_APP_ID = previousAppId
  await rm(temporaryHome, { recursive: true, force: true })
})

describe('Microscope drive contract', () => {
  it('describes and navigates to a real entry', async () => {
    const described = (await (
      await rpc('microscope.ui.describe', {})
    ).json()) as { result: { views: Array<{ id: string }> } }
    expect(described.result.views.map((view) => view.id)).toEqual([
      'library',
      'category',
      'entry',
    ])

    const navigation = (await (
      await rpc('microscope.ui.navigate', {
        view: 'entry',
        entityId: ENTRY_ID,
      })
    ).json()) as { result: { intentId: string } }
    const intent = (await (
      await app.request('/api/moldable/ui-intent', { headers: HEADERS })
    ).json()) as { id: string; view: string; entityId: string }
    expect(intent).toMatchObject({
      id: navigation.result.intentId,
      view: 'entry',
      entityId: ENTRY_ID,
    })
    const ack = await app.request(`/api/moldable/ui-intent?id=${intent.id}`, {
      method: 'DELETE',
      headers: HEADERS,
    })
    expect(await ack.json()).toEqual({ ok: true, deleted: true })
  })

  it('reads complete entry analysis content', async () => {
    const response = await rpc('microscope.ui.read', {
      view: 'entry',
      entityId: ENTRY_ID,
    })
    const body = (await response.json()) as {
      result: {
        entry: {
          description: string
          imageAssetPath?: string
          regenerateActions?: Array<{ id: string }>
          observations: string[]
          details: Array<{ value: string }>
        }
      }
    }
    expect(body.result.entry.description).toContain('photosynthetic')
    expect(body.result.entry.imageAssetPath).toBe(
      `assets/${ENTRY_ID}/microscope-layer.png`,
    )
    expect(body.result.entry.observations[0]).toContain('Palisade')
    expect(body.result.entry.details[0]?.value).toBe('Palisade mesophyll')
  })

  it('keeps NativeUI route projections bounded and route-specific', async () => {
    const library = (await (
      await rpc('microscope.ui.read', {
        view: 'library',
        nativeProjection: true,
      })
    ).json()) as {
      result: { categories: unknown[]; entries?: unknown[] }
    }
    expect(library.result.categories.length).toBeGreaterThan(0)
    expect(library.result.entries).toBeUndefined()

    const entry = (await (
      await rpc('microscope.ui.read', {
        view: 'entry',
        entityId: ENTRY_ID,
        nativeProjection: true,
      })
    ).json()) as {
      result: {
        entry: {
          imageAssetPath?: string
          model?: unknown
          modelVariants?: unknown
          sourceImageUrl?: unknown
          regenerateActions?: Array<{ id: string; label: string }>
        }
      }
    }
    expect(entry.result.entry.imageAssetPath).toBe(
      `assets/${ENTRY_ID}/microscope-layer.png`,
    )
    expect(entry.result.entry.regenerateActions).toEqual([
      { id: ENTRY_ID, label: 'Regenerate exploration' },
    ])
    expect(entry.result.entry.model).toBeUndefined()
    expect(entry.result.entry.modelVariants).toBeUndefined()
    expect(entry.result.entry.sourceImageUrl).toBeUndefined()
    expect(JSON.stringify(entry).length).toBeLessThan(16_000)
  })

  it('opens an entry and rejects invalid views', async () => {
    expect(
      (await rpc('microscope.ui.openEntry', { entryId: ENTRY_ID })).status,
    ).toBe(200)
    const invalid = await rpc('microscope.ui.navigate', { view: 'settings' })
    const invalidBody = (await invalid.json()) as { error: { code: string } }
    expect(invalid.status).toBe(400)
    expect(invalidBody.error.code).toBe('invalid_params')
  })

  it('moves and deletes only a generated exploration in disposable storage', async () => {
    const projected = (await (
      await rpc('microscope.ui.read', {
        view: 'entry',
        entityId: MUTATION_ENTRY_ID,
        nativeProjection: true,
      })
    ).json()) as {
      result: {
        entry: {
          managementActions: Array<{ id: string }>
          moveDestinations: Array<{ categoryId: string }>
          deleteActions: Array<{ id: string }>
        }
      }
    }
    expect(projected.result.entry.managementActions).toEqual([
      { id: MUTATION_ENTRY_ID, label: 'Move or delete' },
    ])
    expect(projected.result.entry.moveDestinations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ categoryId: 'human-body' }),
      ]),
    )
    expect(projected.result.entry.deleteActions).toEqual([
      { id: MUTATION_ENTRY_ID, label: 'Delete exploration' },
    ])

    const moved = await rpc('microscope.move', {
      id: MUTATION_ENTRY_ID,
      categoryId: 'human-body',
    })
    expect(moved.status).toBe(200)
    const movedBody = (await moved.json()) as {
      result: { categoryId: string; subtitle: string; scale: string }
    }
    expect(movedBody.result).toMatchObject({
      categoryId: 'human-body',
      subtitle: 'Human Body',
      scale: 'organ',
    })

    const deleted = await rpc('microscope.delete', { id: MUTATION_ENTRY_ID })
    expect(deleted.status).toBe(200)
    expect(await deleted.json()).toEqual({
      ok: true,
      result: { deleted: true, id: MUTATION_ENTRY_ID },
    })

    const missing = await rpc('microscope.ui.read', {
      view: 'entry',
      entityId: MUTATION_ENTRY_ID,
      nativeProjection: true,
    })
    expect(missing.status).toBe(404)
  })
})
