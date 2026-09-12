import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { type Plant, dueState, nextDueAt } from '../lib/types'
import { handlePlantCard } from './chat-cards'
import { generateCareProfile, identifyPlantImage } from './llm'
import { persistImagePath, registerMediaRoutes } from './media'
import {
  nativeAcquireParamsSchema,
  nativeConfirmIdentificationParamsSchema,
  nativeCreateParamsSchema,
  nativeDeleteParamsSchema,
  nativeGenerateCareParamsSchema,
  nativeMutateParamsSchema,
  nativeReadParamsSchema,
  nativeSetHeroParamsSchema,
  nativeSnoozeParamsSchema,
  nativeUpdateParamsSchema,
  projectNativeCollection,
  projectNativeDetail,
  projectNativeHome,
} from './native-ui-api'
import { syncPlantNotificationSchedules } from './notifications'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import { basename } from 'node:path'
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

registerMediaRoutes(app)

const WATER_HISTORY_CAP = 50

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function getPlantsPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'plants.json')
}

async function loadPlantsRaw(workspaceId?: string): Promise<Plant[]> {
  await ensureDir(getAppDataDir(workspaceId))
  const plants = await readJson<Plant[] | null>(
    getPlantsPath(workspaceId),
    null,
  )
  // Start with an empty library — no demo data.
  if (plants === null) {
    await writeJson(getPlantsPath(workspaceId), [])
    return []
  }
  return plants
}

async function normalizeLoadedPlants(
  plants: Plant[],
  workspaceId?: string,
): Promise<{ plants: Plant[]; changed: boolean }> {
  let changed = false
  const normalized = await Promise.all(
    plants.map(async (plant) => {
      let next = plant
      let plantChanged = false

      // Migrate the original folder-based wishlist convention into a real state.
      if (
        !plant.ownershipStatus &&
        plant.room?.trim().toLowerCase() === 'future plants'
      ) {
        next = {
          ...next,
          ownershipStatus: 'wishlist',
          room: undefined,
          waterIntervalDays: 0,
        }
        plantChanged = true
      }

      if (next.heroImageUrl?.startsWith('/')) {
        const heroImageUrl = await normalizeHeroImagePath(
          next.heroImageUrl,
          workspaceId,
        )
        if (heroImageUrl && heroImageUrl !== next.heroImageUrl) {
          next = { ...next, heroImageUrl }
          plantChanged = true
        }
      }

      if (!plantChanged) return plant
      changed = true
      return { ...next, updatedAt: new Date().toISOString() }
    }),
  )
  return { plants: normalized, changed }
}

async function loadPlants(workspaceId?: string): Promise<Plant[]> {
  return withPlantsWriteLock(workspaceId, async () => {
    const rawPlants = await loadPlantsRaw(workspaceId)
    const { plants, changed } = await normalizeLoadedPlants(
      rawPlants,
      workspaceId,
    )
    if (changed) await savePlants(plants, workspaceId)
    return plants
  })
}

async function savePlants(
  plants: Plant[],
  workspaceId?: string,
): Promise<void> {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(getPlantsPath(workspaceId), plants)
  void syncPlantNotificationSchedules(plants, workspaceId).catch((error) => {
    console.warn('Failed to reconcile watering notifications:', error)
  })
}

const PLANTS_LOCK_SHARED = '__shared__'
const plantWriteLocks = new Map<string, Promise<void>>()

async function withPlantsWriteLock<T>(
  workspaceId: string | undefined,
  operation: () => Promise<T>,
): Promise<T> {
  const key = workspaceId ?? PLANTS_LOCK_SHARED
  const previous = plantWriteLocks.get(key) ?? Promise.resolve()
  let releaseCurrent!: () => void
  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve
  })
  const next = previous.catch(() => undefined).then(() => current)
  plantWriteLocks.set(key, next)

  await previous.catch(() => undefined)

  try {
    return await operation()
  } finally {
    releaseCurrent()
    if (plantWriteLocks.get(key) === next) {
      plantWriteLocks.delete(key)
    }
  }
}

async function mutatePlants<T>(
  workspaceId: string | undefined,
  mutator: (plants: Plant[]) => Promise<T> | T,
): Promise<T> {
  return withPlantsWriteLock(workspaceId, async () => {
    const rawPlants = await loadPlantsRaw(workspaceId)
    const { plants } = await normalizeLoadedPlants(rawPlants, workspaceId)
    const result = await mutator(plants)
    await savePlants(plants, workspaceId)
    return result
  })
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
  )
}

// ---------------------------------------------------------------------------
// UI intents (drive contract) — a single per-workspace slot the client polls
// ---------------------------------------------------------------------------

const UI_VIEW_IDS = [
  'home',
  'all',
  'favorites',
  'needswater',
  'wishlist',
  'memorials',
  'unplaced',
  'room',
  'search',
  'plant',
] as const

type UiViewId = (typeof UI_VIEW_IDS)[number]

type UiIntent = {
  id: string
  view: UiViewId
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}

/** Model-readable catalog of every navigable surface in the client UI. */
const UI_VIEWS: {
  id: UiViewId
  name: string
  description: string
  params?: Record<string, string>
}[] = [
  {
    id: 'home',
    name: 'Home',
    description:
      'The folder grid the app opens on: tiles for All plants, Future Plants (wishlist), Favorites, one tile per room, and Unplaced. Takes no entityId and no params.',
  },
  {
    id: 'all',
    name: 'All plants',
    description:
      'Photo gallery grid of every owned plant in the collection. Takes no entityId and no params.',
  },
  {
    id: 'favorites',
    name: 'Favorites',
    description:
      'Gallery of the plants the user marked as favorites. Takes no entityId and no params.',
  },
  {
    id: 'needswater',
    name: 'Needs water',
    description:
      'Gallery of the plants that are due or overdue for watering right now. Takes no entityId and no params.',
  },
  {
    id: 'wishlist',
    name: 'Future Plants',
    description:
      'Gallery of wishlist plants the user saved to maybe get later; they are not part of the watering schedule. Takes no entityId and no params.',
  },
  {
    id: 'memorials',
    name: 'In memory of…',
    description:
      'A gentle archive of deceased plants. They keep their photos, journal, notes, and care history but no longer receive watering reminders. Takes no entityId and no params.',
  },
  {
    id: 'unplaced',
    name: 'Unplaced',
    description:
      'Gallery of owned plants that have no room assigned yet. Takes no entityId and no params.',
  },
  {
    id: 'room',
    name: 'Room',
    description:
      'Gallery of the plants in one room. Requires params.room set to the room name exactly as stored on the plants (the `room` field returned by plants.list), e.g. "Living room". No entityId.',
    params: {
      room: 'Room name, exactly as stored on the plants (see plants.list results).',
    },
  },
  {
    id: 'search',
    name: 'Search results',
    description:
      'Search the whole collection and show the matching plants. Requires params.query: free text matched against plant name, species, nickname, room, and location. No entityId.',
    params: { query: 'Free-text search string.' },
  },
  {
    id: 'plant',
    name: 'Plant detail',
    description:
      "Detail page for a single plant: large hero photo, watering status and actions, AI care guide, notes, and the growth-photo journal. Requires entityId: the plant id (from plants.list or plants.get). Optional params.fullscreen: when true, additionally opens a full-screen, photo-focused presentation of the plant's photo.",
    params: {
      fullscreen:
        "Optional boolean. When true, present the plant's photo full-screen on top of the detail page.",
    },
  },
]

function getUiIntentPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'ui-intent.json')
}

async function readUiIntent(workspaceId?: string): Promise<UiIntent | null> {
  await ensureDir(getAppDataDir(workspaceId))
  return readJson<UiIntent | null>(getUiIntentPath(workspaceId), null)
}

async function writeUiIntent(
  intent: UiIntent | null,
  workspaceId?: string,
): Promise<void> {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(getUiIntentPath(workspaceId), intent)
}

/** Queue a navigation intent. Single slot: the newest intent replaces any unacked one. */
async function setUiIntent(
  input: {
    view: UiViewId
    entityId?: string
    params?: Record<string, unknown>
  },
  workspaceId?: string,
): Promise<UiIntent> {
  const intent: UiIntent = {
    id: crypto.randomUUID(),
    view: input.view,
    ...(input.entityId ? { entityId: input.entityId } : {}),
    ...(input.params && Object.keys(input.params).length > 0
      ? { params: input.params }
      : {}),
    createdAt: new Date().toISOString(),
  }
  await writeUiIntent(intent, workspaceId)
  return intent
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const idCandidateSchema = z.object({
  name: z.string(),
  commonName: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

const identificationSchema = z.object({
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(['chat', 'manual', 'vision']).optional(),
  candidates: z.array(idCandidateSchema).optional(),
  confirmedAt: z.string().datetime().optional(),
  inaturalistUrl: z.string().optional(),
  wikipediaUrl: z.string().optional(),
})

const intervalDaysSchema = z.number().int().min(0).max(365)
const amountMlSchema = z.number().int().min(1).max(10_000)

const careWaterSchema = z.object({
  intervalDays: intervalDaysSchema.optional(),
  amountMl: amountMlSchema.optional(),
  method: z.string().optional(),
  notes: z.string().optional(),
})

const careFeedingSchema = z.object({
  intervalDays: intervalDaysSchema.optional(),
  fertilizer: z.string().optional(),
  season: z.string().optional(),
  notes: z.string().optional(),
})

const careSchema = z.object({
  summary: z.string().optional(),
  light: z.string().optional(),
  water: careWaterSchema.optional(),
  humidity: z.string().optional(),
  temperatureF: z
    .object({ min: z.number().optional(), max: z.number().optional() })
    .optional(),
  soil: z.string().optional(),
  feeding: careFeedingSchema.optional(),
  toxicity: z.string().optional(),
  commonProblems: z.array(z.string()).optional(),
  careMarkdown: z.string().optional(),
  generatedAt: z.string().datetime().optional(),
  model: z.string().optional(),
})

const ownershipStatusSchema = z.enum(['owned', 'wishlist'])
const lifeStatusSchema = z.enum(['active', 'deceased'])

const plantsListParamsSchema = z
  .object({
    room: z.string().optional(),
    status: ownershipStatusSchema.optional(),
    lifeStatus: lifeStatusSchema.optional(),
    query: z.string().optional(),
    favoriteOnly: z.boolean().optional(),
    dueOnly: z.boolean().optional(),
    includeDeleted: z.boolean().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional()

const plantGetParamsSchema = z.object({ id: z.string().min(1) })

const plantCreateParamsSchema = z.object({
  commonName: z.string().min(1),
  ownershipStatus: ownershipStatusSchema.optional(),
  scientificName: z.string().optional(),
  family: z.string().optional(),
  nickname: z.string().optional(),
  room: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  light: z.string().optional(),
  heroImagePath: z.string().optional(),
  waterIntervalDays: intervalDaysSchema.optional(),
  identification: identificationSchema.optional(),
  care: careSchema.optional(),
})

const plantIdentifyAndCreateParamsSchema = z.object({
  commonName: z.string().min(1),
  ownershipStatus: ownershipStatusSchema.optional(),
  scientificName: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  candidates: z.array(idCandidateSchema).optional(),
  heroImagePath: z.string().optional(),
  room: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
})

const plantIdentifyFromImageParamsSchema = z.object({
  heroImagePath: z.string().min(1),
  imagePath: z.string().min(1).optional(),
  ownershipStatus: ownershipStatusSchema.optional(),
  room: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
})

const plantUpdateParamsSchema = z.object({
  id: z.string().min(1),
  commonName: z.string().min(1).optional(),
  ownershipStatus: ownershipStatusSchema.optional(),
  lifeStatus: lifeStatusSchema.optional(),
  deceasedAt: z.string().datetime().optional(),
  memorialNote: z.string().max(2000).optional(),
  acquiredAt: z.string().datetime().optional(),
  scientificName: z.string().optional(),
  family: z.string().optional(),
  nickname: z.string().optional(),
  heroImageUrl: z.string().optional(),
  room: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  light: z.string().optional(),
  care: careSchema.optional(),
  waterIntervalDays: intervalDaysSchema.optional(),
  lastWateredAt: z.string().datetime().optional(),
  snoozeUntil: z.string().datetime().optional(),
  identification: identificationSchema.optional(),
  isFavorite: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
})

const plantWaterParamsSchema = z.object({
  id: z.string().min(1),
  at: z.string().datetime().optional(),
})

const plantWaterBodySchema = z.object({
  at: z.string().datetime().optional(),
})

const plantAddPhotoBodySchema = z.object({
  path: z.string().min(1),
  caption: z.string().optional(),
})

const plantFavoriteParamsSchema = z.object({
  id: z.string().min(1),
  isFavorite: z.boolean(),
})

const plantDeleteParamsSchema = z.object({ id: z.string().min(1) })

const plantGenerateCareParamsSchema = z.object({ id: z.string().min(1) })

const uiDescribeParamsSchema = z.object({}).optional()

const uiNavigateParamsSchema = z
  .object({
    view: z.enum(UI_VIEW_IDS),
    entityId: z.string().min(1).optional(),
    params: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.view === 'plant' && !value.entityId) {
      ctx.addIssue({
        code: 'custom',
        path: ['entityId'],
        message: 'entityId (the plant id) is required for the plant view.',
      })
    }
    if (value.view === 'room' && typeof value.params?.room !== 'string') {
      ctx.addIssue({
        code: 'custom',
        path: ['params', 'room'],
        message: 'params.room (the room name) is required for the room view.',
      })
    }
    if (value.view === 'search' && typeof value.params?.query !== 'string') {
      ctx.addIssue({
        code: 'custom',
        path: ['params', 'query'],
        message:
          'params.query (the search text) is required for the search view.',
      })
    }
  })

const uiShowPlantParamsSchema = z.object({
  plantId: z.string().min(1),
  fullscreen: z.boolean().optional(),
})

const uiShowGalleryParamsSchema = z.object({}).optional()

const uiReadParamsSchema = z
  .object({
    view: z.enum(UI_VIEW_IDS).optional(),
    entityId: z.string().min(1).optional(),
  })
  .optional()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filterPlants(
  plants: Plant[],
  params: z.infer<typeof plantsListParamsSchema>,
) {
  let result = [...plants]

  if (!params?.includeDeleted) {
    result = result.filter((plant) => !plant.isDeleted)
  }
  if (params?.favoriteOnly) {
    result = result.filter((plant) => plant.isFavorite)
  }
  if (params?.status) {
    result = result.filter(
      (plant) => (plant.ownershipStatus ?? 'owned') === params.status,
    )
  }
  if (params?.lifeStatus) {
    result = result.filter(
      (plant) => (plant.lifeStatus ?? 'active') === params.lifeStatus,
    )
  }
  if (params?.room?.trim()) {
    const room = params.room.toLowerCase()
    result = result.filter((plant) => plant.room?.toLowerCase() === room)
  }
  if (params?.dueOnly) {
    result = result.filter((plant) => {
      const state = dueState(plant)
      return state === 'overdue' || state === 'today'
    })
  }
  if (params?.query?.trim()) {
    const query = params.query.toLowerCase()
    result = result.filter((plant) =>
      [
        plant.commonName,
        plant.scientificName,
        plant.family,
        plant.nickname,
        plant.room,
        plant.location,
        plant.notes,
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

function applyCareDefaults(plant: Plant): void {
  // Wishlist and memorial plants keep care guidance but never enter the active watering queue.
  if (plant.ownershipStatus === 'wishlist' || plant.lifeStatus === 'deceased') {
    plant.waterIntervalDays = 0
    return
  }
  // If the effective interval is unset, seed it from the generated care.
  if (
    (plant.waterIntervalDays === undefined ||
      plant.waterIntervalDays === null) &&
    plant.care?.water?.intervalDays
  ) {
    plant.waterIntervalDays = plant.care.water.intervalDays
  }
}

// Start the growth journal with the plant's first photo, so the timeline isn't
// empty on day one.
function seedJournal(plant: Plant, now: string): void {
  if (plant.heroImageUrl && !(plant.photos && plant.photos.length > 0)) {
    plant.photos = [{ path: plant.heroImageUrl, addedAt: now }]
  }
}

async function normalizeHeroImagePath(
  heroImagePath: string | undefined,
  workspaceId?: string,
): Promise<string | undefined> {
  if (!heroImagePath?.trim()) return undefined
  if (heroImagePath.startsWith('/assets/')) {
    return heroImagePath.slice(1)
  }
  if (!heroImagePath.startsWith('/')) return heroImagePath
  try {
    const imported = await persistImagePath(workspaceId, heroImagePath)
    return imported.path
  } catch (error) {
    console.error('Failed to import hero image path:', error)
    return heroImagePath
  }
}

function imagePathForIdentification(
  params: z.infer<typeof plantIdentifyFromImageParamsSchema>,
  workspaceId?: string,
): string {
  const candidate = params.imagePath ?? params.heroImagePath
  if (candidate.startsWith('/')) return candidate
  return safePath(getAppDataDir(workspaceId), 'assets', basename(candidate))
}

// ---------------------------------------------------------------------------
// iNaturalist + Wikipedia identification confirmation (free, no key)
// ---------------------------------------------------------------------------

type InatMatch = {
  name: string
  commonName?: string
  photo?: string
  wikipediaUrl?: string
}

type WikiSummary = {
  title: string
  extract: string
  thumbnail?: string
}

async function fetchInaturalist(name: string): Promise<InatMatch[]> {
  try {
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(
      name,
    )}&per_page=6&rank=species,genus`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const body = (await res.json()) as {
      results?: Array<{
        name?: string
        preferred_common_name?: string
        default_photo?: { medium_url?: string }
        wikipedia_url?: string
      }>
    }
    const results = Array.isArray(body.results) ? body.results : []
    return results
      .filter((r) => typeof r.name === 'string')
      .map((r) => ({
        name: r.name as string,
        commonName: r.preferred_common_name,
        photo: r.default_photo?.medium_url,
        wikipediaUrl: r.wikipedia_url,
      }))
  } catch {
    return []
  }
}

async function fetchWikipedia(name: string): Promise<WikiSummary | undefined> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      name,
    )}`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return undefined
    const body = (await res.json()) as {
      title?: string
      extract?: string
      thumbnail?: { source?: string }
    }
    if (!body.title || !body.extract) return undefined
    return {
      title: body.title,
      extract: body.extract,
      thumbnail: body.thumbnail?.source,
    }
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Routes: health, commands, today
// ---------------------------------------------------------------------------

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'plants',
      port,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    { 'Cache-Control': 'no-store' },
  )
})

app.get('/api/moldable/commands', (c) => {
  return c.json({
    commands: [
      { id: 'add-plant', title: 'Add plant', icon: '🪴' },
      { id: 'water-due', title: 'Water due', icon: '💧' },
      { id: 'search', title: 'Search', icon: '🔍' },
      { id: 'refresh', title: 'Refresh', icon: '↻' },
    ],
  })
})

app.get('/api/moldable/today', async (c) => {
  // Build plain objects (the installed @moldable-ai/ui predates the Today*
  // types). Quiet by default: only surface watering that is due or overdue.
  const items: unknown[] = []
  const resume: unknown = null
  const generatedAt = new Date().toISOString()

  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const plants = (await loadPlants(workspaceId)).filter(
      (p) => !p.isDeleted && p.lifeStatus !== 'deceased',
    )
    void syncPlantNotificationSchedules(plants, workspaceId).catch((error) => {
      console.warn('Failed to reconcile watering notifications:', error)
    })
    const now = new Date()

    const due = plants.filter((p) => {
      const state = dueState(p, now)
      return state === 'overdue' || state === 'today'
    })

    if (due.length === 0) {
      return c.json({ items: [], resume: null, generatedAt })
    }

    if (due.length === 1) {
      const plant = due[0]!
      const state = dueState(plant, now)
      const subtitleParts = [plant.room, plant.location].filter(
        (part): part is string => Boolean(part && part.trim()),
      )
      if (state === 'overdue') {
        const nextDue = plant.lastWateredAt ?? plant.createdAt
        // Rough overdue-by in days based on the due date.
        const dueDate =
          new Date(nextDue).getTime() +
          (plant.waterIntervalDays ?? 0) * 24 * 60 * 60 * 1000
        const overdueDays = Math.max(
          1,
          Math.round((now.getTime() - dueDate) / (24 * 60 * 60 * 1000)),
        )
        subtitleParts.push(
          `overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`,
        )
      } else {
        subtitleParts.push('due today')
      }

      items.push({
        kind: 'timely',
        priority: 80,
        icon: '🪴',
        title: plant.commonName,
        subtitle: subtitleParts.join(' · '),
        actions: [
          {
            type: 'rpc',
            label: 'Water',
            method: 'plants.water',
            params: { id: plant.id },
          },
          { type: 'open-app', label: 'Open', deepLink: `plant:${plant.id}` },
        ],
      })
    } else {
      items.push({
        kind: 'threshold',
        priority: 75,
        icon: '🪴',
        title: `${due.length} plants need water`,
        subtitle: 'Tap to review and water them.',
        actions: [{ type: 'open-app', label: 'Open' }],
      })
    }
  } catch (error) {
    console.error('Failed to build Today view:', error)
    return c.json({ items: [], resume: null, generatedAt })
  }

  return c.json({ items, resume, generatedAt })
})

// ---------------------------------------------------------------------------
// Routes: UI intent (drive contract). The client polls the slot and acks.
// ---------------------------------------------------------------------------

app.get('/api/moldable/ui-intent', async (c) => {
  try {
    const workspaceId = getRpcWorkspaceId(c.req.raw)
    const intent = await readUiIntent(workspaceId)
    return c.json(intent, 200, { 'Cache-Control': 'no-store' })
  } catch (error) {
    console.error('Failed to read UI intent:', error)
    return c.json({ error: 'Failed to read UI intent' }, 500)
  }
})

app.delete('/api/moldable/ui-intent', async (c) => {
  try {
    const id = c.req.query('id')
    if (!id?.trim()) {
      return c.json({ error: 'Missing id query parameter' }, 400)
    }
    const workspaceId = getRpcWorkspaceId(c.req.raw)
    const intent = await readUiIntent(workspaceId)
    const cleared = intent?.id === id
    if (cleared) await writeUiIntent(null, workspaceId)
    return c.json({ ok: true, cleared })
  } catch (error) {
    console.error('Failed to ack UI intent:', error)
    return c.json({ error: 'Failed to ack UI intent' }, 500)
  }
})

// ---------------------------------------------------------------------------
// REST routes
// ---------------------------------------------------------------------------

app.get('/api/plants', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const includeDeleted = c.req.query('includeDeleted') === 'true'
    const plants = await loadPlants(workspaceId)
    const result = includeDeleted ? plants : plants.filter((p) => !p.isDeleted)
    return c.json(result)
  } catch (error) {
    console.error('Failed to read plants:', error)
    return c.json({ error: 'Failed to read plants' }, 500)
  }
})

app.post('/api/plants', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const params = plantCreateParamsSchema.parse(await c.req.json())
    const plant = await createPlant(params, workspaceId)
    return c.json(plant, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid plant', detail: error.flatten() }, 400)
    }
    console.error('Failed to create plant:', error)
    return c.json({ error: 'Failed to create plant' }, 500)
  }
})

app.post('/api/notifications/sync', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const plants = await loadPlants(workspaceId)
    await syncPlantNotificationSchedules(plants, workspaceId)
    return c.json({
      ok: true,
      scheduleCount: plants.filter(
        (plant) =>
          !plant.isDeleted &&
          plant.ownershipStatus !== 'wishlist' &&
          plant.lifeStatus !== 'deceased' &&
          Number.isInteger(plant.waterIntervalDays) &&
          (plant.waterIntervalDays ?? 0) > 0,
      ).length,
    })
  } catch (error) {
    console.error('Failed to sync watering notifications:', error)
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to sync watering notifications',
      },
      502,
    )
  }
})

