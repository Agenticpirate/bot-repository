import {
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { composeArtifactHtml, escapeHtml } from '../shared/render'
import {
  MAX_RUNTIME_STATE_BYTES,
  isValidRuntimeStateNamespace,
} from '../shared/runtime-state'
import {
  getTemplate,
  getTemplateDetail,
  listTemplates,
  templateTheme,
} from '../shared/templates'
import type { Artifact, PublishedInfo } from '../shared/types'
import {
  ARTIFACTS_UI_VIEWS,
  type ArtifactsUiIntent,
  type ArtifactsUiView,
} from '../shared/ui-intent'
import { createPublishBundle } from './hosting/bundle'
import { contentTypeFor } from './hosting/content-type'
import { HostingError } from './hosting/errors'
import { hostingRoutes } from './hosting/routes'
import { editArtifactImage, generateArtifactImage } from './images'
import {
  getWorkspaceId,
  isValidWorkspaceId,
  jsonError,
  rawWorkspaceId,
} from './moldable'
import type { JsonErrorStatus } from './moldable'
import {
  OperationError,
  addSlide,
  applyPublishResult,
  applyTemplate,
  createArtifact,
  failPublish,
  moveSlide,
  removeArtifact,
  removeSlide,
  reorderSlides,
  replaceArtifact,
  replaceArtifactText,
  requestPublish,
  revertArtifact,
  setImageStyle,
  setPage,
  unpublish,
  updateArtifact,
  updateSlide,
} from './operations'
import {
  deleteRuntimeState,
  getArtifact,
  listArtifacts,
  listAssets,
  listVersions,
  readAsset,
  readRuntimeState,
  readTemplateAsset,
  readTemplateThumb,
  summarize,
  writeAsset,
  writeRuntimeState,
} from './store'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'

type ZodParser<T> = {
  strict(): ZodParser<T>
  parse(value: unknown): T
  optional(): ZodParser<T | undefined>
}
type ZodStringParser = ZodParser<string> & {
  trim(): ZodStringParser
  min(value: number): ZodStringParser
  max(value: number): ZodStringParser
}
type ZodShape = Record<string, ZodParser<unknown>>
type ParsedShape<T extends ZodShape> = {
  [K in keyof T]: T[K] extends ZodParser<infer V> ? V : never
}
type ZodArrayParser<T> = ZodParser<T[]> & {
  max(value: number): ZodArrayParser<T>
}
type ZodApi = {
  array<T>(schema: ZodParser<T>): ZodArrayParser<T>
  boolean(): ZodParser<boolean>
  string(): ZodStringParser
  unknown(): ZodParser<unknown>
  enum<const T extends readonly [string, ...string[]]>(
    values: T,
  ): ZodParser<T[number]>
  object<T extends ZodShape>(shape: T): ZodParser<ParsedShape<T>>
  record<T>(
    key: ZodParser<string>,
    value: ZodParser<T>,
  ): ZodParser<Record<string, T>>
}

// zod is supplied by @moldable-ai/ui. Resolve it from that package so the
// frozen app dependency manifests remain byte-identical.
const requireFromMoldableUi = createRequire(
  import.meta.resolve('@moldable-ai/ui'),
)
const { z } = requireFromMoldableUi('zod') as { z: ZodApi }

export const app = new Hono()

// Allow the Moldable desktop shell to check app status (health) cross-origin.
app.use('/api/moldable/*', cors())

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
const APP_ID = process.env.MOLDABLE_APP_ID ?? 'artifacts'
const CLIENT_REQUEST_HEADER = 'x-artifacts-client'

app.use('/api/*', async (c, next) => {
  const rawWorkspace = rawWorkspaceId(c)
  if (rawWorkspace && !isValidWorkspaceId(rawWorkspace)) {
    return jsonError(c, 'Invalid workspace id', 400)
  }

  const method = c.req.method.toUpperCase()
  const isRead = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
  const isHostEndpoint = c.req.path.startsWith('/api/moldable/')
  if (
    !isRead &&
    !isHostEndpoint &&
    c.req.header(CLIENT_REQUEST_HEADER) !== '1'
  ) {
    return jsonError(c, 'Missing Artifacts client request header', 403)
  }

  await next()
})

app.route('/api', hostingRoutes)

app.get('/api/moldable/health', (c) => {
  return c.json({ appId: APP_ID, status: 'ok' })
})

app.get('/api/moldable/commands', (c) => {
  return c.json({
    commands: [
      {
        id: 'artifacts.new',
        label: 'New artifact',
        shortcut: 'n',
        icon: 'plus',
        group: 'Artifacts',
        action: {
          type: 'message',
          command: 'artifacts.new',
          payload: {},
        },
      },
    ],
  })
})

class DriveError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: 400 | 404 | 422 = 400,
  ) {
    super(message)
  }
}

const ARTIFACTS_UI_DESCRIPTIONS = [
  {
    id: 'library',
    name: 'Artifact library',
    description:
      'The grid of page and slide-deck artifacts in the active workspace. Takes no entityId.',
  },
  {
    id: 'artifact',
    name: 'Artifact editor and preview',
    description:
      'Open one page or slide deck. entityId is an artifact id from artifacts.list.',
    params: {
      slideIndex:
        'For decks, optionally select a zero-based slide index after opening.',
    },
  },
  {
    id: 'presentation',
    name: 'Deck presentation',
    description:
      'Open a slide deck and enter its full-screen presentation overlay. entityId must identify a deck artifact.',
    params: {
      slideIndex: 'Optional zero-based starting slide index.',
    },
  },
] satisfies Array<{
  id: ArtifactsUiView
  name: string
  description: string
  params?: Record<string, string>
}>

