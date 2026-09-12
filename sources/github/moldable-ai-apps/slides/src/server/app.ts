import {
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { composeDeckHtml, escapeHtml } from '../shared/render'
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
import type { Deck, PublishedInfo } from '../shared/types'
import { SLIDES_UI_VIEW_IDS, type SlidesUiIntent } from '../shared/ui-intent'
import { editSlideImage, generateSlideImage } from './images'
import {
  getWorkspaceId,
  isValidWorkspaceId,
  jsonError,
  rawWorkspaceId,
} from './moldable'
import {
  OperationError,
  addSlide,
  applyPublishResult,
  applyTemplate,
  createDeck,
  failPublish,
  moveSlide,
  removeDeck,
  removeSlide,
  reorderSlides,
  replaceDeck,
  replaceDeckText,
  requestPublish,
  revertDeck,
  setImageStyle,
  unpublish,
  updateDeck,
  updateSlide,
} from './operations'
import {
  deleteRuntimeState,
  getDeck,
  listAssets,
  listDecks,
  listVersions,
  readAsset,
  readRuntimeState,
  readTemplateAsset,
  readTemplateThumb,
  stageAsset,
  stageIndexHtml,
  summarize,
  writeAsset,
  writeRuntimeState,
} from './store'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

export const app = new Hono()

app.use('/api/*', cors())

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
const APP_ID = process.env.MOLDABLE_APP_ID ?? 'slides'
const CLIENT_REQUEST_HEADER = 'x-slides-client'

const uiDescribeParamsSchema = z.object({}).strict().optional()
const uiNavigateParamsSchema = z
  .object({
    view: z.enum(SLIDES_UI_VIEW_IDS),
    entityId: z.string().min(1).optional(),
    params: z
      .object({ slideIndex: z.number().int().nonnegative().optional() })
      .strict()
      .optional(),
  })
  .strict()
const uiReadParamsSchema = z
  .object({
    view: z.enum(SLIDES_UI_VIEW_IDS).optional(),
    entityId: z.string().min(1).optional(),
    deckId: z.string().min(1).optional(),
    slideIndex: z.number().int().nonnegative().optional(),
  })
  .strict()
  .optional()
const presentStartParamsSchema = z
  .object({ deckId: z.string().min(1) })
  .strict()
const emptyParamsSchema = z.object({}).strict()
const presentGotoParamsSchema = z
  .object({ slideIndex: z.number().int().nonnegative() })
  .strict()
const nativeReadParamsSchema = z
  .object({
    route: z.enum(['library', 'deck', 'slide']),
    deckId: z.string().min(1).optional(),
    slideIndex: z.number().int().nonnegative().optional(),
    limit: z.number().int().min(1).max(24).optional(),
  })
  .superRefine((value, context) => {
    if (value.route !== 'library' && !value.deckId) {
      context.addIssue({
        code: 'custom',
        path: ['deckId'],
        message: 'deckId is required.',
      })
    }
    if (value.route === 'slide' && value.slideIndex === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['slideIndex'],
        message: 'slideIndex is required.',
      })
    }
  })

interface PresentationState {
  deckId: string
  slideIndex: number
}

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
    return jsonError(c, 'Missing Slides client request header', 403)
  }

  await next()
})

function firstImageAsset(files: string[]): string | undefined {
  return files.find((file) => /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file))
}

function deckPublishMetadata(
  deck: Deck,
  id: string,
  assetFiles: string[],
): Record<string, string> {
  // Only attach a description when the deck has an explicit subtitle — don't
  // stamp boilerplate ("N slide deck published with …") on every deck.
  const description = deck.subtitle?.trim()
  const image = firstImageAsset(assetFiles)
  return {
    sourceAppId: APP_ID,
    deckId: id,
    slideCount: String(deck.slides.length),
    seoTitle: deck.title,
    ...(description ? { description, seoDescription: description } : {}),
    ...(image ? { seoImage: `assets/${image}` } : {}),
  }
}

