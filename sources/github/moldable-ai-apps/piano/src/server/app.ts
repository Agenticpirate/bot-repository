import { generateId, readJson, safePath, writeJson } from '@moldable-ai/storage'
import {
  DEFAULT_PIANO_PRESET_ID,
  PIANO_INSTRUMENT_PACKS,
  PIANO_PRESETS,
  PIANO_SAMPLE_SETS,
  PIANO_SETTING_CONTROLS,
  type PianoAudioSettings,
  type PianoPresetParameters,
  type PianoSoundChoice,
  type SongSoundSettings,
  type SongSoundSettingsResponse,
  defaultPianoAudioSettings,
  pianoPresetById,
} from '../shared/audio'
import type { CourseProgress, PianoCourse } from '../shared/course'
import { type Folder, toneFromSeed } from '../shared/folder'
import {
  type PianoSong,
  type SongSummary,
  type SongWorkspacePracticeSettings,
  getSongDuration,
} from '../shared/song'
import {
  PIANO_PLAYBACK_EXPIRED_MESSAGE,
  PIANO_PLAYBACK_LEASE_MS,
  PIANO_PLAYBACK_STATUSES,
  PIANO_UI_VIEW_IDS,
  type PianoPlaybackStatus,
  type PianoUiIntent,
  type PianoUiViewId,
  isExpiredPianoPlayback,
  isTerminalPianoPlayback,
} from '../shared/ui-intent'
import { defaultCourseIds, defaultCourses } from './courses'
import {
  defaultClassicsIds,
  defaultSongs,
  defaultTutorialIds,
  retiredDefaultSongIds,
} from './default-songs'
import {
  installInstrumentPack,
  withInstrumentInstallState,
  withInstrumentInstallStates,
} from './instrument-installer'
import { getDataDir, jsonError } from './moldable'
import {
  ensureMutopiaPianoIndex,
  fetchMutopiaMidi,
  readMutopiaPianoIndexStatus,
  rebuildMutopiaPianoIndex,
  searchMutopiaPianoIndex,
} from './mutopia-catalog'
import {
  NativeUiParamsError,
  parseNativeDeleteParams,
  parseNativeLibraryUpdateParams,
  parseNativeMutateParams,
  parseNativeReadParams,
  projectNativeCourse,
  projectNativeCourses,
  projectNativeHome,
  projectNativeLesson,
  projectNativeSong,
  projectNativeSongSearch,
  projectNativeSongs,
} from './native-ui-api'
import { readSfzInstrumentPreset } from './sfz-preset'
import { midiBytesToSong } from './song-importer'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createHash } from 'node:crypto'
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { basename, extname, parse } from 'node:path'
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

function songsDir(dataDir: string) {
  return safePath(dataDir, 'songs')
}

function songSourcesDir(dataDir: string) {
  return safePath(dataDir, 'song-sources')
}

function songPath(dataDir: string, songId: string) {
  return safePath(songsDir(dataDir), `${songId}.json`)
}

function copiedMidiPath(dataDir: string, songId: string, filePath: string) {
  const extension =
    extname(filePath).toLowerCase() === '.midi' ? '.midi' : '.mid'
  return safePath(songSourcesDir(dataDir), `${songId}${extension}`)
}

function audioSettingsPath(dataDir: string) {
  return safePath(dataDir, 'audio-settings.json')
}

function songSoundSettingsDir(dataDir: string) {
  return safePath(dataDir, 'song-sounds')
}

function songSoundSettingsPath(dataDir: string, songId: string) {
  return safePath(songSoundSettingsDir(dataDir), `${songId}.json`)
}

function songWorkspaceSettingsDir(dataDir: string) {
  return safePath(dataDir, 'song-workspace-settings')
}

function songWorkspaceSettingsPath(dataDir: string, songId: string) {
  return safePath(songWorkspaceSettingsDir(dataDir), `${songId}.json`)
}

function foldersPath(dataDir: string) {
  return safePath(dataDir, 'folders.json')
}

function coursesDir(dataDir: string) {
  return safePath(dataDir, 'courses')
}

function coursePath(dataDir: string, courseId: string) {
  return safePath(coursesDir(dataDir), `${courseId}.json`)
}

function courseProgressPath(dataDir: string) {
  return safePath(dataDir, 'course-progress.json')
}

function compareByName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

function sortFolders(folders: Folder[]) {
  const hasCustomOrder = folders.some(
    (folder) => typeof folder.sortOrder === 'number',
  )
  return [...folders].sort((a, b) => {
    if (!hasCustomOrder) return compareByName(a, b)
    const aOrder =
      typeof a.sortOrder === 'number' ? a.sortOrder : Number.POSITIVE_INFINITY
    const bOrder =
      typeof b.sortOrder === 'number' ? b.sortOrder : Number.POSITIVE_INFINITY
    if (aOrder !== bOrder) return aOrder - bOrder
    return compareByName(a, b)
  })
}

function nextFolderSortOrder(folders: Folder[]) {
  const orders = folders
    .map((folder) => folder.sortOrder)
    .filter(
      (order): order is number =>
        typeof order === 'number' && Number.isFinite(order),
    )
  if (orders.length === 0) return undefined
  return Math.max(...orders) + 1
}

async function readFolders(dataDir: string): Promise<Folder[]> {
  const raw = await readJson<Folder[] | null>(foldersPath(dataDir), null)
  if (!Array.isArray(raw)) return []
  const folders = raw
    .filter(
      (folder): folder is Folder =>
        !!folder &&
        typeof folder.id === 'string' &&
        typeof folder.name === 'string' &&
        Array.isArray(folder.songIds),
    )
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      tone:
        typeof folder.tone === 'string' && folder.tone
          ? folder.tone
          : toneFromSeed(folder.name),
      songIds: folder.songIds.filter((id) => typeof id === 'string'),
      sortOrder:
        typeof folder.sortOrder === 'number' &&
        Number.isFinite(folder.sortOrder)
          ? folder.sortOrder
          : undefined,
      createdAt: folder.createdAt ?? new Date().toISOString(),
      updatedAt:
        folder.updatedAt ?? folder.createdAt ?? new Date().toISOString(),
    }))
  return sortFolders(folders)
}

async function writeFolders(dataDir: string, folders: Folder[]) {
  await mkdir(dataDir, { recursive: true })
  await writeJson(foldersPath(dataDir), folders)
}

// ─── Courses ─────────────────────────────────────────────────────────

function defaultCourseProgress(courseId: string): CourseProgress {
  return {
    courseId,
    completedLessonIds: [],
    currentLessonId: null,
    updatedAt: new Date().toISOString(),
  }
}

function countCourseLessons(course: PianoCourse): number {
  return course.modules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  )
}

function courseHasLesson(course: PianoCourse, lessonId: string): boolean {
  return course.modules.some((module) =>
    module.lessons.some((lesson) => lesson.id === lessonId),
  )
}

function nextUncompleted(
  course: PianoCourse,
  completed: Set<string>,
  afterLessonId: string,
): string | null {
  const allLessons = course.modules.flatMap((module) => module.lessons)
  const startIndex = allLessons.findIndex(
    (lesson) => lesson.id === afterLessonId,
  )
  if (startIndex === -1) return null
  for (let i = startIndex + 1; i < allLessons.length; i += 1) {
    if (!completed.has(allLessons[i].id)) return allLessons[i].id
  }
  // Wrap from the start
  for (let i = 0; i < startIndex; i += 1) {
    if (!completed.has(allLessons[i].id)) return allLessons[i].id
  }
  return null
}

async function ensureSeedCourses(dataDir: string) {
  await mkdir(coursesDir(dataDir), { recursive: true })
  for (const course of defaultCourses) {
    const path = coursePath(dataDir, course.id)
    const existing = await readJson<PianoCourse | null>(path, null)
    if (!existing) {
      await writeJson(path, course)
    }
  }
}

async function readCourses(dataDir: string): Promise<PianoCourse[]> {
  const courses: PianoCourse[] = []
  // Default-order — read the seeded ids first, then any user-added ones
  const seen = new Set<string>()
  for (const id of defaultCourseIds) {
    const course = await readJson<PianoCourse | null>(
      coursePath(dataDir, id),
      null,
    )
    if (course) {
      courses.push(course)
      seen.add(course.id)
    }
  }
  try {
    const entries = await readdir(coursesDir(dataDir), { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue
      const id = entry.name.replace(/\.json$/, '')
      if (seen.has(id)) continue
      const course = await readJson<PianoCourse | null>(
        coursePath(dataDir, id),
        null,
      )
      if (course?.id) {
        courses.push(course)
        seen.add(course.id)
      }
    }
  } catch {
    // directory may not exist yet — fine
  }
  return courses
}

async function readCourse(
  dataDir: string,
  courseId: string,
): Promise<PianoCourse | null> {
  if (!/^[a-z0-9-]+$/.test(courseId)) return null
  return readJson<PianoCourse | null>(coursePath(dataDir, courseId), null)
}

async function readAllCourseProgress(
  dataDir: string,
): Promise<Record<string, CourseProgress>> {
  const raw = await readJson<Record<string, CourseProgress> | null>(
    courseProgressPath(dataDir),
    null,
  )
  if (!raw || typeof raw !== 'object') return {}
  return raw
}

async function writeAllCourseProgress(
  dataDir: string,
  progress: Record<string, CourseProgress>,
) {
  await mkdir(dataDir, { recursive: true })
  await writeJson(courseProgressPath(dataDir), progress)
}

async function updateCourseProgress(
  dataDir: string,
  courseId: string,
  update: (current: CourseProgress) => CourseProgress,
): Promise<CourseProgress> {
  const all = await readAllCourseProgress(dataDir)
  const current = all[courseId] ?? defaultCourseProgress(courseId)
  const next = update(current)
  all[courseId] = next
  await writeAllCourseProgress(dataDir, all)
  return next
}

function isValidSongId(songId: string) {
  return /^[a-z0-9-]+$/.test(songId)
}

function slugifySongId(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function isPresetId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    PIANO_PRESETS.some((preset) => preset.id === value)
  )
}

function numberInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  )
}

function sanitizeAudioOverrides(
  value: unknown,
): Partial<PianoPresetParameters> {
  if (!value || typeof value !== 'object') return {}

  const source = value as Record<string, unknown>
  const overrides: Partial<PianoPresetParameters> = {}

  if (numberInRange(source.volume, 60, 127)) {
    overrides.volume = source.volume
  }
  if (numberInRange(source.decayTime, 0.2, 2)) {
    overrides.decayTime = source.decayTime
  }
  if (numberInRange(source.velocityScale, 0.45, 1.45)) {
    overrides.velocityScale = source.velocityScale
  }
  if (
    source.velocityCurve === 'soft' ||
    source.velocityCurve === 'balanced' ||
    source.velocityCurve === 'firm' ||
    source.velocityCurve === 'wide'
  ) {
    overrides.velocityCurve = source.velocityCurve
  }
  if (numberInRange(source.tone, -1, 1)) {
    overrides.tone = source.tone
  }
  if (numberInRange(source.room, 0, 1)) {
    overrides.room = source.room
  }
  if (numberInRange(source.width, -1, 1)) {
    overrides.width = source.width
  }
  if (numberInRange(source.detune, -12, 12)) {
    overrides.detune = source.detune
  }

  return overrides
}

function normalizeAudioSettings(settings: PianoAudioSettings | null) {
  const defaults = defaultPianoAudioSettings()
  if (!settings || !isPresetId(settings.presetId)) return defaults
  const instrumentChoice = normalizeInstrumentChoice(
    settings.instrumentPackId,
    settings.instrumentId,
  )

  return {
    presetId: settings.presetId,
    instrumentPackId: instrumentChoice.instrumentPackId,
    instrumentId: instrumentChoice.instrumentId,
    overrides: sanitizeAudioOverrides(settings.overrides),
    updatedAt: settings.updatedAt || new Date().toISOString(),
  } satisfies PianoAudioSettings
}

function normalizeInstrumentChoice(packId: unknown, instrumentId: unknown) {
  const defaults = defaultPianoAudioSettings()
  if (typeof packId !== 'string' || typeof instrumentId !== 'string') {
    return {
      instrumentPackId: defaults.instrumentPackId,
      instrumentId: defaults.instrumentId,
    }
  }

  const pack = PIANO_INSTRUMENT_PACKS.find(
    (candidate) => candidate.id === packId,
  )
  const instrument = pack?.instruments.find(
    (candidate) => candidate.id === instrumentId && candidate.playable,
  )
  if (!pack || !instrument) {
    return {
      instrumentPackId: defaults.instrumentPackId,
      instrumentId: defaults.instrumentId,
    }
  }

  return {
    instrumentPackId: pack.id,
    instrumentId: instrument.id,
  }
}

async function readAudioSettings(dataDir: string) {
  const settings = await readJson<PianoAudioSettings | null>(
    audioSettingsPath(dataDir),
    null,
  )
  return normalizeAudioSettings(settings)
}

function sanitizeSoundChoice(value: unknown): PianoSoundChoice {
  if (!value || typeof value !== 'object') return {}
  const source = value as Record<string, unknown>
  const choice: PianoSoundChoice = {}

  if (source.presetId === undefined || isPresetId(source.presetId)) {
    if (typeof source.presetId === 'string') choice.presetId = source.presetId
  }

  const hasPack = typeof source.instrumentPackId === 'string'
  const hasInstrument = typeof source.instrumentId === 'string'
  if (hasPack || hasInstrument) {
    const instrumentChoice = normalizeInstrumentChoice(
      source.instrumentPackId,
      source.instrumentId,
    )
    choice.instrumentPackId = instrumentChoice.instrumentPackId
    choice.instrumentId = instrumentChoice.instrumentId
  }

  return choice
}

function mergeSoundChoice(
  base: PianoSoundChoice,
  next: PianoSoundChoice | undefined,
): PianoSoundChoice {
  if (!next) return base
  return {
    presetId: next.presetId ?? base.presetId,
    instrumentPackId: next.instrumentPackId ?? base.instrumentPackId,
    instrumentId: next.instrumentId ?? base.instrumentId,
  }
}

function hasSoundChoice(choice: PianoSoundChoice | undefined) {
  return Boolean(
    choice?.presetId || choice?.instrumentPackId || choice?.instrumentId,
  )
}

function optionalSoundChoice(value: unknown) {
  const choice = sanitizeSoundChoice(value)
  return hasSoundChoice(choice) ? choice : undefined
}

async function readSongSoundSettings(dataDir: string, songId: string) {
  const settings = await readJson<SongSoundSettings | null>(
    songSoundSettingsPath(dataDir, songId),
    null,
  )
  if (!settings || settings.songId !== songId) return null
  return {
    songId,
    suggested: optionalSoundChoice(settings.suggested),
    override: optionalSoundChoice(settings.override),
    createdAt: settings.createdAt ?? new Date().toISOString(),
    updatedAt:
      settings.updatedAt ?? settings.createdAt ?? new Date().toISOString(),
  } satisfies SongSoundSettings
}

async function writeSongSoundSettings(
  dataDir: string,
  settings: SongSoundSettings,
) {
  await mkdir(songSoundSettingsDir(dataDir), { recursive: true })
  await writeJson(songSoundSettingsPath(dataDir, settings.songId), settings)
}

async function readSongWorkspaceSettings(dataDir: string, songId: string) {
  const settings = await readJson<SongWorkspacePracticeSettings | null>(
    songWorkspaceSettingsPath(dataDir, songId),
    null,
  )
  if (!settings || settings.songId !== songId) return null
  const playbackSpeed = sanitizePlaybackSpeed(settings.playbackSpeed)
  const now = new Date().toISOString()
  return {
    songId,
    playbackSpeed,
    createdAt: settings.createdAt ?? now,
    updatedAt: settings.updatedAt ?? settings.createdAt ?? now,
  } satisfies SongWorkspacePracticeSettings
}

async function writeSongWorkspaceSettings(
  dataDir: string,
  settings: SongWorkspacePracticeSettings,
) {
  await mkdir(songWorkspaceSettingsDir(dataDir), { recursive: true })
  await writeJson(songWorkspaceSettingsPath(dataDir, settings.songId), settings)
}

