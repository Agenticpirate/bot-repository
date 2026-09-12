import {
  ensureDir,
  generateId,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { DEMO_RECIPES } from '../lib/demo-data'
import { type Folder, type Recipe, toneFromSeed } from '../lib/types'
import {
  RECIPES_UI_VIEW_IDS,
  type RecipesUiIntent,
  type RecipesUiViewId,
} from '../lib/ui-intent'
import {
  pruneRecipeFromFolders,
  readFolders,
  registerFolderRoutes,
  writeFolders,
} from './folders'
import { registerMediaRoutes } from './media'
import {
  nativeCreateParamsSchema,
  nativeDeleteParamsSchema,
  nativeManageParamsSchema,
  nativeMutateParamsSchema,
  nativeReadParamsSchema,
  nativeSearchParamsSchema,
  nativeUpdateParamsSchema,
  projectNativeCollection,
  projectNativeLibrary,
  projectNativeNewRecipeEditor,
  projectNativeRecipe,
  projectNativeRecipeEditor,
  projectNativeRecipeSearch,
} from './native-ui-api'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

export const app = new Hono()
app.use('/api/moldable/today', async (c, next) => {
  if (c.req.method !== 'GET') {
    await next()
    return
  }

  await next()

  const response = c.res
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return

  const data = (await response
    .clone()
    .json()
    .catch(() => null)) as unknown
  if (!isMoldableTodayResponse(data)) return

  const dismissals = await readMoldableTodayDismissals(c.req.raw)
  const items = filterMoldableTodayDismissedItems(data.items, dismissals)
  if (items.length === data.items.length) return

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  c.res = new Response(JSON.stringify({ ...data, items }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})

app.use('/api/*', cors())

registerFolderRoutes(app)
registerMediaRoutes(app)

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const nonEmptyStringSchema = z.string().trim().min(1)
const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const parsed = new Date(Date.UTC(year!, month! - 1, day!))
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month! - 1 &&
      parsed.getUTCDate() === day
    )
  }, 'Expected a real ISO calendar date (YYYY-MM-DD).')

function montrealCalendarDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  return `${values.year}-${values.month}-${values.day}`
}

function montrealWeekStart(now = new Date()): string {
  const today = montrealCalendarDate(now)
  const [year, month, day] = today.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day!))
  const weekday = date.getUTCDay()
  date.setUTCDate(date.getUTCDate() - (weekday === 0 ? 6 : weekday - 1))
  return date.toISOString().slice(0, 10)
}

const recipesListParamsSchema = z
  .object({
    query: z.string().optional(),
    category: z.string().optional(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    favoriteOnly: z.boolean().optional(),
    includeDeleted: z.boolean().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional()

const recipeGetParamsSchema = z.object({
  id: nonEmptyStringSchema,
})

const recipeCreateParamsSchema = z.object({
  title: nonEmptyStringSchema,
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  category: z.string().optional(),
  cookingTime: z.string().optional(),
  prepTime: z.string().optional(),
  servings: z.string().optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  sourceUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
})

const recipeUpdateParamsSchema = recipeCreateParamsSchema.partial().extend({
  id: nonEmptyStringSchema,
  isDeleted: z.boolean().optional(),
})

const recipePlanParamsSchema = z.object({
  id: nonEmptyStringSchema,
  planned: z.boolean(),
  weekStart: calendarDateSchema.optional(),
})

const recipeCookParamsSchema = z.object({
  id: nonEmptyStringSchema,
  date: calendarDateSchema.optional(),
})

const savedRecipeSchema = z.object({
  id: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  description: z.string(),
  imageUrl: z.string().optional(),
  ingredients: z.array(z.string()),
  instructions: z.string(),
  category: z.string(),
  cookingTime: z.string().optional(),
  prepTime: z.string().optional(),
  servings: z.string().optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  sourceUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean(),
  isDeleted: z.boolean(),
  plannedForWeek: calendarDateSchema.optional(),
  cookedOn: z.array(calendarDateSchema).max(100).optional(),
  createdAt: nonEmptyStringSchema,
  updatedAt: nonEmptyStringSchema,
}) satisfies z.ZodType<Recipe>

const savedRecipesSchema = z.array(savedRecipeSchema)

const RECIPES_UI_VIEWS: Array<{
  id: RecipesUiViewId
  name: string
  description: string
  params?: Record<string, string>
}> = [
  {
    id: 'library',
    name: 'Recipe library',
    description:
      'The main recipe and folder grid. Takes no entityId or params.',
  },
  {
    id: 'favorites',
    name: 'Favorite recipes',
    description:
      'The grid of recipes marked as favorites. Takes no entityId or params.',
  },
  {
    id: 'folder',
    name: 'Recipe folder',
    description: 'A saved recipe folder. Requires entityId set to a folder id.',
  },
  {
    id: 'recipe',
    name: 'Recipe detail',
    description:
      'One saved recipe with ingredients and instructions. Requires entityId set to a recipe id. Optional params.cookMode opens the hands-free step view.',
    params: {
      cookMode: 'Set true to open hands-free cook mode.',
    },
  },
]

const uiDescribeParamsSchema = z.object({}).strict().optional()
const uiNavigateParamsSchema = z
  .object({
    view: z.enum(RECIPES_UI_VIEW_IDS),
    entityId: nonEmptyStringSchema.optional(),
    params: z.object({ cookMode: z.boolean().optional() }).strict().optional(),
  })
  .strict()
const uiReadParamsSchema = z
  .object({
    view: z.enum(RECIPES_UI_VIEW_IDS).optional(),
    entityId: nonEmptyStringSchema.optional(),
  })
  .strict()
  .optional()
const uiOpenRecipeParamsSchema = z
  .object({
    recipeId: nonEmptyStringSchema,
    cookMode: z.boolean().optional(),
  })
  .strict()

function getRecipesPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'recipes.json')
}

function getUiIntentPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'ui-intent.json')
}

