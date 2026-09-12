import { generateId, readJson, safePath, writeJson } from '@moldable-ai/storage'
import { tokenizeWords } from '../shared/reader-settings'
import type {
  ReaderCursor,
  ReaderPassage,
  ReaderPassageResult,
} from '../shared/reading-drive'
import {
  READER_UI_VIEW_IDS,
  type ReaderUiIntent,
  type ReaderUiViewId,
} from '../shared/ui-intent'
import {
  addFolder,
  deleteBook,
  deleteFolder,
  foldersResponse,
  getBookMeta,
  getChapter,
  getCover,
  getProgress,
  getResourcePath,
  getSettings,
  importBook,
  listBooks,
  moveBook,
  readFolders,
  renameFolder,
  reorderFolders,
  saveSettings,
  searchBook,
  seedDefaultBooks,
  setProgress,
} from './book-store'
import {
  getFeatured,
  getInstalledIds,
  getStoreStatus,
  installFromStore,
  searchStore,
} from './gutenberg-catalog'
import {
  getAssetDataDir,
  getDataDir,
  getWorkspaceId,
  jsonError,
} from './moldable'
import {
  NativeReaderError,
  moveNativeBook,
  mutateNativeReader,
  nativeMoveBookParamsSchema,
  nativeMutateParamsSchema,
  nativeReadParamsSchema,
  projectNativeReader,
} from './native-ui-api'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createHash } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
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

const LATEST_SPEED_READER_DEBUG_PATH = 'debug/speed-reader-latest.json'

interface SpeedReaderDebugSnapshot {
  generatedAt: string
  [key: string]: unknown
}

function latestSpeedReaderDebugPath(dataDir: string): string {
  return safePath(dataDir, LATEST_SPEED_READER_DEBUG_PATH)
}

async function readLatestSpeedReaderDebug(
  dataDir: string,
): Promise<SpeedReaderDebugSnapshot | null> {
  return readJson<SpeedReaderDebugSnapshot | null>(
    latestSpeedReaderDebugPath(dataDir),
    null,
  )
}

async function writeLatestSpeedReaderDebug(
  dataDir: string,
  snapshot: Record<string, unknown>,
): Promise<SpeedReaderDebugSnapshot> {
  const next: SpeedReaderDebugSnapshot = {
    ...snapshot,
    generatedAt: new Date().toISOString(),
  }
  await writeJson(latestSpeedReaderDebugPath(dataDir), next)
  return next
}

// ─── Drive contract ─────────────────────────────────────────────────

const READER_UI_VIEWS: Array<{
  id: ReaderUiViewId
  name: string
  description: string
  params?: Record<string, string>
}> = [
  {
    id: 'library',
    name: 'Library',
    description:
      'The bookshelf showing every installed book and its reading progress. Takes no entityId or params.',
  },
  {
    id: 'reader',
    name: 'Reader',
    description:
      'The reading surface for one installed book. Requires entityId set to a book id. Optional params.chapterIndex is a zero-based chapter index.',
    params: {
      chapterIndex: 'Optional zero-based chapter index to open.',
    },
  },
]

const uiDescribeParamsSchema = z.object({}).strict().optional()
const uiNavigateParamsSchema = z
  .object({
    view: z.enum(READER_UI_VIEW_IDS),
    entityId: z.string().min(1).optional(),
    params: z
      .object({
        chapterIndex: z.number().int().nonnegative().optional(),
      })
      .passthrough()
      .optional(),
  })
  .strict()
const uiReadParamsSchema = z
  .object({
    view: z.enum(READER_UI_VIEW_IDS).optional(),
    entityId: z.string().min(1).optional(),
  })
  .strict()
  .optional()
const uiOpenBookParamsSchema = z.object({ bookId: z.string().min(1) }).strict()
const uiGoToChapterParamsSchema = z
  .object({
    bookId: z.string().min(1),
    chapter: z.number().int().nonnegative(),
  })
  .strict()
const uiContinueReadingParamsSchema = z
  .object({
    book: z.string().trim().min(1).max(240),
    maxWords: z.number().int().min(30).max(180).optional(),
  })
  .strict()
const readingCurrentPassageParamsSchema = z
  .object({
    bookId: z.string().trim().min(1).max(240),
    maxWords: z.number().int().min(30).max(180).optional(),
  })
  .strict()
const readingAdvanceParamsSchema = z
  .object({
    passageId: z.string().trim().min(1).max(160),
  })
  .strict()
const readingCurrentPagesParamsSchema = z
  .object({ bookId: z.string().trim().min(1).max(240) })
  .strict()
const readingAdvancePageParamsSchema = z
  .object({
    bookId: z.string().trim().min(1).max(240),
    pageIndex: z.number().int().nonnegative(),
  })
  .strict()

function uiIntentPath(dataDir: string): string {
  return safePath(dataDir, 'ui-intent.json')
}

const driveLocks = new Map<string, Promise<void>>()

async function withDriveLock<T>(
  dataDir: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = driveLocks.get(dataDir) ?? Promise.resolve()
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const queued = previous.catch(() => undefined).then(() => gate)
  driveLocks.set(dataDir, queued)
  await previous.catch(() => undefined)

  try {
    return await operation()
  } finally {
    release()
    if (driveLocks.get(dataDir) === queued) driveLocks.delete(dataDir)
  }
}

async function readUiIntent(dataDir: string): Promise<ReaderUiIntent | null> {
  return readJson<ReaderUiIntent | null>(uiIntentPath(dataDir), null)
}

async function writeUiIntent(
  dataDir: string,
  input: Omit<ReaderUiIntent, 'id' | 'createdAt' | 'acknowledgedAt'>,
): Promise<ReaderUiIntent> {
  return withDriveLock(dataDir, () => writeUiIntentUnlocked(dataDir, input))
}