const emptyParamsSchema = z.object({})
const uiNavigateSchema = z.object({
  view: z.enum(ARTIFACTS_UI_VIEWS),
  entityId: z.string().trim().min(1).max(160).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
})
const artifactIdSchema = z.object({
  artifactId: z.string().trim().min(1).max(160),
})
const uiReadSchema = z.object({
  view: z.enum(ARTIFACTS_UI_VIEWS).optional(),
  entityId: z.string().trim().min(1).max(160).optional(),
})
const nativeReadSchema = z.object({
  route: z.enum(['library', 'artifact', 'versions']),
  id: z.string().trim().min(1).max(160).optional(),
})

function uiIntentPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'ui-intent.json')
}

function isArtifactsUiView(value: unknown): value is ArtifactsUiView {
  return (
    typeof value === 'string' &&
    (ARTIFACTS_UI_VIEWS as readonly string[]).includes(value)
  )
}

async function readUiIntent(
  workspaceId?: string,
): Promise<ArtifactsUiIntent | null> {
  const intent = await readJson<ArtifactsUiIntent | null>(
    uiIntentPath(workspaceId),
    null,
  )
  if (
    !intent ||
    typeof intent.id !== 'string' ||
    !isArtifactsUiView(intent.view)
  ) {
    return null
  }
  return intent
}

async function writeUiIntent(
  workspaceId: string | undefined,
  target: Omit<ArtifactsUiIntent, 'id' | 'createdAt'>,
): Promise<ArtifactsUiIntent> {
  const intent: ArtifactsUiIntent = {
    ...target,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  }
  await writeJson(uiIntentPath(workspaceId), intent)
  return intent
}

async function validateArtifactTarget(
  workspaceId: string | undefined,
  view: ArtifactsUiView,
  entityId?: string,
): Promise<Artifact | undefined> {
  if (view === 'library') {
    if (entityId) {
      throw new DriveError(
        'unexpected_entity_id',
        'The library view does not take an entityId.',
      )
    }
    return undefined
  }
  if (!entityId) {
    throw new DriveError(
      'entity_id_required',
      `The ${view} view requires an artifact entityId.`,
    )
  }
  const artifact = await getArtifact(workspaceId, entityId)
  if (!artifact) {
    throw new DriveError('artifact_not_found', `No artifact: ${entityId}`, 404)
  }
  if (view === 'presentation' && artifact.kind !== 'deck') {
    throw new DriveError(
      'artifact_not_presentable',
      `Artifact ${entityId} is a page, not a slide deck.`,
      422,
    )
  }
  return artifact
}

function visibleText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function readableArtifact(artifact: Artifact) {
  const base = {
    id: artifact.id,
    title: artifact.title,
    subtitle: artifact.subtitle ?? null,
    kind: artifact.kind,
    updatedAt: artifact.updatedAt,
  }
  if (artifact.kind === 'page') {
    return {
      ...base,
      content: visibleText(artifact.page?.html ?? ''),
    }
  }
  return {
    ...base,
    slides: artifact.slides.map((slide, index) => ({
      index,
      id: slide.id,
      name: slide.name,
      content: visibleText(slide.bodyHtml),
      notes: slide.notes ?? '',
    })),
  }
}

function isZodError(error: unknown): error is { issues: unknown[] } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'issues' in error &&
    Array.isArray(error.issues)
  )
}

app.get('/api/moldable/ui-intent', async (c) => {
  return c.json(await readUiIntent(getWorkspaceId(c)))
})

app.delete('/api/moldable/ui-intent', async (c) => {
  const id = c.req.query('id')
  if (!id) return jsonError(c, 'An intent id query parameter is required', 400)
  const workspaceId = getWorkspaceId(c)
  const current = await readUiIntent(workspaceId)
  const deleted = current?.id === id
  if (deleted) await writeJson(uiIntentPath(workspaceId), null)
  return c.json({ ok: true, deleted })
})

// Quiet by default: surface a gentle resume for the latest artifact, no
// attention items unless a publish is actually in flight.
app.get('/api/moldable/today', async (c) => {
  try {
    const artifacts = await listArtifacts(getWorkspaceId(c))
    const items = artifacts
      .filter((d) => d.publishPending)
      .map((d) => ({
        kind: 'active',
        title: `Publishing "${d.title}"`,
        subtitle: 'Finishing up the shareable link',
        icon: '🎨',
      }))
    const latest = artifacts[0]
    const resume =
      !items.length && latest
        ? {
            title: `Open "${latest.title}"`,
            subtitle:
              latest.kind === 'page'
                ? 'Page artifact'
                : `${latest.slides.length} slide${latest.slides.length === 1 ? '' : 's'}`,
            icon: '🎨',
          }
        : null
    return c.json({ items, resume, generatedAt: new Date().toISOString() })
  } catch {
    return c.json({
      items: [],
      resume: null,
      generatedAt: new Date().toISOString(),
    })
  }
})

// ---- Artifact REST -------------------------------------------------------

app.get('/api/artifacts', async (c) => {
  const artifacts = await listArtifacts(getWorkspaceId(c))
  return c.json(artifacts.map(summarize))
})

app.post('/api/artifacts', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const artifact = await createArtifact(getWorkspaceId(c), body)
  return c.json(artifact, 201)
})