async function readUiIntent(
  workspaceId?: string,
): Promise<RecipesUiIntent | null> {
  return readJson<RecipesUiIntent | null>(getUiIntentPath(workspaceId), null)
}

async function writeUiIntent(
  workspaceId: string | undefined,
  input: Omit<RecipesUiIntent, 'id' | 'createdAt'>,
): Promise<RecipesUiIntent> {
  const intent: RecipesUiIntent = {
    ...input,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(getUiIntentPath(workspaceId), intent)
  return intent
}

async function acknowledgeUiIntent(
  workspaceId: string | undefined,
  intentId: string,
): Promise<boolean> {
  const current = await readUiIntent(workspaceId)
  if (!current || current.id !== intentId) return false
  await writeJson(getUiIntentPath(workspaceId), null)
  return true
}

function splitRecipeSteps(markdown: string): string[] {
  const text = markdown.trim()
  if (!text) return []
  const ordered = text.match(/^\s*\d+[.)]\s+.+(?:\n(?!\s*\d+[.)]).*)*/gm)
  const chunks =
    ordered && ordered.length > 1
      ? ordered.map((step) => step.replace(/^\s*\d+[.)]\s+/, '').trim())
      : text
          .split(/\n{2,}/)
          .map((step) => step.trim())
          .filter(Boolean)
  return chunks.map((step) =>
    step
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/[*_~`]/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

async function loadRecipes(workspaceId?: string): Promise<Recipe[]> {
  await ensureDir(getAppDataDir(workspaceId))
  const recipes = await readJson<unknown | null>(
    getRecipesPath(workspaceId),
    null,
  )

  if (recipes === null) {
    await writeJson(getRecipesPath(workspaceId), DEMO_RECIPES)
    return DEMO_RECIPES
  }

  return savedRecipesSchema.parse(recipes)
}

async function saveRecipes(
  recipes: Recipe[],
  workspaceId?: string,
): Promise<void> {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(getRecipesPath(workspaceId), recipes)
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
  )
}

function filterRecipes(
  recipes: Recipe[],
  params: z.infer<typeof recipesListParamsSchema>,
) {
  let result = [...recipes]

  if (!params?.includeDeleted) {
    result = result.filter((recipe) => !recipe.isDeleted)
  }
  if (params?.favoriteOnly) {
    result = result.filter((recipe) => recipe.isFavorite)
  }
  if (params?.category?.trim()) {
    const category = params.category.toLowerCase()
    result = result.filter((recipe) =>
      recipe.category.toLowerCase().includes(category),
    )
  }
  if (params?.difficulty) {
    result = result.filter((recipe) => recipe.difficulty === params.difficulty)
  }
  if (params?.query?.trim()) {
    const query = params.query.toLowerCase()
    result = result.filter((recipe) =>
      [
        recipe.title,
        recipe.description,
        recipe.category,
        recipe.cookingTime,
        recipe.difficulty,
        ...recipe.ingredients,
        recipe.instructions,
      ]
        .filter(Boolean)
        .join('\n')
        .toLowerCase()
        .includes(query),
    )
  }

  return result
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, params?.limit ?? 100)
}

function shareableRecipeImagePath(imageUrl: string | undefined): string | null {
  if (!imageUrl) return null
  const normalized = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl
  const candidate = normalized.startsWith('recipes/')
    ? `public/${normalized}`
    : normalized
  if (!candidate.startsWith('assets/') && !candidate.startsWith('public/')) {
    return null
  }
  if (
    candidate.includes('\\') ||
    candidate.includes(':') ||
    candidate
      .split('/')
      .some((segment) => !segment || segment === '.' || segment === '..') ||
    !/\.(?:png|jpe?g|gif|webp)$/i.test(candidate)
  ) {
    return null
  }
  return candidate
}

function remoteRecipe(recipe: Recipe): Recipe & { imageAssetPath?: string } {
  const imageAssetPath = shareableRecipeImagePath(recipe.imageUrl)
  return {
    ...recipe,
    ...(imageAssetPath ? { imageAssetPath } : {}),
  }
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'recipes',
      port,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    {
      'Cache-Control': 'no-store',
    },
  )
})

app.get('/api/moldable/today', async (c) => {
  // Typed loosely on purpose: the installed @moldable-ai/ui predates the
  // Today* types, so we build plain objects here.
  const items: unknown[] = []
  let resume: unknown = null
  const generatedAt = new Date().toISOString()

  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const recipes = (await loadRecipes(workspaceId)).filter(
      (recipe) => !recipe.isDeleted,
    )

    // This app stores only recipes — there is no meal-plan, grocery-list, or
    // timer state to read. Without a planned-for-today meal there is nothing
    // time-sensitive to surface, so we emit no items (no recipe lists, no
    // counts, no empty-state nags). We stay completely quiet by default.
    //
    // The one durable, non-noisy signal is "pick up where you left off": the
    // recipe the user was actually working on. We only surface it when it is
    // (a) a real recipe the user added/edited — not the bundled demo set, which
    // would otherwise nag on every fresh install — and (b) touched recently
    // enough to still be live work rather than a stale entry.
    const RESUME_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
    const now = Date.now()

    const mostRecent = recipes
      .filter((recipe) => !recipe.id.startsWith('demo-'))
      .filter(
        (recipe) =>
          now - new Date(recipe.updatedAt).getTime() <= RESUME_WINDOW_MS,
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0]

    if (mostRecent) {
      const subtitleParts = [
        mostRecent.category,
        mostRecent.cookingTime,
      ].filter((part): part is string => Boolean(part && part.trim()))

      resume = {
        title: mostRecent.title,
        subtitle:
          subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined,
        icon: '🍳',
        deepLink: `recipe:${mostRecent.id}`,
        lastTouchedAt: mostRecent.updatedAt,
      }
    }
  } catch (error) {
    console.error('Failed to build Today view:', error)
    return c.json({ items: [], resume: null, generatedAt })
  }

  return c.json({ items, resume, generatedAt })
})

app.get('/api/moldable/ui-intent', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  return c.json(await readUiIntent(workspaceId))
})

app.delete('/api/moldable/ui-intent', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const id = c.req.query('id') ?? ''
  return c.json({
    deleted: id ? await acknowledgeUiIntent(workspaceId, id) : false,
  })
})

app.get('/api/recipes', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const recipes = await loadRecipes(workspaceId)
    return c.json(recipes)
  } catch (error) {
    console.error('Failed to read recipes:', error)
    return c.json({ error: 'Failed to read recipes' }, 500)
  }
})

app.post('/api/recipes', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const recipes = savedRecipesSchema.parse(await c.req.json())
    await saveRecipes(recipes, workspaceId)
    return c.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: 'Invalid recipes payload',
          detail: error.flatten(),
        },
        400,
      )
    }
    console.error('Failed to save recipes:', error)
    return c.json({ error: 'Failed to save recipes' }, 500)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = rpcRequestSchema.parse(await c.req.json())
    const recipes = await loadRecipes(workspaceId)

    if (
      body.method === 'recipes.cards.present' ||
      body.method === 'recipes.cards.read'
    ) {
      const { ids, detailId } = z
        .object({
          ids: z
            .array(z.string().min(1).max(256))
            .min(1)
            .max(8)
            .refine(
              (ids) => new Set(ids).size === ids.length,
              'Choose each item only once.',
            ),
          detailId: z.string().max(256).optional(),
        })
        .strict()
        .parse(body.params)
      if (detailId && !ids.includes(detailId))
        return c.json(
          {
            ok: false,
            error: {
              code: 'invalid_selection',
              message: 'This recipe is outside the presented collection.',
            },
          },
          400,
        )
      const selected = ids
        .map((id) =>
          recipes.find((recipe) => recipe.id === id && !recipe.isDeleted),
        )
        .filter((recipe): recipe is Recipe => Boolean(recipe))
      if (body.method === 'recipes.cards.present')
        return c.json({
          ok: true,
          result: {
            appCard: {
              version: 1,
              title:
                selected.length === 1
                  ? selected[0]!.title.slice(0, 240)
                  : 'Recipes',
              resourcePath: '/index.html?card=recipes',
              input: { ids },
              readMethod: 'recipes.cards.read',
              actions: [],
              height: 400,
            },
          },
        })
      const detail = selected.find((recipe) => recipe.id === detailId)
      return c.json({
        ok: true,
        result: {
          items: selected.map((recipe) => ({
            id: recipe.id,
            title: recipe.title.slice(0, 240),
            imageUrl: recipe.imageUrl?.startsWith('data:')
              ? undefined
              : recipe.imageUrl,
            cookingTime: recipe.cookingTime,
            plannedForWeek: recipe.plannedForWeek,
          })),
          detail: detail
            ? {
                ...remoteRecipe(detail),
                imageUrl: detail.imageUrl?.startsWith('data:')
                  ? undefined
                  : detail.imageUrl,
                instructions: detail.instructions.slice(0, 20_000),
                description: detail.description.slice(0, 2000),
                ingredients: detail.ingredients
                  .slice(0, 100)
                  .map((item) => item.slice(0, 200)),
                truncated:
                  detail.instructions.length > 20_000 ||
                  detail.ingredients.length > 100,
              }
            : null,
          missingCount: ids.length - selected.length,
        },
      })
    }

    if (body.method === 'recipes.native.read') {
      const params = nativeReadParamsSchema.parse(body.params)
      const folders = await readFolders(workspaceId)
      if (params.route === 'library') {
        return c.json({
          ok: true,
          result: projectNativeLibrary(recipes, folders, params.limit),
        })
      }
      if (params.route === 'collection') {
        const result = projectNativeCollection(recipes, folders, params)
        if (!result) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'folder_not_found',
                message: `Recipe folder ${params.id} was not found.`,
              },
            },
            404,
          )
        }
        return c.json({ ok: true, result })
      }
      if (params.route === 'new') {
        return c.json({ ok: true, result: projectNativeNewRecipeEditor() })
      }
      const recipe = recipes.find(
        (item) => item.id === params.id && !item.isDeleted,
      )
      if (!recipe) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'recipe_not_found',
              message: `Recipe ${params.id} was not found.`,
            },
          },
          404,
        )
      }
      const result =
        params.route === 'edit'
          ? projectNativeRecipeEditor(recipe)
          : projectNativeRecipe(recipe, params.route, params.stepIndex, folders)
      if (!result) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'step_not_found',
              message: 'That cooking step is not available.',
            },
          },
          404,
        )
      }
      return c.json({ ok: true, result })
    }

    if (body.method === 'recipes.native.mutate') {
      const params = nativeMutateParamsSchema.parse(body.params)
      const index = recipes.findIndex(
        (item) => item.id === params.id && !item.isDeleted,
      )
      if (index === -1) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'recipe_not_found',
              message: `Recipe ${params.id} was not found.`,
            },
          },
          404,
        )
      }
      const recipe = recipes[index]!
      recipes[index] = {
        ...recipe,
        isFavorite: params.favorite,
        updatedAt: new Date().toISOString(),
      }
      await saveRecipes(recipes, workspaceId)
      return c.json({
        ok: true,
        result: {
          ok: true,
          id: params.id,
          favorite: params.favorite,
          notices: [
            {
              title: params.favorite
                ? 'Added to favorites'
                : 'Removed from favorites',
              message: recipe.title,
            },
          ],
        },
      })
    }

    if (body.method === 'recipes.native.search') {
      const params = nativeSearchParamsSchema.parse(body.params)
      return c.json({
        ok: true,
        result: projectNativeRecipeSearch(recipes, params.query),
      })
    }

    if (body.method === 'recipes.native.manage') {
      const params = nativeManageParamsSchema.parse(body.params)
      const folders = await readFolders(workspaceId)
      const now = new Date().toISOString()
      if (params.action === 'create-folder') {
        const folder: Folder = {
          id: generateId(),
          name: params.name,
          tone: toneFromSeed(params.name),
          recipeIds: [],
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        }
        await writeFolders(workspaceId, [folder, ...folders])
        return c.json({
          ok: true,
          result: {
            ok: true,
            notices: [
              {
                title: 'Collection created',
                message: `${folder.name} is ready.`,
              },
            ],
          },
        })
      }
      if (params.action === 'rename-folder') {
        const folder = folders.find((item) => item.id === params.folderId)
        if (!folder)
          return c.json(
            {
              ok: false,
              error: {
                code: 'folder_not_found',
                message: 'Collection not found.',
              },
            },
            404,
          )
        folder.name = params.name
        folder.updatedAt = now
        await writeFolders(workspaceId, folders)
        return c.json({
          ok: true,
          result: {
            ok: true,
            notices: [
              {
                title: 'Collection renamed',
                message: `Now named ${folder.name}.`,
              },
            ],
          },
        })
      }
      if (
        !recipes.some((recipe) => recipe.id === params.id && !recipe.isDeleted)
      )
        return c.json(
          {
            ok: false,
            error: { code: 'recipe_not_found', message: 'Recipe not found.' },
          },
          404,
        )
      if (
        params.folderId &&
        !folders.some((folder) => folder.id === params.folderId)
      )
        return c.json(
          {
            ok: false,
            error: {
              code: 'folder_not_found',
              message: 'Collection not found.',
            },
          },
          404,
        )
      await writeFolders(
        workspaceId,
        folders.map((folder) => ({
          ...folder,
          recipeIds:
            folder.id === params.folderId
              ? [
                  ...folder.recipeIds.filter((id) => id !== params.id),
                  params.id,
                ]
              : folder.recipeIds.filter((id) => id !== params.id),
          updatedAt: now,
        })),
      )
      return c.json({
        ok: true,
        result: {
          ok: true,
          notices: [
            {
              title: 'Recipe moved',
              message: params.folderId
                ? 'Collection updated.'
                : 'Moved to Library.',
            },
          ],
        },
      })
    }

    if (body.method === 'recipes.native.update') {
      const params = nativeUpdateParamsSchema.parse(body.params)
      const index = recipes.findIndex(
        (recipe) => recipe.id === params.id && !recipe.isDeleted,
      )
      if (index === -1)
        return c.json(
          {
            ok: false,
            error: { code: 'recipe_not_found', message: 'Recipe not found.' },
          },
          404,
        )
      recipes[index] = {
        ...recipes[index]!,
        title: params.title,
        description: params.description,
        category: params.category,
        servings: params.servings,
        prepTime: params.prepTime,
        cookingTime: params.cookingTime,
        difficulty: params.difficulty,
        ingredients: params.ingredientsText
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean),
        instructions: params.instructions,
        tags: params.tagsText
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        sourceUrl: params.sourceUrl,
        updatedAt: new Date().toISOString(),
      }
      await saveRecipes(recipes, workspaceId)
      return c.json({
        ok: true,
        result: {
          ok: true,
          id: params.id,
          notices: [
            {
              title: 'Recipe saved',
              message: `${params.title} is up to date.`,
            },
          ],
        },
      })
    }

    if (body.method === 'recipes.native.create') {
      const params = nativeCreateParamsSchema.parse(body.params)
      const now = new Date().toISOString()
      const recipe: Recipe = {
        id: generateId(),
        title: params.title,
        description: params.description,
        category: params.category,
        servings: params.servings,
        prepTime: params.prepTime,
        cookingTime: params.cookingTime,
        difficulty: params.difficulty,
        ingredients: params.ingredientsText
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean),
        instructions: params.instructions,
        tags: params.tagsText
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        sourceUrl: params.sourceUrl,
        isFavorite: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      }
      await saveRecipes([recipe, ...recipes], workspaceId)
      return c.json({
        ok: true,
        result: {
          ok: true,
          id: recipe.id,
          notices: [
            {
              title: 'Recipe created',
              message: `${recipe.title} is now in your library.`,
            },
          ],
        },
      })
    }

    if (body.method === 'recipes.native.delete') {
      const params = nativeDeleteParamsSchema.parse(body.params)
      if (params.action === 'delete-folder') {
        const folders = await readFolders(workspaceId)
        const next = folders.filter((folder) => folder.id !== params.folderId)
        if (next.length === folders.length)
          return c.json(
            {
              ok: false,
              error: {
                code: 'folder_not_found',
                message: 'Collection not found.',
              },
            },
            404,
          )
        await writeFolders(workspaceId, next)
        return c.json({ ok: true, result: { ok: true } })
      }
      const index = recipes.findIndex(
        (recipe) => recipe.id === params.id && !recipe.isDeleted,
      )
      if (index === -1)
        return c.json(
          {
            ok: false,
            error: { code: 'recipe_not_found', message: 'Recipe not found.' },
          },
          404,
        )
      recipes[index] = {
        ...recipes[index]!,
        isDeleted: true,
        updatedAt: new Date().toISOString(),
      }
      await saveRecipes(recipes, workspaceId)
      await pruneRecipeFromFolders(workspaceId, params.id)
      return c.json({ ok: true, result: { ok: true, id: params.id } })
    }

    if (body.method === 'recipes.ui.describe') {
      uiDescribeParamsSchema.parse(body.params)
      return c.json({
        ok: true,
        result: {
          views: RECIPES_UI_VIEWS,
          entities:
            'Recipe ids come from recipes.list; folder ids come from the folders in recipes.ui.read for the library view.',
        },
      })
    }

    if (body.method === 'recipes.ui.navigate') {
      const params = uiNavigateParamsSchema.parse(body.params)
      if (params.view === 'library' || params.view === 'favorites') {
        if (params.entityId || params.params) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'invalid_params',
                message: `${params.view} takes no entityId or params.`,
              },
            },
            400,
          )
        }
      } else if (!params.entityId) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'entity_id_required',
              message: `${params.view} requires an entityId.`,
            },
          },
          400,
        )
      }

      if (params.view === 'folder') {
        if (params.params) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'invalid_params',
                message: 'The folder view takes no params.',
              },
            },
            400,
          )
        }
        const folders = await readFolders(workspaceId)
        if (!folders.some((folder) => folder.id === params.entityId)) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'folder_not_found',
                message: `Folder ${params.entityId} was not found.`,
              },
            },
            404,
          )
        }
      }

      if (params.view === 'recipe') {
        const recipe = recipes.find(
          (item) => item.id === params.entityId && !item.isDeleted,
        )
        if (!recipe) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'recipe_not_found',
                message: `Recipe ${params.entityId} was not found.`,
              },
            },
            404,
          )
        }
      }

      const intent = await writeUiIntent(workspaceId, {
        view: params.view,
        ...(params.entityId ? { entityId: params.entityId } : {}),
        ...(params.params ? { params: params.params } : {}),
      })
      return c.json({
        ok: true,
        result: { ok: true, intentId: intent.id },
      })
    }

    if (body.method === 'recipes.ui.openRecipe') {
      const params = uiOpenRecipeParamsSchema.parse(body.params)
      const recipe = recipes.find(
        (item) => item.id === params.recipeId && !item.isDeleted,
      )
      if (!recipe) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'recipe_not_found',
              message: `Recipe ${params.recipeId} was not found.`,
            },
          },
          404,
        )
      }
      const intent = await writeUiIntent(workspaceId, {
        view: 'recipe',
        entityId: recipe.id,
        params: { cookMode: params.cookMode ?? false },
      })
      return c.json({
        ok: true,
        result: {
          ok: true,
          intentId: intent.id,
          recipeId: recipe.id,
          cookMode: params.cookMode ?? false,
        },
      })
    }

    if (body.method === 'recipes.ui.read') {
      const params = uiReadParamsSchema.parse(body.params) ?? {}
      const view = params.view ?? (params.entityId ? 'recipe' : 'library')
      const liveRecipes = recipes.filter((recipe) => !recipe.isDeleted)

      if (view === 'recipe') {
        if (!params.entityId) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'entity_id_required',
                message: 'The recipe view requires an entityId.',
              },
            },
            400,
          )
        }
        const recipe = liveRecipes.find((item) => item.id === params.entityId)
        if (!recipe) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'recipe_not_found',
                message: `Recipe ${params.entityId} was not found.`,
              },
            },
            404,
          )
        }
        return c.json({
          ok: true,
          result: {
            view: 'recipe',
            recipe: {
              id: recipe.id,
              title: recipe.title,
              description: recipe.description,
              category: recipe.category,
              prepTime: recipe.prepTime ?? null,
              cookingTime: recipe.cookingTime ?? null,
              servings: recipe.servings ?? null,
              difficulty: recipe.difficulty ?? null,
              tags: recipe.tags ?? [],
              imageAssetPath: shareableRecipeImagePath(recipe.imageUrl) ?? null,
              ingredients: recipe.ingredients,
              steps: splitRecipeSteps(recipe.instructions).map(
                (text, index) => ({ number: index + 1, text }),
              ),
            },
          },
        })
      }

      const folders = await readFolders(workspaceId)
      if (view === 'folder') {
        if (!params.entityId) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'entity_id_required',
                message: 'The folder view requires an entityId.',
              },
            },
            400,
          )
        }
        const folder = folders.find((item) => item.id === params.entityId)
        if (!folder) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'folder_not_found',
                message: `Folder ${params.entityId} was not found.`,
              },
            },
            404,
          )
        }
        return c.json({
          ok: true,
          result: {
            view: 'folder',
            folder,
            recipes: folder.recipeIds
              .map((id) => liveRecipes.find((recipe) => recipe.id === id))
              .filter((recipe): recipe is Recipe => Boolean(recipe))
              .map(remoteRecipe),
          },
        })
      }

      if (params.entityId) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'invalid_params',
              message: `${view} takes no entityId.`,
            },
          },
          400,
        )
      }
      return c.json({
        ok: true,
        result: {
          view,
          recipes: (view === 'favorites'
            ? liveRecipes.filter((recipe) => recipe.isFavorite)
            : liveRecipes
          ).map(remoteRecipe),
          ...(view === 'library' ? { folders } : {}),
        },
      })
    }

    if (body.method === 'recipes.list' || body.method === 'recipes.search') {
      const params = recipesListParamsSchema.parse(body.params)
      return c.json({
        ok: true,
        result: filterRecipes(recipes, params).map(remoteRecipe),
      })
    }

    if (body.method === 'recipes.get') {
      const params = recipeGetParamsSchema.parse(body.params)
      const recipe = recipes.find((item) => item.id === params.id)

      if (!recipe) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'recipe_not_found',
              message: `Recipe ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      return c.json({ ok: true, result: remoteRecipe(recipe) })
    }

    if (body.method === 'recipes.create') {
      const params = recipeCreateParamsSchema.parse(body.params)
      const now = new Date().toISOString()
      const recipe: Recipe = {
        id: crypto.randomUUID(),
        title: params.title,
        description: params.description ?? '',
        imageUrl: params.imageUrl,
        ingredients: params.ingredients ?? [],
        instructions: params.instructions ?? '',
        category: params.category ?? 'Uncategorized',
        cookingTime: params.cookingTime,
        prepTime: params.prepTime,
        servings: params.servings,
        difficulty: params.difficulty,
        sourceUrl: params.sourceUrl,
        tags: params.tags,
        isFavorite: params.isFavorite ?? false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      }

      await saveRecipes([recipe, ...recipes], workspaceId)
      return c.json({ ok: true, result: recipe })
    }

    if (body.method === 'recipes.plan') {
      const params = recipePlanParamsSchema.parse(body.params)
      const index = recipes.findIndex(
        (item) => item.id === params.id && !item.isDeleted,
      )
      if (index === -1) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'recipe_not_found',
              message: `Recipe ${params.id} was not found.`,
            },
          },
          404,
        )
      }
      const existing = recipes[index]!
      recipes[index] = {
        ...existing,
        ...(params.planned
          ? { plannedForWeek: params.weekStart ?? montrealWeekStart() }
          : { plannedForWeek: undefined }),
        updatedAt: new Date().toISOString(),
      }
      await saveRecipes(recipes, workspaceId)
      return c.json({ ok: true, result: recipes[index] })
    }

    if (body.method === 'recipes.cook') {
      const params = recipeCookParamsSchema.parse(body.params)
      const index = recipes.findIndex(
        (item) => item.id === params.id && !item.isDeleted,
      )
      if (index === -1) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'recipe_not_found',
              message: `Recipe ${params.id} was not found.`,
            },
          },
          404,
        )
      }
      const cookedDate = params.date ?? montrealCalendarDate()
      const existing = recipes[index]!
      const cookedOn = [
        ...new Set([...(existing.cookedOn ?? []), cookedDate]),
      ].sort((a, b) => b.localeCompare(a))
      recipes[index] = {
        ...existing,
        cookedOn,
        updatedAt: new Date().toISOString(),
      }
      await saveRecipes(recipes, workspaceId)
      return c.json({ ok: true, result: recipes[index] })
    }

    if (
      body.method === 'recipes.update' ||
      body.method === 'recipes.favorite' ||
      body.method === 'recipes.delete'
    ) {
      const params = recipeUpdateParamsSchema.parse(body.params)
      const index = recipes.findIndex((item) => item.id === params.id)

      if (index === -1) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'recipe_not_found',
              message: `Recipe ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      const existing = recipes[index]!
      recipes[index] = {
        ...existing,
        ...('title' in params ? { title: params.title } : {}),
        ...('description' in params ? { description: params.description } : {}),
        ...('imageUrl' in params ? { imageUrl: params.imageUrl } : {}),
        ...('ingredients' in params ? { ingredients: params.ingredients } : {}),
        ...('instructions' in params
          ? { instructions: params.instructions }
          : {}),
        ...('category' in params ? { category: params.category } : {}),
        ...('cookingTime' in params ? { cookingTime: params.cookingTime } : {}),
        ...('prepTime' in params ? { prepTime: params.prepTime } : {}),
        ...('servings' in params ? { servings: params.servings } : {}),
        ...('difficulty' in params ? { difficulty: params.difficulty } : {}),
        ...('sourceUrl' in params ? { sourceUrl: params.sourceUrl } : {}),
        ...('tags' in params ? { tags: params.tags } : {}),
        ...('isFavorite' in params ? { isFavorite: params.isFavorite } : {}),
        ...(body.method === 'recipes.delete'
          ? { isDeleted: true }
          : 'isDeleted' in params
            ? { isDeleted: params.isDeleted }
            : {}),
        updatedAt: new Date().toISOString(),
      }

      await saveRecipes(recipes, workspaceId)
      if (body.method === 'recipes.delete') {
        await pruneRecipeFromFolders(workspaceId, params.id)
      }
      return c.json({ ok: true, result: recipes[index] })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Recipes does not expose ${body.method}.`,
        },
      },
      404,
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Recipes received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    console.error('Recipes RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'recipes_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Recipes could not complete the request.',
        },
      },
      500,
    )
  }
})