app.get('/api/moldable/health', (c) => {
  return c.json({ appId: APP_ID, status: 'ok' })
})

function uiIntentPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'ui-intent.json')
}

function presentationStatePath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'presentation-state.json')
}

async function readUiIntent(
  workspaceId?: string,
): Promise<SlidesUiIntent | null> {
  return readJson<SlidesUiIntent | null>(uiIntentPath(workspaceId), null)
}

async function queueUiIntent(
  workspaceId: string | undefined,
  input: Omit<SlidesUiIntent, 'id' | 'createdAt'>,
): Promise<SlidesUiIntent> {
  const intent: SlidesUiIntent = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  await writeJson(uiIntentPath(workspaceId), intent)
  return intent
}

async function requireDeck(
  workspaceId: string | undefined,
  deckId: string,
): Promise<Deck> {
  const deck = await getDeck(workspaceId, deckId)
  if (!deck) {
    throw new OperationError('deck_not_found', `No deck: ${deckId}`, 404)
  }
  return deck
}

function requireSlideIndex(deck: Deck, slideIndex: number): number {
  if (slideIndex >= deck.slides.length) {
    throw new OperationError(
      'slide_not_found',
      `Slide index ${slideIndex} is outside deck ${deck.id}.`,
      404,
    )
  }
  return slideIndex
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  }
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (entity, code: string) => {
      if (code[0] !== '#') return named[code.toLowerCase()] ?? entity
      const radix = code[1]?.toLowerCase() === 'x' ? 16 : 10
      const digits = radix === 16 ? code.slice(2) : code.slice(1)
      const point = Number.parseInt(digits, radix)
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity
    },
  )
}

function slideText(bodyHtml: string): string {
  return decodeHtmlEntities(
    bodyHtml
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:div|h[1-6]|li|p|section|tr)>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function setPresentation(
  workspaceId: string | undefined,
  deck: Deck,
  slideIndex: number,
): Promise<{ deckId: string; slideIndex: number; intentId: string }> {
  requireSlideIndex(deck, slideIndex)
  const state = { deckId: deck.id, slideIndex }
  await writeJson(presentationStatePath(workspaceId), state)
  const intent = await queueUiIntent(workspaceId, {
    view: 'presentation',
    entityId: deck.id,
    params: { slideIndex },
  })
  return { ...state, intentId: intent.id }
}

async function changePresentation(
  workspaceId: string | undefined,
  change: 'next' | 'prev' | number,
): Promise<{ deckId: string; slideIndex: number; intentId: string }> {
  const state = await readJson<PresentationState | null>(
    presentationStatePath(workspaceId),
    null,
  )
  if (!state) {
    throw new OperationError(
      'presentation_not_started',
      'Start a presentation before changing slides.',
      409,
    )
  }
  const deck = await requireDeck(workspaceId, state.deckId)
  const slideIndex =
    typeof change === 'number'
      ? requireSlideIndex(deck, change)
      : Math.min(
          Math.max(state.slideIndex + (change === 'next' ? 1 : -1), 0),
          Math.max(deck.slides.length - 1, 0),
        )
  return setPresentation(workspaceId, deck, slideIndex)
}

app.get('/api/moldable/ui-intent', async (c) => {
  return c.json(await readUiIntent(getWorkspaceId(c)))
})

app.delete('/api/moldable/ui-intent', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const intent = await readUiIntent(workspaceId)
  const id = c.req.query('id')
  const deleted = Boolean(intent && id && intent.id === id)
  if (deleted) await writeJson(uiIntentPath(workspaceId), null)
  return c.json({ ok: true, deleted })
})

