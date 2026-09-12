import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { isWithinDeepLTextRequestLimit } from '../lib/deepl-limits'
import { type Language, isLanguage, languageLabel } from '../lib/languages'
import { translateText } from '../lib/translation-service'
import {
  TRANSLATE_UI_VIEWS,
  type TranslateUiIntent,
  type TranslateUiView,
  type TranslationRecord,
} from '../lib/types'
import { type Context, Hono } from 'hono'
import { cors } from 'hono/cors'
import fs from 'node:fs/promises'
import { z } from 'zod'

const HISTORY_LIMIT = 100
const historyMutationQueues = new Map<string, Promise<void>>()

function boundedExcerpt(value: string, maximumLength = 72): string {
  const compact = value.replace(/\s+/g, ' ').trim()
  if (!compact) return 'Untitled translation'
  return compact.length <= maximumLength
    ? compact
    : `${compact.slice(0, maximumLength - 1).trimEnd()}…`
}

function nativeTranslationRecord(record: TranslationRecord) {
  return {
    ...record,
    sourceExcerpt: boundedExcerpt(record.sourceText),
    displayLabel: `Open translation: ${boundedExcerpt(record.sourceText, 48)}`,
    sourceLanguageLabel: languageLabel(record.sourceLanguage),
    targetLanguageLabel: languageLabel(record.targetLanguage),
    languagePairLabel: `${languageLabel(record.sourceLanguage)} → ${languageLabel(record.targetLanguage)}`,
    createdLabel: new Date(record.createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
  }
}

const languageCodeSchema = z.string().refine(isLanguage, {
  message: 'Unsupported language code',
})

const sourceSelectionSchema = z.union([z.literal('auto'), languageCodeSchema])

const translateRequestSchema = z
  .object({
    text: z.string(),
    from: sourceSelectionSchema.default('auto'),
    to: languageCodeSchema,
  })
  .refine(
    (input) => isWithinDeepLTextRequestLimit(input.text, input.from, input.to),
    {
      message: 'DeepL text translation requests must be 128 KiB or smaller.',
      path: ['text'],
    },
  )

const historyRecordSchema = z.object({
  sourceText: z.string(),
  translatedText: z.string(),
  requestedSource: sourceSelectionSchema,
  sourceLanguage: languageCodeSchema,
  targetLanguage: languageCodeSchema,
})

const persistedHistoryRecordSchema = historyRecordSchema.extend({
  id: z.string().min(1),
  createdAt: z.iso.datetime(),
})

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const historyListParamsSchema = z
  .object({
    limit: z.number().int().min(1).max(HISTORY_LIMIT).optional(),
  })
  .optional()

const historyDeleteParamsSchema = z
  .object({ id: z.string().trim().min(1).max(160) })
  .strict()
const emptyParamsSchema = z.object({}).strict().optional()

const detectParamsSchema = z
  .object({
    text: z.string().min(1),
  })
  .refine((input) => isWithinDeepLTextRequestLimit(input.text, 'auto', 'en'), {
    message: 'DeepL text translation requests must be 128 KiB or smaller.',
    path: ['text'],
  })

const translateUiViewSchema = z.enum(TRANSLATE_UI_VIEWS)
const uiDescribeParamsSchema = z.object({}).optional()
const uiNavigateParamsSchema = z.object({
  view: translateUiViewSchema,
  entityId: z.string().trim().min(1).max(160).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
})
const uiShowHistoryParamsSchema = z.object({}).optional()
const uiReadParamsSchema = z
  .object({
    view: translateUiViewSchema.optional(),
    entityId: z.string().trim().min(1).max(160).optional(),
  })
  .optional()

const TRANSLATE_UI_VIEW_DESCRIPTIONS = [
  {
    id: 'translator',
    name: 'Translation workspace',
    description:
      'The side-by-side source and translated text workspace. entityId may be a record id from translate.history.list to restore that translation.',
  },
  {
    id: 'history',
    name: 'Translation history',
    description:
      'The history sheet listing recent translations, newest first. Takes no entityId.',
  },
] satisfies Array<{
  id: TranslateUiView
  name: string
  description: string
}>

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

function getHistoryPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'history.json')
}

function getUiIntentPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'ui-intent.json')
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
  )
}

async function readJsonBody(
  c: Context,
): Promise<{ success: true; data: unknown } | { success: false }> {
  try {
    return { success: true, data: await c.req.json() }
  } catch {
    return { success: false }
  }
}

function historyQueueKey(workspaceId?: string): string {
  return workspaceId ?? '__default__'
}

function runHistoryMutation<T>(
  workspaceId: string | undefined,
  operation: () => Promise<T>,
): Promise<T> {
  const key = historyQueueKey(workspaceId)
  const previous = historyMutationQueues.get(key) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(operation)

  const cleanup = next
    .then(
      () => undefined,
      () => undefined,
    )
    .finally(() => {
      if (historyMutationQueues.get(key) === cleanup) {
        historyMutationQueues.delete(key)
      }
    })

  historyMutationQueues.set(key, cleanup)
  return next
}

async function loadHistory(workspaceId?: string): Promise<TranslationRecord[]> {
  try {
    const raw = await fs.readFile(getHistoryPath(workspaceId), 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    const records: TranslationRecord[] = []
    for (const record of parsed) {
      const result = persistedHistoryRecordSchema.safeParse(record)
      if (result.success) records.push(result.data)
    }

    return records.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  } catch {
    return []
  }
}

async function saveHistory(
  records: TranslationRecord[],
  workspaceId?: string,
): Promise<void> {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(getHistoryPath(workspaceId), records.slice(0, HISTORY_LIMIT))
}

async function deleteHistoryRecord(id: string, workspaceId?: string) {
  return runHistoryMutation(workspaceId, async () => {
    const history = await loadHistory(workspaceId)
    const next = history.filter((record) => record.id !== id)
    if (next.length === history.length) throw new Error('translation_not_found')
    await saveHistory(next, workspaceId)
    return { deleted: true, id, remaining: next.length }
  })
}

async function clearTranslationHistory(workspaceId?: string) {
  return runHistoryMutation(workspaceId, async () => {
    const history = await loadHistory(workspaceId)
    await saveHistory([], workspaceId)
    return { cleared: history.length }
  })
}

async function readUiIntent(
  workspaceId?: string,
): Promise<TranslateUiIntent | null> {
  return readJson<TranslateUiIntent | null>(getUiIntentPath(workspaceId), null)
}

async function writeUiIntent(
  workspaceId: string | undefined,
  input: {
    view: TranslateUiView
    entityId?: string
    params?: Record<string, unknown>
  },
) {
  await ensureDir(getAppDataDir(workspaceId))
  const intent: TranslateUiIntent = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: new Date().toISOString(),
  }
  await writeJson(getUiIntentPath(workspaceId), intent)
  return intent
}

async function resolveUiNavigation(
  workspaceId: string | undefined,
  input: z.infer<typeof uiNavigateParamsSchema>,
) {
  if (input.view === 'history' && input.entityId) {
    throw new Error('history_entity_not_supported')
  }
  if (input.entityId) {
    const history = await loadHistory(workspaceId)
    if (!history.some((record) => record.id === input.entityId)) {
      throw new Error('translation_not_found')
    }
  }
  return input
}

async function readTranslationView(
  workspaceId: string | undefined,
  params: z.infer<typeof uiReadParamsSchema>,
) {
  const history = await loadHistory(workspaceId)
  if (params?.entityId) {
    const record = history.find((item) => item.id === params.entityId)
    if (!record) throw new Error('translation_not_found')
    return {
      view: params.view ?? 'translator',
      translation: nativeTranslationRecord(record),
      emptyStates: [],
    }
  }
  const view = params?.view ?? 'history'
  const countLabel = `${history.length.toLocaleString()} ${history.length === 1 ? 'translation' : 'translations'}`
  return {
    view,
    count: history.length,
    countLabel,
    translations: history.map(nativeTranslationRecord),
    resultPanels: [],
    successNotices: [],
    emptyStates:
      view === 'translator'
        ? [
            {
              title: 'Ready to translate',
              description:
                'Type or paste text, then choose the language you want.',
            },
          ]
        : history.length === 0
          ? [
              {
                title: 'No translations yet',
                description:
                  'Translations you make on any device will appear here.',
              },
            ]
          : [],
    recentTranslations: history.slice(0, 4).map(nativeTranslationRecord),
    clearActions: history.length > 0 ? [{ count: history.length }] : [],
    recentSections:
      history.length > 0
        ? [{ title: 'Recent', subtitle: 'Private to this workspace' }]
        : [],
  }
}