async function getSongSoundSettingsResponse(
  dataDir: string,
  songId: string,
): Promise<SongSoundSettingsResponse> {
  const globalSettings = await readAudioSettings(dataDir)
  const settings = await readSongSoundSettings(dataDir, songId)
  const globalChoice: PianoSoundChoice = {
    presetId: globalSettings.presetId,
    instrumentPackId: globalSettings.instrumentPackId,
    instrumentId: globalSettings.instrumentId,
  }
  const suggested = mergeSoundChoice(globalChoice, settings?.suggested)
  const effective = mergeSoundChoice(suggested, settings?.override)
  const source = hasSoundChoice(settings?.override)
    ? 'override'
    : hasSoundChoice(settings?.suggested)
      ? 'suggested'
      : 'global'

  return { settings, effective, source }
}

function summarizeSong(song: PianoSong): SongSummary {
  return {
    id: song.id,
    title: song.title,
    source: song.source,
    composer: song.sourceInfo?.composer,
    artist: song.sourceInfo?.artist,
    bpm: song.bpm,
    beatsPerBar: song.beatsPerBar,
    beatUnit: song.beatUnit,
    tempoMap: song.tempoMap,
    timeSignatureMap: song.timeSignatureMap,
    isTutorial: Boolean(song.tutorial),
    tutorialSummary: song.tutorial?.summary,
    noteCount: song.notes.length,
    duration: getSongDuration(song),
    updatedAt: song.updatedAt,
  }
}

function formatCommandDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const totalSeconds = Math.round(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours > 0) {
    return `${hours}:${String(remainingMinutes).padStart(2, '0')}:${String(
      remainingSeconds,
    ).padStart(2, '0')}`
  }
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function songCommandDescription(song: SongSummary) {
  const credits = song.composer || song.artist || song.source
  const noteLabel = `${song.noteCount} ${song.noteCount === 1 ? 'note' : 'notes'}`
  const parts = [credits, formatCommandDuration(song.duration), noteLabel]
    .filter(Boolean)
    .map(String)
  return parts.length > 0 ? `Open song • ${parts.join(' • ')}` : 'Open song'
}

function catalogSongTitle(title: string, opus: string | undefined) {
  if (!opus || title.toLowerCase().includes(opus.toLowerCase())) return title
  return `${title}, ${opus}`
}

interface SongFolderParams {
  folderId?: unknown
  folderName?: unknown
  createFolder?: unknown
}

interface ImportMidiFileParams extends SongFolderParams {
  filePath?: unknown
  path?: unknown
  songId?: unknown
  title?: unknown
  replaceSongId?: unknown
  overwrite?: unknown
  source?: unknown
  composer?: unknown
  artist?: unknown
  license?: unknown
}

interface UpsertSongParams extends SongFolderParams {
  song?: unknown
  overwrite?: unknown
  allowEmpty?: unknown
  soundSettings?: unknown
}

interface UpsertSongFromFileParams extends UpsertSongParams {
  filePath?: unknown
  path?: unknown
}

interface PatchSongParams extends SongFolderParams {
  songId?: unknown
  metadata?: unknown
  noteOperations?: unknown
  sortNotes?: unknown
  allowEmpty?: unknown
  soundSettings?: unknown
}

interface PatchSongFromFileParams extends PatchSongParams {
  filePath?: unknown
  path?: unknown
}

class ImportMidiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: 400 | 404 | 409 | 422 = 400,
  ) {
    super(message)
  }
}

class SongWriteError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: 400 | 404 | 409 | 422 = 400,
  ) {
    super(message)
  }
}

function stringParam(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeImportMidiParams(params: ImportMidiFileParams) {
  const filePath = stringParam(params.filePath) || stringParam(params.path)
  if (!filePath) {
    throw new ImportMidiError(
      'A MIDI filePath is required',
      'file_path_required',
    )
  }

  const extension = extname(filePath).toLowerCase()
  if (extension !== '.mid' && extension !== '.midi') {
    throw new ImportMidiError(
      'Only .mid and .midi files can be imported',
      'invalid_file_type',
    )
  }

  const rawTitle = stringParam(params.title)
  const title = rawTitle || parse(filePath).name.replace(/[-_]+/g, ' ')
  const rawSongId =
    stringParam(params.songId) || slugifySongId(parse(filePath).name)
  const songId = slugifySongId(rawSongId)
  if (!isValidSongId(songId)) {
    throw new ImportMidiError('A valid songId is required', 'invalid_song_id')
  }

  const replaceSongId = stringParam(params.replaceSongId)
  if (replaceSongId && !isValidSongId(replaceSongId)) {
    throw new ImportMidiError(
      'replaceSongId is invalid',
      'invalid_replace_song_id',
    )
  }

  return {
    filePath,
    songId,
    title,
    folderId: stringParam(params.folderId),
    folderName: stringParam(params.folderName),
    createFolder: params.createFolder === true,
    replaceSongId,
    overwrite: params.overwrite === true,
    source: stringParam(params.source),
    composer: stringParam(params.composer),
    artist: stringParam(params.artist),
    license: stringParam(params.license),
  }
}

async function findTargetFolder(
  dataDir: string,
  params: { folderId: string; folderName: string; createFolder: boolean },
) {
  if (!params.folderId && !params.folderName) return null

  const folders = await readFolders(dataDir)
  const existing = folders.find((folder) => {
    if (params.folderId) return folder.id === params.folderId
    return folder.name.toLowerCase() === params.folderName.toLowerCase()
  })

  if (existing) return { folder: existing, folders }
  if (!params.folderName || !params.createFolder) {
    throw new SongWriteError('Folder not found', 'folder_not_found', 404)
  }

  const now = new Date().toISOString()
  const folder: Folder = {
    id: generateId(),
    name: params.folderName.slice(0, 80),
    tone: toneFromSeed(params.folderName),
    songIds: [],
    sortOrder: nextFolderSortOrder(folders),
    createdAt: now,
    updatedAt: now,
  }
  return { folder, folders: sortFolders([folder, ...folders]) }
}

type NormalizedImportMidiParams = ReturnType<typeof normalizeImportMidiParams>

async function persistImportedMidiSong(
  dataDir: string,
  params: NormalizedImportMidiParams,
  bytes: Buffer,
  sourceName: string,
  sourceUrl: string,
  copySourceFilePath?: string,
) {
  const destinationSongPath = songPath(dataDir, params.songId)
  const existing = await readJson<PianoSong | null>(destinationSongPath, null)
  const replacingSameSong = params.replaceSongId === params.songId
  if (existing && !params.overwrite && !replacingSameSong) {
    throw new ImportMidiError(
      `Song ${params.songId} already exists. Pass overwrite: true to replace it.`,
      'song_already_exists',
      409,
    )
  }

  const sourceHash = createHash('sha256').update(bytes).digest('hex')
  const sourceMidiPath = copiedMidiPath(dataDir, params.songId, sourceName)
  const now = new Date().toISOString()
  const song = midiBytesToSong(bytes, {
    id: params.songId,
    title: params.title,
    source: params.source || `Imported from MIDI: ${sourceUrl}`,
    sourceInfo: {
      provider: 'User-provided MIDI',
      sourceUrl,
      midiUrl: sourceMidiPath,
      license: params.license || 'User-provided for personal use',
      composer: params.composer || undefined,
      artist: params.artist || undefined,
    },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    sourceHash,
    sourceFileName: basename(sourceName),
  })

  await mkdir(songsDir(dataDir), { recursive: true })
  await mkdir(songSourcesDir(dataDir), { recursive: true })
  await writeJson(destinationSongPath, song)
  if (copySourceFilePath) {
    await copyFile(copySourceFilePath, sourceMidiPath)
  } else {
    await writeFile(sourceMidiPath, bytes)
  }

  let removedSongId: string | undefined
  if (params.replaceSongId && params.replaceSongId !== params.songId) {
    await rm(songPath(dataDir, params.replaceSongId), { force: true })
    removedSongId = params.replaceSongId
  }

  const folderResult = await findTargetFolder(dataDir, params)
  if (folderResult) {
    const nowForFolder = new Date().toISOString()
    for (const folder of folderResult.folders) {
      folder.songIds = folder.songIds.filter(
        (id) => id !== params.songId && id !== params.replaceSongId,
      )
    }
    folderResult.folder.songIds = [
      ...folderResult.folder.songIds,
      params.songId,
    ]
    folderResult.folder.updatedAt = nowForFolder
    await writeFolders(dataDir, folderResult.folders)
  } else if (removedSongId) {
    const folders = await readFolders(dataDir)
    const updated = folders.map((folder) => ({
      ...folder,
      songIds: folder.songIds.filter((id) => id !== removedSongId),
    }))
    await writeFolders(dataDir, updated)
  }

  return {
    imported: true,
    song: summarizeSong(song),
    sourceMidiPath,
    removedSongId,
    folder: folderResult?.folder,
    midiInfo: song.midiInfo,
  }
}

async function importMidiFile(
  dataDir: string,
  rawParams: ImportMidiFileParams,
) {
  const params = normalizeImportMidiParams(rawParams)
  const fileStats = await stat(params.filePath).catch(() => null)
  if (!fileStats?.isFile()) {
    throw new ImportMidiError('MIDI file not found', 'file_not_found', 404)
  }
  if (fileStats.size > 50 * 1024 * 1024) {
    throw new ImportMidiError(
      'MIDI file is larger than 50 MB',
      'file_too_large',
      422,
    )
  }

  const bytes = await readFile(params.filePath)
  return persistImportedMidiSong(
    dataDir,
    params,
    bytes,
    params.filePath,
    params.filePath,
    params.filePath,
  )
}

function normalizeSongFolderParams(params: SongFolderParams) {
  return {
    folderId: stringParam(params.folderId),
    folderName: stringParam(params.folderName),
    createFolder: params.createFolder === true,
  }
}

function positiveNumber(value: unknown, fallback: number, min = 0) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min
    ? value
    : fallback
}

function sanitizeNote(
  value: unknown,
  index: number,
): PianoSong['notes'][number] | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  const pitch = stringParam(source.pitch)
  const midi = positiveNumber(source.midi, Number.NaN, 0)
  const start = positiveNumber(source.start, Number.NaN, 0)
  const duration = positiveNumber(source.duration, Number.NaN, 0.001)
  if (
    !pitch ||
    !Number.isFinite(midi) ||
    !Number.isFinite(start) ||
    !Number.isFinite(duration)
  ) {
    return null
  }

  const note: PianoSong['notes'][number] = {
    id: stringParam(source.id) || `note-${index + 1}`,
    pitch,
    midi: Math.round(midi),
    start,
    duration,
  }
  if (typeof source.velocity === 'number' && Number.isFinite(source.velocity)) {
    note.velocity = Math.min(1, Math.max(0, source.velocity))
  }
  if (typeof source.color === 'string' && source.color.trim()) {
    note.color = source.color.trim().slice(0, 40)
  }
  if (typeof source.label === 'string' && source.label.trim()) {
    note.label = source.label.trim().slice(0, 120)
  }
  return note
}

function sanitizeSongDocument(
  value: unknown,
  existing: PianoSong | null,
  options: { allowEmpty?: boolean } = {},
): PianoSong {
  if (!value || typeof value !== 'object') {
    throw new SongWriteError(
      'A complete song object is required',
      'invalid_song',
      400,
    )
  }
  const source = value as Record<string, unknown>
  const id = slugifySongId(stringParam(source.id))
  if (!isValidSongId(id)) {
    throw new SongWriteError(
      'A valid song id is required',
      'invalid_song_id',
      400,
    )
  }
  const title = stringParam(source.title).slice(0, 160)
  if (!title) {
    throw new SongWriteError('Song title is required', 'title_required', 400)
  }
  if (!Array.isArray(source.notes)) {
    throw new SongWriteError(
      'Song notes must be an array',
      'invalid_notes',
      400,
    )
  }
  const notes = source.notes
    .map((note, index) => sanitizeNote(note, index))
    .filter((note): note is PianoSong['notes'][number] => Boolean(note))
    .sort((a, b) => a.start - b.start || a.midi - b.midi)
  if (notes.length === 0 && !options.allowEmpty) {
    throw new SongWriteError(
      'Song must contain at least one valid note',
      'empty_song',
      422,
    )
  }

  const now = new Date().toISOString()
  const bpm = positiveNumber(source.bpm, existing?.bpm ?? 90, 1)
  const beatUnit = Math.round(
    positiveNumber(source.beatUnit, existing?.beatUnit ?? 4, 1),
  )
  const beatsPerBar = Math.round(
    positiveNumber(source.beatsPerBar, existing?.beatsPerBar ?? 4, 1),
  )
  const defaultSecondsPerBeat = positiveNumber(
    source.defaultSecondsPerBeat,
    existing?.defaultSecondsPerBeat ?? 60 / bpm,
    0.001,
  )

  const sourceInfo =
    source.sourceInfo && typeof source.sourceInfo === 'object'
      ? (source.sourceInfo as PianoSong['sourceInfo'])
      : existing?.sourceInfo

  return {
    id,
    title,
    source: stringParam(source.source) || existing?.source,
    sourceInfo,
    bpm,
    beatsPerBar,
    beatUnit,
    defaultSecondsPerBeat,
    tempoMap: Array.isArray(source.tempoMap)
      ? (source.tempoMap as PianoSong['tempoMap'])
      : existing?.tempoMap,
    timeSignatureMap: Array.isArray(source.timeSignatureMap)
      ? (source.timeSignatureMap as PianoSong['timeSignatureMap'])
      : existing?.timeSignatureMap,
    midiInfo: existing?.midiInfo,
    practiceSettings:
      source.practiceSettings === undefined
        ? existing?.practiceSettings
        : sanitizeSongPracticeSettings(source.practiceSettings),
    tutorial:
      source.tutorial === undefined
        ? existing?.tutorial
        : sanitizeSongTutorial(source.tutorial),
    pausePoints:
      source.pausePoints === undefined
        ? existing?.pausePoints
        : sanitizePausePoints(source.pausePoints),
    notes: notes.map((note, index) => ({
      ...note,
      id: note.id || `note-${index + 1}`,
    })),
    createdAt: stringParam(source.createdAt) || existing?.createdAt || now,
    updatedAt: now,
  }
}

async function assignSongToFolder(
  dataDir: string,
  songId: string,
  params: { folderId: string; folderName: string; createFolder: boolean },
) {
  const folderResult = await findTargetFolder(dataDir, params)
  if (!folderResult) return undefined

  const now = new Date().toISOString()
  for (const folder of folderResult.folders) {
    folder.songIds = folder.songIds.filter((id) => id !== songId)
  }
  folderResult.folder.songIds = [...folderResult.folder.songIds, songId]
  folderResult.folder.updatedAt = now
  await writeFolders(dataDir, folderResult.folders)
  return folderResult.folder
}

function sanitizeNotesArray(value: unknown, errorCode = 'invalid_notes') {
  if (!Array.isArray(value)) {
    throw new SongWriteError('Notes must be an array', errorCode, 400)
  }
  const notes = value
    .map((note, index) => sanitizeNote(note, index))
    .filter((note): note is PianoSong['notes'][number] => Boolean(note))
  if (notes.length !== value.length) {
    throw new SongWriteError(
      'Every note must include pitch, midi, start, and duration',
      errorCode,
      400,
    )
  }
  return notes
}

function numberParam(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function stringArrayParam(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === 'string' && item.length > 0,
      )
    : []
}

function sanitizeSplitMidi(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.max(21, Math.min(108, Math.round(value)))
}

function sanitizePlaybackSpeed(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.max(0.1, Math.min(2, value))
}

function sanitizePausePoints(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  const cleaned = value
    .filter(
      (entry): entry is number =>
        typeof entry === 'number' && Number.isFinite(entry) && entry >= 0,
    )
    .map((entry) => Number(entry.toFixed(3)))
  if (cleaned.length === 0) return undefined
  const unique = Array.from(new Set(cleaned)).sort((a, b) => a - b)
  return unique
}

function sanitizeSongPracticeSettings(value: unknown) {
  const source = objectParam(value)
  const splitMidi = sanitizeSplitMidi(source.splitMidi)
  return splitMidi === undefined ? undefined : { splitMidi }
}