async function writeUiIntentUnlocked(
  dataDir: string,
  input: Omit<ReaderUiIntent, 'id' | 'createdAt' | 'acknowledgedAt'>,
): Promise<ReaderUiIntent> {
  const intent: ReaderUiIntent = {
    ...input,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  await mkdir(dataDir, { recursive: true })
  await writeJson(uiIntentPath(dataDir), intent)
  return intent
}

async function acknowledgeUiIntent(
  dataDir: string,
  intentId: string,
): Promise<boolean> {
  return withDriveLock(dataDir, async () => {
    const current = await readUiIntent(dataDir)
    if (!current || current.id !== intentId) return false
    if (!current.acknowledgedAt) {
      await writeJson(uiIntentPath(dataDir), {
        ...current,
        acknowledgedAt: new Date().toISOString(),
      })
    }
    return true
  })
}

async function consumeUiIntent(
  dataDir: string,
): Promise<ReaderUiIntent | null> {
  return withDriveLock(dataDir, () => readUiIntent(dataDir))
}

function driveError(
  c: Parameters<typeof jsonError>[0],
  code: string,
  message: string,
  status: 400 | 404 | 409 | 422 = 400,
) {
  return c.json({ ok: false, error: { code, message } }, status)
}

function parsedParams<T>(
  c: Parameters<typeof jsonError>[0],
  schema: z.ZodType<T>,
  params: unknown,
): { data: T } | { response: ReturnType<typeof driveError> } {
  const parsed = schema.safeParse(params)
  if (!parsed.success) {
    return {
      response: driveError(
        c,
        'invalid_params',
        parsed.error.issues.map((issue) => issue.message).join('; '),
      ),
    }
  }
  return { data: parsed.data }
}

async function requireBook(dataDir: string, bookId: string) {
  await seedDefaultBooks(dataDir)
  return getBookMeta(dataDir, bookId)
}

async function enqueueReaderIntent(
  dataDir: string,
  bookId: string,
  chapterIndex?: number,
) {
  return writeUiIntent(dataDir, {
    view: 'reader',
    entityId: bookId,
    ...(chapterIndex === undefined ? {} : { params: { chapterIndex } }),
  })
}

async function persistChapterPosition(
  dataDir: string,
  bookId: string,
  chapterIndex: number,
) {
  const book = await requireBook(dataDir, bookId)
  if (!book) return { error: 'book_not_found' as const }
  if (chapterIndex >= book.chapters.length) {
    return { error: 'chapter_not_found' as const }
  }
  const wordsBefore = book.chapters
    .slice(0, chapterIndex)
    .reduce((total, chapter) => total + chapter.wordCount, 0)
  const progress = await setProgress(dataDir, bookId, {
    chapterIndex,
    blockIndex: 0,
    wordIndex: 0,
    percent: book.wordCount > 0 ? wordsBefore / book.wordCount : 0,
    readerMode: 'standard',
  })
  return { book, progress }
}

const DEFAULT_PASSAGE_WORDS = 90
const MAX_DRIVE_RECORDS = 64

interface IssuedPassage {
  passage: ReaderPassage
  maxWords: number
  issuedAt: string
}

interface PassageReceipt {
  result: ReaderPassageResult
  acknowledgedAt: string
}

interface ReadingDriveState {
  issued: Record<string, IssuedPassage>
  receipts: Record<string, PassageReceipt>
}

function readingDriveStatePath(dataDir: string): string {
  return safePath(dataDir, 'reading-drive.json')
}

async function readReadingDriveState(
  dataDir: string,
): Promise<ReadingDriveState> {
  const state = await readJson<ReadingDriveState>(
    readingDriveStatePath(dataDir),
    { issued: {}, receipts: {} },
  )
  return {
    issued:
      state.issued && typeof state.issued === 'object' ? state.issued : {},
    receipts:
      state.receipts && typeof state.receipts === 'object'
        ? state.receipts
        : {},
  }
}

function trimRecord<T>(record: Record<string, T>): Record<string, T> {
  const entries = Object.entries(record)
  return Object.fromEntries(
    entries.slice(Math.max(0, entries.length - MAX_DRIVE_RECORDS)),
  )
}

async function writeReadingDriveState(
  dataDir: string,
  state: ReadingDriveState,
): Promise<void> {
  await mkdir(dataDir, { recursive: true })
  await writeJson(readingDriveStatePath(dataDir), {
    issued: trimRecord(state.issued),
    receipts: trimRecord(state.receipts),
  })
}

function normalizeBookReference(value: string): string {
  const decomposed = value.normalize('NFKD').toLocaleLowerCase().trim()
  const normalized: string[] = []
  let previousWasSeparator = true

  for (const character of decomposed) {
    const codePoint = character.codePointAt(0) ?? 0
    if (codePoint >= 0x0300 && codePoint <= 0x036f) continue

    const isAsciiDigit = character >= '0' && character <= '9'
    const isLetter =
      character.toLocaleLowerCase() !== character.toLocaleUpperCase()
    if (isLetter || isAsciiDigit) {
      normalized.push(character)
      previousWasSeparator = false
    } else if (!previousWasSeparator && normalized.length > 0) {
      normalized.push(' ')
      previousWasSeparator = true
    }
  }

  return normalized.join('').trim()
}

function withoutLeadingArticle(value: string): string {
  for (const article of ['the ', 'an ', 'a ']) {
    if (value.startsWith(article)) return value.slice(article.length)
  }
  return value
}

async function resolveBookReference(dataDir: string, reference: string) {
  await seedDefaultBooks(dataDir)
  const books = await listBooks(dataDir)
  const normalizedReference = normalizeBookReference(reference)
  const candidates = books
    .map((book) => {
      const id = normalizeBookReference(book.id)
      const title = normalizeBookReference(book.title)
      const titleWithoutArticle = withoutLeadingArticle(title)
      let score = 0
      if (id === normalizedReference) score = 120
      else if (title === normalizedReference) score = 110
      else if (
        titleWithoutArticle === withoutLeadingArticle(normalizedReference)
      ) {
        score = 100
      } else if (
        normalizedReference.length >= 4 &&
        title.includes(normalizedReference)
      ) {
        score = 80 + normalizedReference.length / Math.max(1, title.length)
      } else if (title.length >= 4 && normalizedReference.includes(title)) {
        score = 70 + title.length / Math.max(1, normalizedReference.length)
      }
      return { book, score }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)

  const best = candidates[0]
  if (!best) {
    return {
      error: {
        code: 'book_not_found',
        message: `No installed book matches "${reference}".`,
        status: 404 as const,
      },
    }
  }
  const tied = candidates.filter((candidate) => candidate.score === best.score)
  if (tied.length > 1) {
    return {
      error: {
        code: 'book_ambiguous',
        message: `More than one installed book matches "${reference}": ${tied
          .map((candidate) => candidate.book.title)
          .join(', ')}.`,
        status: 422 as const,
      },
    }
  }

  return { book: best.book }
}

function cursorFromProgress(
  bookId: string,
  chapterCount: number,
  progress: Awaited<ReturnType<typeof getProgress>>,
): ReaderCursor {
  return {
    bookId,
    chapterIndex: Math.min(
      Math.max(0, progress?.chapterIndex ?? 0),
      Math.max(0, chapterCount - 1),
    ),
    wordIndex: Math.max(0, progress?.wordIndex ?? 0),
  }
}

function passageId(
  cursor: ReaderCursor,
  nextCursor: ReaderCursor | null,
  text: string,
  issuanceId: string,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        cursor,
        nextCursor,
        text,
        issuanceId,
      }),
    )
    .digest('hex')
    .slice(0, 32)
}

