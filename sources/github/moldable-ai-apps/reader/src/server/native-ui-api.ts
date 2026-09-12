import { safePath } from '@moldable-ai/storage'
import type { BookMeta, BookSummary, ReadingProgress } from '../shared/book'
import {
  getBookMeta,
  getChapter,
  getCover,
  getProgress,
  getSettings,
  listBooks,
  moveBook,
  readFolders,
  saveSettings,
  searchBook,
  seedDefaultBooks,
  setProgress,
} from './book-store'
import { createHash } from 'node:crypto'
import { copyFile, mkdir } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { z } from 'zod'

const MAX_NATIVE_BOOKS = 16
const MAX_NATIVE_CHAPTERS = 60
const NATIVE_PAGE_WORDS = 420
const NATIVE_SPEED_SEGMENT_WORDS = 1_200

const nativeRouteSchema = z.enum([
  'library',
  'folders',
  'library-search',
  'move-book',
  'chapters',
  'read',
  'speed',
  'search-form',
  'search',
  'metadata',
  'status',
])

export const nativeReadParamsSchema = z
  .object({
    route: nativeRouteSchema,
    bookId: z.string().min(1).optional(),
    folderId: z.string().min(1).optional(),
    chapterIndex: z.number().int().nonnegative().optional(),
    page: z.number().int().nonnegative().optional(),
    wordIndex: z.number().int().nonnegative().optional(),
    autoplay: z.boolean().optional(),
    query: z.string().trim().min(2).max(120).optional(),
    limit: z.number().int().min(1).max(MAX_NATIVE_BOOKS).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !['library', 'folders', 'library-search'].includes(value.route) &&
      !value.bookId
    ) {
      context.addIssue({
        code: 'custom',
        path: ['bookId'],
        message: 'bookId is required outside the library route.',
      })
    }
    if (
      value.route !== 'read' &&
      value.route !== 'speed' &&
      (value.chapterIndex !== undefined ||
        value.page !== undefined ||
        value.wordIndex !== undefined ||
        value.autoplay !== undefined)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['chapterIndex'],
        message:
          'chapterIndex, page, wordIndex, and autoplay are only supported by reading routes.',
      })
    }
    if (
      value.route === 'read' &&
      value.page !== undefined &&
      value.wordIndex !== undefined
    ) {
      context.addIssue({
        code: 'custom',
        path: ['wordIndex'],
        message: 'read accepts either page or wordIndex, not both.',
      })
    }
    if (value.route === 'speed' && value.page !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['page'],
        message: 'page is only supported by the standard read route.',
      })
    }
    if (value.route !== 'speed' && value.autoplay !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['autoplay'],
        message: 'autoplay is only supported by the speed route.',
      })
    }
    if (
      (value.route === 'search' || value.route === 'library-search') &&
      !value.query
    ) {
      context.addIssue({
        code: 'custom',
        path: ['query'],
        message: 'query is required for search results.',
      })
    }
    if (
      value.route !== 'search' &&
      value.route !== 'library-search' &&
      value.query !== undefined
    ) {
      context.addIssue({
        code: 'custom',
        path: ['query'],
        message: 'query is only supported by the search route.',
      })
    }
  })

export const nativeMoveBookParamsSchema = z
  .object({
    bookId: z.string().min(1),
    folderId: z.string().min(1).nullable(),
  })
  .strict()

const readerFontSchema = z.enum(['serif', 'sans', 'mono', 'dyslexic'])
const readerThemeSchema = z.enum([
  'system',
  'paper',
  'sepia',
  'slate',
  'dark',
  'night',
])
const readerFontInputSchema = z
  .union([readerFontSchema, z.array(readerFontSchema).length(1)])
  .transform((value) => (Array.isArray(value) ? value[0] : value))
const readerThemeInputSchema = z
  .union([readerThemeSchema, z.array(readerThemeSchema).length(1)])
  .transform((value) => (Array.isArray(value) ? value[0] : value))

