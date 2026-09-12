import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  safePath,
  sanitizeId,
} from '@moldable-ai/storage'
import type { Note } from '../lib/types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import fs from 'node:fs/promises'
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
const appUrlOrigin = (() => {
  const appUrl = process.env.MOLDABLE_APP_URL
  if (!appUrl) return null

  try {
    return new URL(appUrl).origin
  } catch {
    return null
  }
})()

app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (!origin) return ''
      if (appUrlOrigin && origin === appUrlOrigin) return origin
      return ''
    },
  }),
)

const workspaceIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/)

const isoDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)))

const noteSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9_-]+$/),
  title: z.string(),
  content: z.string(),
  isPinned: z.boolean(),
  isArchived: z.boolean(),
  isDeleted: z.boolean(),
  labels: z.array(z.string()),
  color: z.string().optional(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

const notesBulkSaveSchema = z.array(noteSchema)

const notePatchSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  labels: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  color: z.string().optional(),
})

class NotesValidationError extends Error {}

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const notesListParamsSchema = z
  .object({
    query: z.string().optional(),
    includeArchived: z.boolean().optional(),
    includeDeleted: z.boolean().optional(),
    includeContent: z.boolean().optional(),
    label: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional()

const noteGetParamsSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9_-]+$/),
})

const noteCreateParamsSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  labels: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  color: z.string().optional(),
})
const notesDriveCreateNoteParamsSchema = noteCreateParamsSchema.strict()

const noteUpdateParamsSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9_-]+$/),
  title: z.string().optional(),
  content: z.string().optional(),
  labels: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  color: z.string().optional(),
})

const nativeLabelChoiceSchema = z.enum([
  'label-1',
  'label-2',
  'label-3',
  'label-4',
  'label-5',
  'label-6',
  'label-7',
  'label-8',
])

const nativeUpdateLabelsParamsSchema = z
  .object({
    id: noteGetParamsSchema.shape.id,
    labelChoices: z.array(nativeLabelChoiceSchema).max(8),
  })
  .strict()

const notesDriveViewSchema = z.enum(['notes', 'note'])
const notesDriveEmptyParamsSchema = z.object({}).strict()
const notesDriveNavigateParamsSchema = z
  .object({
    view: notesDriveViewSchema,
    entityId: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(),
    params: z.object({}).strict().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.view === 'note' && !value.entityId) {
      ctx.addIssue({
        code: 'custom',
        message: 'entityId is required for the note view',
        path: ['entityId'],
      })
    }
    if (value.view === 'notes' && value.entityId) {
      ctx.addIssue({
        code: 'custom',
        message: 'entityId is not supported for the notes view',
        path: ['entityId'],
      })
    }
  })
const notesDriveOpenNoteParamsSchema = z
  .object({
    noteId: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[a-zA-Z0-9_-]+$/),
  })
  .strict()
const notesDriveReadParamsSchema = z.object({
  view: notesDriveViewSchema.optional(),
  entityId: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
})

const notesNativeReadParamsSchema = z
  .object({
    route: z.enum(['home', 'search', 'note']),
    view: z.enum(['active', 'archived', 'trash']).optional(),
    id: z.string().min(1).max(255).optional(),
    query: z.string().max(200).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.route === 'note' && !value.id) {
      context.addIssue({
        code: 'custom',
        path: ['id'],
        message: 'id is required for the note route.',
      })
    }
    if (value.route === 'search' && !value.query?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['query'],
        message: 'query is required for note search.',
      })
    }
  })

const notesUiIntentSchema = z.object({
  id: z.string().uuid(),
  view: notesDriveViewSchema,
  entityId: z.string().optional(),
  createdAt: isoDateSchema,
})

type NotesUiIntent = z.infer<typeof notesUiIntentSchema>

function getNotesDir(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'notes')
}

function getNotePath(id: string, workspaceId?: string): string {
  const safeId = sanitizeId(id)
  return safePath(getNotesDir(workspaceId), `${safeId}.json`)
}

function getUiIntentPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'ui-intent.json')
}