function endsSpeakableSentence(word: string): boolean {
  for (let index = word.length - 1; index >= 0; index -= 1) {
    const character = word[index]
    if (character === '.' || character === '!' || character === '?') return true
    const isTrailingQuote =
      character === '"' ||
      character === "'" ||
      character === '”' ||
      character === '’' ||
      character === ')' ||
      character === ']'
    if (!isTrailingQuote) return false
  }
  return false
}

function passageEnd(words: string[], start: number, maxWords: number): number {
  const hardEnd = Math.min(words.length, start + maxWords)
  if (hardEnd >= words.length) return words.length
  const minimumEnd = Math.min(
    hardEnd,
    start + Math.max(20, Math.floor(maxWords * 0.55)),
  )
  for (let index = hardEnd - 1; index >= minimumEnd; index -= 1) {
    if (endsSpeakableSentence(words[index] ?? '')) return index + 1
  }
  return hardEnd
}

async function createPassage(
  dataDir: string,
  bookId: string,
  cursor: ReaderCursor,
  maxWords: number,
  issuanceId: string,
): Promise<ReaderPassage | null> {
  const book = await getBookMeta(dataDir, bookId)
  if (!book || book.chapters.length === 0) return null

  let chapterIndex = Math.min(
    Math.max(0, cursor.chapterIndex),
    book.chapters.length - 1,
  )
  let wordIndex = Math.max(0, cursor.wordIndex)

  while (chapterIndex < book.chapters.length) {
    const chapter = await getChapter(dataDir, bookId, chapterIndex)
    if (!chapter) return null
    const words = tokenizeWords(chapter.text)
    if (wordIndex < words.length) {
      const end = passageEnd(words, wordIndex, maxWords)
      const nextCursor =
        end < words.length
          ? { bookId, chapterIndex, wordIndex: end }
          : chapterIndex < book.chapters.length - 1
            ? { bookId, chapterIndex: chapterIndex + 1, wordIndex: 0 }
            : null
      const passageCursor = { bookId, chapterIndex, wordIndex }
      const text = words.slice(wordIndex, end).join(' ')
      return {
        id: passageId(passageCursor, nextCursor, text, issuanceId),
        bookId,
        bookTitle: book.title,
        chapterIndex,
        chapterTitle: chapter.title,
        text,
        wordCount: end - wordIndex,
        cursor: passageCursor,
        nextCursor,
      }
    }
    chapterIndex += 1
    wordIndex = 0
  }

  return null
}

function sameCursor(left: ReaderCursor, right: ReaderCursor): boolean {
  return (
    left.bookId === right.bookId &&
    left.chapterIndex === right.chapterIndex &&
    left.wordIndex === right.wordIndex
  )
}

async function persistReaderCursor(
  dataDir: string,
  cursor: ReaderCursor | null,
  bookId: string,
) {
  const book = await getBookMeta(dataDir, bookId)
  if (!book || book.chapters.length === 0) return null

  if (!cursor) {
    const chapterIndex = book.chapters.length - 1
    const chapter = await getChapter(dataDir, bookId, chapterIndex)
    return setProgress(dataDir, bookId, {
      chapterIndex,
      blockIndex: 1000,
      wordIndex: tokenizeWords(chapter?.text ?? '').length,
      percent: 1,
      readerMode: 'standard',
    })
  }

  const chapter = await getChapter(dataDir, bookId, cursor.chapterIndex)
  const chapterWords = Math.max(1, tokenizeWords(chapter?.text ?? '').length)
  const chapterFraction = Math.min(1, cursor.wordIndex / chapterWords)
  const wordsBefore = book.chapters
    .slice(0, cursor.chapterIndex)
    .reduce((total, item) => total + item.wordCount, 0)
  return setProgress(dataDir, bookId, {
    chapterIndex: cursor.chapterIndex,
    blockIndex: Math.round(chapterFraction * 1000),
    wordIndex: cursor.wordIndex,
    percent:
      book.wordCount > 0
        ? Math.min(
            1,
            (wordsBefore + chapterWords * chapterFraction) / book.wordCount,
          )
        : 0,
    readerMode: 'standard',
  })
}

async function queueCursorIntentUnlocked(
  dataDir: string,
  cursor: ReaderCursor,
  pageIndex?: number,
): Promise<ReaderUiIntent> {
  return writeUiIntentUnlocked(dataDir, {
    view: 'reader',
    entityId: cursor.bookId,
    params: {
      chapterIndex: cursor.chapterIndex,
      wordIndex: cursor.wordIndex,
      ...(typeof pageIndex === 'number' ? { pageIndex } : {}),
    },
  })
}

type RenderedPage = {
  pageIndex: number
  wordStartIndex: number | null
  wordEndIndexExclusive: number | null
  renderedText: string
}

function renderedPageMap(
  snapshot: SpeedReaderDebugSnapshot | null,
  bookId: string,
) {
  const source = snapshot as Record<string, unknown> | null
  const book = source?.book as Record<string, unknown> | undefined
  const chapter = source?.chapter as Record<string, unknown> | undefined
  const readerState = source?.readerState as Record<string, unknown> | undefined
  const rawPages = source?.speedReaderTextByPage
  if (
    book?.id !== bookId ||
    readerState?.layout !== 'paginated' ||
    typeof chapter?.index !== 'number' ||
    !Array.isArray(rawPages)
  )
    return null
  const pages = rawPages
    .filter(
      (page): page is Record<string, unknown> =>
        !!page && typeof page === 'object',
    )
    .map((page) => ({
      pageIndex: Number(page.pageIndex),
      wordStartIndex:
        typeof page.wordStartIndex === 'number' ? page.wordStartIndex : null,
      wordEndIndexExclusive:
        typeof page.wordEndIndexExclusive === 'number'
          ? page.wordEndIndexExclusive
          : null,
      renderedText:
        typeof page.renderedText === 'string' ? page.renderedText : '',
    }))
    .filter(
      (page) =>
        Number.isInteger(page.pageIndex) && page.renderedText.length > 0,
    )
  if (pages.length === 0) return null
  return {
    chapterIndex: chapter.index,
    currentPageIndex:
      typeof readerState?.pageIndex === 'number' ? readerState.pageIndex : 0,
    pageCount:
      typeof readerState?.pageCount === 'number'
        ? readerState.pageCount
        : pages.length,
    pages,
  }
}