function sanitizeTextList(value: unknown, maxItems = 8, maxLength = 360) {
  return Array.isArray(value)
    ? value
        .filter(
          (item): item is string =>
            typeof item === 'string' && item.trim().length > 0,
        )
        .slice(0, maxItems)
        .map((item) => item.trim().slice(0, maxLength))
    : []
}

function sanitizeSongTutorial(value: unknown): PianoSong['tutorial'] {
  const source = objectParam(value)
  const summary = stringParam(source.summary).slice(0, 700)
  const objectives = sanitizeTextList(source.objectives, 8, 220)
  const rawSections = Array.isArray(source.sections) ? source.sections : []
  const sections = rawSections
    .map((rawSection, index) => {
      const section = objectParam(rawSection)
      const title = stringParam(section.title).slice(0, 120)
      const start = positiveNumber(section.start, Number.NaN, 0)
      const end = positiveNumber(section.end, Number.NaN, 0)
      const learn = sanitizeTextList(section.learn, 8, 360)
      if (
        !title ||
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end <= start ||
        learn.length === 0
      ) {
        return null
      }
      return {
        id: stringParam(section.id) || `section-${index + 1}`,
        title,
        start,
        end,
        focus: stringParam(section.focus).slice(0, 160) || undefined,
        learn,
        tryThis: sanitizeTextList(section.tryThis, 8, 320),
        breakIt: sanitizeTextList(section.breakIt, 8, 320),
        reinforce: sanitizeTextList(section.reinforce, 8, 320),
      }
    })
    .filter((section): section is NonNullable<typeof section> =>
      Boolean(section),
    )

  if (!summary || objectives.length === 0 || sections.length === 0)
    return undefined

  return {
    title: stringParam(source.title).slice(0, 120) || undefined,
    summary,
    level: stringParam(source.level).slice(0, 80) || undefined,
    objectives,
    sections,
  }
}

function objectParam(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

async function readJsonPayloadFile(rawParams: {
  filePath?: unknown
  path?: unknown
}) {
  const filePath =
    stringParam(rawParams.filePath) || stringParam(rawParams.path)
  if (!filePath) {
    throw new SongWriteError(
      'A JSON filePath is required',
      'file_path_required',
      400,
    )
  }
  if (extname(filePath).toLowerCase() !== '.json') {
    throw new SongWriteError(
      'Only .json files can be used for song JSON imports',
      'invalid_file_type',
      400,
    )
  }

  const fileStats = await stat(filePath).catch(() => null)
  if (!fileStats?.isFile()) {
    throw new SongWriteError('JSON file not found', 'file_not_found', 404)
  }
  if (fileStats.size > 50 * 1024 * 1024) {
    throw new SongWriteError(
      'JSON file is larger than 50 MB',
      'file_too_large',
      422,
    )
  }

  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as unknown
  } catch (error) {
    throw new SongWriteError(
      error instanceof SyntaxError
        ? `Invalid JSON: ${error.message}`
        : 'Failed to read JSON file',
      'invalid_json_file',
      400,
    )
  }
}

function mergePatchedSongMetadata(
  existing: PianoSong,
  metadata: Record<string, unknown>,
  notes: PianoSong['notes'],
  options: { allowEmpty?: boolean } = {},
): PianoSong {
  if (notes.length === 0 && !options.allowEmpty) {
    throw new SongWriteError(
      'Song must contain at least one valid note',
      'empty_song',
      422,
    )
  }

  const now = new Date().toISOString()
  const title =
    metadata.title === undefined
      ? existing.title
      : stringParam(metadata.title).slice(0, 160)
  if (!title) {
    throw new SongWriteError('Song title is required', 'title_required', 400)
  }

  const bpm =
    metadata.bpm === undefined
      ? existing.bpm
      : positiveNumber(metadata.bpm, existing.bpm, 1)
  const beatUnit =
    metadata.beatUnit === undefined
      ? existing.beatUnit
      : Math.round(positiveNumber(metadata.beatUnit, existing.beatUnit ?? 4, 1))
  const beatsPerBar =
    metadata.beatsPerBar === undefined
      ? existing.beatsPerBar
      : Math.round(
          positiveNumber(metadata.beatsPerBar, existing.beatsPerBar, 1),
        )
  const defaultSecondsPerBeat =
    metadata.defaultSecondsPerBeat === undefined
      ? existing.defaultSecondsPerBeat
      : positiveNumber(
          metadata.defaultSecondsPerBeat,
          existing.defaultSecondsPerBeat,
          0.001,
        )

  return {
    id: existing.id,
    title,
    source:
      metadata.source === undefined
        ? existing.source
        : stringParam(metadata.source),
    sourceInfo:
      metadata.sourceInfo && typeof metadata.sourceInfo === 'object'
        ? (metadata.sourceInfo as PianoSong['sourceInfo'])
        : existing.sourceInfo,
    bpm,
    beatsPerBar,
    beatUnit,
    defaultSecondsPerBeat,
    tempoMap: Array.isArray(metadata.tempoMap)
      ? (metadata.tempoMap as PianoSong['tempoMap'])
      : existing.tempoMap,
    timeSignatureMap: Array.isArray(metadata.timeSignatureMap)
      ? (metadata.timeSignatureMap as PianoSong['timeSignatureMap'])
      : existing.timeSignatureMap,
    midiInfo: existing.midiInfo,
    practiceSettings:
      metadata.practiceSettings === undefined
        ? existing.practiceSettings
        : sanitizeSongPracticeSettings(metadata.practiceSettings),
    tutorial:
      metadata.tutorial === undefined
        ? existing.tutorial
        : sanitizeSongTutorial(metadata.tutorial),
    notes,
    createdAt: existing.createdAt,
    updatedAt: now,
  }
}

function applyNoteOperations(
  currentNotes: PianoSong['notes'],
  rawOperations: unknown,
  options: { sortNotes: boolean; allowEmpty?: boolean },
) {
  if (!Array.isArray(rawOperations) || rawOperations.length === 0)
    return currentNotes

  let notes = [...currentNotes]
  for (const rawOperation of rawOperations) {
    if (!rawOperation || typeof rawOperation !== 'object') {
      throw new SongWriteError(
        'Each note operation must be an object',
        'invalid_note_operation',
        400,
      )
    }
    const operation = rawOperation as Record<string, unknown>
    const type = stringParam(operation.type)

    if (type === 'append') {
      notes = [...notes, ...sanitizeNotesArray(operation.notes)]
      continue
    }

    if (type === 'replaceAll') {
      notes = sanitizeNotesArray(operation.notes)
      continue
    }

    if (type === 'upsert') {
      const nextNotes = sanitizeNotesArray(operation.notes)
      const byId = new Map(notes.map((note) => [note.id, note]))
      for (const note of nextNotes) byId.set(note.id, note)
      notes = Array.from(byId.values())
      continue
    }

    if (type === 'delete') {
      const ids = new Set(stringArrayParam(operation.ids))
      const start = numberParam(operation.start)
      const end = numberParam(operation.end)
      notes = notes.filter((note) => {
        if (ids.has(note.id)) return false
        if (
          start !== undefined &&
          end !== undefined &&
          note.start >= start &&
          note.start < end
        ) {
          return false
        }
        return true
      })
      continue
    }

    if (type === 'replaceRange') {
      const start = numberParam(operation.start)
      const end = numberParam(operation.end)
      if (start === undefined || end === undefined || end < start) {
        throw new SongWriteError(
          'replaceRange requires start and end numbers',
          'invalid_range',
          400,
        )
      }
      const replacementNotes = sanitizeNotesArray(operation.notes)
      notes = [
        ...notes.filter((note) => note.start < start || note.start >= end),
        ...replacementNotes,
      ]
      continue
    }

    throw new SongWriteError(
      `Unsupported note operation: ${type || 'unknown'}`,
      'unsupported_note_operation',
      400,
    )
  }

  if (options.sortNotes) {
    notes = notes.sort(
      (a, b) =>
        a.start - b.start || a.midi - b.midi || a.id.localeCompare(b.id),
    )
  }
  if (notes.length === 0 && !options.allowEmpty) {
    throw new SongWriteError(
      'Song must contain at least one valid note',
      'empty_song',
      422,
    )
  }
  return notes
}

async function upsertSong(dataDir: string, rawParams: UpsertSongParams) {
  const rawSong =
    rawParams.song && typeof rawParams.song === 'object'
      ? (rawParams.song as Record<string, unknown>)
      : null
  const songId = slugifySongId(stringParam(rawSong?.id))
  if (!isValidSongId(songId)) {
    throw new SongWriteError(
      'A valid song id is required',
      'invalid_song_id',
      400,
    )
  }

  const destinationSongPath = songPath(dataDir, songId)
  const existing = await readJson<PianoSong | null>(destinationSongPath, null)
  if (existing && rawParams.overwrite !== true) {
    throw new SongWriteError(
      `Song ${songId} already exists. Pass overwrite: true to replace it.`,
      'song_already_exists',
      409,
    )
  }

  const song = sanitizeSongDocument(rawParams.song, existing, {
    allowEmpty: rawParams.allowEmpty === true,
  })
  await mkdir(songsDir(dataDir), { recursive: true })
  await writeJson(destinationSongPath, song)

  const folder = await assignSongToFolder(
    dataDir,
    song.id,
    normalizeSongFolderParams(rawParams),
  )

  const suggested = optionalSoundChoice(
    rawParams.soundSettings && typeof rawParams.soundSettings === 'object'
      ? (rawParams.soundSettings as Record<string, unknown>).suggested
      : undefined,
  )
  const override = optionalSoundChoice(
    rawParams.soundSettings && typeof rawParams.soundSettings === 'object'
      ? (rawParams.soundSettings as Record<string, unknown>).override
      : undefined,
  )
  if (suggested || override) {
    const now = new Date().toISOString()
    await writeSongSoundSettings(dataDir, {
      songId: song.id,
      suggested,
      override,
      createdAt: now,
      updatedAt: now,
    })
  }

  return {
    upserted: true,
    song: summarizeSong(song),
    folder,
  }
}

async function upsertSongFromFile(
  dataDir: string,
  rawParams: UpsertSongFromFileParams,
) {
  const payload = await readJsonPayloadFile(rawParams)
  const payloadObject = objectParam(payload)
  const payloadHasEnvelope = 'song' in payloadObject
  const payloadParams = payloadHasEnvelope ? payloadObject : { song: payload }

  return upsertSong(dataDir, {
    ...(payloadParams as UpsertSongParams),
    song: rawParams.song ?? payloadParams.song,
    folderId: rawParams.folderId ?? payloadParams.folderId,
    folderName: rawParams.folderName ?? payloadParams.folderName,
    createFolder: rawParams.createFolder ?? payloadParams.createFolder,
    overwrite: rawParams.overwrite ?? payloadParams.overwrite,
    allowEmpty: rawParams.allowEmpty ?? payloadParams.allowEmpty,
    soundSettings: rawParams.soundSettings ?? payloadParams.soundSettings,
  })
}

async function patchSong(dataDir: string, rawParams: PatchSongParams) {
  const songId = slugifySongId(stringParam(rawParams.songId))
  if (!isValidSongId(songId)) {
    throw new SongWriteError(
      'A valid song id is required',
      'invalid_song_id',
      400,
    )
  }

  const existing = await readJson<PianoSong | null>(
    songPath(dataDir, songId),
    null,
  )
  if (!existing) {
    throw new SongWriteError('Song not found', 'song_not_found', 404)
  }

  const notes = applyNoteOperations(existing.notes, rawParams.noteOperations, {
    sortNotes: rawParams.sortNotes !== false,
    allowEmpty: rawParams.allowEmpty === true,
  })
  const song = mergePatchedSongMetadata(
    existing,
    objectParam(rawParams.metadata),
    notes,
    {
      allowEmpty: rawParams.allowEmpty === true,
    },
  )

  await writeJson(songPath(dataDir, song.id), song)

  const folder = await assignSongToFolder(
    dataDir,
    song.id,
    normalizeSongFolderParams(rawParams),
  )

  const suggested = optionalSoundChoice(
    rawParams.soundSettings && typeof rawParams.soundSettings === 'object'
      ? (rawParams.soundSettings as Record<string, unknown>).suggested
      : undefined,
  )
  const override = optionalSoundChoice(
    rawParams.soundSettings && typeof rawParams.soundSettings === 'object'
      ? (rawParams.soundSettings as Record<string, unknown>).override
      : undefined,
  )
  if (suggested || override) {
    const now = new Date().toISOString()
    const existingSettings = await readSongSoundSettings(dataDir, song.id)
    await writeSongSoundSettings(dataDir, {
      songId: song.id,
      suggested: suggested ?? existingSettings?.suggested,
      override: override ?? existingSettings?.override,
      createdAt: existingSettings?.createdAt ?? now,
      updatedAt: now,
    })
  }

  return {
    patched: true,
    song: summarizeSong(song),
    folder,
  }
}

async function patchSongFromFile(
  dataDir: string,
  rawParams: PatchSongFromFileParams,
) {
  const payload = await readJsonPayloadFile(rawParams)
  const payloadObject = Array.isArray(payload)
    ? { noteOperations: payload }
    : objectParam(payload)

  return patchSong(dataDir, {
    ...(payloadObject as PatchSongParams),
    songId: rawParams.songId ?? payloadObject.songId,
    metadata: rawParams.metadata ?? payloadObject.metadata,
    noteOperations: rawParams.noteOperations ?? payloadObject.noteOperations,
    folderId: rawParams.folderId ?? payloadObject.folderId,
    folderName: rawParams.folderName ?? payloadObject.folderName,
    createFolder: rawParams.createFolder ?? payloadObject.createFolder,
    sortNotes: rawParams.sortNotes ?? payloadObject.sortNotes,
    allowEmpty: rawParams.allowEmpty ?? payloadObject.allowEmpty,
    soundSettings: rawParams.soundSettings ?? payloadObject.soundSettings,
  })
}

async function readLibraryRevision(dataDir: string) {
  const paths = [
    foldersPath(dataDir),
    songsDir(dataDir),
    songSoundSettingsDir(dataDir),
  ]
  let latest = 0
  let fileCount = 0

  for (const path of paths) {
    const entryStat = await stat(path).catch(() => null)
    if (!entryStat) continue
    latest = Math.max(latest, entryStat.mtimeMs)
    if (entryStat.isFile()) {
      fileCount += 1
      continue
    }
    if (!entryStat.isDirectory()) continue
    const entries = await readdir(path, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (!entry.isFile()) continue
      fileCount += 1
      const childStat = await stat(safePath(path, entry.name)).catch(() => null)
      if (childStat) latest = Math.max(latest, childStat.mtimeMs)
    }
  }

  return {
    revision: `${Math.round(latest)}:${fileCount}`,
    updatedAt: latest ? new Date(latest).toISOString() : null,
    fileCount,
  }
}

async function ensureSeedSongs(dataDir: string) {
  await mkdir(songsDir(dataDir), { recursive: true })
  await ensureSeedCourses(dataDir)

  for (const id of retiredDefaultSongIds) {
    const path = songPath(dataDir, id)
    const existing = await readJson<PianoSong | null>(path, null)
    if (existing?.sourceInfo?.provider === 'Mutopia Project') {
      await rm(path, { force: true })
    }
  }

  const newlySeededIds: string[] = []
  for (const song of defaultSongs()) {
    const path = songPath(dataDir, song.id)
    const existing = await readJson<PianoSong | null>(path, null)
    if (!existing) {
      await writeJson(path, song)
      newlySeededIds.push(song.id)
    }
  }

  if (newlySeededIds.length > 0) {
    const seededTutorialIds = newlySeededIds.filter((id) =>
      defaultTutorialIds.includes(id),
    )
    const seededClassicsIds = newlySeededIds.filter((id) =>
      defaultClassicsIds.includes(id),
    )
    if (seededTutorialIds.length > 0) {
      await ensureDefaultFolderHas(dataDir, 'Tutorials', seededTutorialIds)
    }
    if (seededClassicsIds.length > 0) {
      await ensureDefaultFolderHas(dataDir, 'Classics', seededClassicsIds)
    }
  }
}