app.post('/api/moldable/today/dismiss', async (c) => {
  const body = (await c.req.json().catch(() => null)) as unknown
  if (!isMoldableTodayDismissalRequest(body)) {
    return c.json({ error: 'Invalid Today dismissal payload.' }, 400)
  }

  const dismissals = await recordMoldableTodayDismissal(c.req.raw, {
    id: body.id,
    dismissalKey: body.dismissalKey,
    materialDismissalKey: body.materialDismissalKey,
    dismissedAt: body.dismissedAt ?? new Date().toISOString(),
    item: body.item,
  })

  return c.json({ ok: true, dismissals: dismissals.length })
})

type MoldableTodayItem = {
  id?: unknown
  kind?: unknown
  title?: unknown
  subtitle?: unknown
  groupHint?: unknown
}

type MoldableTodayDismissal = {
  id: string
  dismissalKey?: string
  materialDismissalKey?: string
  dismissedAt: string
  item?: {
    kind?: string
    title?: string
    subtitle?: string
    groupHint?: string
  }
}

function isMoldableTodayResponse(value: unknown): value is {
  items: MoldableTodayItem[]
  [key: string]: unknown
} {
  return isMoldableTodayRecord(value) && Array.isArray(value.items)
}

function isMoldableTodayDismissalRequest(
  value: unknown,
): value is MoldableTodayDismissal {
  if (!isMoldableTodayRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    optionalMoldableTodayString(value.dismissalKey) &&
    optionalMoldableTodayString(value.materialDismissalKey) &&
    optionalMoldableTodayString(value.dismissedAt) &&
    (value.item === undefined || isMoldableTodayDismissalItem(value.item))
  )
}