// Quiet by default: surface a gentle resume for the latest deck, no attention
// items unless a publish is actually in flight.
app.get('/api/moldable/today', async (c) => {
  try {
    const decks = await listDecks(getWorkspaceId(c))
    const items = decks
      .filter((d) => d.publishPending)
      .map((d) => ({
        kind: 'active',
        title: `Publishing "${d.title}"`,
        subtitle: 'Finishing up the shareable link',
        icon: '🎞️',
      }))
    const latest = decks[0]
    const resume =
      !items.length && latest
        ? {
            title: `Open "${latest.title}"`,
            subtitle: `${latest.slides.length} slide${latest.slides.length === 1 ? '' : 's'}`,
            icon: '🎞️',
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

// ---- Deck REST -----------------------------------------------------------

app.get('/api/decks', async (c) => {
  const decks = await listDecks(getWorkspaceId(c))
  return c.json(decks.map(summarize))
})

app.post('/api/decks', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const deck = await createDeck(getWorkspaceId(c), body)
  return c.json(deck, 201)
})

app.get('/api/decks/:id', async (c) => {
  const deck = await getDeck(getWorkspaceId(c), c.req.param('id'))
  if (!deck) return jsonError(c, 'Deck not found', 404)
  return c.json(deck)
})

app.patch('/api/decks/:id', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return run(c, () => updateDeck(getWorkspaceId(c), c.req.param('id'), body))
})

// Surgical exact-string edits across deck, theme, and slide text fields.
app.post('/api/decks/:id/text-replace', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return run(c, () =>
    replaceDeckText(getWorkspaceId(c), c.req.param('id'), body),
  )
})

// Image-style recipe + active preset — saved without bumping updatedAt (no canvas reload).
app.post('/api/decks/:id/image-style', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return run(c, () => setImageStyle(getWorkspaceId(c), c.req.param('id'), body))
})

app.put('/api/decks/:id', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return run(c, () => replaceDeck(getWorkspaceId(c), c.req.param('id'), body))
})

app.delete('/api/decks/:id', async (c) => {
  return run(c, async () => {
    await removeDeck(getWorkspaceId(c), c.req.param('id'))
    return { ok: true }
  })
})

// ---- Slide REST ----------------------------------------------------------

app.post('/api/decks/:id/slides', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const index = typeof body.index === 'number' ? body.index : undefined
  return run(c, () =>
    addSlide(getWorkspaceId(c), c.req.param('id'), body, index),
  )
})