export const nativeMutateParamsSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('savePosition'),
      bookId: z.string().min(1),
      chapterIndex: z.number().int().nonnegative(),
      wordIndex: z.number().int().nonnegative(),
      readerMode: z.enum(['standard', 'speed']).optional(),
      wpm: z.number().int().min(100).max(1_200).optional(),
      chunkSize: z.number().int().min(1).max(4).optional(),
      punctuationPause: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('saveSettings'),
      font: readerFontInputSchema,
      fontSize: z.number().min(14).max(30),
      lineHeight: z.number().min(1.3).max(2.2),
      horizontalMargin: z.number().min(12).max(44),
      theme: readerThemeInputSchema,
    })
    .strict(),
])

export type NativeReadParams = z.infer<typeof nativeReadParamsSchema>
export type NativeMutateParams = z.infer<typeof nativeMutateParamsSchema>
export type NativeMoveBookParams = z.infer<typeof nativeMoveBookParamsSchema>

export class NativeReaderError extends Error {
  constructor(
    readonly code: 'book_not_found' | 'chapter_not_found' | 'page_not_found',
    message: string,
  ) {
    super(message)
  }
}

function plural(value: number, singular: string, pluralValue = `${singular}s`) {
  return `${value.toLocaleString('en-US')} ${value === 1 ? singular : pluralValue}`
}

function shortDate(value: string | undefined | null): string {
  if (!value) return 'Not started'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not started'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

function percentLabel(progress: ReadingProgress | null): string {
  if (!progress || progress.percent <= 0) return 'Not started'
  if (progress.percent >= 1) return 'Finished'
  return `${Math.round(progress.percent * 100)}% read`
}

function currentChapterIndex(
  book: BookMeta,
  progress: ReadingProgress | null,
): number {
  return Math.min(
    Math.max(0, progress?.chapterIndex ?? 0),
    Math.max(0, book.chapters.length - 1),
  )
}

function safeCoverName(bookId: string, sourcePath: string): string {
  const digest = createHash('sha256').update(bookId).digest('hex').slice(0, 24)
  const extension =
    extname(sourcePath)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, '') || '.img'
  return `${digest}${extension}`
}

/**
 * The desktop broker only grants app media referenced through an assets/ or
 * public/ relative path. Reader historically stores covers beside each book,
 * so materialize a bounded read-only projection for verified NativeUI delivery.
 */
async function nativeCoverPath(
  dataDir: string,
  book: Pick<BookMeta, 'id' | 'hasCover'>,
) {
  if (!book.hasCover) return ''
  const cover = await getCover(dataDir, book.id)
  if (!cover) return ''
  const relativePath = `assets/native-covers/${safeCoverName(book.id, basename(cover.path))}`
  const projectedPath = safePath(dataDir, relativePath)
  await mkdir(safePath(dataDir, 'assets/native-covers'), { recursive: true })
  await copyFile(cover.path, projectedPath)
  return relativePath
}

async function nativeBookCard(dataDir: string, book: BookSummary) {
  const progress = book.progress
  const chapterLabel = progress
    ? `Chapter ${Math.min(progress.chapterIndex + 1, book.chapterCount)} of ${book.chapterCount}`
    : plural(book.chapterCount, 'chapter')
  return {
    id: book.id,
    title: book.title,
    author: book.author ?? 'Unknown author',
    coverImageUrl: await nativeCoverPath(dataDir, book),
    subtitle: `${percentLabel(progress)} · ${chapterLabel}`,
    badge: book.format.toUpperCase(),
    chapterIndex: Math.max(0, progress?.chapterIndex ?? 0),
    wordIndex: Math.max(0, progress?.wordIndex ?? 0),
  }
}

async function requireBook(dataDir: string, bookId: string) {
  const book = await getBookMeta(dataDir, bookId)
  if (!book) throw new NativeReaderError('book_not_found', 'Book not found')
  return book
}