function validateWorkspaceId(
  workspaceId: string | undefined,
): string | undefined {
  if (!workspaceId) return undefined
  return workspaceIdSchema.parse(workspaceId)
}

function getHttpWorkspaceId(request: Request): string | undefined {
  return validateWorkspaceId(getWorkspaceFromRequest(request))
}

function assertUniqueNoteIds(notes: Note[]) {
  const ids = new Set<string>()

  for (const note of notes) {
    if (ids.has(note.id)) {
      throw new NotesValidationError(`Duplicate note ID "${note.id}"`)
    }
    ids.add(note.id)
  }
}

async function loadNotes(workspaceId?: string): Promise<Note[]> {
  const notesDir = getNotesDir(workspaceId)
  try {
    await ensureDir(notesDir)
    const files = await fs.readdir(notesDir)
    const jsonFiles = files.filter((file) => file.endsWith('.json'))

    const notes: Note[] = []
    for (const file of jsonFiles) {
      try {
        const filePath = safePath(notesDir, file)
        const data = await fs.readFile(filePath, 'utf-8')
        const parsed = noteSchema.safeParse(JSON.parse(data))
        if (parsed.success) {
          notes.push(parsed.data)
        } else {
          console.warn(`Skipping invalid note file: ${file}`)
        }
      } catch (error) {
        console.warn(`Skipping unreadable note file: ${file}`, error)
      }
    }

    return notes.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  } catch {
    return []
  }
}