function isMoldableTodayDismissalItem(value: unknown): value is {
  kind?: string
  title?: string
  subtitle?: string
  groupHint?: string
} {
  if (!isMoldableTodayRecord(value)) return false
  return (
    optionalMoldableTodayString(value.kind) &&
    optionalMoldableTodayString(value.title) &&
    optionalMoldableTodayString(value.subtitle) &&
    optionalMoldableTodayString(value.groupHint)
  )
}

function optionalMoldableTodayString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isMoldableTodayRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function recordMoldableTodayDismissal(
  request: Request,
  dismissal: MoldableTodayDismissal,
): Promise<MoldableTodayDismissal[]> {
  const current = await readMoldableTodayDismissals(request)
  const key = dismissal.dismissalKey ?? dismissal.id
  const next = [
    ...current.filter((entry) => (entry.dismissalKey ?? entry.id) !== key),
    dismissal,
  ].sort((a, b) => a.id.localeCompare(b.id))
  await writeMoldableTodayDismissals(request, next)
  return next
}

async function readMoldableTodayDismissals(
  request: Request,
): Promise<MoldableTodayDismissal[]> {
  const filePath = await moldableTodayDismissalsPath(request)
  const { readFile } = await import('node:fs/promises')
  try {
    const data = JSON.parse(await readFile(filePath, 'utf8')) as unknown
    return Array.isArray(data)
      ? data.filter(isMoldableTodayDismissalRequest)
      : []
  } catch (error) {
    if (isNodeFileNotFound(error)) return []
    throw error
  }
}