async function projectLibrary(
  dataDir: string,
  limit = MAX_NATIVE_BOOKS,
  folderId?: string,
) {
  await seedDefaultBooks(dataDir)
  const books = await listBooks(dataDir)
  const folders = await readFolders(dataDir)
  const folder = folderId
    ? folders.find((item) => item.id === folderId)
    : undefined
  if (folderId && !folder)
    throw new NativeReaderError('book_not_found', 'Folder not found')
  const filtered = folder
    ? books.filter((book) => folder.bookIds.includes(book.id))
    : books
  const visible = filtered.slice(0, limit)
  const started = books.filter((book) => (book.progress?.percent ?? 0) > 0)
  const completed = books.filter((book) => (book.progress?.percent ?? 0) >= 1)
  const current = started[0]
  return {
    title: folder?.name ?? 'Your library',
    summary: `${plural(filtered.length, 'book')} · ${plural(started.length, 'in progress', 'in progress')}`,
    continueBooks: current ? [await nativeBookCard(dataDir, current)] : [],
    continueEmptyStates: current
      ? []
      : [
          {
            title: 'Choose a book to begin',
            description:
              'Your most recently saved reading position will appear here.',
          },
        ],
    books: await Promise.all(
      visible.map((book) => nativeBookCard(dataDir, book)),
    ),
    truncationNotice:
      filtered.length > visible.length
        ? `Showing the ${visible.length} most recently read books. Open Reader on desktop to manage the full library.`
        : '',
    libraryNotices:
      filtered.length > 0
        ? [
            {
              title:
                completed.length > 0
                  ? `${plural(completed.length, 'book')} finished`
                  : 'Your books travel with you',
              message:
                'Reading position stays shared with Reader on Mac. Importing, folders, store browsing, and typography remain on desktop.',
            },
          ]
        : [],
    emptyStates:
      filtered.length === 0
        ? [
            {
              title: 'Your library is empty',
              description: folder
                ? 'Move a book here from its library menu.'
                : 'Import an EPUB or text file from Reader on desktop.',
            },
          ]
        : [],
  }
}

async function projectFolders(dataDir: string) {
  const folders = await readFolders(dataDir)
  const visible = folders.slice(0, 16)
  return {
    folders: visible.map((folder) => ({
      id: folder.id,
      title: folder.name,
      subtitle: plural(folder.bookIds.length, 'book'),
    })),
    emptyStates:
      visible.length === 0
        ? [
            {
              title: 'No folders yet',
              description:
                'Create and reorder folders in Reader on desktop, then move books here on iPhone.',
            },
          ]
        : [],
    truncationNotice:
      folders.length > visible.length
        ? `Showing 16 of ${folders.length} folders.`
        : '',
  }
}

async function projectLibrarySearch(dataDir: string, query: string) {
  await seedDefaultBooks(dataDir)
  const normalized = query.trim().toLocaleLowerCase()
  const books = (await listBooks(dataDir)).filter((book) =>
    [book.title, book.author]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalized),
  )
  const visible = books.slice(0, MAX_NATIVE_BOOKS)
  return {
    summary: `${plural(books.length, 'book')} found`,
    books: await Promise.all(
      visible.map((book) => nativeBookCard(dataDir, book)),
    ),
    emptyStates:
      visible.length === 0
        ? [
            {
              title: 'No matching books',
              description: 'Try another title or author.',
            },
          ]
        : [],
    truncationNotice:
      books.length > visible.length
        ? `Showing 16 of ${books.length} matching books.`
        : '',
  }
}

async function projectMoveBook(dataDir: string, bookId: string) {
  const book = await requireBook(dataDir, bookId)
  const folders = await readFolders(dataDir)
  return {
    bookId: book.id,
    title: book.title,
    destinations: [
      { bookId: book.id, folderId: null, label: 'Library' },
      ...folders.slice(0, 16).map((folder) => ({
        bookId: book.id,
        folderId: folder.id,
        label: folder.name,
      })),
    ],
    truncationNotice:
      folders.length > 16 ? `Showing 16 of ${folders.length} folders.` : '',
  }
}