app.patch('/api/decks/:id/slides/:slideId', async (c) => {
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

app.delete('/api/decks/:id/slides/:slideId', async (c) => {
  return run(c, () =>
    removeSlide(getWorkspaceId(c), c.req.param('id'), c.req.param('slideId')),
  )
})

app.post('/api/decks/:id/slides/reorder', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { order?: unknown }
  return run(c, () =>
    reorderSlides(getWorkspaceId(c), c.req.param('id'), body.order),
  )
})

app.post('/api/decks/:id/slides/:slideId/move', async (c) => {
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

app.get('/api/decks/:id/assets/:file', async (c) => {
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

app.post('/api/decks/:id/assets', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const id = c.req.param('id')
  const deck = await getDeck(workspaceId, id)
  if (!deck) return jsonError(c, 'Deck not found', 404)
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
  if (!(await getDeck(workspace, c.req.param('id')))) {
    return jsonError(c, 'Deck not found', 404)
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
  if (!(await getDeck(workspace, c.req.param('id')))) {
    return jsonError(c, 'Deck not found', 404)
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
  if (!(await getDeck(workspace, c.req.param('id')))) {
    return jsonError(c, 'Deck not found', 404)
  }
  await deleteRuntimeState(workspace, c.req.param('id'), namespace)
  return c.json({ ok: true })
})

app.get('/api/decks/:id/preview', async (c) => {
  const deck = await getDeck(getWorkspaceId(c), c.req.param('id'))
  if (!deck) return c.text('Deck not found', 404)
  const active = Number(c.req.query('active') ?? '0')
  const html = composeDeckHtml(deck, {
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
  const deck = await getDeck(workspace, c.req.param('id'))
  if (!deck) return c.text('Deck not found', 404)
  const active = Number(c.req.query('active') ?? '0')
  return c.html(
    composeDeckHtml(deck, {
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

// Stage the deck bundle on disk and return absolute source paths. The client
// hands these to the host's artifact-publish flow (which reads files by
// sourcePath). index.html is byte-identical to the live preview.
app.get('/api/decks/:id/stage-publish', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const id = c.req.param('id')
  const deck = await getDeck(workspaceId, id)
  if (!deck) return jsonError(c, 'Deck not found', 404)

  const indexPath = await stageIndexHtml(
    workspaceId,
    id,
    composeDeckHtml(deck, { activeIndex: 0 }),
  )

  const files: Array<{
    path: string
    contentType: string
    sourcePath: string
  }> = [
    {
      path: 'index.html',
      contentType: 'text/html; charset=utf-8',
      sourcePath: indexPath,
    },
  ]

  const assetFiles = await listAssets(workspaceId, id)

  for (const file of assetFiles) {
    files.push({
      path: `assets/${file}`,
      contentType: contentTypeFor(file),
      sourcePath: await stageAsset(workspaceId, id, file),
    })
  }

  return c.json({
    entrypoint: 'index.html',
    title: deck.title,
    metadata: deckPublishMetadata(deck, id, assetFiles),
    files,
  })
})

// Mark a deck as needing publish; the open client completes it.
app.post('/api/decks/:id/publish', async (c) => {
  return run(c, () => requestPublish(getWorkspaceId(c), c.req.param('id')))
})

// Called by the client once publishMoldableArtifact resolves (or fails).
app.post('/api/decks/:id/publish-result', async (c) => {
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

app.post('/api/decks/:id/unpublish', async (c) => {
  return run(c, () => unpublish(getWorkspaceId(c), c.req.param('id')))
})

// ---- Style templates -----------------------------------------------------

app.get('/api/templates', (c) => {
  return c.json(listTemplates())
})

app.get('/api/templates/:id', (c) => {
  const detail = getTemplateDetail(c.req.param('id'))
  if (!detail) return jsonError(c, 'Template not found', 404)
  return c.json(detail)
})

// Lightweight pre-rendered cover thumbnail for the picker gallery (47 of these
// as <img> beats 47 live deck iframes). 404 → client falls back to a live frame.
app.get('/api/templates/:id/thumb', async (c) => {
  const bytes = await readTemplateThumb(c.req.param('id'))
  if (!bytes) return c.text('Not found', 404)
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-cache' },
  })
})

// Render a template's sample slides as a deck for the picker gallery.
app.get('/api/templates/:id/preview/index.html', (c) => {
  const template = getTemplate(c.req.param('id'))
  if (!template) return c.text('Template not found', 404)
  const active = Number(c.req.query('active') ?? '0')
  const deck: Deck = {
    id: `tpl-${template.id}`,
    title: template.name,
    subtitle: template.tagline,
    density: 'low',
    templateId: template.id,
    theme: templateTheme(template),
    runtime: template.runtime,
    slides: template.sampleSlides,
    published: null,
    publishPending: false,
    publishError: null,
    createdAt: '',
    updatedAt: '',
  }
  return c.html(
    composeDeckHtml(deck, {
      activeIndex: Number.isFinite(active) ? active : 0,
    }),
  )
})

// QA contact sheet: every slide of a template tiled into one static page, so a
// single screenshot reviews the whole deck. ?cols=N controls the grid width.
app.get('/api/templates/:id/contact.html', (c) => {
  const template = getTemplate(c.req.param('id'))
  if (!template) return c.text('Template not found', 404)
  const cols = Math.max(1, Math.min(4, Number(c.req.query('cols') ?? '3') || 3))
  const tiles = template.sampleSlides
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
  <div class="head"><h1>${escapeHtml(template.name)} — ${template.sampleSlides.length} slides</h1>
  <p>${escapeHtml(template.tagline)} · ${template.categories.join(' · ')}</p></div>
  <div class="grid">${tiles}</div>
</body></html>`
  return c.html(html)
})

// QA: the whole library at a glance — every template's cover slide tiled.
app.get('/api/library.html', (c) => {
  const cols = Math.max(2, Math.min(6, Number(c.req.query('cols') ?? '4') || 4))
  const tiles = listTemplates()
    .map(
      (t) => `
    <div class="tile">
      <iframe src="/api/templates/${t.id}/preview/index.html?thumb=1&active=0"
        scrolling="no" loading="eager"></iframe>
      <div class="cap"><b>${escapeHtml(t.name)}</b><span>${escapeHtml(t.categories.join(' · '))}</span></div>
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
  <h1>Slides — template library</h1>
  <p>${listTemplates().length} studio-grade templates across 11 categories</p>
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

app.post('/api/decks/:id/template', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { templateId?: string }
  return run(c, () => {
    if (!body.templateId) {
      throw new OperationError('missing_template', 'templateId is required')
    }
    return applyTemplate(getWorkspaceId(c), c.req.param('id'), body.templateId)
  })
})

// ---- Version history -----------------------------------------------------

app.get('/api/decks/:id/versions', async (c) => {
  const versions = await listVersions(getWorkspaceId(c), c.req.param('id'))
  return c.json(versions)
})

app.post('/api/decks/:id/revert', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { versionId?: string }
  return run(c, () => {
    if (!body.versionId) {
      throw new OperationError('missing_version', 'versionId is required')
    }
    return revertDeck(getWorkspaceId(c), c.req.param('id'), body.versionId)
  })
})

// ---- AI images -----------------------------------------------------------

app.get('/api/decks/:id/images', async (c) => {
  const files = await listAssets(getWorkspaceId(c), c.req.param('id'))
  return c.json(
    files.map((fileName) => ({ fileName, path: `assets/${fileName}` })),
  )
})

app.post('/api/decks/:id/images/generate', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const id = c.req.param('id')
  const deck = await getDeck(workspaceId, id)
  if (!deck) return jsonError(c, 'Deck not found', 404)
  const body = (await c.req.json().catch(() => ({}))) as {
    prompt?: string
    size?: string
    fileName?: string
    styleRef?: string
  }
  return run(c, () =>
    generateSlideImage(workspaceId, id, {
      prompt: body.prompt ?? '',
      size: body.size,
      fileName: body.fileName,
      styleRef: body.styleRef,
    }),
  )
})

app.post('/api/decks/:id/images/edit', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const id = c.req.param('id')
  const deck = await getDeck(workspaceId, id)
  if (!deck) return jsonError(c, 'Deck not found', 404)
  const body = (await c.req.json().catch(() => ({}))) as {
    source?: string
    prompt?: string
    size?: string
    fileName?: string
  }
  return run(c, () =>
    editSlideImage(workspaceId, id, {
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
  const deckId = (p.id ?? p.deckId) as string | undefined
  const slideId = p.slideId as string | undefined

  try {
    const result = await dispatch(method, workspaceId, deckId, slideId, p)
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
    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Slides received invalid RPC parameters.',
            detail: z.flattenError(error),
          },
        },
        400,
      )
    }
    if (error instanceof OperationError) {
      return c.json(
        { ok: false, error: { code: error.code, message: error.message } },
        error.status as 400,
      )
    }
    return c.json(
      {
        ok: false,
        error: {
          code: 'slides_rpc_failed',
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
  deckId: string | undefined,
  slideId: string | undefined,
  p: Record<string, unknown>,
): Promise<unknown> {
  const needDeck = () => {
    if (!deckId)
      throw new OperationError('missing_id', 'id (deck id) is required')
    return deckId
  }
  const needSlide = () => {
    if (!slideId)
      throw new OperationError('missing_slide_id', 'slideId is required')
    return slideId
  }

  if (method === 'slides.cards.present' || method === 'slides.cards.read') {
    const params = z
      .object({
        id: z.string().min(1).max(256),
        slideIds: z.array(z.string().min(1).max(256)).max(60).optional(),
        detail: z.boolean().optional(),
      })
      .strict()
      .parse(p)
    const item = await getDeck(workspaceId, params.id)
    if (!item)
      throw new OperationError(
        'not_found',
        'This presentation is no longer available.',
        404,
      )
    const slideIds =
      params.slideIds ?? item.slides.slice(0, 60).map((slide) => slide.id)
    if (method === 'slides.cards.present')
      return {
        appCard: {
          version: 1,
          title: item.title.slice(0, 240),
          resourcePath: '/index.html?card=preview',
          input: { id: item.id, slideIds },
          readMethod: 'slides.cards.read',
          actions: [],
          height: 400,
        },
      }
    return {
      id: item.id,
      title: item.title.slice(0, 240),
      subtitle: item.subtitle?.slice(0, 500),
      kind: 'deck',
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
    case 'slides.native.read': {
      const params = nativeReadParamsSchema.parse(p)
      if (params.route === 'library') {
        const decks = (await listDecks(workspaceId)).map(summarize)
        const limit = params.limit ?? 24
        const visible = decks.slice(0, limit)
        return {
          summary: `${decks.length} ${decks.length === 1 ? 'deck' : 'decks'}`,
          decks: visible.map((deck) => ({
            id: deck.id,
            title: deck.title,
            subtitle: `${deck.slideCount} ${deck.slideCount === 1 ? 'slide' : 'slides'}${deck.subtitle?.trim() ? ` · ${deck.subtitle.trim().slice(0, 120)}` : ''}`,
            status: deck.published
              ? 'Published'
              : deck.publishPending
                ? 'Publishing'
                : 'Draft',
          })),
          emptyStates:
            decks.length === 0
              ? [
                  {
                    title: 'No decks yet',
                    description:
                      'Create a presentation with Moldable and it will appear here.',
                  },
                ]
              : [],
          truncationNotice:
            decks.length > visible.length
              ? `Showing the ${visible.length} most recently updated decks.`
              : '',
        }
      }

      const deck = await requireDeck(workspaceId, params.deckId!)
      const slides = deck.slides.map((slide, index) => ({
        deckId: deck.id,
        slideId: slide.id,
        index,
        number: String(index + 1),
        title: slide.name || `Slide ${index + 1}`,
        summary: slideText(slide.bodyHtml).slice(0, 180) || 'Visual slide',
        notes: slide.notes?.trim() ?? '',
      }))
      if (params.route === 'deck') {
        const limit = params.limit ?? 24
        const visible = slides.slice(0, limit)
        return {
          id: deck.id,
          title: deck.title,
          subtitle: deck.subtitle ?? '',
          deckName: deck.title,
          detail: `${slides.length} ${slides.length === 1 ? 'slide' : 'slides'} · ${deck.density === 'high' ? 'Reading-first' : 'Speaker-led'} · ${deck.published ? 'Published' : 'Draft'}`,
          publishLabel: deck.published
            ? 'Published'
            : deck.publishPending
              ? 'Publishing'
              : 'Draft',
          publishTone: deck.published
            ? 'success'
            : deck.publishPending
              ? 'pending'
              : 'neutral',
          publishPending: deck.publishPending,
          publishPendingBadges: deck.publishPending
            ? [
                {
                  text: 'Publish requested — waiting for your Mac',
                  icon: 'clock.arrow.circlepath',
                },
              ]
            : [],
          canPublish: !deck.publishPending && !deck.published,
          canUnpublish: !deck.publishPending && Boolean(deck.published),
          publishActions:
            !deck.publishPending && !deck.published
              ? [{ id: deck.id, label: 'Publish deck' }]
              : [],
          unpublishActions:
            !deck.publishPending && deck.published
              ? [{ id: deck.id, label: 'Unpublish deck' }]
              : [],
          slides: visible,
          emptyStates:
            slides.length === 0
              ? [
                  {
                    title: 'No slides yet',
                    description:
                      'Ask Moldable to add the first slide to this deck.',
                  },
                ]
              : [],
          truncationNotice:
            slides.length > visible.length
              ? `Showing the first ${visible.length} slides.`
              : '',
        }
      }

      const index = requireSlideIndex(deck, params.slideIndex!)
      const slide = slides[index]!
      return {
        deckTitle: deck.title,
        deckId: deck.id,
        slideId: slide.slideId,
        slideIndex: index,
        title: slide.title,
        slideName: slide.title,
        position: `Slide ${index + 1} of ${slides.length}`,
        summary: slide.summary,
        notes: slide.notes,
        noteSections: slide.notes
          ? [{ title: 'Speaker notes', text: slide.notes }]
          : [],
        noteEmptyStates: slide.notes
          ? []
          : [
              {
                title: 'No speaker notes',
                description: 'This slide does not have any speaker notes yet.',
              },
            ],
        previousRoutes:
          index > 0
            ? [
                {
                  deckId: deck.id,
                  slideIndex: index - 1,
                  label: 'Previous slide',
                },
              ]
            : [],
        nextRoutes:
          index + 1 < slides.length
            ? [{ deckId: deck.id, slideIndex: index + 1, label: 'Next slide' }]
            : [],
      }
    }
    case 'slides.ui.describe':
      uiDescribeParamsSchema.parse(p)
      return {
        appId: 'slides',
        summary:
          'A presentation editor with a deck library, slide editor, and native full-screen presentation mode.',
        views: [
          {
            id: 'decks',
            description:
              'The deck library, showing every presentation in the workspace and its slide count and publish status.',
            entityId: 'Not used.',
          },
          {
            id: 'editor',
            description:
              'The editor for one deck, with its slide rail and selected slide canvas.',
            entityId: 'Required existing deck ID.',
          },
          {
            id: 'presentation',
            description:
              'The native full-screen presentation overlay for an existing deck at a zero-based slide index.',
            entityId: 'Required existing deck ID.',
          },
        ],
      }
    case 'slides.ui.navigate': {
      const params = uiNavigateParamsSchema.parse(p)
      if (params.view !== 'decks' && !params.entityId) {
        throw new OperationError(
          'missing_entity_id',
          `entityId is required for the ${params.view} view.`,
        )
      }
      if (params.entityId) {
        const deck = await requireDeck(workspaceId, params.entityId)
        const index = params.params?.slideIndex ?? 0
        if (params.view === 'presentation') {
          return setPresentation(workspaceId, deck, index)
        }
        if (params.params?.slideIndex !== undefined) {
          requireSlideIndex(deck, index)
        }
      }
      const intent = await queueUiIntent(workspaceId, params)
      return { intentId: intent.id }
    }
    case 'slides.ui.read': {
      const params = uiReadParamsSchema.parse(p) ?? {}
      const requestedDeckId = params.deckId ?? params.entityId
      if (!requestedDeckId) {
        return {
          view: params.view ?? 'decks',
          decks: (await listDecks(workspaceId)).map(summarize),
        }
      }
      const deck = await requireDeck(workspaceId, requestedDeckId)
      const slides = deck.slides.map((slide, index) => ({
        index,
        id: slide.id,
        name: slide.name,
        text: slideText(slide.bodyHtml),
        speakerNotes: slide.notes ?? '',
      }))
      if (params.slideIndex !== undefined) {
        requireSlideIndex(deck, params.slideIndex)
      }
      return {
        view: params.view ?? 'editor',
        deck: {
          id: deck.id,
          title: deck.title,
          subtitle: deck.subtitle ?? '',
          density: deck.density,
          slideCount: slides.length,
          slide:
            params.slideIndex === undefined
              ? undefined
              : slides[params.slideIndex],
          slides: params.slideIndex === undefined ? slides : undefined,
        },
      }
    }
    case 'slides.present.start': {
      const params = presentStartParamsSchema.parse(p)
      const deck = await requireDeck(workspaceId, params.deckId)
      return setPresentation(workspaceId, deck, 0)
    }
    case 'slides.present.next':
      emptyParamsSchema.parse(p)
      return changePresentation(workspaceId, 'next')
    case 'slides.present.prev':
      emptyParamsSchema.parse(p)
      return changePresentation(workspaceId, 'prev')
    case 'slides.present.goto': {
      const params = presentGotoParamsSchema.parse(p)
      return changePresentation(workspaceId, params.slideIndex)
    }
    case 'slides.decks.list':
      return (await listDecks(workspaceId)).map(summarize)
    case 'slides.decks.get': {
      const deck = await getDeck(workspaceId, needDeck())
      if (!deck) {
        throw new OperationError('deck_not_found', `No deck: ${deckId}`, 404)
      }
      return deck
    }
    case 'slides.decks.create':
      return createDeck(workspaceId, p)
    case 'slides.decks.update':
      return updateDeck(workspaceId, needDeck(), p)
    case 'slides.decks.replace':
      return replaceDeck(workspaceId, needDeck(), p)
    case 'slides.text.replace':
      return replaceDeckText(workspaceId, needDeck(), p)
    case 'slides.decks.text.replace':
      return replaceDeckText(workspaceId, needDeck(), p, { kind: 'deck' })
    case 'slides.decks.delete':
      await removeDeck(workspaceId, needDeck())
      return { ok: true }

    case 'slides.slides.add':
      return addSlide(
        workspaceId,
        needDeck(),
        p.slide ?? p,
        typeof p.index === 'number' ? p.index : undefined,
      )
    case 'slides.slides.update':
      return updateSlide(workspaceId, needDeck(), needSlide(), p.slide ?? p)
    case 'slides.slides.text.replace':
      return replaceDeckText(workspaceId, needDeck(), p, {
        kind: 'slide',
        slideId,
      })
    case 'slides.slides.remove':
      return removeSlide(workspaceId, needDeck(), needSlide())
    case 'slides.slides.reorder':
      return reorderSlides(workspaceId, needDeck(), p.order)
    case 'slides.slides.move':
      return moveSlide(
        workspaceId,
        needDeck(),
        needSlide(),
        Number(p.toIndex ?? 0),
      )

    case 'slides.deck.publish':
      return requestPublish(workspaceId, needDeck())
    case 'slides.deck.unpublish':
      return unpublish(workspaceId, needDeck())
    case 'slides.deck.previewUrl':
      return { url: `/api/decks/${needDeck()}/preview` }

    case 'slides.templates.list':
      return listTemplates()
    case 'slides.templates.get': {
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
    case 'slides.decks.applyTemplate': {
      if (typeof p.templateId !== 'string') {
        throw new OperationError('missing_template', 'templateId is required')
      }
      return applyTemplate(workspaceId, needDeck(), p.templateId)
    }

    case 'slides.versions.list':
      return listVersions(workspaceId, needDeck())
    case 'slides.deck.revert': {
      if (typeof p.versionId !== 'string') {
        throw new OperationError('missing_version', 'versionId is required')
      }
      return revertDeck(workspaceId, needDeck(), p.versionId)
    }

    case 'slides.images.list':
      return (await listAssets(workspaceId, needDeck())).map((fileName) => ({
        fileName,
        path: `assets/${fileName}`,
      }))
    case 'slides.images.generate':
      return generateSlideImage(workspaceId, needDeck(), {
        prompt: String(p.prompt ?? ''),
        size: typeof p.size === 'string' ? p.size : undefined,
        fileName: typeof p.fileName === 'string' ? p.fileName : undefined,
      })
    case 'slides.images.edit':
      return editSlideImage(workspaceId, needDeck(), {
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

function contentTypeFor(file: string): string {
  const ext = file.toLowerCase().split('.').pop() ?? ''
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'svg':
      return 'image/svg+xml'
    case 'avif':
      return 'image/avif'
    case 'css':
      return 'text/css; charset=utf-8'
    case 'js':
      return 'text/javascript; charset=utf-8'
    case 'json':
      return 'application/json; charset=utf-8'
    case 'woff2':
      return 'font/woff2'
    case 'woff':
      return 'font/woff'
    default:
      return 'application/octet-stream'
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
