import type { CourseProgress, GuitarCourse } from '../shared/course'
import type { Folder } from '../shared/folder'
import type { GuitarSong, SongSummary } from '../shared/song'

const NATIVE_ROUTES = [
  'home',
  'songs',
  'song',
  'courses',
  'course',
  'lesson',
] as const

export type NativeRoute = (typeof NATIVE_ROUTES)[number]

export interface NativeReadParams {
  route: NativeRoute
  songId?: string
  folderId?: string
  courseId?: string
  lessonId?: string
  limit?: number
}
export interface NativeMutateParams {
  action: 'set-lesson-completed'
  courseId: string
  lessonId: string
  completed: boolean
}
export type NativeLibraryUpdateParams =
  | { action: 'create-folder'; name: string }
  | { action: 'rename-folder'; folderId: string; name: string }
  | { action: 'move-song'; songId: string; folderId: string | null }
export type NativeDeleteParams =
  | { action: 'delete-song'; songId: string }
  | { action: 'delete-folder'; folderId: string }

export class NativeUiParamsError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalId(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
    throw new NativeUiParamsError(`${name} must be a valid id.`)
  }
  return value
}

export function parseNativeReadParams(value: unknown): NativeReadParams {
  if (!isRecord(value) || !NATIVE_ROUTES.includes(value.route as NativeRoute)) {
    throw new NativeUiParamsError('A valid native route is required.')
  }
  const params: NativeReadParams = {
    route: value.route as NativeRoute,
    songId: optionalId(value.songId, 'songId'),
    folderId: optionalId(value.folderId, 'folderId'),
    courseId: optionalId(value.courseId, 'courseId'),
    lessonId: optionalId(value.lessonId, 'lessonId'),
  }
  if (value.limit !== undefined) {
    if (
      !Number.isInteger(value.limit) ||
      Number(value.limit) < 1 ||
      Number(value.limit) > 24
    ) {
      throw new NativeUiParamsError(
        'limit must be an integer from 1 through 24.',
      )
    }
    params.limit = Number(value.limit)
  }
  if (params.route === 'song' && !params.songId) {
    throw new NativeUiParamsError('songId is required for the song route.')
  }
  if (params.route === 'course' && !params.courseId) {
    throw new NativeUiParamsError('courseId is required for the course route.')
  }
  if (params.route === 'lesson' && (!params.courseId || !params.lessonId)) {
    throw new NativeUiParamsError(
      'courseId and lessonId are required for the lesson route.',
    )
  }
  return params
}

export function parseNativeMutateParams(value: unknown): NativeMutateParams {
  if (!isRecord(value) || value.action !== 'set-lesson-completed') {
    throw new NativeUiParamsError('A valid native action is required.')
  }
  const courseId = optionalId(value.courseId, 'courseId')
  const lessonId = optionalId(value.lessonId, 'lessonId')
  if (!courseId || !lessonId || typeof value.completed !== 'boolean') {
    throw new NativeUiParamsError(
      'courseId, lessonId, and completed are required.',
    )
  }
  return {
    action: value.action,
    courseId,
    lessonId,
    completed: value.completed,
  }
}

function requiredName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    throw new NativeUiParamsError('A non-empty name is required.')
  return value.trim().slice(0, 80)
}

export function parseNativeLibraryUpdateParams(
  value: unknown,
): NativeLibraryUpdateParams {
  if (!isRecord(value))
    throw new NativeUiParamsError('A valid library action is required.')
  if (value.action === 'create-folder')
    return { action: value.action, name: requiredName(value.name) }
  if (value.action === 'rename-folder') {
    const folderId = optionalId(value.folderId, 'folderId')
    if (!folderId) throw new NativeUiParamsError('folderId is required.')
    return { action: value.action, folderId, name: requiredName(value.name) }
  }
  if (value.action === 'move-song') {
    const songId = optionalId(value.songId, 'songId')
    const folderId =
      value.folderId === null ? null : optionalId(value.folderId, 'folderId')
    if (!songId || folderId === undefined)
      throw new NativeUiParamsError('songId and folderId are required.')
    return { action: value.action, songId, folderId }
  }
  throw new NativeUiParamsError('A valid library action is required.')
}