app.get('/api/artifacts/:id', async (c) => {
  const artifact = await getArtifact(getWorkspaceId(c), c.req.param('id'))
  if (!artifact) return jsonError(c, 'Artifact not found', 404)
  return c.json(artifact)
})

app.patch('/api/artifacts/:id', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return run(c, () =>
    updateArtifact(getWorkspaceId(c), c.req.param('id'), body),
  )
})

// Page document (html/css/js/fonts/libs/background) — page artifacts.
app.post('/api/artifacts/:id/page', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return run(c, () => setPage(getWorkspaceId(c), c.req.param('id'), body))
})

// Surgical exact-string edits for page, slide, artifact, and theme text fields.
app.post('/api/artifacts/:id/text-replace', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return run(c, () =>
    replaceArtifactText(getWorkspaceId(c), c.req.param('id'), body),
  )
})

// Image-style recipe + active preset — saved without bumping updatedAt.
app.post('/api/artifacts/:id/image-style', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return run(c, () => setImageStyle(getWorkspaceId(c), c.req.param('id'), body))
})

app.put('/api/artifacts/:id', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return run(c, () =>
    replaceArtifact(getWorkspaceId(c), c.req.param('id'), body),
  )
})

app.delete('/api/artifacts/:id', async (c) => {
  return run(c, async () => {
    await removeArtifact(getWorkspaceId(c), c.req.param('id'))
    return { ok: true }
  })
})

// ---- Slide REST (deck artifacts) -----------------------------------------

app.post('/api/artifacts/:id/slides', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const index = typeof body.index === 'number' ? body.index : undefined
  return run(c, () =>
    addSlide(getWorkspaceId(c), c.req.param('id'), body, index),
  )
})

app.patch('/api/artifacts/:id/slides/:slideId', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return run(c, () =>
    updateSlide(
      getWorkspaceId(c),
      c.req.param('id'),
      c.req.param('slideId'),
      body,
    ),
  )
})

app.delete('/api/artifacts/:id/slides/:slideId', async (c) => {
  return run(c, () =>
    removeSlide(getWorkspaceId(c), c.req.param('id'), c.req.param('slideId')),
  )
})

app.post('/api/artifacts/:id/slides/reorder', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { order?: unknown }
  return run(c, () =>
    reorderSlides(getWorkspaceId(c), c.req.param('id'), body.order),
  )
})

app.post('/api/artifacts/:id/slides/:slideId/move', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { toIndex?: number }
  return run(c, () =>
    moveSlide(
      getWorkspaceId(c),
      c.req.param('id'),
      c.req.param('slideId'),
      Number(body.toIndex ?? 0),
    ),
  )
})

// ---- Assets --------------------------------------------------------------

app.get('/api/artifacts/:id/assets/:file', async (c) => {
  const bytes = await readAsset(
    getWorkspaceId(c),
    c.req.param('id'),
    c.req.param('file'),
  )
  if (!bytes) return c.text('Not found', 404)
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': contentTypeFor(c.req.param('file')) },
  })
})

app.post('/api/artifacts/:id/assets', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const id = c.req.param('id')
  const artifact = await getArtifact(workspaceId, id)
  if (!artifact) return jsonError(c, 'Artifact not found', 404)
  const body = (await c.req.json().catch(() => ({}))) as {
    fileName?: string
    base64?: string
  }
  const fileName = (body.fileName ?? '').replace(/[^A-Za-z0-9._-]/g, '')
  if (!fileName || !body.base64) {
    return jsonError(c, 'fileName and base64 required', 400)
  }
  await writeAsset(
    workspaceId,
    id,
    fileName,
    Buffer.from(body.base64, 'base64'),
  )
  return c.json({ ok: true, path: `assets/${fileName}` }, 201)
})

// ---- Preview (same bytes as the published artifact) ----------------------

app.get('/api/runtime-state/:workspace/:id/:namespace', async (c) => {
  const workspace = c.req.param('workspace')
  const namespace = c.req.param('namespace')
  if (!isValidWorkspaceId(workspace)) {
    return jsonError(c, 'Invalid workspace id', 400)
  }
  if (!isValidRuntimeStateNamespace(namespace)) {
    return jsonError(c, 'Invalid runtime state namespace', 400)
  }
  if (!(await getArtifact(workspace, c.req.param('id')))) {
    return jsonError(c, 'Artifact not found', 404)
  }
  return c.json({
    value: await readRuntimeState(workspace, c.req.param('id'), namespace),
  })
})

app.put('/api/runtime-state/:workspace/:id/:namespace', async (c) => {
  const workspace = c.req.param('workspace')
  const namespace = c.req.param('namespace')
  if (!isValidWorkspaceId(workspace)) {
    return jsonError(c, 'Invalid workspace id', 400)
  }
  if (!isValidRuntimeStateNamespace(namespace)) {
    return jsonError(c, 'Invalid runtime state namespace', 400)
  }
  if (!(await getArtifact(workspace, c.req.param('id')))) {
    return jsonError(c, 'Artifact not found', 404)
  }

  const contentLength = Number(c.req.header('content-length') ?? '0')
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_RUNTIME_STATE_BYTES
  ) {
    return c.json({ error: 'Runtime state exceeds the 512 KB limit' }, 413)
  }
  const raw = await c.req.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_RUNTIME_STATE_BYTES) {
    return c.json({ error: 'Runtime state exceeds the 512 KB limit' }, 413)
  }
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return jsonError(c, 'Invalid runtime state JSON', 400)
  }
  if (
    !body ||
    typeof body !== 'object' ||
    !Object.prototype.hasOwnProperty.call(body, 'value')
  ) {
    return jsonError(c, 'Runtime state value is required', 400)
  }
  const value = (body as { value: unknown }).value
  await writeRuntimeState(workspace, c.req.param('id'), namespace, value)
  return c.json({ ok: true })
})