async function addHistoryRecord(
  input: z.infer<typeof historyRecordSchema>,
  workspaceId?: string,
): Promise<TranslationRecord> {
  return runHistoryMutation(workspaceId, async () => {
    const record: TranslationRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    }
    const existing = await loadHistory(workspaceId)
    await saveHistory([record, ...existing], workspaceId)
    return record
  })
}

async function runTranslation(input: z.infer<typeof translateRequestSchema>) {
  const trimmed = input.text.trim()
  if (!trimmed) {
    return {
      translatedText: '',
      detectedSourceLanguage: (input.from === 'auto'
        ? 'en'
        : input.from) as Language,
    }
  }

  if (input.from !== 'auto' && input.from === input.to) {
    return {
      translatedText: input.text,
      detectedSourceLanguage: input.from,
    }
  }

  return translateText(input.text, input.from, input.to)
}

async function saveTranslationToHistory(
  input: z.infer<typeof translateRequestSchema>,
  result: Awaited<ReturnType<typeof runTranslation>>,
  workspaceId?: string,
): Promise<void> {
  if (!input.text.trim() || !result.translatedText.trim()) return

  await addHistoryRecord(
    {
      sourceText: input.text,
      translatedText: result.translatedText,
      requestedSource: input.from,
      sourceLanguage:
        input.from === 'auto' ? result.detectedSourceLanguage : input.from,
      targetLanguage: input.to,
    },
    workspaceId,
  )
}

function isMissingCredentialError(message: string): boolean {
  return (
    message.includes('deepl/translate') ||
    message.includes('CredentialNotFound') ||
    message.toLowerCase().includes('credential')
  )
}

export function projectTranslationFailureNotices(message: string) {
  return [
    isMissingCredentialError(message)
      ? {
          title: 'Translation unavailable',
          message:
            'Connect DeepL credentials in the desktop Translate app, then try again.',
        }
      : {
          title: 'Translation failed',
          message:
            'The translation provider could not complete this request. Try again.',
        },
  ]
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'translate',
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
  const generatedAt = new Date().toISOString()
  let resume: unknown = null

  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const history = await loadHistory(workspaceId)

    const now = Date.now()
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000

    // Resume the most recent translation, but only while it is genuinely fresh.
    // A translation tool has no pending work to nag about, so items stay empty;
    // we only offer to pick the last phrase back up if it was recent.
    const latest = history.find((record) => {
      const at = new Date(record.createdAt).getTime()
      return (
        Number.isFinite(at) &&
        now - at <= threeDaysMs &&
        record.sourceText.trim().length > 0
      )
    })

    if (latest) {
      const preview =
        latest.sourceText.trim().length > 60
          ? `${latest.sourceText.trim().slice(0, 60)}…`
          : latest.sourceText.trim()
      resume = {
        title: preview,
        subtitle: `${latest.sourceLanguage.toUpperCase()} → ${latest.targetLanguage.toUpperCase()}`,
        icon: '🌐',
        lastTouchedAt: latest.createdAt,
      }
    }
  } catch (error) {
    console.error('Translate today endpoint failed:', error)
    return c.json({ items: [], resume: null, generatedAt })
  }

  return c.json({ items: [], resume, generatedAt })
})

app.post('/api/translate', async (c) => {
  try {
    const body = await readJsonBody(c)
    if (!body.success) return c.json({ error: 'Invalid JSON' }, 400)

    const parsed = translateRequestSchema.safeParse(body.data)

    if (!parsed.success) {
      return c.json(
        { error: `Invalid request: ${parsed.error.issues[0]?.message}` },
        400,
      )
    }

    const result = await runTranslation(parsed.data)
    return c.json(result)
  } catch (error) {
    console.error('Translation error:', error)
    const message =
      error instanceof Error ? error.message : 'Translation failed'
    return c.json(
      { error: message },
      isMissingCredentialError(message) ? 502 : 500,
    )
  }
})

