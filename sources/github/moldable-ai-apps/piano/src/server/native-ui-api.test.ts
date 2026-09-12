import type { CourseProgress } from '../shared/course'
import type { Folder } from '../shared/folder'
import type { SongSummary } from '../shared/song'
import { defaultCourses } from './courses'
import { defaultSongs } from './default-songs'
import {
  parseNativeMutateParams,
  parseNativeReadParams,
  projectNativeCourse,
  projectNativeCourses,
  projectNativeHome,
  projectNativeLesson,
  projectNativeSong,
  projectNativeSongs,
} from './native-ui-api'
import { describe, expect, it } from 'vitest'

const songs = defaultSongs('2026-08-01T00:00:00.000Z')
const summaries: SongSummary[] = songs.map((song) => ({
  id: song.id,
  title: song.title,
  source: song.source,
  composer: song.sourceInfo?.composer,
  artist: song.sourceInfo?.artist,
  bpm: song.bpm,
  beatsPerBar: song.beatsPerBar,
  beatUnit: song.beatUnit,
  isTutorial: Boolean(song.tutorial),
  tutorialSummary: song.tutorial?.summary,
  noteCount: song.notes.length,
  duration: song.notes.reduce(
    (maximum, note) => Math.max(maximum, note.start + note.duration),
    0,
  ),
  updatedAt: song.updatedAt,
}))
const folders: Folder[] = [
  {
    id: 'starter-songs',
    name: 'Starter songs',
    tone: '#000000',
    songIds: songs.slice(0, 2).map((song) => song.id),
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
]
const course = defaultCourses[0]!
const firstLesson = course.modules[0]!.lessons[0]!
const lessonSong = songs.find((song) => song.id === firstLesson.songId)!
const progress: Record<string, CourseProgress> = {
  [course.id]: {
    courseId: course.id,
    completedLessonIds: [],
    currentLessonId: firstLesson.id,
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
}

describe('Piano NativeUI projections', () => {
  it('validates route requirements and bounds', () => {
    expect(parseNativeReadParams({ route: 'songs', limit: 24 })).toEqual({
      route: 'songs',
      limit: 24,
    })
    expect(() => parseNativeReadParams({ route: 'song' })).toThrow(/songId/)
    expect(() =>
      parseNativeReadParams({ route: 'lesson', courseId: course.id }),
    ).toThrow(/lessonId/)
    expect(() => parseNativeReadParams({ route: 'songs', limit: 25 })).toThrow(
      /limit/,
    )
    expect(
      parseNativeMutateParams({
        action: 'set-lesson-completed',
        courseId: course.id,
        lessonId: firstLesson.id,
        completed: true,
      }),
    ).toMatchObject({ completed: true })
    expect(() => parseNativeMutateParams({ action: 'reset-course' })).toThrow(
      /action/,
    )
  })

  it('projects a bounded navigable home and song library', () => {
    const home = projectNativeHome(summaries, folders, defaultCourses, progress)
    expect(home.continueItems[0]).toMatchObject({
      courseId: course.id,
      lessonId: firstLesson.id,
    })
    expect(home.continueItems).toHaveLength(1)
    expect(home.summary).toContain('song')

    const library = projectNativeSongs(summaries, folders, {
      folderId: folders[0]!.id,
      limit: 1,
    })
    expect(library.songs).toHaveLength(1)
    expect(library.truncationNotice).toContain('Showing the first 1')

    const localSong = {
      ...summaries[0]!,
      composer: undefined,
      artist: undefined,
      source: 'file:/Users/example/Music/private.mid',
    }
    expect(projectNativeSongs([localSong], [], {}).songs[0]?.subtitle).toBe(
      'Personal library',
    )
  })

  it('projects read-only song, course, and lesson reference detail', () => {
    const song = projectNativeSong(lessonSong)
    const courses = projectNativeCourses(defaultCourses, progress)
    const courseDetail = projectNativeCourse(course, progress[course.id])
    const lesson = projectNativeLesson(
      course,
      firstLesson.id,
      lessonSong,
      progress[course.id],
    )

    expect(song.desktopNotices[0]?.message).toContain('full Piano app')
    expect(courses.courses[0]?.id).toBe(course.id)
    expect(courseDetail.lessons[0]).toMatchObject({
      courseId: course.id,
      id: firstLesson.id,
    })
    expect(courseDetail.progressValue).toBe(0)
    expect(courseDetail.progressLabel).toContain('0 of')
    expect(lesson.completionActions[0]).toMatchObject({
      courseId: course.id,
      lessonId: firstLesson.id,
      completed: true,
    })
    expect(lesson.sections.length).toBeGreaterThan(0)

    expect(
      projectNativeCourse({ ...course, modules: [] }, undefined)
        .lessonEmptyStates,
    ).toHaveLength(1)
    expect(
      projectNativeLesson(
        course,
        firstLesson.id,
        { ...lessonSong, tutorial: undefined },
        undefined,
      ).guideEmptyStates,
    ).toHaveLength(1)
  })
})

describe('Piano NativeUI package boundary', () => {
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