app.delete('/api/runtime-state/:workspace/:id/:namespace', async (c) => {
  const workspace = c.req.param('workspace')
  const namespace = c.req.param('namespace')
  if (!isValidWorkspaceId(workspace)) {
    return jsonError(c, 'Invalid workspace id', 400)
  }
  if (!isValidRuntimeStateNamespace(namespace)) {
    return jsonError(c, 'Invalid runtime state namespace', 400)
  }
  if (!(await getArtifact(workspace, c.req.param('id')))) {
    return jsonError(c, 'Artifact not found', 404)
  }
  await deleteRuntimeState(workspace, c.req.param('id'), namespace)
  return c.json({ ok: true })
})

app.get('/api/artifacts/:id/preview', async (c) => {
  const artifact = await getArtifact(getWorkspaceId(c), c.req.param('id'))
  if (!artifact) return c.text('Artifact not found', 404)
  const active = Number(c.req.query('active') ?? '0')
  const html = composeArtifactHtml(artifact, {
    activeIndex: Number.isFinite(active) ? active : 0,
  })
  return c.html(html)
})

// Path-based preview used by the in-app iframe. The workspace lives in the path
// so relative `assets/<file>` references resolve to the sibling asset route —
// exactly mirroring the published artifact's index.html + assets/ layout.
app.get('/api/preview/:workspace/:id/index.html', async (c) => {
  const workspace = c.req.param('workspace')
  if (!isValidWorkspaceId(workspace)) {
    return jsonError(c, 'Invalid workspace id', 400)
  }
  const artifact = await getArtifact(workspace, c.req.param('id'))
  if (!artifact) return c.text('Artifact not found', 404)
  const active = Number(c.req.query('active') ?? '0')
  return c.html(
    composeArtifactHtml(artifact, {
      activeIndex: Number.isFinite(active) ? active : 0,
    }),
  )
})

app.get('/api/preview/:workspace/:id/assets/:file', async (c) => {
  const workspace = c.req.param('workspace')
  if (!isValidWorkspaceId(workspace)) {
    return jsonError(c, 'Invalid workspace id', 400)
  }
  const bytes = await readAsset(
    workspace,
    c.req.param('id'),
    c.req.param('file'),
  )
  if (!bytes) return c.text('Not found', 404)
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': contentTypeFor(c.req.param('file')) },
  })
})

// ---- Publish bundle + bridge ---------------------------------------------

// Stage the artifact bundle on disk and return absolute source paths. The
// client hands these to the host's artifact-publish flow (which reads files by
// sourcePath). index.html is byte-identical to the live preview.
app.get('/api/artifacts/:id/stage-publish', async (c) => {
  let bundle: Awaited<ReturnType<typeof createPublishBundle>>
  try {
    bundle = await createPublishBundle(getWorkspaceId(c), c.req.param('id'))
  } catch (error) {
    if (error instanceof HostingError) {
      return jsonError(c, error.message, error.status as JsonErrorStatus)
    }
    throw error
  }

  return c.json({
    entrypoint: bundle.entrypoint,
    title: bundle.title,
    metadata: bundle.metadata,
    files: bundle.files.map(({ path, contentType, sourcePath }) => ({
      path,
      contentType,
      sourcePath,
    })),
  })
})

// Mark an artifact as needing publish; the open client completes it.
app.post('/api/artifacts/:id/publish', async (c) => {
  return run(c, () => requestPublish(getWorkspaceId(c), c.req.param('id')))
})

// Called by the client once publishMoldableArtifact resolves (or fails).
app.post('/api/artifacts/:id/publish-result', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const id = c.req.param('id')
  const body = (await c.req.json().catch(() => ({}))) as {
    error?: string
    published?: PublishedInfo
  }
  return run(c, () => {
    if (body.error) return failPublish(workspaceId, id, body.error)
    if (body.published) {
      return applyPublishResult(workspaceId, id, body.published)
    }
    throw new OperationError('bad_result', 'published or error required')
  })
})

app.post('/api/artifacts/:id/unpublish', async (c) => {
  return run(c, () => unpublish(getWorkspaceId(c), c.req.param('id')))
})

// ---- Templates -----------------------------------------------------------

app.get('/api/templates', (c) => {
  return c.json(listTemplates())
})

app.get('/api/templates/:id', (c) => {
  const detail = getTemplateDetail(c.req.param('id'))
  if (!detail) return jsonError(c, 'Template not found', 404)
  return c.json(detail)
})

// Lightweight pre-rendered cover thumbnail for the picker gallery. 404 → client
// falls back to a live frame.
app.get('/api/templates/:id/thumb', async (c) => {
  const bytes = await readTemplateThumb(c.req.param('id'))
  if (!bytes) return c.text('Not found', 404)
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-cache' },
  })
})