function pagePayload(page: RenderedPage | undefined) {
  return page
    ? {
        pageIndex: page.pageIndex,
        text: page.renderedText,
        wordStartIndex: page.wordStartIndex,
        wordEndIndexExclusive: page.wordEndIndexExclusive,
      }
    : null
}

async function issuePassage(
  dataDir: string,
  state: ReadingDriveState,
  bookId: string,
  cursor: ReaderCursor,
  maxWords: number,
): Promise<ReaderPassage | null> {
  const existing = Object.values(state.issued).find(
    (issued) =>
      issued.maxWords === maxWords && sameCursor(issued.passage.cursor, cursor),
  )
  if (existing) return existing.passage

  const passage = await createPassage(
    dataDir,
    bookId,
    cursor,
    maxWords,
    generateId(),
  )
  if (passage) {
    state.issued[passage.id] = {
      passage,
      maxWords,
      issuedAt: new Date().toISOString(),
    }
  }
  return passage
}

// ─── Moldable lifecycle ──────────────────────────────────────────────

app.get('/api/moldable/health', (c) => {
  return c.json({
    appId: process.env.MOLDABLE_APP_ID ?? 'reader',
    status: 'ok',
  })
})

app.get('/api/moldable/today', async (c) => {
  const items: unknown[] = []
  let resume: unknown = null
  try {
    const dataDir = getDataDir(c)
    await seedDefaultBooks(dataDir)
    const books = await listBooks(dataDir)
    const inProgress = books
      .filter(
        (book) =>
          book.progress &&
          book.progress.percent > 0.005 &&
          book.progress.percent < 0.995,
      )
      .sort((a, b) =>
        (b.progress?.updatedAt ?? '').localeCompare(
          a.progress?.updatedAt ?? '',
        ),
      )
    const top = inProgress[0]
    if (top && top.progress) {
      resume = {
        title: top.title,
        subtitle: `${Math.round(top.progress.percent * 100)}% · ${
          top.author ?? 'Unknown author'
        }`,
        icon: '📖',
        deepLink: `/?book=${encodeURIComponent(top.id)}`,
        lastTouchedAt: top.progress.updatedAt,
      }
    }
  } catch (error) {
    console.error('today route failed', error)
  }
  return c.json({ items, resume, generatedAt: new Date().toISOString() })
})

app.get('/api/moldable/commands', (c) => {
  return c.json({
    commands: [
      {
        id: 'import-book',
        label: 'Import book',
        shortcut: 'i',
        icon: 'plus',
        group: 'Library',
        action: { type: 'message', command: 'import-book', payload: {} },
      },
      {
        id: 'new-folder',
        label: 'New folder',
        icon: 'folder',
        group: 'Library',
        action: { type: 'message', command: 'new-folder', payload: {} },
      },
      {
        id: 'search-library',
        label: 'Search library',
        shortcut: '/',
        icon: 'filter',
        group: 'Library',
        action: { type: 'message', command: 'search-library', payload: {} },
      },
    ],
  })
})

app.get('/api/moldable/ui-intent', async (c) => {
  return c.json(await readUiIntent(getDataDir(c)))
})

app.post('/api/moldable/ui-intent/consume', async (c) => {
  return c.json(await consumeUiIntent(getDataDir(c)))
})

app.post('/api/moldable/ui-intent/ack', async (c) => {
  let body: { intentId?: unknown }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return jsonError(c, 'Invalid JSON body', 400)
  }
  if (typeof body.intentId !== 'string' || body.intentId.length === 0) {
    return jsonError(c, 'intentId is required', 400)
  }
  return c.json({
    acknowledged: await acknowledgeUiIntent(getDataDir(c), body.intentId),
  })
})

app.delete('/api/moldable/ui-intent', async (c) => {
  const id = c.req.query('id') ?? ''
  return c.json({
    deleted: id ? await acknowledgeUiIntent(getDataDir(c), id) : false,
  })
})

// ─── App-to-app RPC ──────────────────────────────────────────────────