async function projectChapters(dataDir: string, bookId: string) {
  const book = await requireBook(dataDir, bookId)
  const progress = await getProgress(dataDir, book.id)
  const current = currentChapterIndex(book, progress)
  const currentChapter = book.chapters[current]
  const resumeWordIndex = Math.min(
    progress?.wordIndex ?? 0,
    Math.max(0, (currentChapter?.wordCount ?? 1) - 1),
  )
  const start =
    book.chapters.length <= MAX_NATIVE_CHAPTERS
      ? 0
      : Math.min(
          Math.max(0, current - 20),
          book.chapters.length - MAX_NATIVE_CHAPTERS,
        )
  const visible = book.chapters.slice(start, start + MAX_NATIVE_CHAPTERS)
  return {
    bookId: book.id,
    title: book.title,
    author: book.author ?? 'Unknown author',
    coverImageUrl: await nativeCoverPath(dataDir, book),
    tags: [book.format.toUpperCase(), book.language?.toUpperCase()].filter(
      (value): value is string => Boolean(value),
    ),
    description: book.description ?? '',
    descriptionSections: book.description?.trim() ? [{}] : [],
    progress: progress?.percent ?? 0,
    progressLabel: percentLabel(progress),
    currentChapterIndex: current,
    currentWordIndex: resumeWordIndex,
    resumeDestinations:
      book.chapters.length > 0
        ? [
            {
              bookId: book.id,
              chapterIndex: current,
              wordIndex: resumeWordIndex,
              label: progress ? 'Continue reading' : 'Start reading',
            },
          ]
        : [],
    speedDestinations:
      book.chapters.length > 0
        ? [
            {
              bookId: book.id,
              chapterIndex: current,
              wordIndex: resumeWordIndex,
              label:
                progress?.readerMode === 'speed'
                  ? 'Resume speed reading'
                  : 'Speed read',
            },
          ]
        : [],
    chapterSummary: plural(book.chapters.length, 'chapter'),
    chapters: visible.map((chapter) => ({
      bookId: book.id,
      index: chapter.index,
      wordIndex: 0,
      title: chapter.title,
      metadata: plural(chapter.wordCount, 'word'),
      trailingText:
        chapter.index === current ? 'Current' : `${chapter.index + 1}`,
    })),
    chapterEmptyStates:
      book.chapters.length === 0
        ? [
            {
              title: 'No readable chapters',
              description:
                'Reader could not extract chapter text from this book on the current device.',
            },
          ]
        : [],
    truncationNotice:
      book.chapters.length > visible.length
        ? `Showing chapters ${start + 1}–${start + visible.length} of ${book.chapters.length}, centered near your reading position.`
        : '',
  }
}

function pageWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/) : []
}

async function projectRead(
  dataDir: string,
  bookId: string,
  chapterIndex?: number,
  requestedPage?: number,
  requestedWordIndex?: number,
) {
  const book = await requireBook(dataDir, bookId)
  const progress = await getProgress(dataDir, book.id)
  const selectedChapter = chapterIndex ?? currentChapterIndex(book, progress)
  if (selectedChapter >= book.chapters.length) {
    throw new NativeReaderError('chapter_not_found', 'Chapter not found')
  }
  const chapter = await getChapter(dataDir, book.id, selectedChapter)
  if (!chapter)
    throw new NativeReaderError('chapter_not_found', 'Chapter not found')

  const words = pageWords(chapter.text)
  const resolvedPage =
    requestedPage ?? Math.floor((requestedWordIndex ?? 0) / NATIVE_PAGE_WORDS)
  const pageCount = Math.max(1, Math.ceil(words.length / NATIVE_PAGE_WORDS))
  if (resolvedPage >= pageCount) {
    throw new NativeReaderError('page_not_found', 'Reading page not found')
  }
  const wordIndex = resolvedPage * NATIVE_PAGE_WORDS
  const pageText = words
    .slice(wordIndex, wordIndex + NATIVE_PAGE_WORDS)
    .join(' ')
  const wordsBeforeChapter = book.chapters
    .slice(0, selectedChapter)
    .reduce((total, item) => total + item.wordCount, 0)
  const overallProgress =
    book.wordCount > 0
      ? Math.min(1, (wordsBeforeChapter + wordIndex) / book.wordCount)
      : 0

  const previousPages = []
  if (resolvedPage > 0) {
    previousPages.push({
      bookId: book.id,
      chapterIndex: selectedChapter,
      wordIndex: (resolvedPage - 1) * NATIVE_PAGE_WORDS,
      label: '‹ Previous',
    })
  } else if (selectedChapter > 0) {
    const previous = await getChapter(dataDir, book.id, selectedChapter - 1)
    const previousPageCount = Math.max(
      1,
      Math.ceil(pageWords(previous?.text ?? '').length / NATIVE_PAGE_WORDS),
    )
    previousPages.push({
      bookId: book.id,
      chapterIndex: selectedChapter - 1,
      wordIndex: (previousPageCount - 1) * NATIVE_PAGE_WORDS,
      label: '‹ Previous',
    })
  }

  const nextPages = []
  if (resolvedPage + 1 < pageCount) {
    nextPages.push({
      bookId: book.id,
      chapterIndex: selectedChapter,
      wordIndex: (resolvedPage + 1) * NATIVE_PAGE_WORDS,
      label: 'Next ›',
    })
  } else if (selectedChapter + 1 < book.chapters.length) {
    nextPages.push({
      bookId: book.id,
      chapterIndex: selectedChapter + 1,
      wordIndex: 0,
      label: 'Next ›',
    })
  }

  const settings = await getSettings(dataDir)
  return {
    bookId: book.id,
    bookTitle: book.title,
    author: book.author ?? 'Unknown author',
    chapterIndex: selectedChapter,
    chapterTitle: chapter.title,
    locationLabel: `Chapter ${selectedChapter + 1} of ${book.chapters.length} · Page ${resolvedPage + 1} of ${pageCount}`,
    pageText,
    pageProgress:
      words.length > 0
        ? Math.min(
            1,
            (wordIndex +
              Math.min(NATIVE_PAGE_WORDS, words.length - wordIndex)) /
              words.length,
          )
        : 1,
    overallProgress,
    wordIndex,
    readerFont: settings.font,
    readerFontSelection: [settings.font],
    readerFontSize: settings.fontSize,
    readerLineHeight: settings.lineHeight,
    readerHorizontalMargin: settings.nativeHorizontalMargin,
    readerTheme: settings.theme,
    readerThemeSelection: [settings.theme],
    saveActions:
      progress?.chapterIndex === selectedChapter &&
      progress.wordIndex === wordIndex
        ? []
        : [{}],
    speedDestinations: [
      {
        bookId: book.id,
        chapterIndex: selectedChapter,
        wordIndex,
        label: 'Speed read',
      },
    ],
    previousPages,
    nextPages,
  }
}