// Render a template's sample (deck slides OR full page) for the picker gallery.
app.get('/api/templates/:id/preview/index.html', (c) => {
  const template = getTemplate(c.req.param('id'))
  if (!template) return c.text('Template not found', 404)
  const active = Number(c.req.query('active') ?? '0')
  const artifact: Artifact = {
    id: `tpl-${template.id}`,
    title: template.name,
    subtitle: template.tagline,
    kind: template.kind,
    density: 'low',
    templateId: template.id,
    theme: templateTheme(template),
    runtime: template.runtime,
    slides: template.sampleSlides ?? [],
    page: template.samplePage,
    published: null,
    publishPending: false,
    publishError: null,
    createdAt: '',
    updatedAt: '',
  }
  return c.html(
    composeArtifactHtml(artifact, {
      activeIndex: Number.isFinite(active) ? active : 0,
    }),
  )
})

// QA contact sheet: a deck template's slides tiled (one screenshot reviews the
// whole deck); a page template shows its single full page.
app.get('/api/templates/:id/contact.html', (c) => {
  const template = getTemplate(c.req.param('id'))
  if (!template) return c.text('Template not found', 404)
  if (template.kind === 'page') {
    return c.html(
      `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:${escapeHtml(template.stageBg)}}iframe{display:block;width:100%;height:100vh;border:0}</style><iframe src="/api/templates/${template.id}/preview/index.html"></iframe>`,
    )
  }
  const slides = template.sampleSlides ?? []
  const cols = Math.max(1, Math.min(4, Number(c.req.query('cols') ?? '3') || 3))
  const tiles = slides
    .map(
      (slide, i) => `
    <div class="tile">
      <iframe src="/api/templates/${template.id}/preview/index.html?thumb=1&active=${i}"
        scrolling="no" loading="eager"></iframe>
      <div class="cap">${i + 1}. ${escapeHtml(slide.name ?? '')}</div>
    </div>`,
    )
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 28px; background: ${escapeHtml(template.stageBg ?? '#111')};
         font-family: ui-sans-serif, system-ui, sans-serif; }
  .head { color: #fff; mix-blend-mode: difference; margin: 0 4px 22px; }
  .head h1 { font-size: 22px; margin: 0 0 2px; font-weight: 700; }
  .head p { font-size: 13px; margin: 0; opacity: 0.85; }
  .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 18px; }
  .tile { background: #fff; border-radius: 10px; overflow: hidden;
          box-shadow: 0 10px 30px -12px rgba(0,0,0,0.5); }
  .tile iframe { display: block; width: 100%; aspect-ratio: 16/9; border: 0; }
  .cap { font-size: 12px; padding: 6px 10px; color: #444; background: #fff;
         border-top: 1px solid #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style></head>
<body>
  <div class="head"><h1>${escapeHtml(template.name)} — ${slides.length} slides</h1>
  <p>${escapeHtml(template.tagline)} · ${template.categories.join(' · ')}</p></div>
  <div class="grid">${tiles}</div>
</body></html>`
  return c.html(html)
})

// QA: the whole library at a glance — every template's cover tiled.
app.get('/api/library.html', (c) => {
  const cols = Math.max(2, Math.min(6, Number(c.req.query('cols') ?? '4') || 4))
  const tiles = listTemplates()
    .map(
      (t) => `
    <div class="tile">
      <iframe src="/api/templates/${t.id}/preview/index.html?thumb=1&active=0"
        scrolling="no" loading="eager"></iframe>
      <div class="cap"><b>${escapeHtml(t.name)}</b><span>${escapeHtml(t.kind)} · ${escapeHtml(t.categories.join(' · '))}</span></div>
    </div>`,
    )
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin:0; padding:34px; background:#0e0f12; font-family:ui-sans-serif,system-ui,sans-serif; }
  h1 { color:#fff; font-size:26px; margin:0 0 4px; }
  p { color:#9aa3b2; font-size:14px; margin:0 0 26px; }
  .grid { display:grid; grid-template-columns:repeat(${cols},1fr); gap:20px; }
  .tile { background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 12px 34px -14px rgba(0,0,0,.6); }
  .tile iframe { display:block; width:100%; aspect-ratio:16/9; border:0; }
  .cap { padding:9px 13px; border-top:1px solid #eee; }
  .cap b { display:block; font-size:14px; color:#16181d; }
  .cap span { font-size:11px; color:#7a8290; text-transform:uppercase; letter-spacing:.05em; }
  </style></head><body>
  <h1>Artifacts — template library</h1>
  <p>${listTemplates().length} studio-grade templates</p>
  <div class="grid">${tiles}</div></body></html>`
  return c.html(html)
})

// Serve a template's bundled image assets (relative `assets/<file>` references
// in template preview HTML resolve here).
app.get('/api/templates/:id/preview/assets/:file', async (c) => {
  const bytes = await readTemplateAsset(c.req.param('file'))
  if (!bytes) return c.text('Not found', 404)
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': contentTypeFor(c.req.param('file')) },
  })
})

app.post('/api/artifacts/:id/template', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { templateId?: string }
  return run(c, () => {
    if (!body.templateId) {
      throw new OperationError('missing_template', 'templateId is required')
    }
    return applyTemplate(getWorkspaceId(c), c.req.param('id'), body.templateId)
  })
})

// ---- Version history -----------------------------------------------------

app.get('/api/artifacts/:id/versions', async (c) => {
  const versions = await listVersions(getWorkspaceId(c), c.req.param('id'))
  return c.json(versions)
})

app.post('/api/artifacts/:id/revert', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { versionId?: string }
  return run(c, () => {
    if (!body.versionId) {
      throw new OperationError('missing_version', 'versionId is required')
    }
    return revertArtifact(getWorkspaceId(c), c.req.param('id'), body.versionId)
  })
})