app.post('/api/moldable/rpc', async (c) => {
  const dataDir = getDataDir(c)
  let body: { method?: string; params?: Record<string, unknown> }
  try {
    body = (await c.req.json()) as typeof body
  } catch {
    return jsonError(c, 'Invalid JSON body', 400)
  }
  const method = body.method ?? ''
  const params = body.params ?? {}
  try {
    if (method === 'reader.cards.present' || method === 'reader.cards.read') {
      const selection = z
        .object({
          bookId: z.string().min(1).max(256),
          chapterIndex: z.number().int().nonnegative().optional(),
        })
        .strict()
        .parse(params)
      const book = await getBookMeta(dataDir, selection.bookId)
      if (!book) return driveError(c, 'book_not_found', 'Book not found', 404)
      const progress = await getProgress(dataDir, book.id)
      const chapterIndex = selection.chapterIndex ?? progress?.chapterIndex ?? 0
      const chapter = await getChapter(dataDir, book.id, chapterIndex)
      if (!chapter)
        return driveError(c, 'chapter_not_found', 'Chapter not found', 404)
      if (method === 'reader.cards.present')
        return c.json({
          ok: true,
          result: {
            appCard: {
              version: 1,
              title: book.title.slice(0, 240),
              resourcePath: '/index.html?card=book',
              input: { bookId: book.id, chapterIndex },
              readMethod: 'reader.cards.read',
              actions: [],
              height: 400,
            },
          },
        })
      const workspaceId = getWorkspaceId(c)
      return c.json({
        ok: true,
        result: {
          id: book.id,
          title: book.title,
          author: book.author,
          chapterTitle: chapter.title,
          coverUrl: book.hasCover
            ? `/api/books/${encodeURIComponent(book.id)}/cover${workspaceId ? `?w=${encodeURIComponent(workspaceId)}` : ''}`
            : null,
          text: chapter.text.slice(0, 30_000),
          chapterIndex,
          chapterCount: book.chapters.length,
          percent: progress?.percent ?? 0,
          truncated: chapter.text.length > 30_000,
        },
      })
    }
    switch (method) {
      case 'reader.native.read': {
        const parsed = parsedParams(c, nativeReadParamsSchema, params)
        if ('response' in parsed) return parsed.response
        try {
          return c.json({
            ok: true,
            result: await projectNativeReader(dataDir, parsed.data),
          })
        } catch (error) {
          if (error instanceof NativeReaderError) {
            return driveError(c, error.code, error.message, 404)
          }
          throw error
        }
      }
      case 'reader.native.mutate': {
        const parsed = parsedParams(c, nativeMutateParamsSchema, params)
        if ('response' in parsed) return parsed.response
        try {
          return c.json({
            ok: true,
            result: await mutateNativeReader(dataDir, parsed.data),
          })
        } catch (error) {
          if (error instanceof NativeReaderError) {
            return driveError(c, error.code, error.message, 404)
          }
          throw error
        }
      }
      case 'reader.native.moveBook': {
        const parsed = parsedParams(c, nativeMoveBookParamsSchema, params)
        if ('response' in parsed) return parsed.response
        try {
          return c.json({
            ok: true,
            result: await moveNativeBook(dataDir, parsed.data),
          })
        } catch (error) {
          return driveError(
            c,
            error instanceof Error && error.message === 'Folder not found'
              ? 'folder_not_found'
              : 'book_not_found',
            error instanceof Error ? error.message : 'Book could not be moved',
            404,
          )
        }
      }
      case 'reader.ui.describe': {
        const parsed = parsedParams(c, uiDescribeParamsSchema, params)
        if ('response' in parsed) return parsed.response
        return c.json({
          ok: true,
          result: {
            views: READER_UI_VIEWS,
            entities:
              'Book ids come from reader.books.list or the library representation returned by reader.ui.read.',
          },
        })
      }
      case 'reader.ui.navigate': {
        const parsed = parsedParams(c, uiNavigateParamsSchema, params)
        if ('response' in parsed) return parsed.response
        const input = parsed.data
        if (input.view === 'library') {
          if (input.entityId || input.params) {
            return driveError(
              c,
              'invalid_params',
              'The library view takes no entityId or params',
            )
          }
          const intent = await writeUiIntent(dataDir, { view: 'library' })
          return c.json({
            ok: true,
            result: { ok: true, intentId: intent.id },
          })
        }
        if (!input.entityId) {
          return driveError(
            c,
            'entity_id_required',
            'The reader view requires a book entityId',
          )
        }
        const book = await requireBook(dataDir, input.entityId)
        if (!book) {
          return driveError(c, 'book_not_found', 'Book not found', 404)
        }
        const chapterIndex = input.params?.chapterIndex
        if (
          chapterIndex !== undefined &&
          chapterIndex >= book.chapters.length
        ) {
          return driveError(c, 'chapter_not_found', 'Chapter not found', 404)
        }
        if (chapterIndex !== undefined) {
          await persistChapterPosition(dataDir, book.id, chapterIndex)
        }
        const intent = await enqueueReaderIntent(dataDir, book.id, chapterIndex)
        return c.json({
          ok: true,
          result: { ok: true, intentId: intent.id },
        })
      }
      case 'reader.ui.openBook': {
        const parsed = parsedParams(c, uiOpenBookParamsSchema, params)
        if ('response' in parsed) return parsed.response
        const book = await requireBook(dataDir, parsed.data.bookId)
        if (!book) {
          return driveError(c, 'book_not_found', 'Book not found', 404)
        }
        const intent = await enqueueReaderIntent(dataDir, book.id)
        return c.json({
          ok: true,
          result: { ok: true, intentId: intent.id, bookId: book.id },
        })
      }
      case 'reader.ui.goToChapter': {
        const parsed = parsedParams(c, uiGoToChapterParamsSchema, params)
        if ('response' in parsed) return parsed.response
        const positioned = await persistChapterPosition(
          dataDir,
          parsed.data.bookId,
          parsed.data.chapter,
        )
        if (positioned.error === 'book_not_found') {
          return driveError(c, 'book_not_found', 'Book not found', 404)
        }
        if (positioned.error === 'chapter_not_found') {
          return driveError(c, 'chapter_not_found', 'Chapter not found', 404)
        }
        const intent = await enqueueReaderIntent(
          dataDir,
          positioned.book.id,
          positioned.progress.chapterIndex,
        )
        return c.json({
          ok: true,
          result: {
            ok: true,
            intentId: intent.id,
            bookId: positioned.book.id,
            chapter: positioned.progress.chapterIndex,
          },
        })
      }
      case 'reader.ui.continueReading':
      case 'reader.reading.resume': {
        const parsed = parsedParams(c, uiContinueReadingParamsSchema, params)
        if ('response' in parsed) return parsed.response
        const resolved = await resolveBookReference(dataDir, parsed.data.book)
        if ('error' in resolved && resolved.error) {
          const resolutionError = resolved.error
          return driveError(
            c,
            resolutionError.code,
            resolutionError.message,
            resolutionError.status,
          )
        }
        const book = await getBookMeta(dataDir, resolved.book.id)
        if (!book) {
          return driveError(c, 'book_not_found', 'Book not found', 404)
        }

        return withDriveLock(dataDir, async () => {
          const progress = await getProgress(dataDir, book.id)
          const cursor = cursorFromProgress(
            book.id,
            book.chapters.length,
            progress,
          )
          await persistReaderCursor(dataDir, cursor, book.id)
          const state = await readReadingDriveState(dataDir)
          const passage = await issuePassage(
            dataDir,
            state,
            book.id,
            cursor,
            parsed.data.maxWords ?? DEFAULT_PASSAGE_WORDS,
          )
          const intent = await queueCursorIntentUnlocked(dataDir, cursor)
          await writeReadingDriveState(dataDir, state)
          const result: ReaderPassageResult = {
            book: {
              id: book.id,
              title: book.title,
              author: book.author,
            },
            position: cursor,
            passage,
            completed: passage === null,
            intentId: intent.id,
          }
          return c.json({ ok: true, result })
        })
      }
      case 'reader.reading.currentPages': {
        const parsed = parsedParams(c, readingCurrentPagesParamsSchema, params)
        if ('response' in parsed) return parsed.response
        const map = renderedPageMap(
          await readLatestSpeedReaderDebug(dataDir),
          parsed.data.bookId,
        )
        if (!map) {
          return driveError(
            c,
            'page_map_unavailable',
            'Open this book in paginated Reader view and wait for its page map to load.',
            409,
          )
        }
        const current = map.pages.find(
          (page) => page.pageIndex === map.currentPageIndex,
        )
        return c.json({
          ok: true,
          result: {
            bookId: parsed.data.bookId,
            chapterIndex: map.chapterIndex,
            pageCount: map.pageCount,
            currentPage: pagePayload(current),
            nextPage: pagePayload(
              map.pages.find(
                (page) => page.pageIndex === map.currentPageIndex + 1,
              ),
            ),
          },
        })
      }
      case 'reader.reading.advancePage': {
        const parsed = parsedParams(c, readingAdvancePageParamsSchema, params)
        if ('response' in parsed) return parsed.response
        return withDriveLock(dataDir, async () => {
          const map = renderedPageMap(
            await readLatestSpeedReaderDebug(dataDir),
            parsed.data.bookId,
          )
          if (!map) {
            return driveError(
              c,
              'page_map_unavailable',
              'The rendered page map is unavailable.',
              409,
            )
          }
          if (map.currentPageIndex !== parsed.data.pageIndex) {
            return driveError(
              c,
              'page_position_changed',
              'The visible page changed. Read the current pages again.',
              409,
            )
          }
          const target = map.pages.find(
            (page) => page.pageIndex === parsed.data.pageIndex + 1,
          )
          if (!target || target.wordStartIndex === null) {
            return c.json({
              ok: true,
              result: { completed: true, currentPage: null, nextPage: null },
            })
          }
          const cursor: ReaderCursor = {
            bookId: parsed.data.bookId,
            chapterIndex: map.chapterIndex,
            wordIndex: target.wordStartIndex,
          }
          await persistReaderCursor(dataDir, cursor, parsed.data.bookId)
          const intent = await queueCursorIntentUnlocked(
            dataDir,
            cursor,
            target.pageIndex,
          )
          return c.json({
            ok: true,
            result: {
              completed: false,
              intentId: intent.id,
              bookId: cursor.bookId,
              chapterIndex: cursor.chapterIndex,
              pageCount: map.pageCount,
              currentPage: pagePayload(target),
              nextPage: pagePayload(
                map.pages.find(
                  (page) => page.pageIndex === target.pageIndex + 1,
                ),
              ),
            },
          })
        })
      }
      case 'reader.reading.currentPassage': {
        const parsed = parsedParams(
          c,
          readingCurrentPassageParamsSchema,
          params,
        )
        if ('response' in parsed) return parsed.response
        const book = await requireBook(dataDir, parsed.data.bookId)
        if (!book) {
          return driveError(c, 'book_not_found', 'Book not found', 404)
        }

        return withDriveLock(dataDir, async () => {
          const progress = await getProgress(dataDir, book.id)
          const cursor = cursorFromProgress(
            book.id,
            book.chapters.length,
            progress,
          )
          const state = await readReadingDriveState(dataDir)
          const passage = await issuePassage(
            dataDir,
            state,
            book.id,
            cursor,
            parsed.data.maxWords ?? DEFAULT_PASSAGE_WORDS,
          )
          await writeReadingDriveState(dataDir, state)
          const result: ReaderPassageResult = {
            book: {
              id: book.id,
              title: book.title,
              author: book.author,
            },
            position: cursor,
            passage,
            completed: passage === null,
          }
          return c.json({ ok: true, result })
        })
      }
      case 'reader.reading.advance': {
        const parsed = parsedParams(c, readingAdvanceParamsSchema, params)
        if ('response' in parsed) return parsed.response

        return withDriveLock(dataDir, async () => {
          const state = await readReadingDriveState(dataDir)
          const receipt = state.receipts[parsed.data.passageId]
          if (receipt) {
            return c.json({
              ok: true,
              result: receipt.result,
              replayed: true,
            })
          }

          const issued = state.issued[parsed.data.passageId]
          if (!issued) {
            return driveError(
              c,
              'passage_not_found',
              'This passage was not issued, has expired, or was already superseded.',
              404,
            )
          }
          const book = await getBookMeta(dataDir, issued.passage.bookId)
          if (!book) {
            return driveError(c, 'book_not_found', 'Book not found', 404)
          }
          const progress = await getProgress(dataDir, book.id)
          const currentCursor = cursorFromProgress(
            book.id,
            book.chapters.length,
            progress,
          )
          if (!sameCursor(currentCursor, issued.passage.cursor)) {
            return driveError(
              c,
              'reading_position_changed',
              'The saved reading position changed after this passage was issued. Fetch the current passage before advancing.',
              409,
            )
          }

          const nextCursor = issued.passage.nextCursor
          const nextProgress = await persistReaderCursor(
            dataDir,
            nextCursor,
            book.id,
          )
          if (!nextProgress) {
            return driveError(c, 'book_not_found', 'Book not found', 404)
          }
          const displayCursor: ReaderCursor = {
            bookId: book.id,
            chapterIndex: nextProgress.chapterIndex,
            wordIndex: nextProgress.wordIndex,
          }
          const passage = nextCursor
            ? await issuePassage(
                dataDir,
                state,
                book.id,
                nextCursor,
                issued.maxWords,
              )
            : null
          const intent = await queueCursorIntentUnlocked(dataDir, displayCursor)
          const result: ReaderPassageResult = {
            book: {
              id: book.id,
              title: book.title,
              author: book.author,
            },
            position: displayCursor,
            passage,
            completed: passage === null,
            intentId: intent.id,
          }
          delete state.issued[parsed.data.passageId]
          state.receipts[parsed.data.passageId] = {
            result,
            acknowledgedAt: new Date().toISOString(),
          }
          await writeReadingDriveState(dataDir, state)
          return c.json({ ok: true, result, replayed: false })
        })
      }
      case 'reader.ui.read': {
        const parsed = parsedParams(c, uiReadParamsSchema, params)
        if ('response' in parsed) return parsed.response
        const input = parsed.data ?? {}
        const view = input.view ?? (input.entityId ? 'reader' : 'library')
        await seedDefaultBooks(dataDir)
        if (view === 'library') {
          if (input.entityId) {
            return driveError(
              c,
              'invalid_params',
              'The library view takes no entityId',
            )
          }
          const books = await listBooks(dataDir)
          return c.json({
            ok: true,
            result: { view: 'library', books },
          })
        }
        if (!input.entityId) {
          return driveError(
            c,
            'entity_id_required',
            'The reader view requires a book entityId',
          )
        }
        const book = await getBookMeta(dataDir, input.entityId)
        if (!book) {
          return driveError(c, 'book_not_found', 'Book not found', 404)
        }
        const progress = await getProgress(dataDir, book.id)
        const chapterIndex = Math.min(
          Math.max(0, progress?.chapterIndex ?? 0),
          Math.max(0, book.chapters.length - 1),
        )
        const chapter = await getChapter(dataDir, book.id, chapterIndex)
        if (!chapter) {
          return driveError(c, 'chapter_not_found', 'Chapter not found', 404)
        }
        return c.json({
          ok: true,
          result: {
            view: 'reader',
            book: {
              id: book.id,
              title: book.title,
              author: book.author,
              chapterCount: book.chapters.length,
              wordCount: book.wordCount,
            },
            position: {
              chapterIndex,
              blockIndex: progress?.blockIndex ?? 0,
              wordIndex: progress?.wordIndex ?? 0,
              percent: progress?.percent ?? 0,
            },
            chapter: {
              index: chapter.index,
              title: chapter.title,
              wordCount: chapter.wordCount,
              text: chapter.text,
            },
          },
        })
      }
      case 'reader.books.list': {
        const books = await listBooks(dataDir)
        return c.json({ books })
      }
      case 'reader.books.delete': {
        const bookId =
          typeof params.bookId === 'string' ? params.bookId.trim() : ''
        if (!bookId) return jsonError(c, 'bookId is required', 400)
        if (!(await getBookMeta(dataDir, bookId))) {
          return jsonError(c, 'Book not found', 404)
        }
        await deleteBook(dataDir, bookId)
        return c.json({ ok: true, result: { deleted: true, bookId } })
      }
      case 'reader.folders.list': {
        return c.json(await foldersResponse(dataDir))
      }
      case 'reader.store.search': {
        const query = String(params.query ?? params.q ?? '')
        const page = Math.max(0, Number(params.page ?? 0) || 0)
        return c.json(await searchStore(dataDir, query, page))
      }
      case 'reader.store.install': {
        const id = params.id
        if (typeof id !== 'string' && typeof id !== 'number') {
          return jsonError(c, 'A valid book id is required', 400)
        }
        const book = await installFromStore(dataDir, id)
        return c.json({ book })
      }
      case 'reader.books.import': {
        const filePath = String(params.filePath ?? '')
        if (!filePath) return jsonError(c, 'filePath is required', 400)
        const buffer = await readFile(filePath)
        const meta = await importBook(
          dataDir,
          basename(filePath),
          new Uint8Array(buffer),
        )
        if (typeof params.folderName === 'string' && params.folderName) {
          const folders = await readFolders(dataDir)
          let folder = folders.find(
            (entry) =>
              entry.name.toLowerCase() ===
              String(params.folderName).toLowerCase(),
          )
          if (!folder && params.createFolder) {
            folder = await addFolder(dataDir, String(params.folderName))
          }
          if (folder) await moveBook(dataDir, meta.id, folder.id)
        }
        return c.json({ book: meta })
      }
      case 'reader.debug.speedReaderSnapshot': {
        return c.json({ snapshot: await readLatestSpeedReaderDebug(dataDir) })
      }
      case 'reader.debug.speedReaderTextByPage': {
        const snapshot = await readLatestSpeedReaderDebug(dataDir)
        const pages = Array.isArray(snapshot?.speedReaderTextByPage)
          ? snapshot.speedReaderTextByPage
          : []
        return c.json({
          ok: true,
          result: {
            available: pages.length > 0,
            generatedAt: snapshot?.generatedAt ?? null,
            book: snapshot?.book ?? null,
            chapter: snapshot?.chapter ?? null,
            readerState: snapshot?.readerState ?? null,
            pages,
          },
        })
      }
      default:
        return jsonError(c, `Unknown method: ${method}`, 400)
    }
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'RPC failed',
      500,
    )
  }
})