export function parseNativeDeleteParams(value: unknown): NativeDeleteParams {
  if (!isRecord(value))
    throw new NativeUiParamsError('A valid delete action is required.')
  if (value.action === 'delete-song') {
    const songId = optionalId(value.songId, 'songId')
    if (!songId) throw new NativeUiParamsError('songId is required.')
    return { action: value.action, songId }
  }
  if (value.action === 'delete-folder') {
    const folderId = optionalId(value.folderId, 'folderId')
    if (!folderId) throw new NativeUiParamsError('folderId is required.')
    return { action: value.action, folderId }
  }
  throw new NativeUiParamsError('A valid delete action is required.')
}

function plainText(value: string | undefined, max = 320): string {
  return (value ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_`#>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function durationLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'No duration'
  const rounded = Math.round(seconds)
  const minutes = Math.floor(rounded / 60)
  const remainder = rounded % 60
  return minutes > 0
    ? `${minutes}:${String(remainder).padStart(2, '0')}`
    : `${remainder}s`
}

function lessonRows(course: GuitarCourse) {
  return course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title })),
  )
}

function progressFor(
  course: GuitarCourse,
  progress: Record<string, CourseProgress>,
) {
  return (
    progress[course.id] ?? {
      courseId: course.id,
      completedLessonIds: [],
      currentLessonId: null,
      updatedAt: '',
    }
  )
}

function songRow(song: SongSummary) {
  const credit =
    song.composer ?? song.artist ?? song.source ?? 'Personal library'
  return {
    id: song.id,
    songName: plainText(song.title, 120),
    title: plainText(song.title, 120),
    subtitle: plainText(credit, 120),
    metadata: `${durationLabel(song.duration)} · ${song.bpm} bpm · ${song.beatsPerBar}/${song.beatUnit ?? 4}`,
    trailingText: song.isTutorial ? 'Guide' : '',
  }
}

function courseRow(
  course: GuitarCourse,
  progress: Record<string, CourseProgress>,
) {
  const state = progressFor(course, progress)
  const total = lessonRows(course).length
  const completed = state.completedLessonIds.filter((id) =>
    lessonRows(course).some((lesson) => lesson.id === id),
  ).length
  return {
    id: course.id,
    title: plainText(course.title, 120),
    subtitle: plainText(course.subtitle || course.description, 180),
    metadata: `${course.difficulty} · ${course.estimatedMinutes} min · ${completed} complete`,
    trailingText: `${completed}/${total}`,
  }
}

export function projectNativeHome(
  songs: SongSummary[],
  folders: Folder[],
  courses: GuitarCourse[],
  progress: Record<string, CourseProgress>,
) {
  const continueItems = courses
    .flatMap((course) => {
      const rows = lessonRows(course)
      const state = progressFor(course, progress)
      const lesson =
        rows.find((item) => item.id === state.currentLessonId) ??
        rows.find((item) => !state.completedLessonIds.includes(item.id))
      if (!lesson) return []
      return [
        {
          courseId: course.id,
          lessonId: lesson.id,
          title: lesson.titleOverride ?? lesson.moduleTitle,
          subtitle: course.title,
          metadata: plainText(lesson.teaser, 140),
          trailingText: 'Next',
        },
      ]
    })
    .slice(0, 1)

  return {
    summary: `${songs.length} ${songs.length === 1 ? 'song' : 'songs'} · ${courses.length} ${courses.length === 1 ? 'course' : 'courses'}`,
    continueItems,
    continueEmptyStates:
      continueItems.length === 0
        ? [
            {
              title: 'No lesson in progress',
              description: 'Open Courses to choose a learning guide.',
            },
          ]
        : [],
    folders: folders.slice(0, 8).map((folder) => ({
      id: folder.id,
      title: plainText(folder.name, 100),
      subtitle: `${folder.songIds.length} ${folder.songIds.length === 1 ? 'song' : 'songs'}`,
    })),
    folderNotice:
      folders.length > 8 ? `Showing 8 of ${folders.length} folders.` : '',
    folderDrafts: [{ name: '' }],
  }
}

export function projectNativeSongs(
  songs: SongSummary[],
  folders: Folder[],
  params: Pick<NativeReadParams, 'folderId' | 'limit'>,
) {
  const folder = params.folderId
    ? folders.find((item) => item.id === params.folderId)
    : undefined
  const filtered = folder
    ? songs.filter((song) => folder.songIds.includes(song.id))
    : songs
  const limit = params.limit ?? 24
  const rows = filtered.slice(0, limit).map(songRow)
  return {
    title: folder?.name ?? 'Song library',
    subtitle: `${filtered.length} ${filtered.length === 1 ? 'song' : 'songs'} · reference only on iPhone`,
    songs: rows,
    draftQuery: '',
    folderEdits: folder ? [{ folderId: folder.id, name: folder.name }] : [],
    folderDeleteActions: folder
      ? [
          {
            folderId: folder.id,
            folderName: plainText(folder.name, 100),
            label: 'Delete folder',
          },
        ]
      : [],
    emptyStates:
      rows.length === 0
        ? [
            {
              title: 'No songs here yet',
              description: folder
                ? 'This folder is empty.'
                : 'Add or import songs from the Mac app.',
            },
          ]
        : [],
    truncationNotice:
      filtered.length > limit
        ? `Showing the first ${limit} of ${filtered.length} songs.`
        : '',
  }
}

export function projectNativeSongSearch(songs: SongSummary[], query: string) {
  const normalized = plainText(query, 80).toLowerCase()
  const results = songs
    .filter((song) =>
      [song.title, song.composer, song.artist, song.source]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    )
    .slice(0, 24)
    .map(songRow)
  return {
    results,
    notices:
      results.length === 0
        ? [
            {
              title: 'No songs found',
              message: 'Try another title, artist, or composer.',
            },
          ]
        : [
            {
              title: 'Search complete',
              message: `${results.length} ${results.length === 1 ? 'song' : 'songs'} found.`,
            },
          ],
  }
}

export function projectNativeSong(song: GuitarSong, folders: Folder[] = []) {
  const duration = song.notes.reduce(
    (max, note) => Math.max(max, note.start + note.duration),
    0,
  )
  const tutorial = song.tutorial
  return {
    id: song.id,
    songName: plainText(song.title, 140),
    title: plainText(song.title, 140),
    credit: plainText(
      song.sourceInfo?.composer ?? song.sourceInfo?.artist ?? song.source,
      160,
    ),
    tags: [
      durationLabel(duration),
      `${song.bpm} bpm`,
      `${song.beatsPerBar}/${song.beatUnit ?? 4}`,
      `${song.notes.length} notes`,
    ],
    desktopNotices: [
      {
        title: 'Practice on your Mac',
        message:
          'Playback, fretboard visualization, speed controls, MIDI, and recording are available in the full Guitar app.',
      },
    ],
    moveActions: [
      { label: 'Move to Library', songId: song.id, folderId: null },
      ...folders.map((folder) => ({
        label: `Move to ${plainText(folder.name, 80)}`,
        songId: song.id,
        folderId: folder.id,
      })),
    ],
    deleteActions: [
      {
        label: 'Delete song',
        songId: song.id,
        songName: plainText(song.title, 140),
      },
    ],
    tutorialSummaries: tutorial
      ? [{ message: plainText(tutorial.summary, 600) }]
      : [],
    objectives:
      tutorial?.objectives.slice(0, 8).map((objective, index) => ({
        title: `Objective ${index + 1}`,
        subtitle: plainText(objective, 240),
      })) ?? [],
    sections:
      tutorial?.sections.slice(0, 12).map((section) => ({
        title: plainText(section.title, 120),
        text: [section.focus, ...section.learn, ...(section.tryThis ?? [])]
          .filter(Boolean)
          .map((line) => `• ${plainText(line, 280)}`)
          .join('\n'),
      })) ?? [],
    guideEmptyStates: tutorial
      ? []
      : [
          {
            title: 'No learning guide',
            description:
              'This song is in your library, but it does not include a tutorial yet.',
          },
        ],
  }
}

export function projectNativeCourses(
  courses: GuitarCourse[],
  progress: Record<string, CourseProgress>,
) {
  const rows = courses.slice(0, 16).map((course) => courseRow(course, progress))
  return {
    subtitle: `${courses.length} guided ${courses.length === 1 ? 'course' : 'courses'}`,
    courses: rows,
    emptyStates:
      rows.length === 0
        ? [
            {
              title: 'No courses available',
              description: 'Open Guitar on your Mac to add learning material.',
            },
          ]
        : [],
    truncationNotice:
      courses.length > 16 ? `Showing 16 of ${courses.length} courses.` : '',
  }
}

export function projectNativeCourse(
  course: GuitarCourse,
  progress: CourseProgress | undefined,
) {
  const state = progress ?? progressFor(course, {})
  const allLessons = lessonRows(course)
  const completed = new Set(state.completedLessonIds)
  const completedCount = allLessons.filter((lesson) =>
    completed.has(lesson.id),
  ).length
  const nextLesson =
    allLessons.find((lesson) => lesson.id === state.currentLessonId) ??
    allLessons.find((lesson) => !completed.has(lesson.id)) ??
    allLessons[0]
  const lessons = course.modules.slice(0, 12).flatMap((module) =>
    module.lessons.slice(0, 16).map((lesson) => ({
      id: lesson.id,
      courseId: course.id,
      title: plainText(lesson.titleOverride ?? lesson.teaser, 140),
      subtitle: plainText(lesson.teaser, 220),
      metadata: plainText(module.title, 120),
      trailingText: completed.has(lesson.id)
        ? 'Done'
        : lesson.id === state.currentLessonId
          ? 'Next'
          : '',
    })),
  )
  return {
    title: plainText(course.title, 140),
    subtitle: plainText(course.subtitle, 220),
    description: plainText(course.description, 600),
    tags: [
      course.difficulty,
      `${course.estimatedMinutes} min`,
      `${completedCount}/${allLessons.length} complete`,
    ],
    progressValue:
      allLessons.length > 0 ? completedCount / allLessons.length : 0,
    progressLabel: `${completedCount} of ${allLessons.length} lessons complete`,
    canContinue: Boolean(nextLesson),
    continueLabel:
      completedCount === 0
        ? 'Start course'
        : completedCount === allLessons.length
          ? 'Review course'
          : 'Continue',
    nextLessonId: nextLesson?.id ?? '',
    canReset: completedCount > 0,
    courseName: plainText(course.title, 140),
    lessons,
    lessonEmptyStates:
      lessons.length === 0
        ? [
            {
              title: 'No lessons yet',
              description:
                'This course does not have a published lesson guide yet.',
            },
          ]
        : [],
    resetActions:
      completedCount > 0
        ? [
            {
              label: 'Reset course progress',
              courseId: course.id,
              courseName: plainText(course.title, 140),
            },
          ]
        : [],
  }
}

export function projectNativeLesson(
  course: GuitarCourse,
  lessonId: string,
  song: GuitarSong,
  progress: CourseProgress | undefined,
) {
  const lesson = lessonRows(course).find((item) => item.id === lessonId)!
  const tutorial = song.tutorial
  const completed = progress?.completedLessonIds.includes(lessonId) ?? false
  const completionAction = {
    label: completed ? 'Mark incomplete' : 'Mark complete',
    courseId: course.id,
    lessonId,
    completed: !completed,
  }
  return {
    title: plainText(lesson.titleOverride ?? song.title, 140),
    courseLabel: `${course.title} · ${lesson.moduleTitle}`,
    teaser: plainText(lesson.teaser, 360),
    tags: [
      completed ? 'Completed' : 'Not completed',
      tutorial?.level ?? course.difficulty,
    ],
    completionAction,
    completionActions: [completionAction],
    desktopNotices: [
      {
        title: 'Ready when you are',
        message:
          'Use this guide as a reference, then open Guitar on your Mac for the playable lesson.',
      },
    ],
    objectives:
      tutorial?.objectives.slice(0, 8).map((objective, index) => ({
        title: `Objective ${index + 1}`,
        subtitle: plainText(objective, 240),
      })) ?? [],
    sections:
      tutorial?.sections.slice(0, 12).map((section) => ({
        title: plainText(section.title, 120),
        text: [
          section.focus,
          ...section.learn,
          ...(section.tryThis ?? []),
          ...(section.breakIt ?? []),
        ]
          .filter(Boolean)
          .map((line) => `• ${plainText(line, 280)}`)
          .join('\n'),
      })) ?? [],
    guideEmptyStates: tutorial
      ? []
      : [
          {
            title: 'Guide not available',
            description:
              'This lesson does not include mobile reference notes yet.',
          },
        ],
  }
}