/**
 * Ensure a default-named folder exists containing the given song ids.
 * Never modifies an existing folder's membership beyond appending songs
 * that aren't already in *any* folder — so the user's custom
 * organization is preserved.
 */
async function ensureDefaultFolderHas(
  dataDir: string,
  folderName: string,
  songIds: string[],
) {
  const folders = await readFolders(dataDir)
  const alreadyAssigned = new Set<string>()
  for (const folder of folders) {
    for (const id of folder.songIds) alreadyAssigned.add(id)
  }
  const idsToAssign = songIds.filter((id) => !alreadyAssigned.has(id))
  if (idsToAssign.length === 0) return

  const now = new Date().toISOString()
  let target = folders.find(
    (folder) => folder.name.toLowerCase() === folderName.toLowerCase(),
  )

  if (!target) {
    target = {
      id: generateId(),
      name: folderName,
      tone: toneFromSeed(folderName),
      songIds: [],
      createdAt: now,
      updatedAt: now,
    }
    folders.unshift(target)
  }

  const existingInTarget = new Set(target.songIds)
  for (const id of idsToAssign) {
    if (!existingInTarget.has(id)) {
      target.songIds.push(id)
      existingInTarget.add(id)
    }
  }
  target.updatedAt = now

  await writeFolders(dataDir, folders)
}

async function readSongs(dataDir: string) {
  await ensureSeedSongs(dataDir)
  const entries = await readdir(songsDir(dataDir), { withFileTypes: true })
  const songs: PianoSong[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const songId = entry.name.replace(/\.json$/, '')
    if (!isValidSongId(songId)) continue
    const song = await readJson<PianoSong | null>(
      songPath(dataDir, songId),
      null,
    )
    if (song?.id && Array.isArray(song.notes)) {
      songs.push(song)
    }
  }

  return songs.sort((a, b) => a.title.localeCompare(b.title))
}

app.get('/api/moldable/health', (c) => {
  return c.json({
    appId: process.env.MOLDABLE_APP_ID ?? 'piano',
    status: 'ok',
  })
})

// Today contribution: nudge the user back into their in-progress lesson — the
// canonical "resume where you left off" case. Silent when no course is started.
app.get('/api/moldable/today', async (c) => {
  const dataDir = getDataDir(c)
  const [courses, progressMap] = await Promise.all([
    readCourses(dataDir),
    readAllCourseProgress(dataDir),
  ])

  type Candidate = {
    course: PianoCourse
    lessonId: string
    completedCount: number
    total: number
    hasCurrent: boolean
    updatedAt: string
  }
  let best: Candidate | null = null

  for (const course of courses) {
    const progress = progressMap[course.id]
    if (!progress) continue
    const total = countCourseLessons(course)
    const completed = new Set(progress.completedLessonIds)
    const completedCount = completed.size
    if (completedCount === 0 && !progress.currentLessonId) continue
    if (completedCount >= total) continue // finished — nothing to resume

    const allLessons = course.modules.flatMap((m) => m.lessons)
    const lessonId =
      progress.currentLessonId &&
      !completed.has(progress.currentLessonId) &&
      courseHasLesson(course, progress.currentLessonId)
        ? progress.currentLessonId
        : (allLessons.find((l) => !completed.has(l.id))?.id ?? null)
    if (!lessonId) continue

    const candidate: Candidate = {
      course,
      lessonId,
      completedCount,
      total,
      hasCurrent: Boolean(progress.currentLessonId),
      updatedAt: progress.updatedAt || new Date(0).toISOString(),
    }
    // Prefer the course the user was most recently working in (that's the real
    // "where I left off"); fall back to an active course, then most progress.
    const moreRecent = candidate.updatedAt > (best?.updatedAt ?? '')
    if (
      !best ||
      (candidate.hasCurrent && !best.hasCurrent) ||
      (candidate.hasCurrent === best.hasCurrent && moreRecent)
    ) {
      best = candidate
    }
  }

  let resume: unknown = null
  if (best) {
    const allLessons = best.course.modules.flatMap((m) => m.lessons)
    const index = allLessons.findIndex((l) => l.id === best!.lessonId)
    const lesson = allLessons[index]
    const lessonLabel =
      lesson?.titleOverride ??
      best.course.modules.find((m) =>
        m.lessons.some((l) => l.id === best!.lessonId),
      )?.title ??
      `Lesson ${index + 1}`
    resume = {
      title: best.course.title,
      subtitle: `Lesson ${index + 1} of ${best.total}: ${lessonLabel}`,
      icon: '🎹',
      deepLink: `course/${best.course.id}/lesson/${best.lessonId}`,
      lastTouchedAt: best.updatedAt,
    }
  }

  return c.json({ items: [], resume, generatedAt: new Date().toISOString() })
})

// ─────────────────────────────────────────────────────────────────────
// Moldable drive contract (OB-008): high-level, durable UI outcomes plus the
// per-workspace intent slot the client drains when its view and audio are warm.
// ─────────────────────────────────────────────────────────────────────

class DriveError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: 400 | 404 | 422 = 400,
  ) {
    super(message)
  }
}

const PIANO_UI_VIEWS: Array<{
  id: PianoUiViewId
  name: string
  description: string
  params?: Record<string, string>
}> = [
  {
    id: 'library',
    name: 'Song library',
    description:
      'The home screen: a grid of every song plus folder shelves. Takes no entityId. Use this to bring the user back to the top level of the app.',
  },
  {
    id: 'courses',
    name: 'Courses tab',
    description:
      'The Courses tab of the home screen, listing structured piano courses with their progress. Takes no entityId.',
  },
  {
    id: 'folder',
    name: 'Folder',
    description:
      'One folder of songs opened inside the library. entityId is the folder id, as returned by the piano.folders.list RPC method.',
  },
  {
    id: 'course',
    name: 'Course outline',
    description:
      'One course outline showing its modules, lessons, and progress. entityId is the course id.',
  },
  {
    id: 'lesson',
    name: 'Course lesson',
    description:
      'One lesson inside a course, opened as an interactive tutorial in the falling-notes practice view. entityId is the lesson id.',
    params: {
      courseId:
        'Optional course id to disambiguate when the same lesson id exists in more than one course.',
    },
  },
  {
    id: 'practice',
    name: 'Practice view',
    description:
      'The falling-notes practice view for one song, with an 88-key piano and playback controls. entityId is the song id, as returned by the piano.songs.list RPC method.',
    params: {
      part: "Optional hand isolation: 'all', 'bass' (notes below the split note), or 'melody' (the split note and above).",
      mode: "Optional. 'practice' restarts the piece from the beginning, stopped and ready to practice.",
    },
  },
]

const uiViewIdSchema = z.enum(PIANO_UI_VIEW_IDS)

const uiDescribeParamsSchema = z.object({}).optional()

const uiNavigateParamsSchema = z.object({
  view: uiViewIdSchema,
  entityId: z.string().trim().min(1).max(120).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
})

const uiOpenPieceParamsSchema = z.object({
  pieceId: z.string().trim().min(1).max(120),
})

const uiPracticeModeParamsSchema = z.object({
  pieceId: z.string().trim().min(1).max(120),
  part: z.enum(['all', 'bass', 'melody']).optional(),
})

const uiPlayPieceParamsSchema = z.object({
  piece: z.string().trim().min(1).max(160),
  part: z.enum(['all', 'bass', 'melody']).optional(),
})

const uiPlaybackStatusParamsSchema = z.object({
  intentId: z.string().trim().min(1).max(160),
})

const uiPlaybackConsumerSchema = z.object({
  consumerId: z.string().trim().min(1).max(160),
})

const uiPlaybackOwnershipSchema = uiPlaybackConsumerSchema.extend({
  attemptId: z.string().trim().min(1).max(160),
})

const uiPlaybackFinalStatuses = [
  'playing',
  'completed',
  'interaction-required',
  'failed',
] as const satisfies readonly PianoPlaybackStatus[]

const uiPlaybackUpdateSchema = uiPlaybackOwnershipSchema.extend({
  status: z.enum(uiPlaybackFinalStatuses),
  message: z.string().trim().min(1).max(500).optional(),
})

const uiReadParamsSchema = z
  .object({
    view: uiViewIdSchema.optional(),
    entityId: z.string().trim().min(1).max(120).optional(),
  })
  .optional()

function uiIntentPath(dataDir: string) {
  return safePath(dataDir, 'ui-intent.json')
}

const uiIntentLocks = new Map<string, Promise<void>>()

interface ActivePlaybackLease {
  attemptId: string
  consumerId: string
  expiresAt: number
}

const uiPlaybackLeases = new Map<string, ActivePlaybackLease>()

function playbackLeaseKey(dataDir: string, intentId: string) {
  return `${uiIntentPath(dataDir)}:${intentId}`
}

function clearPlaybackLeases(dataDir: string) {
  const prefix = `${uiIntentPath(dataDir)}:`
  for (const key of uiPlaybackLeases.keys()) {
    if (key.startsWith(prefix)) uiPlaybackLeases.delete(key)
  }
}

async function withUiIntentLock<T>(
  dataDir: string,
  operation: () => Promise<T>,
): Promise<T> {
  const key = uiIntentPath(dataDir)
  const previous = uiIntentLocks.get(key) ?? Promise.resolve()
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const queued = previous.catch(() => undefined).then(() => gate)
  uiIntentLocks.set(key, queued)
  await previous.catch(() => undefined)

  try {
    return await operation()
  } finally {
    release()
    if (uiIntentLocks.get(key) === queued) uiIntentLocks.delete(key)
  }
}

function isPianoUiViewId(value: unknown): value is PianoUiViewId {
  return (
    typeof value === 'string' &&
    (PIANO_UI_VIEW_IDS as readonly string[]).includes(value)
  )
}

function isPianoPlaybackStatus(value: unknown): value is PianoPlaybackStatus {
  return (
    typeof value === 'string' &&
    (PIANO_PLAYBACK_STATUSES as readonly string[]).includes(value)
  )
}

async function readUiIntent(dataDir: string): Promise<PianoUiIntent | null> {
  const intent = await readJson<PianoUiIntent | null>(
    uiIntentPath(dataDir),
    null,
  )
  if (
    !intent ||
    typeof intent.id !== 'string' ||
    !isPianoUiViewId(intent.view) ||
    (intent.playback && !isPianoPlaybackStatus(intent.playback.status))
  )
    return null
  return intent
}

async function writeUiIntent(
  dataDir: string,
  intent: {
    view: PianoUiViewId
    entityId?: string
    params?: Record<string, unknown>
    playback?: PianoUiIntent['playback']
  },
): Promise<PianoUiIntent> {
  return withUiIntentLock(dataDir, async () => {
    clearPlaybackLeases(dataDir)
    const full: PianoUiIntent = {
      id: generateId(),
      view: intent.view,
      entityId: intent.entityId,
      params: intent.params,
      playback: intent.playback,
      createdAt: new Date().toISOString(),
    }
    await mkdir(dataDir, { recursive: true })
    await writeJson(uiIntentPath(dataDir), full)
    return full
  })
}

function normalizedPieceReference(value: string): string {
  const decomposed = value.normalize('NFKD').toLocaleLowerCase().trim()
  const characters: string[] = []
  let previousWasSpace = false

  for (const character of decomposed) {
    const codePoint = character.codePointAt(0) ?? 0
    if (codePoint >= 0x0300 && codePoint <= 0x036f) continue
    const isSpace = character.trim().length === 0
    if (isSpace) {
      if (!previousWasSpace && characters.length > 0) characters.push(' ')
      previousWasSpace = true
      continue
    }
    characters.push(character)
    previousWasSpace = false
  }

  return characters.join('').trim()
}

async function resolvePieceReference(dataDir: string, reference: string) {
  const songs = await readSongs(dataDir)
  const normalized = normalizedPieceReference(reference)
  const matches = songs.filter(
    (song) =>
      normalizedPieceReference(song.id) === normalized ||
      normalizedPieceReference(song.title) === normalized,
  )
  if (matches.length === 1) return matches[0]
  if (matches.length > 1) {
    throw new DriveError(
      `More than one Piano piece matches ${reference}. Use a song id to disambiguate.`,
      'piece_ambiguous',
      422,
    )
  }

  throw new DriveError(
    `No Piano piece matches ${reference}.`,
    'song_not_found',
    404,
  )
}

async function folderContainingSong(dataDir: string, songId: string) {
  const folders = await readFolders(dataDir)
  return folders.find((folder) => folder.songIds.includes(songId)) ?? null
}

function activePlaybackLease(
  dataDir: string,
  intent: PianoUiIntent,
  now = Date.now(),
): ActivePlaybackLease | null {
  const playback = intent.playback
  if (!playback?.consumerId || !playback.attemptId) return null
  const key = playbackLeaseKey(dataDir, intent.id)
  const inMemory = uiPlaybackLeases.get(key)
  if (
    inMemory?.attemptId === playback.attemptId &&
    inMemory.consumerId === playback.consumerId &&
    inMemory.expiresAt > now
  ) {
    return inMemory
  }
  if (inMemory) uiPlaybackLeases.delete(key)

  // The persisted initial lease permits a brief handoff after a local server
  // restart. Renewals live only in memory so sync never sees heartbeat churn.
  const persistedExpiresAt = Date.parse(playback.leaseExpiresAt ?? '')
  if (!Number.isFinite(persistedExpiresAt) || persistedExpiresAt <= now) {
    return null
  }
  const restored = {
    attemptId: playback.attemptId,
    consumerId: playback.consumerId,
    expiresAt: persistedExpiresAt,
  }
  uiPlaybackLeases.set(key, restored)
  return restored
}

function intentWithPlaybackLease(
  intent: PianoUiIntent,
  lease: ActivePlaybackLease | null,
): PianoUiIntent {
  if (!intent.playback || !lease) return intent
  return {
    ...intent,
    playback: {
      ...intent.playback,
      attemptId: lease.attemptId,
      consumerId: lease.consumerId,
      leaseExpiresAt: new Date(lease.expiresAt).toISOString(),
    },
  }
}

function expiredPlaybackIntent(intent: PianoUiIntent): PianoUiIntent {
  if (!intent.playback) return intent
  const now = new Date().toISOString()
  return {
    ...intent,
    playback: {
      type: 'play',
      status: 'failed',
      requestedAt: intent.playback.requestedAt,
      updatedAt: now,
      message: PIANO_PLAYBACK_EXPIRED_MESSAGE,
    },
  }
}

async function readUiIntentForClient(
  dataDir: string,
): Promise<PianoUiIntent | null> {
  return withUiIntentLock(dataDir, async () => {
    const intent = await readUiIntent(dataDir)
    if (!intent?.playback) return intent
    const lease = activePlaybackLease(dataDir, intent)
    if (!lease && isExpiredPianoPlayback(intent.playback)) {
      const expired = expiredPlaybackIntent(intent)
      uiPlaybackLeases.delete(playbackLeaseKey(dataDir, intent.id))
      await writeJson(uiIntentPath(dataDir), expired)
      return expired
    }
    return intentWithPlaybackLease(intent, lease)
  })
}

async function claimPlaybackIntentForConsumer(
  dataDir: string,
  intentId: string,
  consumerId: string,
) {
  return withUiIntentLock(dataDir, async () => {
    const intent = await readUiIntent(dataDir)
    if (!intent || intent.id !== intentId || !intent.playback) return null
    const activeLease = activePlaybackLease(dataDir, intent)
    if (!activeLease && isExpiredPianoPlayback(intent.playback)) {
      const expired = expiredPlaybackIntent(intent)
      uiPlaybackLeases.delete(playbackLeaseKey(dataDir, intent.id))
      await writeJson(uiIntentPath(dataDir), expired)
      return { claimed: false as const, owned: false as const, intent: expired }
    }
    if (
      isTerminalPianoPlayback(intent.playback) ||
      (intent.playback.status !== 'queued' && activeLease)
    ) {
      return {
        claimed: false as const,
        owned: activeLease?.consumerId === consumerId,
        intent: intentWithPlaybackLease(intent, activeLease),
      }
    }

    const nowMs = Date.now()
    const now = new Date(nowMs).toISOString()
    const attemptId = generateId()
    const lease: ActivePlaybackLease = {
      attemptId,
      consumerId,
      expiresAt: nowMs + PIANO_PLAYBACK_LEASE_MS,
    }
    const updated: PianoUiIntent = {
      ...intent,
      playback: {
        ...intent.playback,
        status: 'preparing',
        attemptId,
        consumerId,
        leaseExpiresAt: new Date(lease.expiresAt).toISOString(),
        message: undefined,
        updatedAt: now,
      },
    }
    uiPlaybackLeases.set(playbackLeaseKey(dataDir, intent.id), lease)
    await writeJson(uiIntentPath(dataDir), updated)
    return { claimed: true as const, owned: true as const, intent: updated }
  })
}