app.post('/api/plants/identify-from-image', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const params = plantIdentifyFromImageParamsSchema.parse(await c.req.json())
    const imagePath = imagePathForIdentification(params, workspaceId)
    const identification = await identifyPlantImage(imagePath, workspaceId)
    if (!identification) {
      return c.json({ error: 'Failed to identify plant from image' }, 502)
    }

    const plant = await identifyAndCreatePlant(
      {
        commonName: identification.commonName,
        ownershipStatus: params.ownershipStatus,
        scientificName: identification.scientificName,
        confidence: identification.confidence,
        candidates: identification.candidates,
        heroImagePath: params.heroImagePath,
        room: params.room,
        location: params.location,
        notes: params.notes ?? identification.notes,
      },
      workspaceId,
      {
        family: identification.family,
        source: 'vision',
      },
    )
    return c.json(plant, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { error: 'Invalid image identification', detail: error.flatten() },
        400,
      )
    }
    console.error('Failed to identify plant image:', error)
    return c.json({ error: 'Failed to identify plant from image' }, 500)
  }
})

app.get('/api/plants/identify-confirm', async (c) => {
  const name = c.req.query('name')
  if (!name?.trim()) {
    return c.json({ inaturalist: [], wikipedia: undefined })
  }
  const [inaturalist, wikipedia] = await Promise.all([
    fetchInaturalist(name),
    fetchWikipedia(name),
  ])
  return c.json({ inaturalist, wikipedia })
})