async function writeMoldableTodayDismissals(
  request: Request,
  dismissals: MoldableTodayDismissal[],
): Promise<void> {
  const filePath = await moldableTodayDismissalsPath(request)
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = path.join(
    path.dirname(filePath),
    '.' +
      path.basename(filePath) +
      '.' +
      process.pid +
      '.' +
      Date.now() +
      '.tmp',
  )
  await fs.writeFile(tempPath, JSON.stringify(dismissals, null, 2), 'utf8')
  await fs.rename(tempPath, filePath)
}

async function moldableTodayDismissalsPath(request: Request): Promise<string> {
  const path = await import('node:path')
  return path.join(moldableTodayDataDir(request), 'today-dismissals.json')
}

function moldableTodayDataDir(request: Request): string {
  const workspaceId =
    request.headers.get('x-moldable-workspace') ??
    request.headers.get('x-moldable-workspace-id') ??
    process.env.MOLDABLE_WORKSPACE_ID ??
    'personal'
  const appId = process.env.MOLDABLE_APP_ID

  if (appId) {
    const home =
      process.env.MOLDABLE_HOME ??
      (process.env.HOME ?? process.cwd()) + '/.moldable'
    return home + '/workspaces/' + workspaceId + '/apps/' + appId + '/data'
  }

  return process.env.MOLDABLE_APP_DATA_DIR ?? process.cwd() + '/data'
}

function filterMoldableTodayDismissedItems<T extends MoldableTodayItem>(
  items: T[],
  dismissals: MoldableTodayDismissal[],
): T[] {
  if (dismissals.length === 0) return items
  const dismissedIds = new Set(dismissals.map((entry) => entry.id))
  const dismissedMaterialKeys = new Set(
    dismissals
      .map((entry) => entry.materialDismissalKey)
      .filter((key): key is string => Boolean(key)),
  )

  return items.filter((item) => {
    if (typeof item.id === 'string' && dismissedIds.has(item.id)) return false
    return !dismissedMaterialKeys.has(moldableTodayMaterialKey(item))
  })
}

function moldableTodayMaterialKey(item: MoldableTodayItem): string {
  return [
    'material',
    process.env.MOLDABLE_APP_ID ?? '',
    typeof item.kind === 'string' ? item.kind : '',
    'text',
    normalizeMoldableTodayText(item.title),
    normalizeMoldableTodayText(item.subtitle),
    typeof item.groupHint === 'string' ? item.groupHint : '',
    '',
  ].join('\u001e')
}

function normalizeMoldableTodayText(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLowerCase()
    : ''
}

function isNodeFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}