// ---- AI images -----------------------------------------------------------

app.get('/api/artifacts/:id/images', async (c) => {
  const files = await listAssets(getWorkspaceId(c), c.req.param('id'))
  return c.json(
    files.map((fileName) => ({ fileName, path: `assets/${fileName}` })),
  )
})

app.post('/api/artifacts/:id/images/generate', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const id = c.req.param('id')
  const artifact = await getArtifact(workspaceId, id)
  if (!artifact) return jsonError(c, 'Artifact not found', 404)
  const body = (await c.req.json().catch(() => ({}))) as {
    prompt?: string
    size?: string
    fileName?: string
    styleRef?: string
  }
  return run(c, () =>
    generateArtifactImage(workspaceId, id, {
      prompt: body.prompt ?? '',
      size: body.size,
      fileName: body.fileName,
      styleRef: body.styleRef,
    }),
  )
})

app.post('/api/artifacts/:id/images/edit', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const id = c.req.param('id')
  const artifact = await getArtifact(workspaceId, id)
  if (!artifact) return jsonError(c, 'Artifact not found', 404)
  const body = (await c.req.json().catch(() => ({}))) as {
    source?: string
    prompt?: string
    size?: string
    fileName?: string
  }
  return run(c, () =>
    editArtifactImage(workspaceId, id, {
      source: body.source ?? '',
      prompt: body.prompt ?? '',
      size: body.size,
      fileName: body.fileName,
    }),
  )
})

// ---- RPC dispatch (chat-driven editing) ----------------------------------

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const body = (await c.req.json().catch(() => ({}))) as {
    method?: string
    params?: Record<string, unknown>
  }
  const method = body.method ?? ''
  const p = (body.params ?? {}) as Record<string, unknown>
  const artifactId = (p.id ?? p.artifactId ?? p.deckId) as string | undefined
  const slideId = p.slideId as string | undefined

  try {
    const result = await dispatch(method, workspaceId, artifactId, slideId, p)
    if (result === undefined) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'method_not_found',
            message: `Unknown method: ${method}`,
          },
        },
        404,
      )
    }
    return c.json({ ok: true, result })
  } catch (error) {
    if (error instanceof OperationError) {
      return c.json(
        { ok: false, error: { code: error.code, message: error.message } },
        error.status as 400,
      )
    }
    if (error instanceof DriveError) {
      return c.json(
        { ok: false, error: { code: error.code, message: error.message } },
        error.status,
      )
    }
    if (isZodError(error)) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'validation_error',
            message: 'Invalid drive method parameters.',
            issues: error.issues,
          },
        },
        400,
      )
    }
    return c.json(
      {
        ok: false,
        error: {
          code: 'artifacts_rpc_failed',
          message: error instanceof Error ? error.message : 'RPC failed',
        },
      },
      500,
    )
  }
})