app.get('/api/plants/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const plants = await loadPlants(workspaceId)
  const plant = plants.find((p) => p.id === c.req.param('id'))
  if (!plant) return c.json({ error: 'Plant not found' }, 404)
  return c.json(plant)
})

app.patch('/api/plants/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const params = plantUpdateParamsSchema.parse({
      ...(await c.req.json()),
      id: c.req.param('id'),
    })
    const plant = await updatePlant(params, workspaceId)
    if (!plant) return c.json({ error: 'Plant not found' }, 404)
    return c.json(plant)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid update', detail: error.flatten() }, 400)
    }
    console.error('Failed to update plant:', error)
    return c.json({ error: 'Failed to update plant' }, 500)
  }
})

app.delete('/api/plants/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const plant = await softDeletePlant(c.req.param('id'), workspaceId)
  if (!plant) return c.json({ error: 'Plant not found' }, 404)
  return c.json(plant)
})

app.post('/api/plants/:id/water', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const body = plantWaterBodySchema.parse(
      await c.req.json().catch(() => ({})),
    )
    const plant = await waterPlant(c.req.param('id'), body.at, workspaceId)
    if (!plant) return c.json({ error: 'Plant not found' }, 404)
    return c.json(plant)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { error: 'Invalid watering timestamp', detail: error.flatten() },
        400,
      )
    }
    console.error('Failed to water plant:', error)
    return c.json({ error: 'Failed to water plant' }, 500)
  }
})

app.post('/api/plants/:id/generate-care', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const plant = await regenerateCare(c.req.param('id'), workspaceId)
  if (!plant) return c.json({ error: 'Plant not found' }, 404)
  return c.json(plant)
})

app.post('/api/plants/:id/photos', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const body = plantAddPhotoBodySchema.parse(await c.req.json())
    const plant = await addPlantPhoto(
      c.req.param('id'),
      body.path,
      workspaceId,
      body.caption,
    )
    if (!plant) return c.json({ error: 'Plant not found' }, 404)
    return c.json(plant)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid photo', detail: error.flatten() }, 400)
    }
    console.error('Failed to add plant photo:', error)
    return c.json({ error: 'Failed to add photo' }, 500)
  }
})

// ---------------------------------------------------------------------------
// Shared mutation helpers (used by REST + RPC)
// ---------------------------------------------------------------------------

async function createPlant(
  params: z.infer<typeof plantCreateParamsSchema>,
  workspaceId?: string,
): Promise<Plant> {
  const now = new Date().toISOString()
  const heroImagePath = await normalizeHeroImagePath(
    params.heroImagePath,
    workspaceId,
  )
  const plant: Plant = {
    id: crypto.randomUUID(),
    commonName: params.commonName,
    ownershipStatus: params.ownershipStatus ?? 'owned',
    scientificName: params.scientificName,
    family: params.family,
    nickname: params.nickname,
    heroImageUrl: heroImagePath,
    room: params.ownershipStatus === 'wishlist' ? undefined : params.room,
    location: params.location,
    notes: params.notes,
    light: params.light,
    care: params.care,
    waterIntervalDays: params.waterIntervalDays,
    identification: params.identification,
    isFavorite: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }

  // Auto-generate care if it was not supplied. Tolerant of a missing AI server.
  if (!plant.care) {
    const care = await generateCareProfile(plant, workspaceId)
    if (care) plant.care = care
  }
  applyCareDefaults(plant)
  seedJournal(plant, now)

  return mutatePlants(workspaceId, (plants) => {
    plants.unshift(plant)
    return plant
  })
}