// ─── Books ───────────────────────────────────────────────────────────

app.get('/api/books', async (c) => {
  const dataDir = getDataDir(c)
  await seedDefaultBooks(dataDir)
  const books = await listBooks(dataDir)
  return c.json({ books })
})

app.post('/api/books/import', async (c) => {
  const dataDir = getDataDir(c)
  const contentType = c.req.header('content-type') ?? ''
  try {
    if (contentType.includes('application/json')) {
      const body = (await c.req.json()) as { filePath?: string }
      if (!body.filePath) return jsonError(c, 'filePath is required', 400)
      const buffer = await readFile(body.filePath)
      const meta = await importBook(
        dataDir,
        basename(body.filePath),
        new Uint8Array(buffer),
      )
      return c.json({ book: meta })
    }
    const form = await c.req.parseBody()
    const file = form['file']
    if (!file || typeof file === 'string') {
      return jsonError(c, 'No file uploaded', 400)
    }
    const arrayBuffer = await file.arrayBuffer()
    const meta = await importBook(
      dataDir,
      file.name || 'book.epub',
      new Uint8Array(arrayBuffer),
    )
    return c.json({ book: meta })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Import failed',
      422,
    )
  }
})

app.get('/api/books/:id', async (c) => {
  const dataDir = getDataDir(c)
  const meta = await getBookMeta(dataDir, c.req.param('id'))
  if (!meta) return jsonError(c, 'Book not found', 404)
  const progress = await getProgress(dataDir, meta.id)
  return c.json({ book: meta, progress })
})