async function updatePlaybackIntent(
  dataDir: string,
  intentId: string,
  update: z.infer<typeof uiPlaybackUpdateSchema>,
) {
  return withUiIntentLock(dataDir, async () => {
    const intent = await readUiIntent(dataDir)
    if (!intent || intent.id !== intentId || !intent.playback) return null
    const lease = activePlaybackLease(dataDir, intent)
    const canCompleteClaim =
      (intent.playback.status === 'preparing' &&
        update.status !== 'completed') ||
      (intent.playback.status === 'interaction-required' &&
        (update.status === 'playing' || update.status === 'failed')) ||
      (intent.playback.status === 'playing' && update.status === 'completed')
    if (
      !canCompleteClaim ||
      !lease ||
      intent.playback.attemptId !== update.attemptId ||
      intent.playback.consumerId !== update.consumerId
    ) {
      return { updated: false as const, intent }
    }

    const terminal = update.status === 'completed' || update.status === 'failed'
    const next: PianoUiIntent = {
      ...intent,
      playback: terminal
        ? {
            type: 'play',
            status: update.status,
            requestedAt: intent.playback.requestedAt,
            message: update.message,
            updatedAt: new Date().toISOString(),
          }
        : {
            ...intent.playback,
            status: update.status,
            message: update.message,
            leaseExpiresAt: new Date(lease.expiresAt).toISOString(),
            updatedAt: new Date().toISOString(),
          },
    }
    if (terminal) {
      uiPlaybackLeases.delete(playbackLeaseKey(dataDir, intent.id))
    }
    await writeJson(uiIntentPath(dataDir), next)
    return { updated: true as const, intent: next }
  })
}

async function heartbeatPlaybackIntent(
  dataDir: string,
  intentId: string,
  ownership: z.infer<typeof uiPlaybackOwnershipSchema>,
) {
  return withUiIntentLock(dataDir, async () => {
    const intent = await readUiIntent(dataDir)
    if (!intent || intent.id !== intentId || !intent.playback) return null
    const lease = activePlaybackLease(dataDir, intent)
    if (
      !lease ||
      lease.attemptId !== ownership.attemptId ||
      lease.consumerId !== ownership.consumerId ||
      isTerminalPianoPlayback(intent.playback)
    ) {
      return { renewed: false as const, intent }
    }

    const renewed: ActivePlaybackLease = {
      ...lease,
      expiresAt: Date.now() + PIANO_PLAYBACK_LEASE_MS,
    }
    uiPlaybackLeases.set(playbackLeaseKey(dataDir, intent.id), renewed)
    return {
      renewed: true as const,
      intent: intentWithPlaybackLease(intent, renewed),
    }
  })
}

async function releasePlaybackIntent(
  dataDir: string,
  intentId: string,
  ownership: z.infer<typeof uiPlaybackOwnershipSchema>,
) {
  return withUiIntentLock(dataDir, async () => {
    const intent = await readUiIntent(dataDir)
    if (!intent || intent.id !== intentId || !intent.playback) return null
    if (
      intent.playback.attemptId !== ownership.attemptId ||
      intent.playback.consumerId !== ownership.consumerId ||
      isTerminalPianoPlayback(intent.playback)
    ) {
      return { released: false as const, intent }
    }

    const now = new Date().toISOString()
    const updated: PianoUiIntent = {
      ...intent,
      playback: {
        type: 'play',
        status: 'queued',
        requestedAt: intent.playback.requestedAt,
        updatedAt: now,
      },
    }
    uiPlaybackLeases.delete(playbackLeaseKey(dataDir, intent.id))
    await writeJson(uiIntentPath(dataDir), updated)
    return { released: true as const, intent: updated }
  })
}

/** Validate a navigation target against real workspace data. */
async function resolveUiNavigation(
  dataDir: string,
  input: {
    view: PianoUiViewId
    entityId?: string
    params?: Record<string, unknown>
  },
): Promise<{
  view: PianoUiViewId
  entityId?: string
  params?: Record<string, unknown>
}> {
  const { view, entityId } = input
  if (view === 'library' || view === 'courses') return input

  if (!entityId) {
    throw new DriveError(
      `The ${view} view requires an entityId.`,
      'entity_id_required',
      400,
    )
  }

  if (view === 'folder') {
    const folders = await readFolders(dataDir)
    if (!folders.some((folder) => folder.id === entityId)) {
      throw new DriveError(
        `No folder with id ${entityId}.`,
        'folder_not_found',
        404,
      )
    }
    return input
  }

  if (view === 'course') {
    await ensureSeedCourses(dataDir)
    if (!(await readCourse(dataDir, entityId))) {
      throw new DriveError(
        `No course with id ${entityId}.`,
        'course_not_found',
        404,
      )
    }
    return input
  }

  if (view === 'lesson') {
    await ensureSeedCourses(dataDir)
    const courseIdHint =
      typeof input.params?.courseId === 'string'
        ? input.params.courseId
        : undefined
    const courses = await readCourses(dataDir)
    const course = courses.find(
      (candidate) =>
        (!courseIdHint || candidate.id === courseIdHint) &&
        courseHasLesson(candidate, entityId),
    )
    if (!course) {
      throw new DriveError(
        `No course lesson with id ${entityId}.`,
        'lesson_not_found',
        404,
      )
    }
    return { ...input, params: { ...input.params, courseId: course.id } }
  }

  // view === 'practice'
  if (!isValidSongId(entityId)) {
    throw new DriveError('A valid song id is required.', 'invalid_song_id', 400)
  }
  await ensureSeedSongs(dataDir)
  const song = await readJson<PianoSong | null>(
    songPath(dataDir, entityId),
    null,
  )
  if (!song) {
    throw new DriveError(`No song with id ${entityId}.`, 'song_not_found', 404)
  }
  return input
}

// ─── ui.read: clean speakable text, no markdown ──────────────────────

function speakableDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 seconds'
  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  const parts: string[] = []
  if (minutes > 0)
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`)
  if (rest > 0 || minutes === 0)
    parts.push(`${rest} ${rest === 1 ? 'second' : 'seconds'}`)
  return parts.join(' and ')
}

function speakableCount(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`
}

/** Turn display copy into speech-friendly prose: no visual separators. */
function speakablePhrase(value: string): string {
  return value
    .replace(/\s*[·•|]\s*/g, '. ')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/, '')
    .trim()
}

async function lessonContextSentence(
  dataDir: string,
  songId: string,
): Promise<string | null> {
  const courses = await readCourses(dataDir)
  const progressMap = await readAllCourseProgress(dataDir)
  for (const course of courses) {
    const allLessons = course.modules.flatMap((module) => module.lessons)
    const index = allLessons.findIndex((lesson) => lesson.songId === songId)
    if (index === -1) continue
    const completed = (
      progressMap[course.id]?.completedLessonIds ?? []
    ).includes(allLessons[index].id)
    return `This piece is lesson ${index + 1} of ${allLessons.length} in the course ${course.title}, and it is ${completed ? 'completed' : 'not completed yet'}.`
  }
  return null
}

async function pieceSpeakableText(
  dataDir: string,
  songId: string,
): Promise<string> {
  if (!isValidSongId(songId)) {
    throw new DriveError('A valid song id is required.', 'invalid_song_id', 400)
  }
  await ensureSeedSongs(dataDir)
  const song = await readJson<PianoSong | null>(songPath(dataDir, songId), null)
  if (!song) {
    throw new DriveError(`No song with id ${songId}.`, 'song_not_found', 404)
  }

  const summary = summarizeSong(song)
  const sentences: string[] = []
  const credit = summary.composer ?? summary.artist
  sentences.push(credit ? `${song.title}, by ${credit}.` : `${song.title}.`)
  sentences.push(
    `It runs ${speakableDuration(summary.duration)} at ${Math.round(song.bpm)} beats per minute, with ${speakableCount(summary.noteCount, 'note')}.`,
  )
  if (song.tutorial?.summary) {
    sentences.push(`This piece is an interactive tutorial.`)
    sentences.push(song.tutorial.summary)
  }

  const workspaceSettings = await readSongWorkspaceSettings(dataDir, songId)
  const playbackSpeed = workspaceSettings?.playbackSpeed ?? 1
  sentences.push(
    playbackSpeed === 1
      ? 'Practice playback speed is set to full speed.'
      : `Practice playback speed is set to ${Math.round(playbackSpeed * 100)} percent of full speed.`,
  )
  const splitMidi = song.practiceSettings?.splitMidi
  if (typeof splitMidi === 'number') {
    sentences.push(
      `The bass and melody practice split is at MIDI note ${splitMidi}.`,
    )
  }

  const sound = await getSongSoundSettingsResponse(dataDir, songId)
  const presetName = PIANO_PRESETS.find(
    (preset) => preset.id === sound.effective.presetId,
  )?.name
  const packName = PIANO_INSTRUMENT_PACKS.find(
    (pack) => pack.id === sound.effective.instrumentPackId,
  )?.name
  if (presetName && packName) {
    sentences.push(
      `It plays with the ${presetName} preset on the ${packName} instrument.`,
    )
  } else if (presetName) {
    sentences.push(`It plays with the ${presetName} preset.`)
  }

  const lessonContext = await lessonContextSentence(dataDir, songId)
  if (lessonContext) sentences.push(lessonContext)

  return sentences.join(' ')
}

async function coursesSpeakableText(dataDir: string): Promise<string> {
  await ensureSeedCourses(dataDir)
  const courses = await readCourses(dataDir)
  if (courses.length === 0) return 'There are no courses yet.'
  const progressMap = await readAllCourseProgress(dataDir)
  const parts = courses.map((course) => {
    const total = countCourseLessons(course)
    const completed = (progressMap[course.id]?.completedLessonIds ?? []).length
    return completed > 0
      ? `${course.title} with ${completed} of ${total} lessons completed`
      : `${course.title} with ${speakableCount(total, 'lesson')}`
  })
  const lead =
    courses.length === 1
      ? 'There is 1 course'
      : `There are ${courses.length} courses`
  return `${lead}: ${parts.join(', ')}.`
}

async function librarySpeakableText(dataDir: string): Promise<string> {
  const songs = (await readSongs(dataDir)).map(summarizeSong)
  const folders = await readFolders(dataDir)
  const sentences: string[] = []
  sentences.push(
    `The piano library has ${speakableCount(songs.length, 'song')}.`,
  )
  const tutorials = songs.filter((song) => song.isTutorial).length
  if (tutorials > 0) {
    sentences.push(
      `${speakableCount(tutorials, 'of them is an interactive tutorial', 'of them are interactive tutorials')}.`,
    )
  }
  if (folders.length > 0) {
    const folderList = folders
      .map(
        (folder) =>
          `${folder.name} with ${speakableCount(folder.songIds.length, 'song')}`,
      )
      .join(', ')
    sentences.push(`Folders: ${folderList}.`)
  }
  sentences.push(await coursesSpeakableText(dataDir))
  return sentences.join(' ')
}

async function courseSpeakableText(
  dataDir: string,
  courseId: string,
): Promise<string> {
  await ensureSeedCourses(dataDir)
  const course = await readCourse(dataDir, courseId)
  if (!course) {
    throw new DriveError(
      `No course with id ${courseId}.`,
      'course_not_found',
      404,
    )
  }
  const progress = (await readAllCourseProgress(dataDir))[course.id]
  const total = countCourseLessons(course)
  const completed = progress?.completedLessonIds.length ?? 0
  const sentences: string[] = []
  sentences.push(
    `${course.title} is a ${course.difficulty} course with ${speakableCount(total, 'lesson')} across ${speakableCount(course.modules.length, 'module')}, about ${course.estimatedMinutes} minutes in total.`,
  )
  const subtitle = speakablePhrase(course.subtitle)
  if (subtitle) sentences.push(`${subtitle}.`)
  sentences.push(
    completed === 0
      ? 'No lessons are completed yet.'
      : `${completed} of ${total} lessons are completed.`,
  )
  if (progress?.currentLessonId) {
    const allLessons = course.modules.flatMap((module) => module.lessons)
    const index = allLessons.findIndex(
      (lesson) => lesson.id === progress.currentLessonId,
    )
    if (index !== -1) {
      const label = allLessons[index].titleOverride
      sentences.push(
        label
          ? `The current lesson is lesson ${index + 1}, ${label}.`
          : `The current lesson is lesson ${index + 1}.`,
      )
    }
  }
  return sentences.join(' ')
}

async function folderSpeakableText(
  dataDir: string,
  folderId: string,
): Promise<string> {
  const folders = await readFolders(dataDir)
  const folder = folders.find((candidate) => candidate.id === folderId)
  if (!folder) {
    throw new DriveError(
      `No folder with id ${folderId}.`,
      'folder_not_found',
      404,
    )
  }
  const songs = await readSongs(dataDir)
  const titleById = new Map(songs.map((song) => [song.id, song.title]))
  const titles = folder.songIds
    .map((id) => titleById.get(id))
    .filter((title): title is string => Boolean(title))
  if (titles.length === 0) {
    return `The folder ${folder.name} is empty.`
  }
  const listed = titles.slice(0, 20)
  const overflow = titles.length - listed.length
  const suffix =
    overflow > 0 ? `, and ${speakableCount(overflow, 'more song')}` : ''
  return `The folder ${folder.name} has ${speakableCount(titles.length, 'song')}: ${listed.join(', ')}${suffix}.`
}

async function lessonSpeakableText(
  dataDir: string,
  lessonId: string,
): Promise<string> {
  await ensureSeedCourses(dataDir)
  const courses = await readCourses(dataDir)
  for (const course of courses) {
    const lesson = course.modules
      .flatMap((module) => module.lessons)
      .find((candidate) => candidate.id === lessonId)
    if (!lesson) continue
    const teaser = speakablePhrase(lesson.teaser)
    const pieceText = await pieceSpeakableText(dataDir, lesson.songId)
    return teaser ? `${teaser}. ${pieceText}` : pieceText
  }
  throw new DriveError(
    `No course lesson with id ${lessonId}.`,
    'lesson_not_found',
    404,
  )
}

async function uiReadText(
  dataDir: string,
  params: { view?: PianoUiViewId; entityId?: string },
): Promise<string> {
  const view = params.view
  if (!view || view === 'library') return librarySpeakableText(dataDir)
  if (view === 'courses') return coursesSpeakableText(dataDir)

  if (!params.entityId) {
    throw new DriveError(
      `Reading the ${view} view requires an entityId.`,
      'entity_id_required',
      400,
    )
  }
  if (view === 'course') return courseSpeakableText(dataDir, params.entityId)
  if (view === 'folder') return folderSpeakableText(dataDir, params.entityId)
  if (view === 'lesson') return lessonSpeakableText(dataDir, params.entityId)
  return pieceSpeakableText(dataDir, params.entityId)
}

app.get('/api/moldable/ui-intent', async (c) => {
  try {
    return c.json(await readUiIntentForClient(getDataDir(c)))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read UI intent',
    )
  }
})

app.post('/api/moldable/ui-intent/:intentId/claim-playback', async (c) => {
  try {
    const claim = uiPlaybackConsumerSchema.parse(await c.req.json())
    const result = await claimPlaybackIntentForConsumer(
      getDataDir(c),
      c.req.param('intentId'),
      claim.consumerId,
    )
    if (!result) return jsonError(c, 'Playback intent not found', 404)
    return c.json({
      ok: true,
      claimed: result.claimed,
      owned: result.owned,
      intent: result.intent,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(
        c,
        error.issues[0]?.message ?? 'A valid consumerId is required',
        400,
      )
    }
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to claim playback intent',
    )
  }
})