async function identifyAndCreatePlant(
  params: z.infer<typeof plantIdentifyAndCreateParamsSchema>,
  workspaceId?: string,
  options?: { family?: string; source?: 'chat' | 'manual' | 'vision' },
): Promise<Plant> {
  const now = new Date().toISOString()
  const heroImagePath = await normalizeHeroImagePath(
    params.heroImagePath,
    workspaceId,
  )
  const plant: Plant = {
    id: crypto.randomUUID(),
    commonName: params.commonName,
    ownershipStatus: params.ownershipStatus ?? 'owned',
    scientificName: params.scientificName,
    family: options?.family,
    heroImageUrl: heroImagePath,
    room: params.ownershipStatus === 'wishlist' ? undefined : params.room,
    location: params.location,
    notes: params.notes,
    identification: {
      source: options?.source ?? 'chat',
      confidence: params.confidence,
      candidates: params.candidates,
      // Auto-confirm only user-asserted IDs (chat/manual). A machine vision
      // guess stays unconfirmed so the detail view asks the user to verify.
      confirmedAt: options?.source === 'vision' ? undefined : now,
    },
    isFavorite: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }

  const care = await generateCareProfile(plant, workspaceId)
  if (care) plant.care = care
  applyCareDefaults(plant)
  seedJournal(plant, now)

  return mutatePlants(workspaceId, (plants) => {
    plants.unshift(plant)
    return plant
  })
}

async function updatePlant(
  params: z.infer<typeof plantUpdateParamsSchema>,
  workspaceId?: string,
): Promise<Plant | null> {
  const heroImageUrl =
    'heroImageUrl' in params
      ? await normalizeHeroImagePath(params.heroImageUrl, workspaceId)
      : undefined

  return mutatePlants(workspaceId, (plants) => {
    const index = plants.findIndex((p) => p.id === params.id)
    if (index === -1) return null

    const existing = plants[index]!
    const updated: Plant = {
      ...existing,
      ...('commonName' in params ? { commonName: params.commonName } : {}),
      ...('ownershipStatus' in params
        ? { ownershipStatus: params.ownershipStatus }
        : {}),
      ...('lifeStatus' in params ? { lifeStatus: params.lifeStatus } : {}),
      ...('deceasedAt' in params ? { deceasedAt: params.deceasedAt } : {}),
      ...('memorialNote' in params
        ? { memorialNote: params.memorialNote }
        : {}),
      ...('acquiredAt' in params ? { acquiredAt: params.acquiredAt } : {}),
      ...('scientificName' in params
        ? { scientificName: params.scientificName }
        : {}),
      ...('family' in params ? { family: params.family } : {}),
      ...('nickname' in params ? { nickname: params.nickname } : {}),
      ...('heroImageUrl' in params ? { heroImageUrl } : {}),
      ...('room' in params ? { room: params.room } : {}),
      ...('location' in params ? { location: params.location } : {}),
      ...('notes' in params ? { notes: params.notes } : {}),
      ...('light' in params ? { light: params.light } : {}),
      ...('care' in params ? { care: params.care } : {}),
      ...('waterIntervalDays' in params
        ? { waterIntervalDays: params.waterIntervalDays }
        : {}),
      ...('lastWateredAt' in params
        ? { lastWateredAt: params.lastWateredAt }
        : {}),
      ...('snoozeUntil' in params ? { snoozeUntil: params.snoozeUntil } : {}),
      ...('identification' in params
        ? { identification: params.identification }
        : {}),
      ...('isFavorite' in params ? { isFavorite: params.isFavorite } : {}),
      ...('isDeleted' in params ? { isDeleted: params.isDeleted } : {}),
      updatedAt: new Date().toISOString(),
    } as Plant

    if (updated.lifeStatus === 'deceased') {
      // Memorials keep their history and original care cadence, but reminders stop.
      updated.deceasedAt = updated.deceasedAt ?? updated.updatedAt
      updated.snoozeUntil = undefined
    } else if (
      existing.lifeStatus === 'deceased' &&
      updated.lifeStatus === 'active'
    ) {
      // Restoring a plant makes it care-active again without losing its memorial history.
      updated.deceasedAt = undefined
      updated.memorialNote = undefined
    }

    if (updated.ownershipStatus === 'wishlist') {
      // A future plant is reference material, not part of the active collection.
      updated.room = undefined
      updated.waterIntervalDays = 0
      updated.snoozeUntil = undefined
    } else if (
      existing.ownershipStatus === 'wishlist' &&
      updated.ownershipStatus === 'owned'
    ) {
      // Acquiring a wishlist plant starts care tracking from today. Restore the
      // care cadence that was intentionally disabled while it was on the list.
      updated.acquiredAt = updated.acquiredAt ?? updated.updatedAt
      if (!(updated.waterIntervalDays && updated.waterIntervalDays > 0)) {
        updated.waterIntervalDays = updated.care?.water?.intervalDays
      }
      if (/^wishlist\b/i.test(updated.location?.trim() ?? '')) {
        updated.location = undefined
      }
    }

    plants[index] = updated
    return updated
  })
}

async function softDeletePlant(
  id: string,
  workspaceId?: string,
): Promise<Plant | null> {
  return mutatePlants(workspaceId, (plants) => {
    const index = plants.findIndex((p) => p.id === id)
    if (index === -1) return null
    plants[index] = {
      ...plants[index]!,
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    }
    return plants[index]!
  })
}

async function waterPlant(
  id: string,
  at?: string,
  workspaceId?: string,
  expectedUpdatedAt?: string,
): Promise<Plant | null> {
  return mutatePlants(workspaceId, (plants) => {
    const index = plants.findIndex((p) => p.id === id)
    if (index === -1) return null
    const existing = plants[index]!
    if (existing.isDeleted) return null
    if (
      expectedUpdatedAt !== undefined &&
      existing.updatedAt !== expectedUpdatedAt
    )
      throw new Error(
        'This plant changed. Refresh the card before marking it watered.',
      )
    if (
      existing.ownershipStatus === 'wishlist' ||
      existing.lifeStatus === 'deceased'
    )
      return null
    const wateredAt = at ?? new Date().toISOString()
    const history = [...(existing.waterHistory ?? []), { at: wateredAt }].slice(
      -WATER_HISTORY_CAP,
    )
    plants[index] = {
      ...existing,
      lastWateredAt: wateredAt,
      waterHistory: history,
      snoozeUntil: undefined, // a real watering resets any "still moist" skip
      updatedAt: new Date(
        Math.max(Date.now(), (Date.parse(existing.updatedAt) || 0) + 1),
      ).toISOString(),
    }
    return plants[index]!
  })
}

/**
 * Append a photo to the plant's growth journal and make it the current hero, so
 * the portrait always shows the latest look. The path is a workspace-relative
 * assets path produced by the media upload route.
 */
async function addPlantPhoto(
  id: string,
  sourcePath: string,
  workspaceId?: string,
  caption?: string,
): Promise<Plant | null> {
  const path = await normalizeHeroImagePath(sourcePath, workspaceId)
  if (!path) return null
  return mutatePlants(workspaceId, (plants) => {
    const index = plants.findIndex((p) => p.id === id)
    if (index === -1) return null
    const existing = plants[index]!
    const now = new Date().toISOString()
    const photos = [
      ...(existing.photos ?? []),
      { path, addedAt: now, ...(caption?.trim() ? { caption } : {}) },
    ]
    plants[index] = {
      ...existing,
      photos,
      heroImageUrl: path, // newest photo becomes the portrait
      updatedAt: now,
    }
    return plants[index]!
  })
}