async function readNote(
  id: string,
  workspaceId?: string,
): Promise<Note | null> {
  try {
    const data = await fs.readFile(getNotePath(id, workspaceId), 'utf-8')
    return noteSchema.parse(JSON.parse(data))
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${crypto.randomUUID()}.tmp`
  const content = JSON.stringify(data, null, 2)

  try {
    await fs.writeFile(tempPath, content, 'utf-8')
    await fs.rename(tempPath, filePath)
  } catch (error) {
    await fs.unlink(tempPath).catch(() => undefined)
    throw error
  }
}

async function saveNote(note: Note, workspaceId?: string): Promise<void> {
  await ensureDir(getNotesDir(workspaceId))
  const validatedNote = noteSchema.parse(note)
  await writeJsonAtomic(
    getNotePath(validatedNote.id, workspaceId),
    validatedNote,
  )
}

async function createNote(
  params: z.infer<typeof noteCreateParamsSchema>,
  workspaceId?: string,
): Promise<Note> {
  const now = new Date().toISOString()
  const note: Note = {
    id: crypto.randomUUID(),
    title: params.title ?? '',
    content: params.content ?? '',
    isPinned: params.isPinned ?? false,
    isArchived: params.isArchived ?? false,
    isDeleted: false,
    labels: params.labels ?? [],
    color: params.color,
    createdAt: now,
    updatedAt: now,
  }

  await saveNote(note, workspaceId)
  return note
}

async function readUiIntent(
  workspaceId?: string,
): Promise<NotesUiIntent | null> {
  try {
    const data = await fs.readFile(getUiIntentPath(workspaceId), 'utf-8')
    if (JSON.parse(data) === null) return null
    return notesUiIntentSchema.parse(JSON.parse(data))
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

async function writeUiIntent(
  workspaceId: string | undefined,
  view: NotesUiIntent['view'],
  entityId?: string,
) {
  await ensureDir(getAppDataDir(workspaceId))
  const intent: NotesUiIntent = {
    id: crypto.randomUUID(),
    view,
    ...(entityId ? { entityId } : {}),
    createdAt: new Date().toISOString(),
  }
  await writeJsonAtomic(getUiIntentPath(workspaceId), intent)
  return intent
}

async function acknowledgeUiIntent(
  workspaceId: string | undefined,
  intentId?: string,
) {
  const intent = await readUiIntent(workspaceId)
  if (intent && intentId && intent.id !== intentId) return false
  await ensureDir(getAppDataDir(workspaceId))
  await writeJsonAtomic(getUiIntentPath(workspaceId), null)
  return true
}

async function replaceNotes(
  notes: Note[],
  workspaceId?: string,
): Promise<void> {
  assertUniqueNoteIds(notes)
  await ensureDir(getNotesDir(workspaceId))

  const existingNotes = await loadNotes(workspaceId)
  const newIds = new Set(notes.map((note) => note.id))
  const stagedWrites: Array<{ tempPath: string; finalPath: string }> = []

  try {
    for (const note of notes) {
      const finalPath = getNotePath(note.id, workspaceId)
      const tempPath = `${finalPath}.${process.pid}.${Date.now()}.${crypto.randomUUID()}.tmp`
      await fs.writeFile(tempPath, JSON.stringify(note, null, 2), 'utf-8')
      stagedWrites.push({ tempPath, finalPath })
    }

    for (const staged of stagedWrites) {
      await fs.rename(staged.tempPath, staged.finalPath)
    }

    for (const existing of existingNotes) {
      if (!newIds.has(existing.id)) {
        await deleteNote(existing.id, workspaceId)
      }
    }
  } catch (error) {
    await Promise.all(
      stagedWrites.map((staged) =>
        fs.unlink(staged.tempPath).catch(() => undefined),
      ),
    )
    throw error
  }
}

async function deleteNote(id: string, workspaceId?: string): Promise<void> {
  try {
    await fs.unlink(getNotePath(id, workspaceId))
  } catch {
    // Ignore deletion errors, including files already being gone.
  }
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return validateWorkspaceId(
    request.headers.get('x-moldable-workspace-id') ??
      getWorkspaceFromRequest(request),
  )
}

function summarizeNote(note: Note, includeContent = false): Note {
  return includeContent
    ? note
    : {
        ...note,
        content:
          note.content.length > 400
            ? `${note.content.slice(0, 400)}...`
            : note.content,
      }
}

function plainNoteText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatNoteDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function nativeNoteSummary(note: Note) {
  const snippet = plainNoteText(note.content)
  return {
    id: note.id,
    title: note.title.trim() || 'Untitled note',
    snippet: snippet
      ? snippet.length > 160
        ? `${snippet.slice(0, 157).trimEnd()}…`
        : snippet
      : 'No preview',
    updatedAt: note.updatedAt,
    updatedAtLabel: formatNoteDate(note.updatedAt),
    status: note.isDeleted
      ? 'Trash'
      : note.isArchived
        ? 'Archived'
        : note.isPinned
          ? 'Pinned'
          : '',
    metadata: [note.isPinned ? 'Pinned' : '', ...note.labels]
      .filter(Boolean)
      .join(' · '),
    labels: note.labels,
    canPin: !note.isPinned && !note.isDeleted,
    canUnpin: note.isPinned && !note.isDeleted,
    pinActionLabel: note.isPinned ? 'Unpin' : 'Pin',
    nextPinned: !note.isPinned,
  }
}

function nativeLabelCatalog(notes: Note[], target: Note) {
  const current = [...new Set(target.labels)].sort((a, b) => a.localeCompare(b))
  const remaining = [...new Set(notes.flatMap((note) => note.labels))]
    .filter((label) => !current.includes(label))
    .sort((a, b) => a.localeCompare(b))
  return [...current, ...remaining].slice(0, 8)
}

function nativeLabelProjection(notes: Note[], target: Note) {
  const catalog = nativeLabelCatalog(notes, target)
  return {
    labelChoices: target.labels.flatMap((label) => {
      const index = catalog.indexOf(label)
      return index === -1 ? [] : [`label-${index + 1}`]
    }),
    labelOptionLabels: [
      ...catalog,
      ...Array.from(
        { length: Math.max(0, 8 - catalog.length) },
        () => 'Unused label slot',
      ),
    ],
    labelPickerHelp:
      catalog.length > 0
        ? 'Choose from up to eight workspace labels.'
        : 'Create labels in Notes on your Mac before assigning them here.',
  }
}

function filterNotes(
  notes: Note[],
  params: z.infer<typeof notesListParamsSchema>,
) {
  let result = [...notes]

  if (!params?.includeArchived) {
    result = result.filter((note) => !note.isArchived)
  }
  if (!params?.includeDeleted) {
    result = result.filter((note) => !note.isDeleted)
  }
  if (params?.label?.trim()) {
    result = result.filter((note) => note.labels.includes(params.label!))
  }
  if (params?.query?.trim()) {
    const query = params.query.toLowerCase()
    result = result.filter((note) =>
      [note.title, note.content, ...note.labels]
        .join('\n')
        .toLowerCase()
        .includes(query),
    )
  }

  return result
    .slice(0, params?.limit ?? 100)
    .map((note) => summarizeNote(note, params?.includeContent))
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'notes',
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

// Notes intentionally does not contribute to the Today view — quick capture
// has no deadline / blocked / in-progress state worth nudging about. Silent.
app.get('/api/moldable/today', (c) => {
  return c.json({
    items: [],
    resume: null,
    generatedAt: new Date().toISOString(),
  })
})

app.get('/api/notes', async (c) => {
  try {
    const workspaceId = getHttpWorkspaceId(c.req.raw)
    const notes = await loadNotes(workspaceId)
    return c.json(notes)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid workspace ID' }, 400)
    }

    console.error('Failed to read notes:', error)
    return c.json({ error: 'Failed to read notes' }, 500)
  }
})

app.patch('/api/notes/:id', async (c) => {
  try {
    const workspaceId = getHttpWorkspaceId(c.req.raw)
    const { id } = noteGetParamsSchema.parse({ id: c.req.param('id') })
    const patch = notePatchSchema.parse(await c.req.json())
    const note = await readNote(id, workspaceId)

    if (!note) {
      return c.json({ error: 'Note not found' }, 404)
    }

    const updated: Note = {
      ...note,
      ...patch,
      updatedAt: new Date().toISOString(),
    }

    await saveNote(updated, workspaceId)
    return c.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid note update' }, 400)
    }

    console.error('Failed to update note:', error)
    return c.json({ error: 'Failed to update note' }, 500)
  }
})

app.delete('/api/notes/:id', async (c) => {
  try {
    const workspaceId = getHttpWorkspaceId(c.req.raw)
    const { id } = noteGetParamsSchema.parse({ id: c.req.param('id') })
    await deleteNote(id, workspaceId)
    return c.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid note ID' }, 400)
    }

    console.error('Failed to delete note:', error)
    return c.json({ error: 'Failed to delete note' }, 500)
  }
})

app.post('/api/notes', async (c) => {
  try {
    const workspaceId = getHttpWorkspaceId(c.req.raw)
    const body = await c.req.json()

    if (Array.isArray(body)) {
      const notes = notesBulkSaveSchema.parse(body)
      assertUniqueNoteIds(notes)
      await replaceNotes(notes, workspaceId)
      return c.json({ success: true })
    }

    const note = noteSchema.parse(body)
    await saveNote(note, workspaceId)
    return c.json({ success: true, note })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof NotesValidationError) {
      return c.json({ error: 'Invalid notes payload' }, 400)
    }

    console.error('Failed to save notes:', error)
    return c.json({ error: 'Failed to save notes' }, 500)
  }
})

app.get('/api/moldable/ui-intent', async (c) => {
  try {
    return c.json(await readUiIntent(getHttpWorkspaceId(c.req.raw)))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid workspace or UI intent' }, 400)
    }
    return c.json({ error: 'Failed to read UI intent' }, 500)
  }
})

app.delete('/api/moldable/ui-intent', async (c) => {
  try {
    const acknowledged = await acknowledgeUiIntent(
      getHttpWorkspaceId(c.req.raw),
      c.req.query('id'),
    )
    if (!acknowledged) {
      return c.json(
        {
          ok: false,
          error: { code: 'intent_mismatch', message: 'Intent changed.' },
        },
        409,
      )
    }
    return c.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid workspace or UI intent' }, 400)
    }
    return c.json({ error: 'Failed to acknowledge UI intent' }, 500)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = rpcRequestSchema.parse(await c.req.json())
    const notes = await loadNotes(workspaceId)

    if (
      body.method === 'notes.cards.present' ||
      body.method === 'notes.cards.read'
    ) {
      const { id } = noteGetParamsSchema.parse(body.params)
      const note = notes.find((note) => note.id === id && !note.isDeleted)
      if (!note)
        return c.json(
          {
            ok: false,
            error: {
              code: 'note_not_found',
              message: 'This note is no longer available.',
            },
          },
          404,
        )
      if (body.method === 'notes.cards.read')
        return c.json({
          ok: true,
          result: {
            id: note.id,
            title: note.title.slice(0, 240),
            content: note.content.slice(0, 30_000),
            isDeleted: note.isDeleted,
            truncated: note.content.length > 30_000,
          },
        })
      return c.json({
        ok: true,
        result: {
          appCard: {
            version: 1,
            title: (note.title || 'Note').slice(0, 240),
            resourcePath: '/index.html?card=note',
            input: { id },
            readMethod: 'notes.cards.read',
            actions: [],
            height: 400,
          },
        },
      })
    }

    if (body.method === 'notes.ui.describe') {
      notesDriveEmptyParamsSchema.parse(body.params ?? {})
      return c.json({
        ok: true,
        result: {
          appId: 'notes',
          views: [
            {
              id: 'notes',
              description:
                'The note library with pinned notes, labels, archive, trash, and search.',
            },
            {
              id: 'note',
              description:
                'The markdown editor for one existing note, addressed by entityId.',
              entityId: 'A note ID from notes.ui.read or notes.list.',
            },
          ],
        },
      })
    }

    if (body.method === 'notes.ui.navigate') {
      const params = notesDriveNavigateParamsSchema.parse(body.params)
      if (
        params.entityId &&
        !notes.some((note) => note.id === params.entityId)
      ) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'note_not_found',
              message: `Note ${params.entityId} was not found.`,
            },
          },
          404,
        )
      }
      const intent = await writeUiIntent(
        workspaceId,
        params.view,
        params.entityId,
      )
      return c.json({
        ok: true,
        result: { ok: true, intentId: intent.id },
      })
    }

    if (body.method === 'notes.ui.openNote') {
      const params = notesDriveOpenNoteParamsSchema.parse(body.params)
      if (!notes.some((note) => note.id === params.noteId)) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'note_not_found',
              message: `Note ${params.noteId} was not found.`,
            },
          },
          404,
        )
      }
      const intent = await writeUiIntent(workspaceId, 'note', params.noteId)
      return c.json({
        ok: true,
        result: { ok: true, intentId: intent.id },
      })
    }

    if (body.method === 'notes.ui.createNote') {
      const params = notesDriveCreateNoteParamsSchema.parse(body.params ?? {})
      const note = await createNote(params, workspaceId)
      const intent = await writeUiIntent(workspaceId, 'note', note.id)
      return c.json({
        ok: true,
        result: {
          ok: true,
          intentId: intent.id,
          noteId: note.id,
          title: note.title,
          content: note.content,
        },
      })
    }

    if (body.method === 'notes.ui.read') {
      const params = notesDriveReadParamsSchema.parse(body.params ?? {})
      if (params.entityId) {
        const note = notes.find((item) => item.id === params.entityId)
        if (!note) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'note_not_found',
                message: `Note ${params.entityId} was not found.`,
              },
            },
            404,
          )
        }
        return c.json({ ok: true, result: { view: 'note', note } })
      }

      return c.json({
        ok: true,
        result: {
          view: 'notes',
          summary: {
            total: notes.length,
            active: notes.filter((note) => !note.isArchived && !note.isDeleted)
              .length,
            archived: notes.filter((note) => note.isArchived && !note.isDeleted)
              .length,
            deleted: notes.filter((note) => note.isDeleted).length,
            pinned: notes.filter((note) => note.isPinned && !note.isDeleted)
              .length,
          },
          notes,
        },
      })
    }

    if (body.method === 'notes.native.read') {
      const params = notesNativeReadParamsSchema.parse(body.params)
      if (params.route === 'note') {
        const note = notes.find((item) => item.id === params.id)
        if (!note) {
          return c.json(
            {
              ok: false,
              error: {
                code: 'note_not_found',
                message: `Note ${params.id} was not found.`,
              },
            },
            404,
          )
        }
        return c.json({
          ok: true,
          result: {
            id: note.id,
            title: note.title.trim() || 'Untitled note',
            titleDraft: note.title,
            contentDraft: note.content.slice(0, 48_000),
            contentDisplay:
              note.content.trim().slice(0, 48_000) || 'This note is empty.',
            truncationNotice:
              note.content.trim().length > 48_000
                ? 'This long note is abbreviated on iPhone. Open Notes on your Mac to read the complete text.'
                : '',
            updatedAt: note.updatedAt,
            updatedAtLabel: formatNoteDate(note.updatedAt),
            statusTags: [
              ...(note.isPinned ? ['Pinned'] : []),
              ...(note.isArchived ? ['Archived'] : []),
              ...(note.isDeleted ? ['Trash'] : []),
              ...note.labels,
            ],
            canEdit: !note.isDeleted,
            canPin: !note.isPinned && !note.isDeleted,
            canUnpin: note.isPinned && !note.isDeleted,
            canTrash: !note.isDeleted,
            canRestore: note.isDeleted,
            ...nativeLabelProjection(notes, note),
          },
        })
      }

      const query = params.route === 'search' ? params.query : undefined
      const view = params.view ?? 'active'
      const candidates =
        view === 'trash'
          ? notes.filter((note) => note.isDeleted)
          : view === 'archived'
            ? notes.filter((note) => note.isArchived && !note.isDeleted)
            : notes.filter((note) => !note.isArchived && !note.isDeleted)
      const visible = filterNotes(candidates, {
        query,
        includeArchived: true,
        includeDeleted: true,
        includeContent: true,
        limit: params.limit ?? 30,
      })
      const viewTitle =
        params.route === 'search'
          ? 'Search results'
          : view === 'archived'
            ? 'Archived'
            : view === 'trash'
              ? 'Trash'
              : 'Notes'
      return c.json({
        ok: true,
        result: {
          title: viewTitle,
          subtitle:
            params.route === 'search'
              ? `${visible.length} ${visible.length === 1 ? 'match' : 'matches'}`
              : `${visible.length} ${view === 'active' ? 'active ' : ''}${visible.length === 1 ? 'note' : 'notes'}`,
          notes: visible.map(nativeNoteSummary),
          archivedCountLabel: String(
            notes.filter((note) => note.isArchived && !note.isDeleted).length,
          ),
          trashCountLabel: String(
            notes.filter((note) => note.isDeleted).length,
          ),
          emptyStates:
            visible.length === 0
              ? [
                  {
                    title:
                      params.route === 'search'
                        ? 'No matching notes'
                        : view === 'archived'
                          ? 'No archived notes'
                          : view === 'trash'
                            ? 'Trash is empty'
                            : 'No notes yet',
                    description:
                      params.route === 'search'
                        ? 'Try another word or phrase.'
                        : view === 'archived'
                          ? 'Archived notes appear here.'
                          : view === 'trash'
                            ? 'Notes moved to Trash appear here until restored on iPhone or permanently removed on Mac.'
                            : 'Create your first note on iPhone.',
                  },
                ]
              : [],
        },
      })
    }

    if (body.method === 'notes.list' || body.method === 'notes.search') {
      const params = notesListParamsSchema.parse(body.params)
      return c.json({ ok: true, result: filterNotes(notes, params) })
    }

    if (body.method === 'notes.get') {
      const params = noteGetParamsSchema.parse(body.params)
      const note = notes.find((item) => item.id === params.id)

      if (!note) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'note_not_found',
              message: `Note ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      return c.json({ ok: true, result: note })
    }

    if (body.method === 'notes.create') {
      const params = noteCreateParamsSchema.parse(body.params)
      return c.json({
        ok: true,
        result: await createNote(params, workspaceId),
      })
    }

    if (body.method === 'notes.update') {
      const params = noteUpdateParamsSchema.parse(body.params)
      const note = notes.find((item) => item.id === params.id)

      if (!note) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'note_not_found',
              message: `Note ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      const updated: Note = {
        ...note,
        ...('title' in params ? { title: params.title } : {}),
        ...('content' in params ? { content: params.content } : {}),
        ...('labels' in params ? { labels: params.labels } : {}),
        ...('isPinned' in params ? { isPinned: params.isPinned } : {}),
        ...('isArchived' in params ? { isArchived: params.isArchived } : {}),
        ...('isDeleted' in params ? { isDeleted: params.isDeleted } : {}),
        ...('color' in params ? { color: params.color } : {}),
        updatedAt: new Date().toISOString(),
      }

      await saveNote(updated, workspaceId)
      return c.json({ ok: true, result: updated })
    }

    if (body.method === 'notes.native.setPin') {
      const params = z
        .object({
          id: noteGetParamsSchema.shape.id,
          isPinned: z.boolean(),
        })
        .strict()
        .parse(body.params)
      const note = notes.find((item) => item.id === params.id)
      if (!note) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'note_not_found',
              message: `Note ${params.id} was not found.`,
            },
          },
          404,
        )
      }
      const updated: Note = {
        ...note,
        isPinned: params.isPinned,
        updatedAt: new Date().toISOString(),
      }
      await saveNote(updated, workspaceId)
      return c.json({ ok: true, result: updated })
    }

    if (body.method === 'notes.native.updateLabels') {
      const params = nativeUpdateLabelsParamsSchema.parse(body.params)
      const note = notes.find((item) => item.id === params.id)
      if (!note) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'note_not_found',
              message: `Note ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      const catalog = nativeLabelCatalog(notes, note)
      const labels = params.labelChoices.flatMap((choice) => {
        const index = Number(choice.slice('label-'.length)) - 1
        const label = catalog[index]
        return label ? [label] : []
      })
      const updated: Note = {
        ...note,
        labels: [...new Set(labels)],
        updatedAt: new Date().toISOString(),
      }
      await saveNote(updated, workspaceId)
      return c.json({ ok: true, result: updated })
    }

    if (body.method === 'notes.delete') {
      const params = noteGetParamsSchema.parse(body.params)
      const note = notes.find((item) => item.id === params.id)

      if (!note) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'note_not_found',
              message: `Note ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      const deleted: Note = {
        ...note,
        isDeleted: true,
        isPinned: false,
        updatedAt: new Date().toISOString(),
      }
      await saveNote(deleted, workspaceId)
      return c.json({ ok: true, result: deleted })
    }

    if (body.method === 'notes.restore') {
      const params = noteGetParamsSchema.parse(body.params)
      const note = notes.find((item) => item.id === params.id)

      if (!note) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'note_not_found',
              message: `Note ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      const restored: Note = {
        ...note,
        isDeleted: false,
        updatedAt: new Date().toISOString(),
      }
      await saveNote(restored, workspaceId)
      return c.json({ ok: true, result: restored })
    }

    if (body.method === 'notes.deletePermanently') {
      const params = noteGetParamsSchema.parse(body.params)
      const note = notes.find((item) => item.id === params.id)

      if (!note) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'note_not_found',
              message: `Note ${params.id} was not found.`,
            },
          },
          404,
        )
      }

      await deleteNote(note.id, workspaceId)
      return c.json({
        ok: true,
        result: { ok: true, deletedId: note.id, permanent: true },
      })
    }

    if (body.method === 'notes.emptyTrash') {
      notesDriveEmptyParamsSchema.parse(body.params ?? {})
      const deletedIds = notes
        .filter((note) => note.isDeleted)
        .map((note) => note.id)
      await Promise.all(
        deletedIds.map((noteId) => deleteNote(noteId, workspaceId)),
      )
      return c.json({
        ok: true,
        result: {
          ok: true,
          deletedCount: deletedIds.length,
          deletedIds,
          permanent: true,
        },
      })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Notes does not expose ${body.method}.`,
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
            message: 'Notes received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    console.error('Notes RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'notes_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Notes could not complete the request.',
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