app.post('/api/moldable/ui-intent/:intentId/playback-heartbeat', async (c) => {
  try {
    const ownership = uiPlaybackOwnershipSchema.parse(await c.req.json())
    const result = await heartbeatPlaybackIntent(
      getDataDir(c),
      c.req.param('intentId'),
      ownership,
    )
    if (!result) return jsonError(c, 'Playback intent not found', 404)
    if (!result.renewed) {
      return c.json(
        {
          ok: false,
          error: 'Playback lease is no longer owned by this consumer',
          intent: result.intent,
        },
        409,
      )
    }
    return c.json({ ok: true, intent: result.intent })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(
        c,
        error.issues[0]?.message ?? 'Valid playback ownership is required',
        400,
      )
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to renew playback lease',
    )
  }
})

app.post('/api/moldable/ui-intent/:intentId/release-playback', async (c) => {
  try {
    const ownership = uiPlaybackOwnershipSchema.parse(await c.req.json())
    const result = await releasePlaybackIntent(
      getDataDir(c),
      c.req.param('intentId'),
      ownership,
    )
    if (!result) return jsonError(c, 'Playback intent not found', 404)
    if (!result.released) {
      return c.json(
        {
          ok: false,
          error: 'Playback lease is no longer owned by this consumer',
          intent: result.intent,
        },
        409,
      )
    }
    return c.json({ ok: true, intent: result.intent })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(
        c,
        error.issues[0]?.message ?? 'Valid playback ownership is required',
        400,
      )
    }
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to release playback lease',
    )
  }
})

app.patch('/api/moldable/ui-intent/:intentId/playback', async (c) => {
  try {
    const update = uiPlaybackUpdateSchema.parse(await c.req.json())
    const result = await updatePlaybackIntent(
      getDataDir(c),
      c.req.param('intentId'),
      update,
    )
    if (!result) return jsonError(c, 'Playback intent not found', 404)
    if (!result.updated) {
      return c.json(
        {
          ok: false,
          error: 'Playback intent is not owned by this attempt',
          intent: result.intent,
        },
        409,
      )
    }
    return c.json({ ok: true, intent: result.intent })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(
        c,
        error.issues[0]?.message ?? 'Invalid playback status',
        400,
      )
    }
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to update playback intent',
    )
  }
})

app.delete('/api/moldable/ui-intent', async (c) => {
  try {
    const id = c.req.query('id')
    if (!id)
      return jsonError(c, 'An intent id query parameter is required', 400)
    const dataDir = getDataDir(c)
    const deleted = await withUiIntentLock(dataDir, async () => {
      const intent = await readUiIntent(dataDir)
      const shouldDelete = Boolean(intent && intent.id === id)
      if (shouldDelete) {
        uiPlaybackLeases.delete(playbackLeaseKey(dataDir, id))
        await rm(uiIntentPath(dataDir), { force: true })
      }
      return shouldDelete
    })
    return c.json({ ok: true, deleted })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to ack UI intent',
    )
  }
})

app.get('/api/moldable/commands', async (c) => {
  const dataDir = getDataDir(c)
  const songs = (await readSongs(dataDir)).map(summarizeSong)

  return c.json({
    commands: songs.map((song) => ({
      id: `piano.open-song.${song.id}`,
      label: song.title,
      description: songCommandDescription(song),
      icon: '🎵',
      indicator: song.isTutorial
        ? {
            label: 'Tutorial',
            color: 'var(--primary)',
          }
        : undefined,
      group: 'Songs',
      action: {
        type: 'message',
        command: 'piano.open-song',
        payload: { songId: song.id },
      },
    })),
  })
})