async function dispatch(
  method: string,
  workspaceId: string | undefined,
  artifactId: string | undefined,
  slideId: string | undefined,
  p: Record<string, unknown>,
): Promise<unknown> {
  const need = () => {
    if (!artifactId)
      throw new OperationError('missing_id', 'id (artifact id) is required')
    return artifactId
  }
  const needSlide = () => {
    if (!slideId)
      throw new OperationError('missing_slide_id', 'slideId is required')
    return slideId
  }

  if (
    method === 'artifacts.cards.present' ||
    method === 'artifacts.cards.read'
  ) {
    const params = z
      .object({
        id: z.string().min(1).max(256),
        slideIds: z.array(z.string().min(1).max(256)).max(60).optional(),
        detail: z.boolean().optional(),
      })
      .strict()
      .parse(p)
    const item = await getArtifact(workspaceId, params.id)
    if (!item)
      throw new OperationError(
        'not_found',
        'This presentation is no longer available.',
        404,
      )
    const slideIds =
      params.slideIds ?? item.slides.slice(0, 60).map((slide) => slide.id)
    if (method === 'artifacts.cards.present')
      return {
        appCard: {
          version: 1,
          title: item.title.slice(0, 240),
          resourcePath: '/index.html?card=preview',
          input: { id: item.id, slideIds },
          readMethod: 'artifacts.cards.read',
          actions: [],
          height: 400,
        },
      }
    return {
      id: item.id,
      title: item.title.slice(0, 240),
      subtitle: item.subtitle?.slice(0, 500),
      kind: item.kind,
      updatedAt: item.updatedAt,
      totalSlides: item.slides.length,
      slides: item.slides
        .flatMap((slide, index) =>
          slideIds.includes(slide.id)
            ? [
                {
                  id: slide.id,
                  index,
                  name: slide.name.slice(0, 240),
                  notes: params.detail
                    ? slide.notes?.slice(0, 2000)
                    : undefined,
                },
              ]
            : [],
        )
        .slice(0, 60),
    }
  }

  switch (method) {
    case 'artifacts.native.read': {
      const params = nativeReadSchema.parse(p)
      if (params.route === 'library') {
        const allArtifacts = await listArtifacts(workspaceId)
        const artifacts = allArtifacts.slice(0, 24).map((artifact) => {
          const summary = summarize(artifact)
          const kindLabel = artifact.kind === 'deck' ? 'Slide deck' : 'Web page'
          return {
            ...summary,
            kindLabel,
            listSubtitle: artifact.subtitle?.trim()
              ? `${kindLabel} · ${artifact.subtitle.trim().slice(0, 120)}`
              : kindLabel,
            statusLabel: artifact.publishPending
              ? 'Publishing'
              : artifact.published
                ? 'Published'
                : 'Draft',
          }
        })
        return {
          artifacts,
          emptyStates:
            artifacts.length === 0
              ? [
                  {
                    title: 'No artifacts yet',
                    description:
                      'Create a page or deck with Moldable and it will appear here.',
                  },
                ]
              : [],
          truncationNote:
            allArtifacts.length > artifacts.length
              ? `Showing the ${artifacts.length} most recently updated artifacts.`
              : '',
        }
      }
      if (!params.id) {
        throw new OperationError(
          'missing_artifact_id',
          'id is required for the artifact route',
        )
      }
      if (params.route === 'versions') {
        const artifact = await getArtifact(workspaceId, params.id)
        if (!artifact) {
          throw new OperationError(
            'artifact_not_found',
            `No artifact: ${params.id}`,
            404,
          )
        }
        const allVersions = await listVersions(workspaceId, params.id)
        const versions = allVersions
          .slice(0, 20)
          .map((version, index, list) => ({
            versionId: version.versionId,
            title: version.label || 'Saved version',
            subtitle: `${version.slideCount} ${version.slideCount === 1 ? 'slide' : 'slides'}`,
            timestamp: new Date(version.createdAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
            isLast: index === list.length - 1,
          }))
        return {
          artifactId: artifact.id,
          artifactTitle: artifact.title,
          versions,
          emptyStates:
            versions.length === 0
              ? [
                  {
                    title: 'No versions yet',
                    description: 'Saved restore points appear here.',
                  },
                ]
              : [],
          truncationNote:
            allVersions.length > versions.length
              ? `Showing the 20 most recent of ${allVersions.length} versions.`
              : '',
        }
      }
      const artifact = await getArtifact(workspaceId, params.id)
      if (!artifact) {
        throw new OperationError(
          'artifact_not_found',
          `No artifact: ${params.id}`,
          404,
        )
      }
      const sections =
        artifact.kind === 'page'
          ? [
              {
                title: 'Page content',
                content: visibleText(artifact.page?.html ?? '').slice(0, 3_200),
                notesSections: [],
              },
            ]
          : artifact.slides.slice(0, 12).map((slide, index) => ({
              title: slide.name || `Slide ${index + 1}`,
              content: visibleText(slide.bodyHtml).slice(0, 900),
              notesSections: slide.notes?.trim()
                ? [{ text: slide.notes.trim().slice(0, 800) }]
                : [],
            }))
      return {
        id: artifact.id,
        title: artifact.title,
        subtitle: artifact.subtitle ?? '',
        kindLabel: artifact.kind === 'deck' ? 'Slide deck' : 'Web page',
        statusLabel: artifact.publishPending
          ? 'Publishing'
          : artifact.published
            ? 'Published'
            : 'Draft',
        canPublish: !artifact.publishPending && !artifact.published,
        canUnpublish: !artifact.publishPending && Boolean(artifact.published),
        draft: {
          title: artifact.title,
          subtitle: artifact.subtitle ?? '',
        },
        versionCountLabel: String(
          (await listVersions(workspaceId, artifact.id)).length,
        ),
        publishActions:
          !artifact.publishPending && !artifact.published
            ? [{ id: artifact.id, label: 'Publish artifact' }]
            : [],
        unpublishActions:
          !artifact.publishPending && artifact.published
            ? [{ id: artifact.id, label: 'Unpublish artifact' }]
            : [],
        updatedAt: new Date(artifact.updatedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        sections,
        sectionEmptyStates:
          sections.length === 0
            ? [
                {
                  title: 'No readable content yet',
                  description: 'This deck does not contain any slides yet.',
                },
              ]
            : [],
        truncationNote:
          artifact.kind === 'deck' && artifact.slides.length > sections.length
            ? `Showing the first ${sections.length} of ${artifact.slides.length} slides.`
            : artifact.kind === 'page' &&
                visibleText(artifact.page?.html ?? '').length > 3_200
              ? 'Showing a mobile excerpt. Open the artifact on Mac for the complete visual page.'
              : '',
      }
    }
    // ---- drive contract ----
    case 'artifacts.ui.describe':
      emptyParamsSchema.parse(p)
      return {
        views: ARTIFACTS_UI_DESCRIPTIONS,
        entities:
          'Use artifact ids from artifacts.list. Only deck artifacts can target presentation.',
      }
    case 'artifacts.ui.navigate': {
      const params = uiNavigateSchema.parse(p)
      await validateArtifactTarget(workspaceId, params.view, params.entityId)
      const intent = await writeUiIntent(workspaceId, params)
      return { ok: true, intentId: intent.id }
    }
    case 'artifacts.ui.openArtifact': {
      const params = artifactIdSchema.parse(p)
      await validateArtifactTarget(workspaceId, 'artifact', params.artifactId)
      const intent = await writeUiIntent(workspaceId, {
        view: 'artifact',
        entityId: params.artifactId,
      })
      return { ok: true, intentId: intent.id }
    }
    case 'artifacts.present.start': {
      const params = artifactIdSchema.parse(p)
      await validateArtifactTarget(
        workspaceId,
        'presentation',
        params.artifactId,
      )
      const intent = await writeUiIntent(workspaceId, {
        view: 'presentation',
        entityId: params.artifactId,
        params: { presentation: 'start' },
      })
      return { ok: true, intentId: intent.id }
    }
    case 'artifacts.present.next':
    case 'artifacts.present.prev': {
      emptyParamsSchema.parse(p)
      const presentation = method === 'artifacts.present.next' ? 'next' : 'prev'
      const intent = await writeUiIntent(workspaceId, {
        view: 'presentation',
        params: { presentation },
      })
      return { ok: true, intentId: intent.id }
    }
    case 'artifacts.ui.read': {
      const params = uiReadSchema.parse(p)
      if (!params.entityId) {
        return (await listArtifacts(workspaceId)).map(summarize)
      }
      const artifact = await validateArtifactTarget(
        workspaceId,
        params.view ?? 'artifact',
        params.entityId,
      )
      return readableArtifact(artifact as Artifact)
    }

    // ---- artifact ----
    case 'artifacts.list':
      return (await listArtifacts(workspaceId)).map(summarize)
    case 'artifacts.get': {
      const artifact = await getArtifact(workspaceId, need())
      if (!artifact) {
        throw new OperationError(
          'artifact_not_found',
          `No artifact: ${artifactId}`,
          404,
        )
      }
      return artifact
    }
    case 'artifacts.create':
      return createArtifact(workspaceId, p)
    case 'artifacts.update':
      return updateArtifact(workspaceId, need(), p)
    case 'artifacts.replace':
      return replaceArtifact(workspaceId, need(), p)
    case 'artifacts.text.replace':
      return replaceArtifactText(workspaceId, need(), p)
    case 'artifacts.delete':
      await removeArtifact(workspaceId, need())
      return { ok: true }

    // ---- page ----
    case 'artifacts.page.set':
      return setPage(workspaceId, need(), p.page ?? p)
    case 'artifacts.page.text.replace':
      return replaceArtifactText(workspaceId, need(), p, { kind: 'page' })
    case 'artifacts.page.get': {
      const artifact = await getArtifact(workspaceId, need())
      if (!artifact)
        throw new OperationError('artifact_not_found', `No artifact`, 404)
      return artifact.page ?? null
    }

    // ---- slides (deck artifacts) ----
    case 'artifacts.slides.add':
      return addSlide(
        workspaceId,
        need(),
        p.slide ?? p,
        typeof p.index === 'number' ? p.index : undefined,
      )
    case 'artifacts.slides.update':
      return updateSlide(workspaceId, need(), needSlide(), p.slide ?? p)
    case 'artifacts.slides.text.replace':
      return replaceArtifactText(workspaceId, need(), p, {
        kind: 'slide',
        slideId,
      })
    case 'artifacts.slides.remove':
      return removeSlide(workspaceId, need(), needSlide())
    case 'artifacts.slides.reorder':
      return reorderSlides(workspaceId, need(), p.order)
    case 'artifacts.slides.move':
      return moveSlide(workspaceId, need(), needSlide(), Number(p.toIndex ?? 0))

    // ---- publish ----
    case 'artifacts.publish':
      return requestPublish(workspaceId, need())
    case 'artifacts.unpublish':
      return unpublish(workspaceId, need())
    case 'artifacts.previewUrl':
      return { url: `/api/artifacts/${need()}/preview` }

    // ---- templates ----
    case 'artifacts.templates.list':
      return listTemplates()
    case 'artifacts.templates.get': {
      const tid = (p.templateId ?? p.id) as string | undefined
      if (!tid) {
        throw new OperationError('missing_template', 'templateId is required')
      }
      const detail = getTemplateDetail(tid)
      if (!detail) {
        throw new OperationError(
          'template_not_found',
          `No template: ${tid}`,
          404,
        )
      }
      return detail
    }
    case 'artifacts.applyTemplate': {
      if (typeof p.templateId !== 'string') {
        throw new OperationError('missing_template', 'templateId is required')
      }
      return applyTemplate(workspaceId, need(), p.templateId)
    }

    // ---- versions ----
    case 'artifacts.versions.list':
      return listVersions(workspaceId, need())
    case 'artifacts.revert': {
      if (typeof p.versionId !== 'string') {
        throw new OperationError('missing_version', 'versionId is required')
      }
      return revertArtifact(workspaceId, need(), p.versionId)
    }

    // ---- images ----
    case 'artifacts.images.list':
      return (await listAssets(workspaceId, need())).map((fileName) => ({
        fileName,
        path: `assets/${fileName}`,
      }))
    case 'artifacts.images.generate':
      return generateArtifactImage(workspaceId, need(), {
        prompt: String(p.prompt ?? ''),
        size: typeof p.size === 'string' ? p.size : undefined,
        fileName: typeof p.fileName === 'string' ? p.fileName : undefined,
        styleRef: typeof p.styleRef === 'string' ? p.styleRef : undefined,
      })
    case 'artifacts.images.edit':
      return editArtifactImage(workspaceId, need(), {
        source: String(p.source ?? ''),
        prompt: String(p.prompt ?? ''),
        size: typeof p.size === 'string' ? p.size : undefined,
        fileName: typeof p.fileName === 'string' ? p.fileName : undefined,
      })

    default:
      return undefined
  }
}

// ---- helpers -------------------------------------------------------------

async function run<T>(c: Context, fn: () => Promise<T> | T): Promise<Response> {
  try {
    const result = await fn()
    return c.json(result as Record<string, unknown>)
  } catch (error) {
    if (error instanceof OperationError) {
      return c.json(
        { error: error.message, code: error.code },
        error.status as 400,
      )
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Request failed',
    )
  }
}

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
  ].join('')
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