app.delete('/api/books/:id', async (c) => {
  const dataDir = getDataDir(c)
  await deleteBook(dataDir, c.req.param('id'))
  return c.json({ ok: true })
})

app.get('/api/books/:id/search', async (c) => {
  const dataDir = getDataDir(c)
  const query = c.req.query('q') ?? ''
  try {
    return c.json(await searchBook(dataDir, c.req.param('id'), query))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed'
    return jsonError(c, message, message === 'Book not found' ? 404 : 500)
  }
})

app.get('/api/books/:id/chapter/:index', async (c) => {
  const dataDir = getDataDir(c)
  const index = Number(c.req.param('index'))
  if (!Number.isInteger(index) || index < 0) {
    return jsonError(c, 'Invalid chapter index', 400)
  }
  const workspaceId = getWorkspaceId(c)
  const assetQuery = workspaceId ? `w=${encodeURIComponent(workspaceId)}` : ''
  const chapter = await getChapter(
    dataDir,
    c.req.param('id'),
    index,
    assetQuery,
  )
  if (!chapter) return jsonError(c, 'Chapter not found', 404)
  return c.json(chapter)
})

app.get('/api/books/:id/cover', async (c) => {
  const dataDir = getAssetDataDir(c)
  const cover = await getCover(dataDir, c.req.param('id'))
  if (!cover) return jsonError(c, 'No cover', 404)
  const data = await readFile(cover.path)
  return c.body(new Uint8Array(data), 200, {
    'Content-Type': cover.contentType,
    'Cache-Control': 'private, max-age=86400',
  })
})