app.get('/api/history', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    return c.json(await loadHistory(workspaceId))
  } catch (error) {
    console.error('Failed to read history:', error)
    return c.json({ error: 'Failed to read history' }, 500)
  }
})

app.get('/api/moldable/ui-intent', async (c) => {
  try {
    return c.json(await readUiIntent(getWorkspaceFromRequest(c.req.raw)))
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to read UI intent',
      },
      500,
    )
  }
})

app.delete('/api/moldable/ui-intent', async (c) => {
  try {
    const id = c.req.query('id')
    if (!id) return c.json({ error: 'An intent id is required.' }, 400)
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const intent = await readUiIntent(workspaceId)
    const deleted = intent?.id === id
    if (deleted) {
      await fs.unlink(getUiIntentPath(workspaceId)).catch((error: unknown) => {
        if (
          !(
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
          )
        ) {
          throw error
        }
      })
    }
    return c.json({ ok: true, deleted })
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to acknowledge UI intent',
      },
      500,
    )
  }
})

app.post('/api/history', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const body = await readJsonBody(c)
    if (!body.success) return c.json({ error: 'Invalid JSON' }, 400)

    const parsed = historyRecordSchema.safeParse(body.data)
    if (!parsed.success) {
      return c.json(
        { error: `Invalid request: ${parsed.error.issues[0]?.message}` },
        400,
      )
    }
    const record = await addHistoryRecord(parsed.data, workspaceId)
    return c.json(record)
  } catch (error) {
    console.error('Failed to save history:', error)
    return c.json({ error: 'Failed to save history' }, 500)
  }
})

app.delete('/api/history/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const id = c.req.param('id')
    await runHistoryMutation(workspaceId, async () => {
      const existing = await loadHistory(workspaceId)
      await saveHistory(
        existing.filter((record) => record.id !== id),
        workspaceId,
      )
    })
    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to delete history record:', error)
    return c.json({ error: 'Failed to delete history record' }, 500)
  }
})

