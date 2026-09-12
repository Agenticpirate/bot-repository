import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let dataDir: string
let previousDataDir: string | undefined
let app: (typeof import('./app'))['app']

const WORKSPACE = 'recipes-drive-test'
const HEADERS = { 'x-moldable-workspace': WORKSPACE }

function rpc(method: string, params?: unknown) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })
}

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'recipes-drive-'))
  previousDataDir = process.env.MOLDABLE_APP_DATA_DIR
  process.env.MOLDABLE_APP_DATA_DIR = dataDir
  app = (await import('./app')).app
})

afterAll(async () => {
  if (previousDataDir === undefined) delete process.env.MOLDABLE_APP_DATA_DIR
  else process.env.MOLDABLE_APP_DATA_DIR = previousDataDir
  await rm(dataDir, { recursive: true, force: true })
})

describe('recipes drive contract', () => {
  it('describes every navigable view', async () => {
    const response = await rpc('recipes.ui.describe', {})
    const body = (await response.json()) as {
      result: { views: Array<{ id: string; description: string }> }
    }
    expect(response.status).toBe(200)
    expect(body.result.views.map((view) => view.id)).toEqual([
      'library',
      'favorites',
      'folder',
      'recipe',
    ])
    expect(
      body.result.views.every((view) => view.description.length > 25),
    ).toBe(true)
  })

  it('queues, replaces, exposes, and acknowledges navigation', async () => {
    await rpc('recipes.ui.navigate', { view: 'library' })
    const navigate = await rpc('recipes.ui.navigate', {
      view: 'recipe',
      entityId: 'demo-1',
      params: { cookMode: true },
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
      params?: { cookMode?: boolean }
    }
    expect(intent.id).toBe(navigateBody.result.intentId)
    expect(intent.entityId).toBe('demo-1')
    expect(intent.params?.cookMode).toBe(true)

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

  it('opens cook mode and reads structured ingredients and clean steps', async () => {
    const open = await rpc('recipes.ui.openRecipe', {
      recipeId: 'demo-1',
      cookMode: true,
    })
    const openBody = (await open.json()) as {
      result: { cookMode: boolean; intentId: string }
    }
    expect(open.status).toBe(200)
    expect(openBody.result.cookMode).toBe(true)
    expect(openBody.result.intentId).toBeTruthy()

    const read = await rpc('recipes.ui.read', {
      view: 'recipe',
      entityId: 'demo-1',
    })
    const body = (await read.json()) as {
      result: {
        recipe: {
          ingredients: string[]
          steps: Array<{ number: number; text: string }>
        }
      }
    }
    expect(read.status).toBe(200)
    expect(body.result.recipe.ingredients).toContain('Salmon fillets')
    expect(body.result.recipe.steps).toEqual([
      { number: 1, text: 'Pat salmon dry.' },
      { number: 2, text: 'Sear skin-side down for 5 mins.' },
      { number: 3, text: 'Flip and baste with lemon butter.' },
    ])
  })

  it('rejects invalid views and missing recipes with structured errors', async () => {
    const invalid = await rpc('recipes.ui.navigate', {
      view: 'shopping-list',
    })
    expect(invalid.status).toBe(400)
    expect(
      ((await invalid.json()) as { error: { code: string } }).error.code,
    ).toBe('invalid_params')

    const missing = await rpc('recipes.ui.openRecipe', {
      recipeId: 'missing',
    })
    expect(missing.status).toBe(404)
  })

  it('projects bounded route-specific NativeUI cookbook data', async () => {
    const library = await rpc('recipes.native.read', {
      route: 'library',
      limit: 16,
    })
    const libraryBody = (await library.json()) as {
      result: {
        summary: string
        folderSections: unknown[]
        recipeSections: Array<{
          items: Array<{ imageURL: string }>
        }>
      }
    }
    expect(library.status).toBe(200)
    expect(libraryBody.result.summary).toContain('recipes')
    const visibleImages = libraryBody.result.recipeSections
      .flatMap((section) => section.items)
      .map((item) => item.imageURL)
      .filter(Boolean)
    expect(visibleImages.length).toBeLessThanOrEqual(16)

    const recipe = await rpc('recipes.native.read', {
      route: 'recipe',
      id: 'demo-1',
    })
    const recipeBody = (await recipe.json()) as {
      result: Record<string, unknown> & {
        title: string
        ingredientDestinations: unknown[]
      }
    }
    expect(recipe.status).toBe(200)
    expect(recipeBody.result.title).toBe('Perfect Pan-Seared Salmon')
    expect(recipeBody.result.ingredientDestinations).toHaveLength(1)
    expect(recipeBody.result.favoriteActions).toHaveLength(1)
    expect(recipeBody.result).not.toHaveProperty('ingredients')
    expect(recipeBody.result).not.toHaveProperty('instructions')

    const cook = await rpc('recipes.native.read', {
      route: 'cook-step',
      id: 'demo-1',
      stepIndex: 0,
    })
    const cookBody = (await cook.json()) as {
      result: {
        stepLabel: string
        stepCards: Array<{ text: string }>
        nextDestinations: Array<{ stepIndex: number }>
      }
    }
    expect(cook.status).toBe(200)
    expect(cookBody.result.stepLabel).toBe('Step 1 of 3')
    expect(cookBody.result.stepCards).toEqual([{ text: 'Pat salmon dry.' }])
    expect(cookBody.result.nextDestinations).toEqual([
      expect.objectContaining({ stepIndex: 1 }),
    ])
  })

  it('updates favorite state through the bounded NativeUI action', async () => {
    const mutate = await rpc('recipes.native.mutate', {
      action: 'favorite',
      id: 'demo-1',
      favorite: true,
    })
    expect(mutate.status).toBe(200)
    expect(await mutate.json()).toEqual({
      ok: true,
      result: {
        ok: true,
        id: 'demo-1',
        favorite: true,
        notices: [
          { title: 'Added to favorites', message: 'Perfect Pan-Seared Salmon' },
        ],
      },
    })

    const recipe = await rpc('recipes.native.read', {
      route: 'recipe',
      id: 'demo-1',
    })
    const body = (await recipe.json()) as {
      result: {
        favoriteBadges: unknown[]
        favoriteActions: Array<{ favorite: boolean }>
      }
    }
    expect(body.result.favoriteBadges).toHaveLength(1)
    expect(body.result.favoriteActions[0]?.favorite).toBe(false)

    await rpc('recipes.native.mutate', {
      action: 'favorite',
      id: 'demo-1',
      favorite: false,
    })
  })

  it('creates, searches, edits, organizes, and deletes a recipe in temporary storage', async () => {
    const blank = await rpc('recipes.native.read', { route: 'new' })
    expect(
      ((await blank.json()) as { result: { draft: unknown[] } }).result.draft,
    ).toHaveLength(1)

    const fields = {
      title: 'Native test soup',
      description: 'A temporary test recipe',
      category: 'Test',
      servings: 'Serves 2',
      prepTime: '5 min',
      cookingTime: '10 min',
      difficulty: 'Easy',
      ingredientsText: 'Water\nSalt',
      instructions: '1. Simmer.\n\n2. Serve.',
      tagsText: 'temporary, soup',
      sourceUrl: '',
    }
    const create = await rpc('recipes.native.create', fields)
    const created = (await create.json()) as { result: { id: string } }
    expect(create.status).toBe(200)

    const search = await rpc('recipes.native.search', { query: 'Native test' })
    expect((await search.json()) as unknown).toEqual(
      expect.objectContaining({
        result: expect.objectContaining({
          results: expect.arrayContaining([
            expect.objectContaining({ id: created.result.id }),
          ]),
        }),
      }),
    )

    const update = await rpc('recipes.native.update', {
      id: created.result.id,
      ...fields,
      title: 'Native test stew',
    })
    expect(update.status).toBe(200)

    await rpc('recipes.native.manage', {
      action: 'create-folder',
      name: 'Native QA',
    })
    const library = await rpc('recipes.native.read', {
      route: 'library',
      limit: 16,
    })
    const libraryBody = (await library.json()) as {
      result: {
        folderSections: Array<{ items: Array<{ id: string; name: string }> }>
      }
    }
    const folder = libraryBody.result.folderSections
      .flatMap((section) => section.items)
      .find((item) => item.name === 'Native QA')
    expect(folder).toBeTruthy()
    await rpc('recipes.native.manage', {
      action: 'move-recipe',
      id: created.result.id,
      folderId: folder!.id,
    })

    expect(
      (
        await rpc('recipes.native.delete', {
          action: 'delete-recipe',
          id: created.result.id,
        })
      ).status,
    ).toBe(200)
    expect(
      (
        await rpc('recipes.native.delete', {
          action: 'delete-folder',
          folderId: folder!.id,
        })
      ).status,
    ).toBe(200)
    expect(
      (
        await rpc('recipes.native.read', {
          route: 'recipe',
          id: created.result.id,
        })
      ).status,
    ).toBe(404)
  })

  it('rejects invalid and unbounded NativeUI reads', async () => {
    expect((await rpc('recipes.native.read', { route: 'recipe' })).status).toBe(
      400,
    )
    expect(
      (
        await rpc('recipes.native.read', {
          route: 'library',
          limit: 17,
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await rpc('recipes.native.read', {
          route: 'cook-step',
          id: 'demo-1',
          stepIndex: 99,
        })
      ).status,
    ).toBe(404)
  })
})

describe('Recipes NativeUI package boundary', () => {
  it('uses mobile web without a per-app NativeUI package', async () => {
    const { readFile, access } = await import('node:fs/promises')
    const manifest = JSON.parse(
      await readFile(new URL('../../moldable.json', import.meta.url), 'utf8'),
    ) as {
      nativeUI?: string
      mobile?: { type: string }
    }
    expect(manifest.nativeUI).toBeUndefined()
    expect(manifest.mobile?.type).toBe('mobile-web')
    await expect(
      access(new URL('../../native-ui.json', import.meta.url)),
    ).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