async function projectSpeed(
  dataDir: string,
  bookId: string,
  chapterIndex?: number,
  requestedWordIndex?: number,
  autoplay = false,
) {
  const book = await requireBook(dataDir, bookId)
  const progress = await getProgress(dataDir, book.id)
  const settings = await getSettings(dataDir)
  const selectedChapter = chapterIndex ?? currentChapterIndex(book, progress)
  if (selectedChapter >= book.chapters.length) {
    throw new NativeReaderError('chapter_not_found', 'Chapter not found')
  }
  const chapter = await getChapter(dataDir, book.id, selectedChapter)
  if (!chapter)
    throw new NativeReaderError('chapter_not_found', 'Chapter not found')

  const words = pageWords(chapter.text)
  const maximumIndex = Math.max(0, words.length - 1)
  const savedIndex =
    progress?.chapterIndex === selectedChapter ? progress.wordIndex : 0
  const wordIndex = Math.min(requestedWordIndex ?? savedIndex, maximumIndex)
  const chunkSize = Math.min(Math.max(settings.chunkSize, 1), 4)
  const segmentWords = words.slice(
    wordIndex,
    wordIndex + NATIVE_SPEED_SEGMENT_WORDS,
  )
  const nextSegmentWordIndex = wordIndex + segmentWords.length
  const hasNextSegment = nextSegmentWordIndex < words.length
  const hasNextChapter =
    !hasNextSegment && selectedChapter + 1 < book.chapters.length
  const wordsBeforeChapter = book.chapters
    .slice(0, selectedChapter)
    .reduce((total, item) => total + item.wordCount, 0)

  return {
    bookId: book.id,
    bookTitle: book.title,
    author: book.author ?? 'Unknown author',
    chapterIndex: selectedChapter,
    chapterTitle: chapter.title,
    wordIndex,
    segmentStartWordIndex: wordIndex,
    speedText: segmentWords.join(' '),
    liveWordIndex: wordIndex,
    liveWordsPerMinute: settings.wpm,
    liveChunkSize: chunkSize,
    livePunctuationPause: settings.punctuationPause,
    autoplay,
    continuationAvailable: hasNextSegment || hasNextChapter,
    continuationBookId: book.id,
    continuationChapterIndex: hasNextSegment
      ? selectedChapter
      : selectedChapter + 1,
    continuationWordIndex: hasNextSegment ? nextSegmentWordIndex : 0,
    locationLabel: `Chapter ${selectedChapter + 1} of ${book.chapters.length} · Word ${Math.min(wordIndex + 1, Math.max(1, words.length))} of ${words.length.toLocaleString('en-US')}`,
    progress:
      words.length > 0
        ? Math.min(1, (wordIndex + chunkSize) / words.length)
        : 1,
    overallProgress:
      book.wordCount > 0
        ? Math.min(1, (wordsBeforeChapter + wordIndex) / book.wordCount)
        : 0,
    saveActions: [{}],
  }
}