app.post('/api/moldable/rpc', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    method?: unknown
    params?: unknown
  } | null

  if (!body || typeof body.method !== 'string') {
    return c.json(
      {
        ok: false,
        error: {
          code: 'invalid_request',
          message: 'Piano RPC requires a method string.',
        },
      },
      400,
    )
  }

  try {
    const dataDir = getDataDir(c)

    if (
      body.method === 'piano.cards.present' ||
      body.method === 'piano.cards.read'
    ) {
      const { songId, detail } = z
        .object({
          songId: z.string().min(1).max(128),
          detail: z.boolean().optional(),
        })
        .strict()
        .parse(body.params)
      if (!isValidSongId(songId))
        return c.json(
          {
            ok: false,
            error: {
              code: 'invalid_song_id',
              message: 'Choose a valid song id.',
            },
          },
          400,
        )
      await ensureSeedSongs(dataDir)
      const song = await readJson<PianoSong | null>(
        songPath(dataDir, songId),
        null,
      )
      if (!song)
        return c.json(
          {
            ok: false,
            error: {
              code: 'song_not_found',
              message: 'This song is no longer available.',
            },
          },
          404,
        )
      if (body.method === 'piano.cards.present')
        return c.json({
          ok: true,
          result: {
            appCard: {
              version: 1,
              title: song.title.slice(0, 240),
              resourcePath: '/index.html?card=song',
              input: { songId },
              readMethod: 'piano.cards.read',
              actions: [],
              height: 360,
            },
          },
        })
      return c.json({
        ok: true,
        result: {
          id: song.id,
          title: song.title.slice(0, 240),
          bpm: song.bpm,
          duration: getSongDuration(song),
          composer: (
            song.sourceInfo?.composer ??
            song.sourceInfo?.artist ??
            ''
          ).slice(0, 240),
          notes: song.notes
            .filter((note) => note.start < 30)
            .slice(0, detail ? 1000 : 12)
            .map((note) => ({
              id: note.id,
              midi: note.midi,
              pitch: note.pitch,
              start: note.start,
              duration: Math.min(note.duration, 30 - note.start),
              velocity: note.velocity,
            })),
          tutorial:
            detail && song.tutorial
              ? {
                  title: song.tutorial.title?.slice(0, 240),
                  summary: song.tutorial.summary.slice(0, 4000),
                  objectives: song.tutorial.objectives
                    .slice(0, 20)
                    .map((value) => value.slice(0, 500)),
                  sections: song.tutorial.sections
                    .slice(0, 20)
                    .map((section) => ({
                      id: section.id,
                      title: section.title.slice(0, 240),
                      focus: section.focus?.slice(0, 1000),
                      learn: section.learn
                        .slice(0, 12)
                        .map((value) => value.slice(0, 1000)),
                    })),
                }
              : undefined,
          previewSeconds: Math.min(30, getSongDuration(song)),
          previewLimited:
            song.notes.filter((note) => note.start < 30).length > 1000,
        },
      })
    }

    if (body.method === 'piano.native.read') {
      const params = parseNativeReadParams(body.params)
      await Promise.all([ensureSeedSongs(dataDir), ensureSeedCourses(dataDir)])
      const [songs, folders, courses, progress] = await Promise.all([
        readSongs(dataDir),
        readFolders(dataDir),
        readCourses(dataDir),
        readAllCourseProgress(dataDir),
      ])
      if (params.route === 'home') {
        return c.json({
          ok: true,
          result: projectNativeHome(
            songs.map(summarizeSong),
            folders,
            courses,
            progress,
          ),
        })
      }
      if (params.route === 'songs') {
        if (
          params.folderId &&
          !folders.some((folder) => folder.id === params.folderId)
        ) {
          return c.json(
            {
              ok: false,
              error: { code: 'folder_not_found', message: 'Folder not found.' },
            },
            404,
          )
        }
        return c.json({
          ok: true,
          result: projectNativeSongs(songs.map(summarizeSong), folders, params),
        })
      }
      if (params.route === 'song') {
        const song = songs.find((item) => item.id === params.songId)
        if (!song) {
          return c.json(
            {
              ok: false,
              error: { code: 'song_not_found', message: 'Song not found.' },
            },
            404,
          )
        }
        return c.json({ ok: true, result: projectNativeSong(song, folders) })
      }
      if (params.route === 'courses') {
        return c.json({
          ok: true,
          result: projectNativeCourses(courses, progress),
        })
      }
      const course = courses.find((item) => item.id === params.courseId)
      if (!course) {
        return c.json(
          {
            ok: false,
            error: { code: 'course_not_found', message: 'Course not found.' },
          },
          404,
        )
      }
      if (params.route === 'course') {
        return c.json({
          ok: true,
          result: projectNativeCourse(course, progress[course.id]),
        })
      }
      const lesson = course.modules
        .flatMap((module) => module.lessons)
        .find((item) => item.id === params.lessonId)
      if (!lesson) {
        return c.json(
          {
            ok: false,
            error: { code: 'lesson_not_found', message: 'Lesson not found.' },
          },
          404,
        )
      }
      const song = songs.find((item) => item.id === lesson.songId)
      if (!song) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'song_not_found',
              message: 'Lesson song not found.',
            },
          },
          404,
        )
      }
      return c.json({
        ok: true,
        result: projectNativeLesson(
          course,
          lesson.id,
          song,
          progress[course.id],
        ),
      })
    }

    if (body.method === 'piano.native.mutate') {
      const params = parseNativeMutateParams(body.params)
      await ensureSeedCourses(dataDir)
      const course = await readCourse(dataDir, params.courseId)
      if (!course) {
        return c.json(
          {
            ok: false,
            error: { code: 'course_not_found', message: 'Course not found.' },
          },
          404,
        )
      }
      if (!courseHasLesson(course, params.lessonId)) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'lesson_not_found',
              message: 'Lesson not found in course.',
            },
          },
          404,
        )
      }
      const progress = await updateCourseProgress(
        dataDir,
        course.id,
        (current) => {
          const completed = new Set(current.completedLessonIds)
          if (params.completed) completed.add(params.lessonId)
          else completed.delete(params.lessonId)
          return {
            ...current,
            completedLessonIds: [...completed],
            currentLessonId: params.completed
              ? nextUncompleted(course, completed, params.lessonId)
              : params.lessonId,
            updatedAt: new Date().toISOString(),
          }
        },
      )
      return c.json({
        ok: true,
        result: {
          ok: true,
          courseId: course.id,
          lessonId: params.lessonId,
          completed: progress.completedLessonIds.includes(params.lessonId),
          notices: [
            {
              title: params.completed ? 'Lesson completed' : 'Lesson reopened',
              message: params.completed
                ? 'Course progress is up to date.'
                : 'This lesson is ready to revisit.',
            },
          ],
        },
      })
    }

    if (body.method === 'piano.native.search') {
      const query =
        body.params &&
        typeof body.params === 'object' &&
        typeof (body.params as { query?: unknown }).query === 'string'
          ? (body.params as { query: string }).query.trim()
          : ''
      if (query.length < 1 || query.length > 80)
        throw new NativeUiParamsError(
          'query must contain 1 through 80 characters.',
        )
      const songs = await readSongs(dataDir)
      return c.json({
        ok: true,
        result: projectNativeSongSearch(songs.map(summarizeSong), query),
      })
    }

    if (body.method === 'piano.native.library.update') {
      const params = parseNativeLibraryUpdateParams(body.params)
      const folders = await readFolders(dataDir)
      const now = new Date().toISOString()
      if (params.action === 'create-folder') {
        const folder: Folder = {
          id: generateId(),
          name: params.name,
          tone: toneFromSeed(params.name),
          songIds: [],
          sortOrder: nextFolderSortOrder(folders),
          createdAt: now,
          updatedAt: now,
        }
        await writeFolders(dataDir, sortFolders([folder, ...folders]))
        return c.json({
          ok: true,
          result: {
            ok: true,
            notices: [
              { title: 'Folder created', message: `${folder.name} is ready.` },
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
              error: { code: 'folder_not_found', message: 'Folder not found.' },
            },
            404,
          )
        folder.name = params.name
        folder.updatedAt = now
        await writeFolders(dataDir, folders)
        return c.json({
          ok: true,
          result: {
            ok: true,
            notices: [
              { title: 'Folder renamed', message: `Now named ${folder.name}.` },
            ],
          },
        })
      }
      if (
        !(await readJson<PianoSong | null>(
          songPath(dataDir, params.songId),
          null,
        ))
      ) {
        return c.json(
          {
            ok: false,
            error: { code: 'song_not_found', message: 'Song not found.' },
          },
          404,
        )
      }
      if (
        params.folderId &&
        !folders.some((folder) => folder.id === params.folderId)
      ) {
        return c.json(
          {
            ok: false,
            error: { code: 'folder_not_found', message: 'Folder not found.' },
          },
          404,
        )
      }
      const updated = folders.map((folder) => ({
        ...folder,
        songIds:
          folder.id === params.folderId
            ? [
                ...folder.songIds.filter((id) => id !== params.songId),
                params.songId,
              ]
            : folder.songIds.filter((id) => id !== params.songId),
        updatedAt:
          folder.songIds.includes(params.songId) ||
          folder.id === params.folderId
            ? now
            : folder.updatedAt,
      }))
      await writeFolders(dataDir, updated)
      return c.json({
        ok: true,
        result: {
          ok: true,
          notices: [
            {
              title: 'Song moved',
              message: params.folderId
                ? 'Folder updated.'
                : 'Moved to Library.',
            },
          ],
        },
      })
    }

    if (body.method === 'piano.native.delete') {
      const params = parseNativeDeleteParams(body.params)
      if (params.action === 'delete-folder') {
        const folders = await readFolders(dataDir)
        const next = folders.filter((folder) => folder.id !== params.folderId)
        if (next.length === folders.length)
          return c.json(
            {
              ok: false,
              error: { code: 'folder_not_found', message: 'Folder not found.' },
            },
            404,
          )
        await writeFolders(dataDir, next)
        return c.json({ ok: true, result: { ok: true } })
      }
      const existing = await readJson<PianoSong | null>(
        songPath(dataDir, params.songId),
        null,
      )
      if (!existing)
        return c.json(
          {
            ok: false,
            error: { code: 'song_not_found', message: 'Song not found.' },
          },
          404,
        )
      await rm(songPath(dataDir, params.songId), { force: true })
      const folders = await readFolders(dataDir)
      await writeFolders(
        dataDir,
        folders.map((folder) => ({
          ...folder,
          songIds: folder.songIds.filter((id) => id !== params.songId),
        })),
      )
      return c.json({ ok: true, result: { ok: true, id: params.songId } })
    }

    if (body.method === 'piano.native.course.reset') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as { courseId?: unknown })
          : {}
      if (typeof params.courseId !== 'string')
        throw new NativeUiParamsError('courseId is required.')
      const course = await readCourse(dataDir, params.courseId)
      if (!course)
        return c.json(
          {
            ok: false,
            error: { code: 'course_not_found', message: 'Course not found.' },
          },
          404,
        )
      const progress = await updateCourseProgress(dataDir, course.id, () =>
        defaultCourseProgress(course.id),
      )
      return c.json({
        ok: true,
        result: { ok: true, courseId: course.id, progress },
      })
    }

    if (body.method === 'piano.songs.list') {
      const songs = await readSongs(dataDir)
      return c.json({ ok: true, result: songs.map(summarizeSong) })
    }

    if (body.method === 'piano.folders.list') {
      return c.json({ ok: true, result: await readFolders(dataDir) })
    }

    if (body.method === 'piano.songs.get') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as { songId?: unknown })
          : {}
      if (typeof params.songId !== 'string' || !isValidSongId(params.songId)) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'invalid_song_id',
              message: 'A valid songId is required.',
            },
          },
          400,
        )
      }
      await ensureSeedSongs(dataDir)
      const song = await readJson<PianoSong | null>(
        songPath(dataDir, params.songId),
        null,
      )
      if (!song) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'song_not_found',
              message: 'Song not found.',
            },
          },
          404,
        )
      }
      return c.json({ ok: true, result: song })
    }

    if (body.method === 'piano.songs.getSoundSettings') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as { songId?: unknown })
          : {}
      if (typeof params.songId !== 'string' || !isValidSongId(params.songId)) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'invalid_song_id',
              message: 'A valid songId is required.',
            },
          },
          400,
        )
      }
      return c.json({
        ok: true,
        result: await getSongSoundSettingsResponse(dataDir, params.songId),
      })
    }

    if (body.method === 'piano.songs.setSoundSettings') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as {
              songId?: unknown
              suggested?: unknown
              override?: unknown
            })
          : {}
      if (typeof params.songId !== 'string' || !isValidSongId(params.songId)) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'invalid_song_id',
              message: 'A valid songId is required.',
            },
          },
          400,
        )
      }
      const existing = await readSongSoundSettings(dataDir, params.songId)
      const now = new Date().toISOString()
      const next: SongSoundSettings = {
        songId: params.songId,
        suggested:
          params.suggested === undefined
            ? existing?.suggested
            : params.suggested === null
              ? undefined
              : mergeSoundChoice(
                  existing?.suggested ?? {},
                  sanitizeSoundChoice(params.suggested),
                ),
        override:
          params.override === undefined
            ? existing?.override
            : params.override === null
              ? undefined
              : mergeSoundChoice(
                  existing?.override ?? {},
                  sanitizeSoundChoice(params.override),
                ),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      await writeSongSoundSettings(dataDir, next)
      return c.json({
        ok: true,
        result: await getSongSoundSettingsResponse(dataDir, params.songId),
      })
    }

    if (body.method === 'piano.songs.importMidiFile') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as ImportMidiFileParams)
          : {}
      return c.json({ ok: true, result: await importMidiFile(dataDir, params) })
    }

    if (body.method === 'piano.songs.upsert') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as UpsertSongParams)
          : {}
      return c.json({ ok: true, result: await upsertSong(dataDir, params) })
    }

    if (body.method === 'piano.songs.upsertFromFile') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as UpsertSongFromFileParams)
          : {}
      return c.json({
        ok: true,
        result: await upsertSongFromFile(dataDir, params),
      })
    }

    if (body.method === 'piano.songs.patch') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as PatchSongParams)
          : {}
      return c.json({ ok: true, result: await patchSong(dataDir, params) })
    }

    if (body.method === 'piano.songs.patchFromFile') {
      const params =
        body.params && typeof body.params === 'object'
          ? (body.params as PatchSongFromFileParams)
          : {}
      return c.json({
        ok: true,
        result: await patchSongFromFile(dataDir, params),
      })
    }

    if (body.method === 'piano.library.revision') {
      return c.json({ ok: true, result: await readLibraryRevision(dataDir) })
    }

    if (body.method === 'piano.ui.describe') {
      uiDescribeParamsSchema.parse(body.params)
      return c.json({ ok: true, result: { views: PIANO_UI_VIEWS } })
    }

    if (body.method === 'piano.ui.navigate') {
      const params = uiNavigateParamsSchema.parse(body.params)
      const resolved = await resolveUiNavigation(dataDir, params)
      const intent = await writeUiIntent(dataDir, resolved)
      return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
    }

    if (body.method === 'piano.ui.openPiece') {
      const params = uiOpenPieceParamsSchema.parse(body.params)
      const resolved = await resolveUiNavigation(dataDir, {
        view: 'practice',
        entityId: params.pieceId,
      })
      const intent = await writeUiIntent(dataDir, resolved)
      return c.json({
        ok: true,
        result: { ok: true, intentId: intent.id, pieceId: params.pieceId },
      })
    }

    if (body.method === 'piano.ui.practiceMode') {
      const params = uiPracticeModeParamsSchema.parse(body.params)
      const resolved = await resolveUiNavigation(dataDir, {
        view: 'practice',
        entityId: params.pieceId,
        params: {
          mode: 'practice',
          ...(params.part ? { part: params.part } : {}),
        },
      })
      const intent = await writeUiIntent(dataDir, resolved)
      return c.json({
        ok: true,
        result: {
          ok: true,
          intentId: intent.id,
          pieceId: params.pieceId,
          part: params.part ?? 'all',
        },
      })
    }

    if (body.method === 'piano.ui.playPiece') {
      const params = uiPlayPieceParamsSchema.parse(body.params)
      const piece = await resolvePieceReference(dataDir, params.piece)
      const folder = await folderContainingSong(dataDir, piece.id)
      const now = new Date().toISOString()
      const intent = await writeUiIntent(dataDir, {
        view: 'practice',
        entityId: piece.id,
        params: {
          mode: 'play',
          part: params.part ?? 'all',
          ...(folder ? { folderId: folder.id } : {}),
        },
        playback: {
          type: 'play',
          status: 'queued',
          requestedAt: now,
          updatedAt: now,
        },
      })
      return c.json({
        ok: true,
        result: {
          ok: true,
          intentId: intent.id,
          pieceId: piece.id,
          title: piece.title,
          folderId: folder?.id ?? null,
          status: intent.playback?.status ?? 'queued',
          message:
            'Playback is queued. Piano will restore the piece and start once its client and audio are ready.',
        },
      })
    }

    if (body.method === 'piano.ui.playbackStatus') {
      const params = uiPlaybackStatusParamsSchema.parse(body.params)
      const intent = await readUiIntent(dataDir)
      if (
        !intent ||
        intent.id !== params.intentId ||
        !intent.playback ||
        !intent.entityId
      ) {
        throw new DriveError(
          `No playback intent with id ${params.intentId}.`,
          'playback_intent_not_found',
          404,
        )
      }
      const piece = await readJson<PianoSong | null>(
        songPath(dataDir, intent.entityId),
        null,
      )
      return c.json({
        ok: true,
        result: {
          intentId: intent.id,
          pieceId: intent.entityId,
          title: piece?.title ?? intent.entityId,
          status: intent.playback.status,
          message: intent.playback.message ?? null,
          requestedAt: intent.playback.requestedAt,
          updatedAt: intent.playback.updatedAt,
        },
      })
    }

    if (body.method === 'piano.ui.read') {
      const params = uiReadParamsSchema.parse(body.params) ?? {}
      return c.json({
        ok: true,
        result: { text: await uiReadText(dataDir, params) },
      })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Piano does not expose ${body.method}.`,
        },
      },
      404,
    )
  } catch (error) {
    if (error instanceof NativeUiParamsError) {
      return c.json(
        {
          ok: false,
          error: { code: 'invalid_params', message: error.message },
        },
        400,
      )
    }
    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: error.issues[0]?.message ?? 'Invalid RPC parameters.',
          },
        },
        400,
      )
    }

    if (error instanceof DriveError) {
      return c.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        error.status,
      )
    }

    if (error instanceof ImportMidiError || error instanceof SongWriteError) {
      return c.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        error.status,
      )
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'internal_error',
          message: error instanceof Error ? error.message : 'Piano RPC failed.',
        },
      },
      500,
    )
  }
})

app.get('/api/audio/options', async (c) => {
  const dataDir = getDataDir(c)
  return c.json({
    defaultPresetId: DEFAULT_PIANO_PRESET_ID,
    instrumentPacks: await withInstrumentInstallStates(
      PIANO_INSTRUMENT_PACKS,
      dataDir,
    ),
    sampleSets: PIANO_SAMPLE_SETS,
    presets: PIANO_PRESETS,
    controls: PIANO_SETTING_CONTROLS,
  })
})

app.post('/api/audio/instrument-packs/:packId/install', async (c) => {
  try {
    const packId = c.req.param('packId')
    const pack = PIANO_INSTRUMENT_PACKS.find(
      (candidate) => candidate.id === packId,
    )
    if (!pack) return jsonError(c, 'Instrument pack not found', 404)

    const installedPack = await installInstrumentPack(pack, getDataDir(c))
    return c.json({ pack: installedPack })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to install instrument pack',
      400,
    )
  }
})

app.get(
  '/api/audio/instrument-packs/:packId/instruments/:instrumentId/preset',
  async (c) => {
    try {
      const packId = c.req.param('packId')
      const instrumentId = c.req.param('instrumentId')
      const pack = PIANO_INSTRUMENT_PACKS.find(
        (candidate) => candidate.id === packId,
      )
      if (!pack) return jsonError(c, 'Instrument pack not found', 404)
      if (pack.playbackEngine !== 'smplr-sfz') {
        return jsonError(
          c,
          'Instrument pack does not expose an SFZ preset',
          400,
        )
      }

      const installedPack = await withInstrumentInstallState(
        pack,
        getDataDir(c),
      )
      if (installedPack.status !== 'installed') {
        return jsonError(c, 'Instrument pack is not installed', 409)
      }

      return c.json(await readSfzInstrumentPreset(installedPack, instrumentId))
    } catch (error) {
      return jsonError(
        c,
        error instanceof Error ? error.message : 'Failed to read SFZ preset',
        400,
      )
    }
  },
)

app.get('/api/audio/settings', async (c) => {
  try {
    const settings = await readAudioSettings(getDataDir(c))
    return c.json({
      settings,
      preset: pianoPresetById(settings.presetId),
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read audio settings',
    )
  }
})

app.patch('/api/audio/settings', async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as {
      presetId?: unknown
      instrumentPackId?: unknown
      instrumentId?: unknown
      overrides?: unknown
    } | null

    if (!body || (body.presetId !== undefined && !isPresetId(body.presetId))) {
      return jsonError(c, 'A valid preset id is required', 400)
    }
    if (
      (body.instrumentPackId === undefined) !==
      (body.instrumentId === undefined)
    ) {
      return jsonError(
        c,
        'Instrument pack and instrument id are required together',
        400,
      )
    }

    const dataDir = getDataDir(c)
    await mkdir(dataDir, { recursive: true })
    const current = await readAudioSettings(dataDir)
    const instrumentChoice =
      body.instrumentPackId === undefined
        ? {
            instrumentPackId: current.instrumentPackId,
            instrumentId: current.instrumentId,
          }
        : normalizeInstrumentChoice(body.instrumentPackId, body.instrumentId)
    const settings: PianoAudioSettings = {
      presetId: body.presetId ?? current.presetId,
      instrumentPackId: instrumentChoice.instrumentPackId,
      instrumentId: instrumentChoice.instrumentId,
      overrides:
        body.overrides === undefined
          ? current.overrides
          : sanitizeAudioOverrides(body.overrides),
      updatedAt: new Date().toISOString(),
    }

    await writeJson(audioSettingsPath(dataDir), settings)

    return c.json({
      settings,
      preset: pianoPresetById(settings.presetId),
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to write audio settings',
    )
  }
})

app.get('/api/songs/:songId/sound-settings', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)
    const dataDir = getDataDir(c)
    await ensureSeedSongs(dataDir)
    const song = await readJson<PianoSong | null>(
      songPath(dataDir, songId),
      null,
    )
    if (!song) return jsonError(c, 'Song not found', 404)
    return c.json(await getSongSoundSettingsResponse(dataDir, songId))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to read song sound settings',
    )
  }
})

app.patch('/api/songs/:songId/sound-settings', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)
    const body = (await c.req.json().catch(() => null)) as {
      suggested?: unknown
      override?: unknown
    } | null
    if (!body) return jsonError(c, 'JSON body required', 400)

    const dataDir = getDataDir(c)
    await ensureSeedSongs(dataDir)
    const song = await readJson<PianoSong | null>(
      songPath(dataDir, songId),
      null,
    )
    if (!song) return jsonError(c, 'Song not found', 404)

    const existing = await readSongSoundSettings(dataDir, songId)
    const now = new Date().toISOString()
    const next: SongSoundSettings = {
      songId,
      suggested:
        body.suggested === undefined
          ? existing?.suggested
          : body.suggested === null
            ? undefined
            : mergeSoundChoice(
                existing?.suggested ?? {},
                sanitizeSoundChoice(body.suggested),
              ),
      override:
        body.override === undefined
          ? existing?.override
          : body.override === null
            ? undefined
            : mergeSoundChoice(
                existing?.override ?? {},
                sanitizeSoundChoice(body.override),
              ),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    await writeSongSoundSettings(dataDir, next)
    return c.json(await getSongSoundSettingsResponse(dataDir, songId))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to write song sound settings',
    )
  }
})

app.get('/api/songs/:songId/workspace-settings', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)
    const dataDir = getDataDir(c)
    await ensureSeedSongs(dataDir)
    const song = await readJson<PianoSong | null>(
      songPath(dataDir, songId),
      null,
    )
    if (!song) return jsonError(c, 'Song not found', 404)
    const settings = await readSongWorkspaceSettings(dataDir, songId)
    return c.json({
      settings: settings ?? null,
      effective: {
        playbackSpeed: settings?.playbackSpeed ?? 1,
      },
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to read song workspace settings',
    )
  }
})

app.patch('/api/songs/:songId/workspace-settings', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)
    const body = (await c.req.json().catch(() => null)) as {
      playbackSpeed?: unknown
    } | null
    if (!body) return jsonError(c, 'JSON body required', 400)
    const playbackSpeed = sanitizePlaybackSpeed(body.playbackSpeed)
    if (playbackSpeed === undefined) {
      return jsonError(c, 'A valid playbackSpeed is required', 400)
    }

    const dataDir = getDataDir(c)
    await ensureSeedSongs(dataDir)
    const song = await readJson<PianoSong | null>(
      songPath(dataDir, songId),
      null,
    )
    if (!song) return jsonError(c, 'Song not found', 404)
    const existing = await readSongWorkspaceSettings(dataDir, songId)
    const now = new Date().toISOString()
    const settings: SongWorkspacePracticeSettings = {
      songId,
      playbackSpeed,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await writeSongWorkspaceSettings(dataDir, settings)
    return c.json({ settings, effective: { playbackSpeed } })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to write song workspace settings',
    )
  }
})

app.patch('/api/songs/:songId/practice-settings', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)
    const body = (await c.req.json().catch(() => null)) as {
      splitMidi?: unknown
    } | null
    if (!body) return jsonError(c, 'JSON body required', 400)
    const splitMidi = sanitizeSplitMidi(body.splitMidi)
    if (splitMidi === undefined) {
      return jsonError(c, 'A valid splitMidi is required', 400)
    }

    const dataDir = getDataDir(c)
    await ensureSeedSongs(dataDir)
    const path = songPath(dataDir, songId)
    const existing = await readJson<PianoSong | null>(path, null)
    if (!existing) return jsonError(c, 'Song not found', 404)
    const now = new Date().toISOString()
    const song: PianoSong = {
      ...existing,
      practiceSettings: {
        ...existing.practiceSettings,
        splitMidi,
      },
      updatedAt: now,
    }
    await writeJson(path, song)
    return c.json(song)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to write song practice settings',
    )
  }
})

app.get('/api/library/revision', async (c) => {
  try {
    return c.json(await readLibraryRevision(getDataDir(c)))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to read library revision',
    )
  }
})

app.get('/api/folders', async (c) => {
  try {
    const folders = await readFolders(getDataDir(c))
    return c.json({ folders })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read folders',
    )
  }
})

app.post('/api/folders', async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as {
      name?: unknown
      tone?: unknown
    } | null
    const rawName = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!rawName) return jsonError(c, 'Folder name is required', 400)
    const name = rawName.slice(0, 80)
    const tone =
      typeof body?.tone === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(body.tone)
        ? body.tone
        : toneFromSeed(name)

    const dataDir = getDataDir(c)
    const folders = await readFolders(dataDir)
    const now = new Date().toISOString()
    const folder: Folder = {
      id: generateId(),
      name,
      tone,
      songIds: [],
      sortOrder: nextFolderSortOrder(folders),
      createdAt: now,
      updatedAt: now,
    }
    await writeFolders(dataDir, sortFolders([folder, ...folders]))
    return c.json(folder, 201)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to create folder',
    )
  }
})

app.post('/api/folders/reorder', async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as {
      folderIds?: unknown
    } | null
    if (!Array.isArray(body?.folderIds)) {
      return jsonError(c, 'folderIds must be an array', 400)
    }

    const dataDir = getDataDir(c)
    const folders = await readFolders(dataDir)
    const byId = new Map(folders.map((folder) => [folder.id, folder]))
    const seen = new Set<string>()
    const requestedIds = body.folderIds.filter((id): id is string => {
      if (typeof id !== 'string' || !byId.has(id) || seen.has(id)) return false
      seen.add(id)
      return true
    })

    if (folders.length > 0 && requestedIds.length === 0) {
      return jsonError(c, 'At least one known folder id is required', 400)
    }

    const requested = requestedIds
      .map((id) => byId.get(id))
      .filter((folder): folder is Folder => Boolean(folder))
    const remaining = folders.filter((folder) => !seen.has(folder.id))
    const reordered = [...requested, ...remaining].map((folder, index) => ({
      ...folder,
      sortOrder: index,
    }))

    await writeFolders(dataDir, reordered)
    return c.json({ folders: reordered })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to reorder folders',
    )
  }
})

app.patch('/api/folders/:folderId', async (c) => {
  try {
    const folderId = c.req.param('folderId')
    const body = (await c.req.json().catch(() => null)) as {
      name?: unknown
      tone?: unknown
    } | null
    if (!body) return jsonError(c, 'Body required', 400)

    const dataDir = getDataDir(c)
    const folders = await readFolders(dataDir)
    const target = folders.find((folder) => folder.id === folderId)
    if (!target) return jsonError(c, 'Folder not found', 404)

    if (typeof body.name === 'string') {
      const trimmed = body.name.trim().slice(0, 80)
      if (trimmed) target.name = trimmed
    }
    if (
      typeof body.tone === 'string' &&
      /^#[0-9a-fA-F]{3,8}$/.test(body.tone)
    ) {
      target.tone = body.tone
    }
    target.updatedAt = new Date().toISOString()

    await writeFolders(dataDir, folders)
    return c.json(target)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to update folder',
    )
  }
})

app.delete('/api/folders/:folderId', async (c) => {
  try {
    const folderId = c.req.param('folderId')
    const dataDir = getDataDir(c)
    const folders = await readFolders(dataDir)
    const next = folders.filter((folder) => folder.id !== folderId)
    if (next.length === folders.length) {
      return jsonError(c, 'Folder not found', 404)
    }
    await writeFolders(dataDir, next)
    return c.json({ ok: true })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to delete folder',
    )
  }
})

app.post('/api/folders/move', async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as {
      songId?: unknown
      folderId?: unknown
    } | null
    if (!body || typeof body.songId !== 'string' || !body.songId) {
      return jsonError(c, 'songId is required', 400)
    }
    const targetFolderId =
      typeof body.folderId === 'string' && body.folderId ? body.folderId : null

    const dataDir = getDataDir(c)
    const folders = await readFolders(dataDir)

    if (
      targetFolderId &&
      !folders.some((folder) => folder.id === targetFolderId)
    ) {
      return jsonError(c, 'Folder not found', 404)
    }

    const now = new Date().toISOString()
    const updated = folders.map((folder) => {
      const had = folder.songIds.includes(body.songId as string)
      const willHave = folder.id === targetFolderId
      if (had === willHave) return folder
      return {
        ...folder,
        songIds: willHave
          ? [
              ...folder.songIds.filter((id) => id !== body.songId),
              body.songId as string,
            ]
          : folder.songIds.filter((id) => id !== body.songId),
        updatedAt: now,
      }
    })

    await writeFolders(dataDir, updated)
    return c.json({ folders: updated })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to move song',
    )
  }
})

// ─────────────────────────────────────────────────────────────────────
// Courses
// ─────────────────────────────────────────────────────────────────────

app.get('/api/courses', async (c) => {
  try {
    const dataDir = getDataDir(c)
    await ensureSeedCourses(dataDir)
    const courses = await readCourses(dataDir)
    const progressMap = await readAllCourseProgress(dataDir)
    return c.json({
      courses: courses.map((course) => ({
        course,
        progress: progressMap[course.id] ?? defaultCourseProgress(course.id),
        totalLessons: countCourseLessons(course),
        completedCount: (progressMap[course.id]?.completedLessonIds ?? [])
          .length,
      })),
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to list courses',
    )
  }
})

app.get('/api/courses/:courseId', async (c) => {
  try {
    const dataDir = getDataDir(c)
    await ensureSeedCourses(dataDir)
    const course = await readCourse(dataDir, c.req.param('courseId'))
    if (!course) return jsonError(c, 'Course not found', 404)
    const progressMap = await readAllCourseProgress(dataDir)
    return c.json({
      course,
      progress: progressMap[course.id] ?? defaultCourseProgress(course.id),
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read course',
    )
  }
})

app.post('/api/courses/:courseId/complete', async (c) => {
  try {
    const courseId = c.req.param('courseId')
    const body = (await c.req.json().catch(() => null)) as {
      lessonId?: unknown
    } | null
    if (!body || typeof body.lessonId !== 'string') {
      return jsonError(c, 'lessonId is required', 400)
    }
    const dataDir = getDataDir(c)
    const course = await readCourse(dataDir, courseId)
    if (!course) return jsonError(c, 'Course not found', 404)
    if (!courseHasLesson(course, body.lessonId)) {
      return jsonError(c, 'Lesson not found in course', 404)
    }
    const progress = await updateCourseProgress(
      dataDir,
      courseId,
      (current) => {
        const next = new Set(current.completedLessonIds)
        next.add(body.lessonId as string)
        const nextLessonId = nextUncompleted(
          course,
          next,
          body.lessonId as string,
        )
        return {
          ...current,
          completedLessonIds: [...next],
          currentLessonId: nextLessonId,
          updatedAt: new Date().toISOString(),
        }
      },
    )
    return c.json({ course, progress })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to mark lesson complete',
    )
  }
})

app.post('/api/courses/:courseId/uncomplete', async (c) => {
  try {
    const courseId = c.req.param('courseId')
    const body = (await c.req.json().catch(() => null)) as {
      lessonId?: unknown
    } | null
    if (!body || typeof body.lessonId !== 'string') {
      return jsonError(c, 'lessonId is required', 400)
    }
    const dataDir = getDataDir(c)
    const course = await readCourse(dataDir, courseId)
    if (!course) return jsonError(c, 'Course not found', 404)
    const progress = await updateCourseProgress(
      dataDir,
      courseId,
      (current) => {
        const next = current.completedLessonIds.filter(
          (id) => id !== body.lessonId,
        )
        return {
          ...current,
          completedLessonIds: next,
          updatedAt: new Date().toISOString(),
        }
      },
    )
    return c.json({ course, progress })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to undo completion',
    )
  }
})

app.post('/api/courses/:courseId/current', async (c) => {
  try {
    const courseId = c.req.param('courseId')
    const body = (await c.req.json().catch(() => null)) as {
      lessonId?: unknown
    } | null
    const dataDir = getDataDir(c)
    const course = await readCourse(dataDir, courseId)
    if (!course) return jsonError(c, 'Course not found', 404)
    const lessonId =
      typeof body?.lessonId === 'string' &&
      courseHasLesson(course, body.lessonId)
        ? body.lessonId
        : null
    const progress = await updateCourseProgress(
      dataDir,
      courseId,
      (current) => ({
        ...current,
        currentLessonId: lessonId,
        updatedAt: new Date().toISOString(),
      }),
    )
    return c.json({ course, progress })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to set current lesson',
    )
  }
})

app.post('/api/courses/:courseId/reset', async (c) => {
  try {
    const courseId = c.req.param('courseId')
    const dataDir = getDataDir(c)
    const course = await readCourse(dataDir, courseId)
    if (!course) return jsonError(c, 'Course not found', 404)
    const progress = await updateCourseProgress(dataDir, courseId, () => ({
      courseId,
      completedLessonIds: [],
      currentLessonId: null,
      updatedAt: new Date().toISOString(),
    }))
    return c.json({ course, progress })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to reset course',
    )
  }
})

app.get('/api/songs', async (c) => {
  try {
    const dataDir = getDataDir(c)
    const songs = await readSongs(dataDir)
    return c.json({
      dataDir,
      songsDir: songsDir(dataDir),
      songs: songs.map(summarizeSong),
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read songs',
    )
  }
})

app.post('/api/songs', async (c) => {
  try {
    const body = (await c.req
      .json()
      .catch(() => null)) as UpsertSongParams | null
    if (!body) return jsonError(c, 'JSON body required', 400)
    return c.json(await upsertSong(getDataDir(c), body), 201)
  } catch (error) {
    if (error instanceof SongWriteError) {
      return jsonError(c, error.message, error.status)
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to write song',
    )
  }
})

app.patch('/api/songs/:songId', async (c) => {
  try {
    const body = (await c.req
      .json()
      .catch(() => null)) as PatchSongParams | null
    if (!body) return jsonError(c, 'JSON body required', 400)
    return c.json(
      await patchSong(getDataDir(c), {
        ...body,
        songId: c.req.param('songId'),
      }),
    )
  } catch (error) {
    if (error instanceof SongWriteError) {
      return jsonError(c, error.message, error.status)
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to patch song',
    )
  }
})

app.post('/api/song-import/midi-file', async (c) => {
  try {
    const body = (await c.req
      .json()
      .catch(() => null)) as ImportMidiFileParams | null
    if (!body) return jsonError(c, 'JSON body required', 400)
    return c.json(await importMidiFile(getDataDir(c), body), 201)
  } catch (error) {
    if (error instanceof ImportMidiError || error instanceof SongWriteError) {
      return jsonError(c, error.message, error.status)
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to import MIDI file',
    )
  }
})

app.post('/api/song-import/midi-upload', async (c) => {
  try {
    const form = await c.req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return jsonError(c, 'A MIDI file upload is required', 400)
    }

    const fileName = file.name || 'uploaded.mid'
    const extension = extname(fileName).toLowerCase()
    if (extension !== '.mid' && extension !== '.midi') {
      throw new ImportMidiError(
        'Only .mid and .midi files can be imported',
        'invalid_file_type',
      )
    }
    if (file.size > 50 * 1024 * 1024) {
      throw new ImportMidiError(
        'MIDI file is larger than 50 MB',
        'file_too_large',
        422,
      )
    }

    const field = (name: string) => {
      const value = form.get(name)
      return typeof value === 'string' ? value : undefined
    }
    const boolField = (name: string) => field(name) === 'true'
    const params = normalizeImportMidiParams({
      filePath: fileName,
      songId: field('songId'),
      title: field('title'),
      replaceSongId: field('replaceSongId'),
      overwrite: boolField('overwrite'),
      source: field('source'),
      composer: field('composer'),
      artist: field('artist'),
      license: field('license'),
      folderId: field('folderId'),
      folderName: field('folderName'),
      createFolder: boolField('createFolder'),
    })
    const bytes = Buffer.from(await file.arrayBuffer())
    return c.json(
      await persistImportedMidiSong(
        getDataDir(c),
        params,
        bytes,
        fileName,
        fileName,
      ),
      201,
    )
  } catch (error) {
    if (error instanceof ImportMidiError || error instanceof SongWriteError) {
      return jsonError(c, error.message, error.status)
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to import MIDI file',
    )
  }
})

app.get('/api/song-catalog/mutopia/status', async (c) => {
  try {
    return c.json(await readMutopiaPianoIndexStatus(getDataDir(c)))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to read Mutopia catalog status',
    )
  }
})

app.post('/api/song-catalog/mutopia/rebuild', async (c) => {
  try {
    const index = await rebuildMutopiaPianoIndex(getDataDir(c))
    return c.json({
      repository: index.repository,
      repositoryCommit: index.repositoryCommit,
      generatedAt: index.generatedAt,
      entryCount: index.entries.length,
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to rebuild Mutopia catalog',
      502,
    )
  }
})

app.get('/api/song-catalog/search', async (c) => {
  try {
    const query = c.req.query('q') ?? ''
    const limit = Number(c.req.query('limit') ?? 40)
    const dataDir = getDataDir(c)
    const index = await ensureMutopiaPianoIndex(dataDir)
    const installedSongs = await readSongs(dataDir)
    const installedMutopiaIds = new Set(
      installedSongs
        .map((song) => song.sourceInfo?.mutopiaId)
        .filter((id): id is string => Boolean(id)),
    )

    return c.json({
      provider: 'mutopia',
      repository: index.repository,
      repositoryCommit: index.repositoryCommit,
      generatedAt: index.generatedAt,
      results: searchMutopiaPianoIndex(index, query, limit).map((entry) => ({
        ...entry,
        installed: installedMutopiaIds.has(entry.mutopiaId),
      })),
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to search Mutopia catalog',
      502,
    )
  }
})

app.post('/api/song-catalog/install', async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as {
      provider?: unknown
      mutopiaId?: unknown
      id?: unknown
    } | null

    if (
      !body ||
      (body.provider !== undefined && body.provider !== 'mutopia') ||
      (typeof body.mutopiaId !== 'string' && typeof body.id !== 'string')
    ) {
      return jsonError(c, 'A Mutopia catalog song id is required', 400)
    }

    const requestedId =
      typeof body.mutopiaId === 'string' ? body.mutopiaId : body.id
    const dataDir = getDataDir(c)
    const index = await ensureMutopiaPianoIndex(dataDir)
    const entry = index.entries.find(
      (candidate) =>
        candidate.mutopiaId === requestedId || candidate.id === requestedId,
    )
    if (!entry) return jsonError(c, 'Catalog song not found', 404)

    await ensureSeedSongs(dataDir)
    const installedSong = (await readSongs(dataDir)).find(
      (song) => song.sourceInfo?.mutopiaId === entry.mutopiaId,
    )
    if (installedSong) {
      return c.json({
        installed: true,
        song: summarizeSong(installedSong),
      })
    }

    const existing = await readJson<PianoSong | null>(
      songPath(dataDir, entry.id),
      null,
    )
    if (existing) {
      return c.json({
        installed: true,
        song: summarizeSong(existing),
      })
    }

    const now = new Date().toISOString()
    const midiBytes = await fetchMutopiaMidi(entry)
    const song = midiBytesToSong(midiBytes, {
      id: entry.id,
      title: catalogSongTitle(entry.title, entry.opus),
      source: `${entry.composer}; ${entry.source ?? 'Mutopia Project'}; Mutopia Project`,
      sourceInfo: {
        provider: 'Mutopia Project',
        sourceUrl: entry.sourceUrl,
        midiUrl: entry.midiUrl,
        license: entry.license,
        composer: entry.composer,
        mutopiaId: entry.mutopiaId,
        lilypondPath: entry.lilypondPath,
        lilypondUrl: entry.lilypondUrl,
        sourceRepository: entry.repository,
      },
      createdAt: now,
      updatedAt: now,
    })

    await writeJson(songPath(dataDir, song.id), song)
    return c.json({
      installed: true,
      song: summarizeSong(song),
    })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to install song',
      502,
    )
  }
})

app.get('/api/songs/:songId', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)

    const dataDir = getDataDir(c)
    await ensureSeedSongs(dataDir)
    const song = await readJson<PianoSong | null>(
      songPath(dataDir, songId),
      null,
    )
    if (!song) return jsonError(c, 'Song not found', 404)
    return c.json(song)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read song',
    )
  }
})

app.put('/api/songs/:songId', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)

    const body = (await c.req.json().catch(() => null)) as PianoSong | null
    if (!body || body.id !== songId || !Array.isArray(body.notes)) {
      return jsonError(c, 'A complete song JSON document is required', 400)
    }

    const now = new Date().toISOString()
    const song: PianoSong = {
      ...body,
      updatedAt: now,
      createdAt: body.createdAt || now,
    }
    await ensureSeedSongs(getDataDir(c))
    await writeJson(songPath(getDataDir(c), songId), song)
    return c.json(song)
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to write song',
    )
  }
})

app.delete('/api/songs/:songId', async (c) => {
  try {
    const songId = c.req.param('songId')
    if (!isValidSongId(songId)) return jsonError(c, 'Invalid song id', 400)

    const dataDir = getDataDir(c)
    const filePath = songPath(dataDir, songId)
    const existing = await readJson<PianoSong | null>(filePath, null)
    if (!existing) return jsonError(c, 'Song not found', 404)

    await rm(filePath, { force: true })

    // Remove from any folders that reference this song
    const folders = await readFolders(dataDir)
    const now = new Date().toISOString()
    let folderTouched = false
    const updatedFolders = folders.map((folder) => {
      if (!folder.songIds.includes(songId)) return folder
      folderTouched = true
      return {
        ...folder,
        songIds: folder.songIds.filter((id) => id !== songId),
        updatedAt: now,
      }
    })
    if (folderTouched) {
      await writeFolders(dataDir, updatedFolders)
    }

    return c.json({ ok: true, id: songId })
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to delete song',
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