app.get('/api/books/:id/resource/*', async (c) => {
  const dataDir = getAssetDataDir(c)
  const prefix = `/api/books/${c.req.param('id')}/resource/`
  const url = new URL(c.req.url)
  const relPath = decodeURIComponent(url.pathname.slice(prefix.length))
  const resource = await getResourcePath(dataDir, c.req.param('id'), relPath)
  if (!resource) return jsonError(c, 'Resource not found', 404)
  const data = await readFile(resource.path)
  return c.body(new Uint8Array(data), 200, {
    'Content-Type': resource.contentType,
    'Cache-Control': 'private, max-age=86400',
  })
})

app.get('/api/books/:id/progress', async (c) => {
  const dataDir = getDataDir(c)
  const progress = await getProgress(dataDir, c.req.param('id'))
  return c.json({ progress })
})

app.put('/api/books/:id/progress', async (c) => {
  const dataDir = getDataDir(c)
  const patch = (await c.req.json().catch(() => ({}))) as Record<
    string,
    unknown
  >
  try {
    const progress = await setProgress(dataDir, c.req.param('id'), patch)
    return c.json({ progress })
  } catch (error) {
    if (error instanceof Error && error.message === 'Book not found') {
      return jsonError(c, error.message, 404)
    }
    throw error
  }
})

// ─── Speed reader debug snapshots ────────────────────────────────────

app.get('/api/debug/speed-reader/latest', async (c) => {
  const dataDir = getDataDir(c)
  return c.json({ snapshot: await readLatestSpeedReaderDebug(dataDir) })
})

app.post('/api/debug/speed-reader/latest', async (c) => {
  const dataDir = getDataDir(c)
  const snapshot = (await c.req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null
  if (!snapshot || typeof snapshot !== 'object') {
    return jsonError(c, 'Invalid debug snapshot', 400)
  }
  return c.json({
    snapshot: await writeLatestSpeedReaderDebug(dataDir, snapshot),
  })
})

// ─── Book store ──────────────────────────────────────────────────────

app.get('/api/store/status', async (c) => {
  return c.json(await getStoreStatus(getDataDir(c)))
})

app.get('/api/store/featured', async (c) => {
  const dataDir = getDataDir(c)
  return c.json({
    results: getFeatured(),
    installed: await getInstalledIds(dataDir),
  })
})

app.get('/api/store/search', async (c) => {
  const dataDir = getDataDir(c)
  const q = c.req.query('q') ?? ''
  const page = Math.max(0, Number(c.req.query('page') ?? '0') || 0)
  try {
    const result = await searchStore(dataDir, q, page)
    const installed = await getInstalledIds(dataDir)
    return c.json({ ...result, installed })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Store search failed',
      502,
    )
  }
})

app.post('/api/store/install', async (c) => {
  const dataDir = getDataDir(c)
  const body = (await c.req.json().catch(() => ({}))) as {
    id?: number | string
  }
  if (typeof body.id !== 'string' && typeof body.id !== 'number') {
    return jsonError(c, 'A valid book id is required', 400)
  }
  try {
    const book = await installFromStore(dataDir, body.id)
    return c.json({ book })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Install failed',
      502,
    )
  }
})

// ─── Settings ────────────────────────────────────────────────────────

app.get('/api/settings', async (c) => {
  const settings = await getSettings(getDataDir(c))
  return c.json({ settings })
})

app.put('/api/settings', async (c) => {
  const patch = (await c.req.json().catch(() => ({}))) as Record<
    string,
    unknown
  >
  const settings = await saveSettings(getDataDir(c), patch)
  return c.json({ settings })
})

// ─── Folders ─────────────────────────────────────────────────────────

app.get('/api/folders', async (c) => {
  return c.json(await foldersResponse(getDataDir(c)))
})

app.post('/api/folders', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    name?: string
    tone?: string
  }
  if (!body.name || !body.name.trim())
    return jsonError(c, 'Name is required', 400)
  const folder = await addFolder(getDataDir(c), body.name, body.tone)
  return c.json(folder)
})

app.patch('/api/folders/:id', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { name?: string }
  if (!body.name) return jsonError(c, 'Name is required', 400)
  const folder = await renameFolder(getDataDir(c), c.req.param('id'), body.name)
  if (!folder) return jsonError(c, 'Folder not found', 404)
  return c.json(folder)
})

app.delete('/api/folders/:id', async (c) => {
  await deleteFolder(getDataDir(c), c.req.param('id'))
  return c.json({ ok: true })
})

app.post('/api/folders/reorder', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    folderIds?: string[]
  }
  const folders = await reorderFolders(getDataDir(c), body.folderIds ?? [])
  return c.json({ folders })
})

app.post('/api/folders/move', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    bookId?: string
    folderId?: string | null
    inFolder?: boolean
  }
  if (!body.bookId) return jsonError(c, 'bookId is required', 400)
  try {
    const folders = await moveBook(
      getDataDir(c),
      body.bookId,
      body.folderId ?? null,
      body.inFolder ?? true,
    )
    return c.json({ folders })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Book not found' ||
        error.message === 'Folder not found')
    ) {
      return jsonError(c, error.message, 404)
    }
    throw error
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