async function projectSearchForm(dataDir: string, bookId: string) {
  const book = await requireBook(dataDir, bookId)
  return {
    bookId: book.id,
    bookTitle: book.title,
    draftQuery: '',
  }
}

async function projectSearch(dataDir: string, bookId: string, query: string) {
  const book = await requireBook(dataDir, bookId)
  const response = await searchBook(dataDir, book.id, query, 24)
  const chapters = new Map<number, Awaited<ReturnType<typeof getChapter>>>()
  const results = []
  for (const result of response.results) {
    let chapter = chapters.get(result.chapterIndex)
    if (chapter === undefined) {
      chapter = await getChapter(dataDir, book.id, result.chapterIndex)
      chapters.set(result.chapterIndex, chapter)
    }
    const wordsBeforeMatch = pageWords(
      chapter?.text.slice(0, result.textStart) ?? '',
    ).length
    results.push({
      id: result.id,
      bookId: book.id,
      chapterIndex: result.chapterIndex,
      wordIndex: wordsBeforeMatch,
      title: result.chapterTitle || `Chapter ${result.chapterIndex + 1}`,
      subtitle: [result.before, result.match, result.after]
        .filter(Boolean)
        .join(' '),
      metadata: `${Math.round(result.position * 100)}% through chapter`,
    })
  }
  return {
    bookId: book.id,
    bookTitle: book.title,
    query: response.query,
    summary: `${plural(response.total, 'passage')} found`,
    results,
    emptyStates:
      results.length === 0
        ? [
            {
              title: 'No passages found',
              description: `Try another phrase in ${book.title}.`,
            },
          ]
        : [],
    truncationNotice: response.truncated
      ? `Showing the first ${results.length} of ${response.total} passages.`
      : '',
  }
}

async function projectMetadata(dataDir: string, bookId: string) {
  const book = await requireBook(dataDir, bookId)
  return {
    bookId: book.id,
    title: book.title,
    author: book.author ?? 'Unknown author',
    coverImageUrl: await nativeCoverPath(dataDir, book),
    description:
      book.description ?? 'No description is available for this book.',
    tags: [book.format.toUpperCase(), book.language?.toUpperCase()].filter(
      (value): value is string => Boolean(value),
    ),
    details: [
      { label: 'Author', value: book.author ?? 'Unknown author' },
      { label: 'Publisher', value: book.publisher ?? 'Unknown' },
      { label: 'Length', value: plural(book.wordCount, 'word') },
      { label: 'Chapters', value: String(book.chapters.length) },
      { label: 'Added', value: shortDate(book.addedAt) },
      { label: 'Source', value: book.source ?? 'Bundled with Reader' },
    ],
  }
}

async function projectStatus(dataDir: string, bookId: string) {
  const book = await requireBook(dataDir, bookId)
  const progress = await getProgress(dataDir, book.id)
  const chapterIndex = currentChapterIndex(book, progress)
  const chapter = book.chapters[chapterIndex]
  const currentWordIndex = Math.min(
    progress?.wordIndex ?? 0,
    Math.max(0, (chapter?.wordCount ?? 1) - 1),
  )
  return {
    bookId: book.id,
    title: book.title,
    author: book.author ?? 'Unknown author',
    progress: progress?.percent ?? 0,
    progressLabel: percentLabel(progress),
    currentChapter: chapter?.title ?? 'No chapters',
    readDestinations: chapter
      ? [
          {
            bookId: book.id,
            chapterIndex,
            wordIndex: currentWordIndex,
            label: progress ? 'Continue reading' : 'Start reading',
          },
        ]
      : [],
    speedDestinations: chapter
      ? [
          {
            bookId: book.id,
            chapterIndex,
            wordIndex: currentWordIndex,
            label:
              progress?.readerMode === 'speed'
                ? 'Resume speed reading'
                : 'Speed read',
          },
        ]
      : [],
    statusRows: [
      {
        label: 'Reading position',
        value: chapter
          ? `Chapter ${chapterIndex + 1} of ${book.chapters.length}`
          : 'Unavailable',
      },
      {
        label: 'Last read',
        value: shortDate(progress?.updatedAt),
      },
      {
        label: 'Mode',
        value: progress?.readerMode === 'speed' ? 'Speed reader' : 'Standard',
      },
      {
        label: 'Book length',
        value: plural(book.wordCount, 'word'),
      },
    ],
    statusNotices: progress
      ? []
      : [
          {
            title: 'Ready when you are',
            message:
              'Open a chapter to begin. Save a reading page whenever you want it to become your shared resume position.',
          },
        ],
  }
}