async function regenerateCare(
  id: string,
  workspaceId?: string,
): Promise<Plant | null> {
  const plants = await loadPlants(workspaceId)
  const index = plants.findIndex((p) => p.id === id)
  if (index === -1) return null
  const existing = plants[index]!
  const care = await generateCareProfile(existing, workspaceId)
  return mutatePlants(workspaceId, (latestPlants) => {
    const latestIndex = latestPlants.findIndex((p) => p.id === id)
    if (latestIndex === -1) return null
    const latest = latestPlants[latestIndex]!
    if (!care) {
      // AI server unavailable — leave existing care, just touch updatedAt.
      latestPlants[latestIndex] = {
        ...latest,
        updatedAt: new Date().toISOString(),
      }
      return latestPlants[latestIndex]!
    }
    const updated: Plant = {
      ...latest,
      care,
      updatedAt: new Date().toISOString(),
    }
    applyCareDefaults(updated)
    latestPlants[latestIndex] = updated
    return updated
  })
}

// ---------------------------------------------------------------------------
// Speakable text (drive contract plants.ui.read) — plain prose, no markup
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

/** Strip markdown/markup so the text reads cleanly out loud. */
function speakablePlain(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_`#>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function ensureSentence(text: string): string {
  if (!text) return text
  return /[.!?]$/.test(text) ? text : `${text}.`
}

function joinSpeakableList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function countPhrase(count: number, noun: string): string {
  if (count === 1) return `one ${noun}`
  return `${count} ${noun}s`
}

function speakableName(plant: Plant): string {
  return plant.nickname?.trim() || plant.commonName
}

function wholeDaysBetween(fromMs: number, toMs: number): number {
  return Math.round((toMs - fromMs) / DAY_MS)
}

function needsWaterNow(plant: Plant, now: Date): boolean {
  const state = dueState(plant, now)
  return state === 'overdue' || state === 'today'
}

function speakableWateringStatus(plant: Plant, now: Date): string {
  if (plant.lifeStatus === 'deceased') {
    return 'It is remembered in the memorial collection, so watering reminders are paused.'
  }
  if (plant.ownershipStatus === 'wishlist') {
    return 'It is on the future plants wishlist, so it has no watering schedule yet.'
  }

  const sentences: string[] = []
  if (plant.lastWateredAt) {
    const days = wholeDaysBetween(
      new Date(plant.lastWateredAt).getTime(),
      now.getTime(),
    )
    if (days <= 0) sentences.push('It was last watered today.')
    else if (days === 1) sentences.push('It was last watered yesterday.')
    else sentences.push(`It was last watered ${days} days ago.`)
  } else {
    sentences.push('It has no watering recorded yet.')
  }

  const due = nextDueAt(plant, now)
  const state = dueState(plant, now)
  if (!due || state === 'unknown') {
    sentences.push('It has no watering schedule.')
  } else if (state === 'overdue') {
    const days = Math.max(
      1,
      wholeDaysBetween(new Date(due).getTime(), now.getTime()),
    )
    sentences.push(
      `Watering is overdue by ${days === 1 ? 'one day' : `${days} days`}.`,
    )
  } else if (state === 'today') {
    sentences.push('Watering is due today.')
  } else {
    const days = Math.max(
      1,
      wholeDaysBetween(now.getTime(), new Date(due).getTime()),
    )
    sentences.push(
      `The next watering is due in ${days === 1 ? 'one day' : `${days} days`}.`,
    )
  }
  return sentences.join(' ')
}

function plantSpeakableText(plant: Plant, now: Date): string {
  const sentences: string[] = []

  let intro = plant.nickname?.trim()
    ? `${plant.nickname.trim()} is a ${plant.commonName}`
    : `This is ${plant.commonName}`
  if (plant.scientificName?.trim()) {
    intro += `, scientific name ${plant.scientificName.trim()}`
  }
  const where = [plant.room, plant.location]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
  if (where.length > 0) intro += `, located in ${where.join(', ')}`
  sentences.push(`${intro}.`)

  if (plant.lifeStatus === 'deceased') {
    sentences.push('It is preserved in the In memory of collection.')
  } else if (plant.ownershipStatus === 'wishlist') {
    sentences.push(
      'It is saved on the future plants wishlist and not in the collection yet.',
    )
  }
  if (plant.isFavorite) sentences.push('It is one of your favorites.')

  const careSummary = plant.care?.summary?.trim()
  if (careSummary) sentences.push(ensureSentence(speakablePlain(careSummary)))

  sentences.push(speakableWateringStatus(plant, now))
  return sentences.join(' ')
}

function collectionSpeakableText(live: Plant[], now: Date): string {
  if (live.length === 0) {
    return 'The plant collection is empty. Add a plant to get started.'
  }

  const active = live.filter((p) => p.lifeStatus !== 'deceased')
  const memorials = live.filter((p) => p.lifeStatus === 'deceased')
  const owned = active.filter((p) => p.ownershipStatus !== 'wishlist')
  const wishlist = active.filter((p) => p.ownershipStatus === 'wishlist')
  const sentences: string[] = []

  if (owned.length > 0) {
    sentences.push(`The collection has ${countPhrase(owned.length, 'plant')}.`)
    const rooms = [
      ...new Set(
        owned
          .map((p) => p.room?.trim())
          .filter((room): room is string => Boolean(room)),
      ),
    ]
    if (rooms.length > 0) {
      sentences.push(`They are spread across ${joinSpeakableList(rooms)}.`)
    }
    const due = owned.filter((p) => needsWaterNow(p, now))
    if (due.length === 0) {
      sentences.push('No plants need water right now.')
    } else if (due.length <= 4) {
      sentences.push(
        `${joinSpeakableList(due.map(speakableName))} ${
          due.length === 1 ? 'needs' : 'need'
        } water now.`,
      )
    } else {
      sentences.push(
        `${due.length} plants need water now, including ${joinSpeakableList(
          due.slice(0, 3).map(speakableName),
        )}.`,
      )
    }
    const favorites = owned.filter((p) => p.isFavorite)
    if (favorites.length > 0) {
      sentences.push(
        `${countPhrase(favorites.length, 'plant')} ${
          favorites.length === 1 ? 'is' : 'are'
        } marked as favorites.`,
      )
    }
  }

  if (wishlist.length > 0) {
    sentences.push(
      `The future plants wishlist has ${countPhrase(wishlist.length, 'plant')}.`,
    )
  }
  if (memorials.length > 0) {
    sentences.push(
      `The In memory of collection remembers ${countPhrase(memorials.length, 'plant')}.`,
    )
  }

  return sentences.join(' ')
}

function viewSpeakableText(
  live: Plant[],
  view: UiViewId | undefined,
  entityId: string | undefined,
  now: Date,
): string {
  const active = live.filter((p) => p.lifeStatus !== 'deceased')
  const owned = active.filter((p) => p.ownershipStatus !== 'wishlist')

  switch (view) {
    case 'favorites': {
      const favorites = owned.filter((p) => p.isFavorite)
      if (favorites.length === 0)
        return 'No plants are marked as favorites yet.'
      return `You have ${countPhrase(favorites.length, 'favorite plant')}: ${joinSpeakableList(favorites.map(speakableName))}.`
    }
    case 'needswater': {
      const due = owned.filter((p) => needsWaterNow(p, now))
      if (due.length === 0) return 'No plants need water right now.'
      return `${countPhrase(due.length, 'plant')} ${
        due.length === 1 ? 'needs' : 'need'
      } water now: ${joinSpeakableList(due.map(speakableName))}.`
    }
    case 'wishlist': {
      const wishlist = active.filter((p) => p.ownershipStatus === 'wishlist')
      if (wishlist.length === 0) return 'The future plants wishlist is empty.'
      return `The future plants wishlist has ${countPhrase(wishlist.length, 'plant')}: ${joinSpeakableList(wishlist.map(speakableName))}.`
    }
    case 'memorials': {
      const memorials = live.filter((p) => p.lifeStatus === 'deceased')
      if (memorials.length === 0) return 'The In memory of collection is empty.'
      return `The In memory of collection remembers ${countPhrase(memorials.length, 'plant')}: ${joinSpeakableList(memorials.map(speakableName))}.`
    }
    case 'unplaced': {
      const unplaced = owned.filter((p) => !p.room?.trim())
      if (unplaced.length === 0) return 'Every plant has a room assigned.'
      return `${countPhrase(unplaced.length, 'plant')} ${
        unplaced.length === 1 ? 'has' : 'have'
      } no room assigned: ${joinSpeakableList(unplaced.map(speakableName))}.`
    }
    case 'room': {
      const room = entityId?.trim()
      if (!room) return collectionSpeakableText(live, now)
      const inRoom = owned.filter(
        (p) => p.room?.trim().toLowerCase() === room.toLowerCase(),
      )
      if (inRoom.length === 0) return `There are no plants in ${room}.`
      const due = inRoom.filter((p) => needsWaterNow(p, now))
      let text = `${room} has ${countPhrase(inRoom.length, 'plant')}: ${joinSpeakableList(inRoom.map(speakableName))}.`
      if (due.length > 0) {
        text += ` ${joinSpeakableList(due.map(speakableName))} ${
          due.length === 1 ? 'needs' : 'need'
        } water.`
      }
      return text
    }
    default:
      return collectionSpeakableText(live, now)
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// RPC
// ---------------------------------------------------------------------------

function notFound(c: Context, id: string) {
  return c.json(
    {
      ok: false,
      error: {
        code: 'plant_not_found',
        message: `Plant ${id} was not found.`,
      },
    },
    404,
  )
}

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = rpcRequestSchema.parse(await c.req.json())
    if (body.method.startsWith('plants.cards.')) {
      return c.json({
        ok: true,
        result: await handlePlantCard(body.method, body.params, {
          load: () => loadPlants(workspaceId),
          water: (id, revision) =>
            waterPlant(id, undefined, workspaceId, revision),
        }),
      })
    }

    if (body.method === 'plants.native.read') {
      const params = nativeReadParamsSchema.parse(body.params)
      const plants = await loadPlants(workspaceId)
      const live = plants.filter((plant) => !plant.isDeleted)
      const now = new Date()
      if (params.route === 'home') {
        return c.json({ ok: true, result: projectNativeHome(live, now) })
      }
      if (params.route === 'collection') {
        return c.json({
          ok: true,
          result: projectNativeCollection(live, params, now),
        })
      }
      const plant = plants.find(
        (candidate) => candidate.id === params.id && !candidate.isDeleted,
      )
      if (!plant) return notFound(c, params.id!)
      return c.json({
        ok: true,
        result: projectNativeDetail(plant, now, params.route),
      })
    }

    if (body.method === 'plants.native.mutate') {
      const params = nativeMutateParamsSchema.parse(body.params)
      const plant =
        params.action === 'water'
          ? await waterPlant(params.id, params.at, workspaceId)
          : params.action === 'favorite'
            ? await updatePlant(
                { id: params.id, isFavorite: params.isFavorite },
                workspaceId,
              )
            : (await loadPlants(workspaceId)).find(
                (candidate) =>
                  candidate.id === params.id && !candidate.isDeleted,
              )
      if (!plant) return notFound(c, params.id)
      if (params.action === 'refreshMemorialEulogy') {
        if (plant.lifeStatus !== 'deceased') {
          return c.json(
            {
              ok: false,
              error: {
                code: 'not_a_memorial',
                message: 'Only memorial plants have epitaphs.',
              },
            },
            400,
          )
        }
        return c.json({ ok: true, result: { id: plant.id } })
      }
      if (params.action === 'water') {
        return c.json({
          ok: true,
          result: {
            ok: true,
            id: plant.id,
            wateredAt: plant.lastWateredAt,
            notices: [
              {
                title: 'Watering recorded',
                message: `${plant.commonName} is up to date.`,
              },
            ],
          },
        })
      }
      return c.json({
        ok: true,
        result: {
          ok: true,
          id: plant.id,
          isFavorite: plant.isFavorite,
          notices: [
            {
              title: plant.isFavorite
                ? 'Added to favorites'
                : 'Removed from favorites',
              message: plant.commonName,
            },
          ],
        },
      })
    }

    if (body.method === 'plants.native.acquire') {
      const params = nativeAcquireParamsSchema.parse(body.params)
      const plant = await updatePlant(
        { id: params.id, ownershipStatus: 'owned' },
        workspaceId,
      )
      if (!plant) return notFound(c, params.id)
      return c.json({
        ok: true,
        result: {
          ok: true,
          id: plant.id,
          ownershipStatus: plant.ownershipStatus,
          notices: [
            {
              title: 'Added to your plants',
              message: `${plant.commonName} now follows your care schedule.`,
            },
          ],
        },
      })
    }

    if (body.method === 'plants.native.generateCare') {
      const params = nativeGenerateCareParamsSchema.parse(body.params)
      const previous = (await loadPlants(workspaceId)).find(
        (candidate) => candidate.id === params.id && !candidate.isDeleted,
      )
      if (!previous) return notFound(c, params.id)
      const plant = await regenerateCare(params.id, workspaceId)
      if (!plant) return notFound(c, params.id)
      if (
        !plant.care?.generatedAt ||
        plant.care.generatedAt === previous.care?.generatedAt
      ) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'care_generation_unavailable',
              message: 'A fresh care guide could not be generated right now.',
            },
          },
          502,
        )
      }
      return c.json({
        ok: true,
        result: {
          ok: true,
          id: plant.id,
          notices: [
            {
              title: 'Care guide updated',
              message: `Fresh guidance is ready for ${plant.commonName}.`,
            },
          ],
        },
      })
    }

    if (body.method === 'plants.native.create') {
      const params = nativeCreateParamsSchema.parse(body.params)
      const plant = await createPlant(
        {
          commonName: params.commonName,
          ownershipStatus: params.ownershipStatus,
          scientificName: params.scientificName,
          room: params.ownershipStatus === 'owned' ? params.room : undefined,
          identification: {
            source: 'manual',
            confirmedAt: new Date().toISOString(),
          },
        },
        workspaceId,
      )
      return c.json({
        ok: true,
        result: {
          ok: true,
          id: plant.id,
          notices: [
            {
              title:
                plant.ownershipStatus === 'wishlist'
                  ? 'Future plant saved'
                  : 'Plant added',
              message: plant.commonName,
            },
          ],
        },
      })
    }

    if (body.method === 'plants.native.update') {
      const params = nativeUpdateParamsSchema.parse(body.params)
      const plant = await updatePlant(
        {
          id: params.id,
          commonName: params.commonName,
          scientificName: params.scientificName,
          room: params.room,
          location: params.location,
          notes: params.notes,
          waterIntervalDays: params.waterIntervalDays,
        },
        workspaceId,
      )
      if (!plant) return notFound(c, params.id)
      return c.json({
        ok: true,
        result: {
          ok: true,
          id: plant.id,
          notices: [{ title: 'Plant updated', message: plant.commonName }],
        },
      })
    }

    if (body.method === 'plants.native.snooze') {
      const params = nativeSnoozeParamsSchema.parse(body.params)
      const snoozeUntil = new Date(
        Date.now() + params.days * 24 * 60 * 60 * 1_000,
      ).toISOString()
      const plant = await updatePlant(
        { id: params.id, snoozeUntil },
        workspaceId,
      )
      if (!plant) return notFound(c, params.id)
      return c.json({
        ok: true,
        result: {
          ok: true,
          id: plant.id,
          snoozeUntil,
          notices: [
            {
              title: 'Watering reminder moved',
              message: `Check ${plant.commonName} again in ${params.days} days.`,
            },
          ],
        },
      })
    }

    if (body.method === 'plants.native.setHero') {
      const params = nativeSetHeroParamsSchema.parse(body.params)
      const existing = (await loadPlants(workspaceId)).find(
        (candidate) => candidate.id === params.id && !candidate.isDeleted,
      )
      if (!existing) return notFound(c, params.id)
      const knownPaths = new Set([
        ...(existing.photos ?? []).map((photo) => photo.path),
        ...(existing.heroImageUrl ? [existing.heroImageUrl] : []),
      ])
      if (!knownPaths.has(params.path)) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'unknown_plant_photo',
              message: "That photo is not part of this plant's journal.",
            },
          },
          400,
        )
      }
      const plant = await updatePlant(
        { id: params.id, heroImageUrl: params.path },
        workspaceId,
      )
      if (!plant) return notFound(c, params.id)
      return c.json({
        ok: true,
        result: {
          ok: true,
          id: plant.id,
          notices: [{ title: 'Portrait updated', message: plant.commonName }],
        },
      })
    }

    if (body.method === 'plants.native.confirmIdentification') {
      const params = nativeConfirmIdentificationParamsSchema.parse(body.params)
      const existing = (await loadPlants(workspaceId)).find(
        (candidate) => candidate.id === params.id && !candidate.isDeleted,
      )
      if (!existing) return notFound(c, params.id)
      const allowedNames = new Set([
        existing.scientificName?.trim(),
        ...(existing.identification?.candidates ?? []).map((candidate) =>
          candidate.name.trim(),
        ),
      ])
      if (!allowedNames.has(params.scientificName)) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'unknown_identification_candidate',
              message:
                'Choose the current identification or one of its candidates.',
            },
          },
          400,
        )
      }
      const plant = await updatePlant(
        {
          id: params.id,
          scientificName: params.scientificName,
          commonName: params.commonName ?? existing.commonName,
          identification: {
            ...existing.identification,
            confirmedAt: new Date().toISOString(),
          },
        },
        workspaceId,
      )
      if (!plant) return notFound(c, params.id)
      return c.json({
        ok: true,
        result: {
          ok: true,
          id: plant.id,
          notices: [
            {
              title: 'Identification confirmed',
              message: `${plant.commonName} · ${plant.scientificName}`,
            },
          ],
        },
      })
    }

    if (body.method === 'plants.native.delete') {
      const params = nativeDeleteParamsSchema.parse(body.params)
      const plant = await softDeletePlant(params.id, workspaceId)
      if (!plant) return notFound(c, params.id)
      return c.json({
        ok: true,
        result: {
          ok: true,
          id: plant.id,
          notices: [{ title: 'Plant deleted', message: plant.commonName }],
        },
      })
    }

    if (body.method === 'plants.list') {
      const params = plantsListParamsSchema.parse(body.params)
      const plants = await loadPlants(workspaceId)
      return c.json({ ok: true, result: filterPlants(plants, params) })
    }

    if (body.method === 'plants.get') {
      const params = plantGetParamsSchema.parse(body.params)
      const plants = await loadPlants(workspaceId)
      const plant = plants.find((p) => p.id === params.id)
      if (!plant) return notFound(c, params.id)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.create') {
      const params = plantCreateParamsSchema.parse(body.params)
      const plant = await createPlant(params, workspaceId)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.identifyAndCreate') {
      const params = plantIdentifyAndCreateParamsSchema.parse(body.params)
      const plant = await identifyAndCreatePlant(params, workspaceId)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.update') {
      const params = plantUpdateParamsSchema.parse(body.params)
      const plant = await updatePlant(params, workspaceId)
      if (!plant) return notFound(c, params.id)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.water') {
      const params = plantWaterParamsSchema.parse(body.params)
      const plant = await waterPlant(params.id, params.at, workspaceId)
      if (!plant) return notFound(c, params.id)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.generateCare') {
      const params = plantGenerateCareParamsSchema.parse(body.params)
      const plant = await regenerateCare(params.id, workspaceId)
      if (!plant) return notFound(c, params.id)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.favorite') {
      const params = plantFavoriteParamsSchema.parse(body.params)
      const plant = await updatePlant(
        { id: params.id, isFavorite: params.isFavorite },
        workspaceId,
      )
      if (!plant) return notFound(c, params.id)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.delete') {
      const params = plantDeleteParamsSchema.parse(body.params)
      const plant = await softDeletePlant(params.id, workspaceId)
      if (!plant) return notFound(c, params.id)
      return c.json({ ok: true, result: plant })
    }

    if (body.method === 'plants.ui.describe') {
      uiDescribeParamsSchema.parse(body.params)
      return c.json({ ok: true, result: { views: UI_VIEWS } })
    }

    if (body.method === 'plants.ui.navigate') {
      const params = uiNavigateParamsSchema.parse(body.params)
      if (params.view === 'plant' && params.entityId) {
        const plants = await loadPlants(workspaceId)
        const exists = plants.some(
          (p) => p.id === params.entityId && !p.isDeleted,
        )
        if (!exists) return notFound(c, params.entityId)
      }
      const intent = await setUiIntent(params, workspaceId)
      return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
    }

    if (body.method === 'plants.ui.showPlant') {
      const params = uiShowPlantParamsSchema.parse(body.params)
      const plants = await loadPlants(workspaceId)
      const plant = plants.find((p) => p.id === params.plantId && !p.isDeleted)
      if (!plant) return notFound(c, params.plantId)
      const intent = await setUiIntent(
        {
          view: 'plant',
          entityId: plant.id,
          ...(params.fullscreen ? { params: { fullscreen: true } } : {}),
        },
        workspaceId,
      )
      return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
    }

    if (body.method === 'plants.ui.showGallery') {
      uiShowGalleryParamsSchema.parse(body.params)
      const intent = await setUiIntent({ view: 'all' }, workspaceId)
      return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
    }

    if (body.method === 'plants.ui.read') {
      const params = uiReadParamsSchema.parse(body.params) ?? {}
      const plants = await loadPlants(workspaceId)
      const live = plants.filter((p) => !p.isDeleted)
      const now = new Date()

      if (params.entityId && params.view !== 'room') {
        const plant = live.find((p) => p.id === params.entityId)
        if (!plant) return notFound(c, params.entityId)
        return c.json({
          ok: true,
          result: { text: plantSpeakableText(plant, now) },
        })
      }

      return c.json({
        ok: true,
        result: {
          text: viewSpeakableText(live, params.view, params.entityId, now),
        },
      })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Plants does not expose ${body.method}.`,
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
            message: 'Plants received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    console.error('Plants RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'plants_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Plants could not complete the request.',
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
