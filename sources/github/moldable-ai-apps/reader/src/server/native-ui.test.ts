import type { BookMeta } from '../shared/book'
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let moldableHome: string
let previousHome: string | undefined
let previousAppId: string | undefined
let app: (typeof import('./app'))['app']

const WORKSPACE = 'reader-native-test'
const HEADERS = { 'x-moldable-workspace': WORKSPACE }

function rpc(method: string, params?: unknown) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })
}

beforeAll(async () => {
  moldableHome = await mkdtemp(path.join(tmpdir(), 'reader-native-'))
  previousHome = process.env.MOLDABLE_HOME
  previousAppId = process.env.MOLDABLE_APP_ID
  process.env.MOLDABLE_HOME = moldableHome
  process.env.MOLDABLE_APP_ID = 'reader'
  app = (await import('./app')).app
})

afterAll(async () => {
  if (previousHome === undefined) delete process.env.MOLDABLE_HOME
  else process.env.MOLDABLE_HOME = previousHome
  if (previousAppId === undefined) delete process.env.MOLDABLE_APP_ID
  else process.env.MOLDABLE_APP_ID = previousAppId
  await rm(moldableHome, { recursive: true, force: true })
})

describe('Reader NativeUI API', () => {
  it('returns bounded, independently readable mobile routes', async () => {
    const libraryResponse = await rpc('reader.native.read', {
      route: 'library',
      limit: 16,
    })
    const library = (await libraryResponse.json()) as {
      ok: boolean
      result: {
        books: Array<{ id: string; title: string }>
        continueBooks: Array<{ id: string }>
      }
    }
    expect(libraryResponse.status).toBe(200)
    expect(library.ok).toBe(true)
    expect(library.result.books).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'aesops-fables',
          title: "Aesop's Fables",
        }),
      ]),
    )
    expect(Array.isArray(library.result.continueBooks)).toBe(true)

    const chaptersResponse = await rpc('reader.native.read', {
      route: 'chapters',
      bookId: 'aesops-fables',
    })
    const chapters = (await chaptersResponse.json()) as {
      result: {
        chapters: Array<{ index: number; title: string }>
        resumeDestinations: Array<{ chapterIndex: number; wordIndex: number }>
        descriptionSections: unknown[]
      }
    }
    expect(chaptersResponse.status).toBe(200)
    expect(chapters.result.chapters[0]).toMatchObject({
      index: 0,
      title: 'The Fox and the Grapes',
    })
    expect(chapters.result.resumeDestinations).toEqual([
      expect.objectContaining({ chapterIndex: 0, wordIndex: 0 }),
    ])
    expect(chapters.result.descriptionSections).toHaveLength(1)

    const searchFormResponse = await rpc('reader.native.read', {
      route: 'search-form',
      bookId: 'aesops-fables',
    })
    const searchForm = (await searchFormResponse.json()) as {
      result: { bookId: string; draftQuery: string }
    }
    expect(searchFormResponse.status).toBe(200)
    expect(searchForm.result).toMatchObject({
      bookId: 'aesops-fables',
      draftQuery: '',
    })

    const searchResponse = await rpc('reader.native.read', {
      route: 'search',
      bookId: 'aesops-fables',
      query: 'summer',
    })
    const search = (await searchResponse.json()) as {
      result: {
        results: Array<{
          bookId: string
          chapterIndex: number
          wordIndex: number
          subtitle: string
        }>
      }
    }
    expect(searchResponse.status).toBe(200)
    expect(search.result.results[0]).toMatchObject({
      bookId: 'aesops-fables',
      chapterIndex: 0,
      wordIndex: 2,
    })
    expect(search.result.results[0]?.subtitle.toLowerCase()).toContain('summer')

    const readResponse = await rpc('reader.native.read', {
      route: 'read',
      bookId: 'aesops-fables',
      chapterIndex: 0,
      page: 0,
    })
    const read = (await readResponse.json()) as {
      result: {
        pageText: string
        wordIndex: number
        nextPages: Array<{ chapterIndex: number; page: number }>
      }
    }
    expect(readResponse.status).toBe(200)
    expect(read.result.pageText).toContain('One hot summer day')
    expect(read.result.pageText).not.toMatch(/<[^>]+>/)
    expect(read.result.wordIndex).toBe(0)
    expect(JSON.stringify(read.result).length).toBeLessThan(16_000)

    const speedResponse = await rpc('reader.native.read', {
      route: 'speed',
      bookId: 'aesops-fables',
      chapterIndex: 0,
      wordIndex: 3,
    })
    const speed = (await speedResponse.json()) as {
      result: {
        speedText: string
        wordIndex: number
        liveWordIndex: number
        liveWordsPerMinute: number
        livePunctuationPause: boolean
        continuationAvailable: boolean
      }
    }
    expect(speedResponse.status).toBe(200)
    expect(speed.result.wordIndex).toBe(3)
    expect(speed.result.speedText).toBeTruthy()
    expect(speed.result.liveWordIndex).toBe(3)
    expect(speed.result.liveWordsPerMinute).toBe(350)
    expect(speed.result.livePunctuationPause).toBe(true)
    expect(speed.result.continuationAvailable).toBe(true)

    const metadataResponse = await rpc('reader.native.read', {
      route: 'metadata',
      bookId: 'aesops-fables',
    })
    const metadata = (await metadataResponse.json()) as {
      result: { details: Array<{ label: string; value: string }> }
    }
    expect(metadataResponse.status).toBe(200)
    expect(metadata.result.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Author', value: 'Aesop' }),
      ]),
    )

    const statusResponse = await rpc('reader.native.read', {
      route: 'status',
      bookId: 'aesops-fables',
    })
    const status = (await statusResponse.json()) as {
      result: {
        progressLabel: string
        readDestinations: Array<{ chapterIndex: number; wordIndex: number }>
      }
    }
    expect(statusResponse.status).toBe(200)
    expect(status.result.progressLabel).toBe('Not started')
    expect(status.result.readDestinations).toEqual([
      expect.objectContaining({ chapterIndex: 0, wordIndex: 0 }),
    ])
  })

  it('saves an explicit reading position and reports it across routes', async () => {
    const saveResponse = await rpc('reader.native.mutate', {
      action: 'savePosition',
      bookId: 'aesops-fables',
      chapterIndex: 1,
      wordIndex: 12,
    })
    const save = (await saveResponse.json()) as {
      result: { bookId: string; chapterIndex: number; wordIndex: number }
    }
    expect(saveResponse.status).toBe(200)
    expect(save.result).toMatchObject({
      bookId: 'aesops-fables',
      chapterIndex: 1,
      wordIndex: 12,
    })

    const statusResponse = await rpc('reader.native.read', {
      route: 'status',
      bookId: 'aesops-fables',
    })
    const status = (await statusResponse.json()) as {
      result: {
        currentChapter: string
        progress: number
        readDestinations: Array<{ chapterIndex: number; page: number }>
      }
    }
    expect(status.result.currentChapter).toBe('The Tortoise and the Hare')
    expect(status.result.readDestinations[0]?.chapterIndex).toBe(1)
    expect(status.result.progress).toBeGreaterThan(0)
  })

  it('saves speed-reader mode and deletes only a disposable book', async () => {
    const saveResponse = await rpc('reader.native.mutate', {
      action: 'savePosition',
      bookId: 'aesops-fables',
      chapterIndex: 0,
      wordIndex: 5,
      readerMode: 'speed',
      wpm: 475,
      chunkSize: 3,
      punctuationPause: false,
    })
    expect(saveResponse.status).toBe(200)

    const statusResponse = await rpc('reader.native.read', {
      route: 'status',
      bookId: 'aesops-fables',
    })
    const status = (await statusResponse.json()) as {
      result: { statusRows: Array<{ label: string; value: string }> }
    }
    expect(status.result.statusRows).toContainEqual({
      label: 'Mode',
      value: 'Speed reader',
    })

    const speedResponse = await rpc('reader.native.read', {
      route: 'speed',
      bookId: 'aesops-fables',
      chapterIndex: 0,
      wordIndex: 5,
      autoplay: false,
    })
    const speed = (await speedResponse.json()) as {
      result: {
        liveWordIndex: number
        liveWordsPerMinute: number
        liveChunkSize: number
        livePunctuationPause: boolean
      }
    }
    expect(speed.result).toMatchObject({
      liveWordIndex: 5,
      liveWordsPerMinute: 475,
      liveChunkSize: 3,
      livePunctuationPause: false,
    })

    const dataDir = path.join(
      moldableHome,
      'workspaces',
      WORKSPACE,
      'apps',
      'reader',
      'data',
    )
    const disposableId = 'delete-me'
    const disposableDir = path.join(dataDir, 'books', disposableId)
    const now = new Date().toISOString()
    await mkdir(path.join(disposableDir, 'chapters'), { recursive: true })
    await writeFile(
      path.join(disposableDir, 'book.json'),
      JSON.stringify({
        id: disposableId,
        title: 'Disposable Book',
        author: null,
        format: 'txt',
        language: 'en',
        description: null,
        publisher: null,
        hasCover: false,
        coverColor: null,
        chapters: [{ index: 0, title: 'Only', href: '', wordCount: 1 }],
        wordCount: 1,
        addedAt: now,
        updatedAt: now,
        source: null,
      }),
    )
    await writeFile(
      path.join(disposableDir, 'chapters', '0.json'),
      JSON.stringify({
        index: 0,
        title: 'Only',
        href: '',
        html: '<p>Temporary.</p>',
        text: 'Temporary.',
        wordCount: 1,
      }),
    )
    const deleteResponse = await rpc('reader.books.delete', {
      bookId: disposableId,
    })
    expect(deleteResponse.status).toBe(200)
    const missingResponse = await rpc('reader.native.read', {
      route: 'metadata',
      bookId: disposableId,
    })
    expect(missingResponse.status).toBe(404)
  })

  it('projects bounded folders and moves a book through the native organization scope', async () => {
    const dataDir = path.join(
      moldableHome,
      'workspaces',
      WORKSPACE,
      'apps',
      'reader',
      'data',
    )
    const store = await import('./book-store')
    const folder = await store.addFolder(dataDir, 'Phone reading')

    const moveResponse = await rpc('reader.native.moveBook', {
      bookId: 'aesops-fables',
      folderId: folder.id,
    })
    expect(moveResponse.status).toBe(200)

    const folderResponse = await rpc('reader.native.read', {
      route: 'library',
      folderId: folder.id,
      limit: 16,
    })
    const folderLibrary = (await folderResponse.json()) as {
      result: { title: string; books: Array<{ id: string }> }
    }
    expect(folderLibrary.result.title).toBe('Phone reading')
    expect(folderLibrary.result.books).toContainEqual(
      expect.objectContaining({ id: 'aesops-fables' }),
    )

    const moveFormResponse = await rpc('reader.native.read', {
      route: 'move-book',
      bookId: 'aesops-fables',
    })
    const moveForm = (await moveFormResponse.json()) as {
      result: { destinations: Array<{ folderId: string | null }> }
    }
    expect(moveForm.result.destinations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ folderId: null }),
        expect.objectContaining({ folderId: folder.id }),
      ]),
    )
  })

  it('projects stored covers through the verified assets boundary', async () => {
    const dataDir = path.join(
      moldableHome,
      'workspaces',
      WORKSPACE,
      'apps',
      'reader',
      'data',
    )
    const bookId = 'covered-book'
    const bookDir = path.join(dataDir, 'books', bookId)
    const now = new Date().toISOString()
    const meta: BookMeta = {
      id: bookId,
      title: 'Covered Book',
      author: 'Reader Test',
      format: 'epub',
      language: 'en',
      description: 'A cover projection test.',
      publisher: null,
      hasCover: true,
      coverColor: 'oklch(0.62 0.13 25)',
      chapters: [
        { index: 0, title: 'Opening', href: 'opening.xhtml', wordCount: 2 },
      ],
      wordCount: 2,
      addedAt: now,
      updatedAt: now,
      source: null,
    }
    await mkdir(path.join(bookDir, 'chapters'), { recursive: true })
    await writeFile(path.join(bookDir, 'book.json'), JSON.stringify(meta))
    await writeFile(
      path.join(bookDir, 'chapters', '0.json'),
      JSON.stringify({
        index: 0,
        title: 'Opening',
        href: 'opening.xhtml',
        html: '<p>Hello cover.</p>',
        text: 'Hello cover.',
        wordCount: 2,
      }),
    )
    await writeFile(
      path.join(bookDir, 'cover.png'),
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    )

    const response = await rpc('reader.native.read', {
      route: 'metadata',
      bookId,
    })
    const body = (await response.json()) as {
      result: { coverImageUrl: string }
    }
    expect(response.status).toBe(200)
    expect(body.result.coverImageUrl).toMatch(
      /^assets\/native-covers\/[a-f0-9]{24}\.png$/,
    )
    await expect(
      access(path.join(dataDir, body.result.coverImageUrl)),
    ).resolves.toBeUndefined()
  })

  it('bounds speed segments, continues automatically, and maps live cursors to standard pages', async () => {
    const dataDir = path.join(
      moldableHome,
      'workspaces',
      WORKSPACE,
      'apps',
      'reader',
      'data',
    )
    const bookId = 'long-native-book'
    const bookDir = path.join(dataDir, 'books', bookId)
    const now = new Date().toISOString()
    const firstWords = Array.from(
      { length: 1_350 },
      (_, index) => `word${index}`,
    )
    const secondWords = ['next', 'chapter', 'starts', 'here']
    const meta: BookMeta = {
      id: bookId,
      title: 'Long Native Book',
      author: 'Reader Test',
      format: 'txt',
      language: 'en',
      description: null,
      publisher: null,
      hasCover: false,
      coverColor: 'oklch(0.62 0.13 25)',
      chapters: [
        {
          index: 0,
          title: 'Long Chapter',
          href: '',
          wordCount: firstWords.length,
        },
        {
          index: 1,
          title: 'Next Chapter',
          href: '',
          wordCount: secondWords.length,
        },
      ],
      wordCount: firstWords.length + secondWords.length,
      addedAt: now,
      updatedAt: now,
      source: null,
    }
    await mkdir(path.join(bookDir, 'chapters'), { recursive: true })
    await writeFile(path.join(bookDir, 'book.json'), JSON.stringify(meta))
    for (const [index, words] of [firstWords, secondWords].entries()) {
      await writeFile(
        path.join(bookDir, 'chapters', `${index}.json`),
        JSON.stringify({
          index,
          title: index === 0 ? 'Long Chapter' : 'Next Chapter',
          href: '',
          html: `<p>${words.join(' ')}</p>`,
          text: words.join(' '),
          wordCount: words.length,
        }),
      )
    }

    const firstSegmentResponse = await rpc('reader.native.read', {
      route: 'speed',
      bookId,
      chapterIndex: 0,
      wordIndex: 0,
      autoplay: false,
    })
    const firstSegment = (await firstSegmentResponse.json()) as {
      result: {
        speedText: string
        continuationAvailable: boolean
        continuationChapterIndex: number
        continuationWordIndex: number
      }
    }
    expect(firstSegment.result.speedText.split(/\s+/)).toHaveLength(1_200)
    expect(firstSegment.result).toMatchObject({
      continuationAvailable: true,
      continuationChapterIndex: 0,
      continuationWordIndex: 1_200,
    })

    const finalSegmentResponse = await rpc('reader.native.read', {
      route: 'speed',
      bookId,
      chapterIndex: 0,
      wordIndex: 1_200,
      autoplay: true,
    })
    const finalSegment = (await finalSegmentResponse.json()) as {
      result: {
        speedText: string
        autoplay: boolean
        continuationChapterIndex: number
        continuationWordIndex: number
      }
    }
    expect(finalSegment.result.speedText.split(/\s+/)).toHaveLength(150)
    expect(finalSegment.result).toMatchObject({
      autoplay: true,
      continuationChapterIndex: 1,
      continuationWordIndex: 0,
    })

    const standardResponse = await rpc('reader.native.read', {
      route: 'read',
      bookId,
      chapterIndex: 0,
      wordIndex: 1_001,
    })
    const standard = (await standardResponse.json()) as {
      result: { wordIndex: number; pageText: string }
    }
    expect(standard.result.wordIndex).toBe(840)
    expect(standard.result.pageText).toContain('word1001')
  })

  it('persists NativeUI reading appearance through an explicit mutation', async () => {
    const mutationResponse = await rpc('reader.native.mutate', {
      action: 'saveSettings',
      font: ['sans'],
      fontSize: 24,
      lineHeight: 1.85,
      horizontalMargin: 32,
      theme: ['sepia'],
    })
    expect(mutationResponse.status).toBe(200)

    const readResponse = await rpc('reader.native.read', {
      route: 'read',
      bookId: 'aesops-fables',
      chapterIndex: 0,
      wordIndex: 0,
    })
    const read = (await readResponse.json()) as {
      result: {
        readerFont: string
        readerFontSelection: string[]
        readerFontSize: number
        readerLineHeight: number
        readerHorizontalMargin: number
        readerTheme: string
        readerThemeSelection: string[]
      }
    }
    expect(read.result).toMatchObject({
      readerFont: 'sans',
      readerFontSelection: ['sans'],
      readerFontSize: 24,
      readerLineHeight: 1.85,
      readerHorizontalMargin: 32,
      readerTheme: 'sepia',
      readerThemeSelection: ['sepia'],
    })
  })

  it('does not render unusable reading actions for an empty book', async () => {
    const dataDir = path.join(
      moldableHome,
      'workspaces',
      WORKSPACE,
      'apps',
      'reader',
      'data',
    )
    const bookId = 'empty-book'
    const bookDir = path.join(dataDir, 'books', bookId)
    const now = new Date().toISOString()
    const meta: BookMeta = {
      id: bookId,
      title: 'Empty Book',
      author: null,
      format: 'txt',
      language: null,
      description: null,
      publisher: null,
      hasCover: false,
      coverColor: 'oklch(0.62 0.13 25)',
      chapters: [],
      wordCount: 0,
      addedAt: now,
      updatedAt: now,
      source: null,
    }
    await mkdir(bookDir, { recursive: true })
    await writeFile(path.join(bookDir, 'book.json'), JSON.stringify(meta))

    const chaptersResponse = await rpc('reader.native.read', {
      route: 'chapters',
      bookId,
    })
    const chapters = (await chaptersResponse.json()) as {
      result: { resumeDestinations: unknown[]; descriptionSections: unknown[] }
    }
    expect(chapters.result.resumeDestinations).toEqual([])
    expect(chapters.result.descriptionSections).toEqual([])

    const statusResponse = await rpc('reader.native.read', {
      route: 'status',
      bookId,
    })
    const status = (await statusResponse.json()) as {
      result: { currentChapter: string; readDestinations: unknown[] }
    }
    expect(status.result.currentChapter).toBe('No chapters')
    expect(status.result.readDestinations).toEqual([])
  })

  it('rejects incomplete, unknown, and unbounded requests', async () => {
    expect(
      (await rpc('reader.native.read', { route: 'chapters' })).status,
    ).toBe(400)
    expect(
      (await rpc('reader.native.read', { route: 'library', limit: 17 })).status,
    ).toBe(400)
    expect(
      (
        await rpc('reader.native.read', {
          route: 'search',
          bookId: 'aesops-fables',
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await rpc('reader.native.read', {
          route: 'search',
          bookId: 'aesops-fables',
          query: 'x',
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await rpc('reader.native.read', {
          route: 'read',
          bookId: 'missing-book',
          chapterIndex: 0,
          page: 0,
        })
      ).status,
    ).toBe(404)
    expect(
      (
        await rpc('reader.native.mutate', {
          action: 'savePosition',
          bookId: 'aesops-fables',
          chapterIndex: 0,
        })
      ).status,
    ).toBe(400)
  })
})

describe('Reader NativeUI package boundary', () => {
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