export async function projectNativeReader(
  dataDir: string,
  params: NativeReadParams,
) {
  switch (params.route) {
    case 'library':
      return projectLibrary(dataDir, params.limit, params.folderId)
    case 'folders':
      return projectFolders(dataDir)
    case 'library-search':
      return projectLibrarySearch(dataDir, params.query!)
    case 'move-book':
      return projectMoveBook(dataDir, params.bookId!)
    case 'chapters':
      return projectChapters(dataDir, params.bookId!)
    case 'read':
      return projectRead(
        dataDir,
        params.bookId!,
        params.chapterIndex,
        params.page,
        params.wordIndex,
      )
    case 'speed':
      return projectSpeed(
        dataDir,
        params.bookId!,
        params.chapterIndex,
        params.wordIndex,
        params.autoplay,
      )
    case 'search-form':
      return projectSearchForm(dataDir, params.bookId!)
    case 'search':
      return projectSearch(dataDir, params.bookId!, params.query!)
    case 'metadata':
      return projectMetadata(dataDir, params.bookId!)
    case 'status':
      return projectStatus(dataDir, params.bookId!)
  }
}

export async function moveNativeBook(
  dataDir: string,
  params: NativeMoveBookParams,
) {
  await moveBook(dataDir, params.bookId, params.folderId)
  const folders = await readFolders(dataDir)
  const folder = params.folderId
    ? folders.find((item) => item.id === params.folderId)
    : undefined
  return {
    ok: true,
    bookId: params.bookId,
    folderId: params.folderId,
    notices: [
      {
        title: 'Book moved',
        message: folder
          ? `Moved to ${folder.name}.`
          : 'Moved to the main library.',
      },
    ],
  }
}

export async function mutateNativeReader(
  dataDir: string,
  params: NativeMutateParams,
) {
  if (params.action === 'saveSettings') {
    const settings = await saveSettings(dataDir, {
      font: params.font,
      fontSize: params.fontSize,
      lineHeight: params.lineHeight,
      nativeHorizontalMargin: params.horizontalMargin,
      theme: params.theme,
    })
    return { ok: true, action: params.action, settings }
  }
  const book = await requireBook(dataDir, params.bookId)
  const chapter = await getChapter(dataDir, book.id, params.chapterIndex)
  if (!chapter)
    throw new NativeReaderError('chapter_not_found', 'Chapter not found')
  const wordIndex = Math.min(params.wordIndex, chapter.wordCount)
  const wordsBefore = book.chapters
    .slice(0, params.chapterIndex)
    .reduce((total, item) => total + item.wordCount, 0)
  const progress = await setProgress(dataDir, book.id, {
    chapterIndex: params.chapterIndex,
    blockIndex: 0,
    wordIndex,
    percent:
      book.wordCount > 0
        ? Math.min(1, (wordsBefore + wordIndex) / book.wordCount)
        : 0,
    readerMode: params.readerMode ?? 'standard',
  })
  if (
    params.wpm !== undefined ||
    params.chunkSize !== undefined ||
    params.punctuationPause !== undefined
  ) {
    await saveSettings(dataDir, {
      wpm: params.wpm,
      chunkSize: params.chunkSize,
      punctuationPause: params.punctuationPause,
    })
  }
  return {
    ok: true,
    action: params.action,
    bookId: book.id,
    chapterIndex: progress.chapterIndex,
    wordIndex: progress.wordIndex,
    progress: progress.percent,
    savedAt: progress.updatedAt,
  }
}