app.delete('/api/history', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    await runHistoryMutation(workspaceId, () => saveHistory([], workspaceId))
    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to clear history:', error)
    return c.json({ error: 'Failed to clear history' }, 500)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const rawBody = await readJsonBody(c)
    if (!rawBody.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Translate received invalid JSON.',
          },
        },
        400,
      )
    }

    const body = rpcRequestSchema.parse(rawBody.data)

    if (
      body.method === 'translate.cards.present' ||
      body.method === 'translate.cards.read'
    ) {
      const { id } = z
        .object({ id: z.string().min(1).max(256) })
        .strict()
        .parse(body.params)
      const record = (await loadHistory(workspaceId)).find(
        (item) => item.id === id,
      )
      if (!record)
        return c.json(
          {
            ok: false,
            error: {
              code: 'record_not_found',
              message: 'This translation is no longer available.',
            },
          },
          404,
        )
      const title = (record.sourceText.slice(0, 80) || 'Translation').slice(
        0,
        240,
      )
      if (body.method === 'translate.cards.read')
        return c.json({
          ok: true,
          result: {
            id,
            title,
            sourceLanguage: record.sourceLanguage,
            targetLanguage: record.targetLanguage,
            source: record.sourceText.slice(0, 20_000),
            translation: record.translatedText.slice(0, 20_000),
            truncated:
              record.sourceText.length > 20_000 ||
              record.translatedText.length > 20_000,
          },
        })
      return c.json({
        ok: true,
        result: {
          appCard: {
            version: 1,
            title,
            resourcePath: '/index.html?card=translation',
            input: { id },
            readMethod: 'translate.cards.read',
            actions: [],
            height: 360,
          },
        },
      })
    }

    if (body.method === 'translate.ui.describe') {
      uiDescribeParamsSchema.parse(body.params)
      return c.json({
        ok: true,
        result: {
          views: TRANSLATE_UI_VIEW_DESCRIPTIONS,
          entities: 'Use translation record ids from translate.history.list.',
        },
      })
    }

    if (body.method === 'translate.ui.navigate') {
      const params = await resolveUiNavigation(
        workspaceId,
        uiNavigateParamsSchema.parse(body.params),
      )
      const intent = await writeUiIntent(workspaceId, params)
      return c.json({
        ok: true,
        result: { ok: true, intentId: intent.id },
      })
    }

    if (body.method === 'translate.ui.showHistory') {
      uiShowHistoryParamsSchema.parse(body.params)
      const intent = await writeUiIntent(workspaceId, { view: 'history' })
      return c.json({
        ok: true,
        result: { ok: true, intentId: intent.id },
      })
    }

    if (body.method === 'translate.ui.read') {
      const params = uiReadParamsSchema.parse(body.params)
      return c.json({
        ok: true,
        result: await readTranslationView(workspaceId, params),
      })
    }

    if (body.method === 'translate.text') {
      const params = translateRequestSchema.parse(body.params)
      let result: Awaited<ReturnType<typeof runTranslation>>
      try {
        result = await runTranslation(params)
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Translate could not complete the request.'
        return c.json({
          ok: true,
          result: {
            resultPanels: [],
            failureNotices: projectTranslationFailureNotices(message),
          },
        })
      }
      await saveTranslationToHistory(params, result, workspaceId)
      const updatedHistory = await loadHistory(workspaceId)
      const recentTranslations = updatedHistory
        .slice(0, 4)
        .map(nativeTranslationRecord)
      return c.json({
        ok: true,
        result: {
          ...result,
          resultPanels: result.translatedText
            ? [
                {
                  translatedText: result.translatedText,
                  detectedSourceLanguage: result.detectedSourceLanguage,
                  detectedSourceLanguageLabel: languageLabel(
                    result.detectedSourceLanguage,
                  ),
                  targetLanguage: params.to,
                  targetLanguageLabel: languageLabel(params.to),
                },
              ]
            : [],
          successNotices: result.translatedText
            ? [
                {
                  title: 'Translated',
                  message: 'Saved to translation history.',
                },
              ]
            : [],
          emptyStates: result.translatedText
            ? []
            : [
                {
                  title: 'Nothing to translate',
                  description: 'Enter some text and try again.',
                },
              ],
          failureNotices: [],
          recentTranslations,
          recentSections:
            recentTranslations.length > 0
              ? [{ title: 'Recent', subtitle: 'Private to this workspace' }]
              : [],
        },
      })
    }

    if (body.method === 'translate.detect') {
      const params = detectParamsSchema.parse(body.params)
      // Detect by asking DeepL to translate to English and reading back the
      // source language it identified.
      const result = await translateText(params.text, 'auto', 'en')
      return c.json({
        ok: true,
        result: { language: result.detectedSourceLanguage },
      })
    }

    if (body.method === 'translate.history.list') {
      const params = historyListParamsSchema.parse(body.params)
      const history = await loadHistory(workspaceId)
      return c.json({
        ok: true,
        result: history.slice(0, params?.limit ?? 50),
      })
    }

    if (body.method === 'translate.history.delete') {
      const params = historyDeleteParamsSchema.parse(body.params)
      return c.json({
        ok: true,
        result: await deleteHistoryRecord(params.id, workspaceId),
      })
    }

    if (body.method === 'translate.history.clear') {
      emptyParamsSchema.parse(body.params)
      return c.json({
        ok: true,
        result: await clearTranslationHistory(workspaceId),
      })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Translate does not expose ${body.method}.`,
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
            message: 'Translate received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    const message =
      error instanceof Error
        ? error.message
        : 'Translate could not complete the request.'

    if (isMissingCredentialError(message)) {
      return c.json(
        {
          ok: false,
          error: { code: 'translation_failed', message },
        },
        502,
      )
    }

    if (message === 'translation_not_found') {
      return c.json(
        {
          ok: false,
          error: {
            code: 'translation_not_found',
            message: 'Translation record was not found.',
          },
        },
        404,
      )
    }

    if (message === 'history_entity_not_supported') {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_navigation',
            message: 'The history view does not take an entityId.',
          },
        },
        400,
      )
    }

    console.error('Translate RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: { code: 'translate_rpc_failed', message },
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
