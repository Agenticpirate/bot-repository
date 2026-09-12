import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type AppCommand,
  AppFrameContent,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  useMoldableAppCommands,
  useMoldableCommands,
  useMoldableNavigationPop,
  useMoldablePlatform,
  useWorkspace,
} from '@moldable-ai/ui'
import { CourseView } from './components/course-view'
import { LibraryView } from './components/library-view'
import { type CourseContext, PracticeView } from './components/practice-view'
import {
  type PianoAudioSettings,
  type PianoInstrumentPack,
  type PianoSoundChoice,
  SPLENDID_GRAND_SAMPLE_SET_ID,
  type SongSoundSettingsResponse,
} from '../shared/audio'
import type { Folder } from '../shared/folder'
import {
  DEFAULT_SPLIT_MIDI,
  type PracticePart,
  noteMatchesPracticePart,
  suggestSplitMidi,
} from '../shared/practice-part'
import type {
  PianoSong,
  SongSummary,
  SongWorkspacePracticeSettings,
} from '../shared/song'
import { getSongDuration } from '../shared/song'
import {
  PIANO_PLAYBACK_HEARTBEAT_MS,
  type PianoPlaybackStatus,
  type PianoUiIntent,
  isExpiredPianoPlaybackFailure,
  isTerminalPianoPlayback,
} from '../shared/ui-intent'
import { PIANO_PRESETS, type PianoPresetId } from './audio-presets'
import { formatDuration } from './piano-utils'
import {
  type ActivePlaybackOwnership,
  canAdoptPersistedPlaybackLease,
  isCurrentPlaybackOwnership,
  playbackOwnershipAfterLoss,
  shouldCompletePlaybackOnRendererExit,
} from './playback-ownership'
import {
  findFirstNoteStartingAtOrAfter,
  sortNotesForPlayback,
} from './playback-performance'
import { createPlaybackTimeline } from './playback-timeline'
import { useAudioOptions } from './use-audio-options'
import { useCourses } from './use-courses'
import { useFolders } from './use-folders'
import { usePianoAudio } from './use-piano-audio'

interface SongsResponse {
  songsDir: string
  songs: SongSummary[]
}

interface AudioSettingsResponse {
  settings: PianoAudioSettings
}

interface LibraryRevisionResponse {
  revision: string
  updatedAt: string | null
  fileCount: number
}

interface SongWorkspaceSettingsResponse {
  settings: SongWorkspacePracticeSettings | null
  effective: {
    playbackSpeed: number
  }
}

function isPianoPresetId(value: string | undefined): value is PianoPresetId {
  return Boolean(value && PIANO_PRESETS.some((preset) => preset.id === value))
}

const APP_SOURCE_PATH = '~/.moldable/shared/apps/piano'
const INSTRUMENTS_STORAGE_PATH =
  '~/.moldable/workspaces/{workspace-id}/apps/piano/data/instruments'
const AUDIO_MODEL_PATH = `${APP_SOURCE_PATH}/src/shared/audio.ts`
const AUDIO_SCHEDULE_LOOKAHEAD_SECONDS = 0.12

type PlaybackStartResult =
  | { status: 'playing' }
  | { status: 'interaction-required' | 'failed'; message: string }

function songCommandDescription(song: SongSummary) {
  const credits = song.composer || song.artist || song.source
  const noteLabel = `${song.noteCount} ${song.noteCount === 1 ? 'note' : 'notes'}`
  const parts = [credits, formatDuration(song.duration), noteLabel]
    .filter(Boolean)
    .map(String)
  return parts.length > 0 ? `Open song • ${parts.join(' • ')}` : 'Open song'
}

export function App() {
  const platform = useMoldablePlatform()
  const isMobileWeb = platform === 'mobileWeb'
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const { folders, isLoading: foldersLoading } = useFolders()
  const cachedAudioSettings = queryClient.getQueryData<AudioSettingsResponse>([
    'audio-settings',
    workspaceId,
  ])?.settings
  const [presetId, setPresetId] = useState<PianoPresetId>(
    isPianoPresetId(cachedAudioSettings?.presetId)
      ? cachedAudioSettings.presetId
      : 'classic-grand',
  )
  const [activeSongId, setActiveSongId] = useState<string | null>(null)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null)
  const [activeCourseLessonId, setActiveCourseLessonId] = useState<
    string | null
  >(null)
  const [libraryTab, setLibraryTab] = useState<'library' | 'courses'>('library')
  const [cursor, setCursor] = useState(0)
  const [playbackTimeline] = useState(() => createPlaybackTimeline())
  const [practicePart, setPracticePart] = useState<PracticePart>('all')
  const [splitMidi, setSplitMidi] = useState(DEFAULT_SPLIT_MIDI)
  const [isPlaying, setIsPlaying] = useState(false)
  const isPlayingRef = useRef(isPlaying)
  const setPlaybackPlaying = useCallback((nextPlaying: boolean) => {
    isPlayingRef.current = nextPlaying
    setIsPlaying(nextPlaying)
  }, [])
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [songSoundLoadingLabel, setSongSoundLoadingLabel] = useState<
    string | null
  >(null)
  const [playbackNotice, setPlaybackNotice] = useState<string | null>(null)
  const playbackConsumerIdRef = useRef<string | null>(null)
  if (!playbackConsumerIdRef.current) {
    playbackConsumerIdRef.current = crypto.randomUUID()
  }
  const playbackConsumerId = playbackConsumerIdRef.current
  const activePlaybackOwnershipRef = useRef<ActivePlaybackOwnership | null>(
    null,
  )
  const startedVoicePlaybackRef = useRef<ActivePlaybackOwnership | null>(null)
  const settlingPlaybackAttemptIdRef = useRef<string | null>(null)
  const playbackClaimRetryRef = useRef<{
    intentId: string | null
    count: number
  }>({ intentId: null, count: 0 })
  const abandonedPlaybackAttemptIdsRef = useRef<Set<string>>(new Set())
  const playbackRecoveryIntentIdRef = useRef<string | null>(null)
  const checkUiIntentRef = useRef<() => Promise<void>>(async () => undefined)
  const uiIntentCheckTimerRef = useRef<number | null>(null)
  const recoverablePlaybackIntentRef = useRef<ActivePlaybackOwnership | null>(
    null,
  )

  const audioOptionsQuery = useAudioOptions()
  const instrumentPacks = useMemo(() => {
    const packs = audioOptionsQuery.data?.instrumentPacks ?? []
    return isMobileWeb
      ? packs.filter((pack) => pack.id === SPLENDID_GRAND_SAMPLE_SET_ID)
      : packs
  }, [audioOptionsQuery.data?.instrumentPacks, isMobileWeb])
  const [activePackId, setActivePackId] = useState<string | null>(
    isMobileWeb
      ? SPLENDID_GRAND_SAMPLE_SET_ID
      : (cachedAudioSettings?.instrumentPackId ?? SPLENDID_GRAND_SAMPLE_SET_ID),
  )
  const [activeInstrumentId, setActiveInstrumentId] = useState<string | null>(
    isMobileWeb
      ? SPLENDID_GRAND_SAMPLE_SET_ID
      : (cachedAudioSettings?.instrumentId ?? SPLENDID_GRAND_SAMPLE_SET_ID),
  )
  const [installingPackIds, setInstallingPackIds] = useState<Set<string>>(
    () => new Set(),
  )
  const audioSettingsQuery = useQuery({
    queryKey: ['audio-settings', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/audio/settings')
      if (!res.ok) throw new Error('Failed to load audio settings')
      return (await res.json()) as AudioSettingsResponse
    },
  })
  const activePack = useMemo<PianoInstrumentPack | null>(() => {
    return (
      instrumentPacks.find((pack) => pack.id === activePackId) ??
      instrumentPacks.find((pack) => pack.id === 'splendid-grand-piano') ??
      instrumentPacks.find((pack) => pack.status === 'installed') ??
      null
    )
  }, [activePackId, instrumentPacks])
  const activeInstrument = useMemo(() => {
    return (
      activePack?.instruments.find(
        (instrument) =>
          instrument.id === activeInstrumentId && instrument.playable,
      ) ??
      activePack?.instruments.find((instrument) => instrument.playable) ??
      null
    )
  }, [activeInstrumentId, activePack])
  const {
    loadState,
    playMidi,
    prepare,
    prewarm,
    resume,
    stopAll,
    getCurrentTime,
  } = usePianoAudio(
    presetId,
    activePack,
    activeInstrument?.id ?? null,
    fetchWithWorkspace,
  )

  const persistAudioSettings = useCallback(
    async (settings: Partial<PianoAudioSettings>) => {
      const res = await fetchWithWorkspace('/api/audio/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) return
      void queryClient.invalidateQueries({
        queryKey: ['audio-settings', workspaceId],
      })
    },
    [fetchWithWorkspace, queryClient, workspaceId],
  )

  const setActiveInstrumentChoice = useCallback(
    (
      packId: string,
      instrumentId: string,
      options: { persist?: boolean } = {},
    ) => {
      setActivePackId(packId)
      setActiveInstrumentId(instrumentId)
      if (options.persist !== false) {
        void persistAudioSettings({
          instrumentPackId: packId,
          instrumentId,
        })
      }
    },
    [persistAudioSettings],
  )

  useEffect(() => {
    const settings = queryClient.getQueryData<AudioSettingsResponse>([
      'audio-settings',
      workspaceId,
    ])?.settings
    setPresetId(
      isPianoPresetId(settings?.presetId) ? settings.presetId : 'classic-grand',
    )
    setActivePackId(
      isMobileWeb
        ? SPLENDID_GRAND_SAMPLE_SET_ID
        : (settings?.instrumentPackId ?? SPLENDID_GRAND_SAMPLE_SET_ID),
    )
    setActiveInstrumentId(
      isMobileWeb
        ? SPLENDID_GRAND_SAMPLE_SET_ID
        : (settings?.instrumentId ?? SPLENDID_GRAND_SAMPLE_SET_ID),
    )
  }, [isMobileWeb, queryClient, workspaceId])

  const persistSongSoundSettings = useCallback(
    async (
      songId: string,
      settings: {
        suggested?: PianoSoundChoice | null
        override?: PianoSoundChoice | null
      },
    ) => {
      const res = await fetchWithWorkspace(
        `/api/songs/${songId}/sound-settings`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        },
      )
      if (!res.ok) return
      void queryClient.invalidateQueries({
        queryKey: ['song-sound-settings', songId, workspaceId],
      })
    },
    [fetchWithWorkspace, queryClient, workspaceId],
  )

  const handleActiveInstrumentChange = useCallback(
    (packId: string, instrumentId: string) => {
      setActiveInstrumentChoice(packId, instrumentId, {
        persist: activeSongId ? false : undefined,
      })
      if (activeSongId) {
        void persistSongSoundSettings(activeSongId, {
          override: { instrumentPackId: packId, instrumentId },
        })
      }
    },
    [activeSongId, persistSongSoundSettings, setActiveInstrumentChoice],
  )

  const handlePresetChange = useCallback(
    (nextPresetId: PianoPresetId) => {
      setPresetId(nextPresetId)
      if (activeSongId) {
        void persistSongSoundSettings(activeSongId, {
          override: { presetId: nextPresetId },
        })
        return
      }
      void persistAudioSettings({ presetId: nextPresetId })
    },
    [activeSongId, persistAudioSettings, persistSongSoundSettings],
  )

  useEffect(() => {
    if (activeSongId) return
    const settings = audioSettingsQuery.data?.settings
    if (!settings) return
    if (isPianoPresetId(settings.presetId)) {
      setPresetId(settings.presetId)
    }
    if (!isMobileWeb) {
      setActiveInstrumentChoice(
        settings.instrumentPackId,
        settings.instrumentId,
        {
          persist: false,
        },
      )
    }
  }, [
    activeSongId,
    audioSettingsQuery.data?.settings,
    isMobileWeb,
    setActiveInstrumentChoice,
  ])

  useEffect(() => {
    if (!activeSongId && !audioSettingsQuery.data?.settings) return
    if (instrumentPacks.length === 0) return
    const current = instrumentPacks.find((pack) => pack.id === activePackId)
    if (
      current?.status === 'installed' &&
      current.instruments.some((instrument) => instrument.playable) &&
      current.instruments.some(
        (instrument) =>
          instrument.id === activeInstrumentId && instrument.playable,
      )
    ) {
      return
    }
    const fallbackPack =
      (current?.status === 'installed'
        ? current
        : instrumentPacks.find(
            (pack) =>
              pack.status === 'installed' &&
              pack.instruments.some((instrument) => instrument.playable),
          )) ??
      instrumentPacks[0] ??
      null
    const fallbackInstrument =
      fallbackPack?.instruments.find((instrument) => instrument.playable) ??
      null
    if (fallbackPack && fallbackInstrument) {
      setActiveInstrumentChoice(fallbackPack.id, fallbackInstrument.id, {
        persist: false,
      })
    }
  }, [
    activeInstrumentId,
    activePackId,
    activeSongId,
    audioSettingsQuery.data?.settings,
    instrumentPacks,
    setActiveInstrumentChoice,
  ])

  const handleInstallPack = useCallback(
    async (
      packId: string,
      options: { select?: boolean; persist?: boolean } = {},
    ) => {
      setInstallingPackIds((current) => new Set(current).add(packId))
      try {
        const res = await fetchWithWorkspace(
          `/api/audio/instrument-packs/${packId}/install`,
          { method: 'POST' },
        )
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(body?.error ?? 'Failed to install instrument pack')
        }
        const body = (await res.json()) as { pack: { id: string } }
        const installedPack = instrumentPacks.find(
          (pack) => pack.id === body.pack.id,
        )
        const defaultInstrument =
          installedPack?.instruments.find(
            (instrument) => instrument.playable,
          ) ?? null
        if (options.select !== false) {
          if (defaultInstrument) {
            setActiveInstrumentChoice(body.pack.id, defaultInstrument.id, {
              persist: options.persist,
            })
          } else {
            setActivePackId(body.pack.id)
          }
        }
        await queryClient.invalidateQueries({
          queryKey: ['audio-options', workspaceId],
        })
      } finally {
        setInstallingPackIds((current) => {
          const next = new Set(current)
          next.delete(packId)
          return next
        })
      }
    },
    [
      fetchWithWorkspace,
      instrumentPacks,
      queryClient,
      setActiveInstrumentChoice,
      workspaceId,
    ],
  )

  const automaticSongSoundInstallRef = useRef<Set<string>>(new Set())
  const playedNotesRef = useRef<Set<string>>(new Set())
  const rafRef = useRef<number | null>(null)
  const playStartCursorRef = useRef(0)
  const playStartPerformanceRef = useRef(0)
  const playStartAudioTimeRef = useRef<number | null>(null)
  const lastCursorRef = useRef(0)
  const commitCursor = useCallback(
    (nextCursor: number) => {
      const normalized = Number.isFinite(nextCursor)
        ? Math.max(0, nextCursor)
        : 0
      lastCursorRef.current = normalized
      playbackTimeline.setCursor(normalized)
      setCursor(normalized)
    },
    [playbackTimeline],
  )
  const lastLibraryRevisionRef = useRef<string | null>(null)
  const [playbackSpeed, setPlaybackSpeedState] = useState(1)
  const playbackSpeedRef = useRef(1)

  const setPlaybackSpeed = useCallback(
    (nextSpeed: number) => {
      const clamped = Math.max(0.1, Math.min(2, nextSpeed))
      setPlaybackSpeedState(clamped)
      // Re-anchor the playback origin so the cursor doesn't jump when speed changes.
      if (playStartPerformanceRef.current !== 0) {
        playStartCursorRef.current = lastCursorRef.current
        playStartPerformanceRef.current = performance.now()
        playStartAudioTimeRef.current = getCurrentTime()
      }
      playbackSpeedRef.current = clamped

      if (activeSongId) {
        void fetchWithWorkspace(
          `/api/songs/${activeSongId}/workspace-settings`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playbackSpeed: clamped }),
          },
        )
          .then((res) => {
            if (!res.ok) throw new Error('Failed to save playback speed')
            return queryClient.invalidateQueries({
              queryKey: ['song-workspace-settings', activeSongId, workspaceId],
            })
          })
          .catch((error) => {
            console.error('Failed to save playback speed', error)
          })
      }
    },
    [
      activeSongId,
      fetchWithWorkspace,
      getCurrentTime,
      queryClient,
      workspaceId,
    ],
  )

  const songsQuery = useQuery({
    queryKey: ['songs', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/songs')
      if (!res.ok) throw new Error('Failed to load songs')
      return (await res.json()) as SongsResponse
    },
  })

  const libraryRevisionQuery = useQuery({
    queryKey: ['library-revision', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/library/revision')
      if (!res.ok) throw new Error('Failed to load library revision')
      return (await res.json()) as LibraryRevisionResponse
    },
    refetchInterval: 2500,
    refetchIntervalInBackground: true,
  })

  const songQuery = useQuery({
    queryKey: ['song', activeSongId, workspaceId],
    enabled: Boolean(activeSongId),
    queryFn: async () => {
      const res = await fetchWithWorkspace(`/api/songs/${activeSongId}`)
      if (!res.ok) throw new Error('Failed to load song')
      return (await res.json()) as PianoSong
    },
    // Keep the previous song visible while the next one is fetching so the
    // PracticeView doesn't unmount between lessons.
    placeholderData: keepPreviousData,
  })

  const songSoundSettingsQuery = useQuery({
    queryKey: ['song-sound-settings', activeSongId, workspaceId],
    enabled: Boolean(activeSongId),
    queryFn: async () => {
      const res = await fetchWithWorkspace(
        `/api/songs/${activeSongId}/sound-settings`,
      )
      if (!res.ok) throw new Error('Failed to load song sound settings')
      return (await res.json()) as SongSoundSettingsResponse
    },
  })

  const songWorkspaceSettingsQuery = useQuery({
    queryKey: ['song-workspace-settings', activeSongId, workspaceId],
    enabled: Boolean(activeSongId),
    queryFn: async () => {
      const res = await fetchWithWorkspace(
        `/api/songs/${activeSongId}/workspace-settings`,
      )
      if (!res.ok) throw new Error('Failed to load song workspace settings')
      return (await res.json()) as SongWorkspaceSettingsResponse
    },
  })

  useEffect(() => {
    if (!activeSongId || !songWorkspaceSettingsQuery.data) return
    const nextSpeed = songWorkspaceSettingsQuery.data.effective.playbackSpeed
    setPlaybackSpeedState(nextSpeed)
    playbackSpeedRef.current = nextSpeed
    if (playStartPerformanceRef.current !== 0) {
      playStartCursorRef.current = lastCursorRef.current
      playStartPerformanceRef.current = performance.now()
      playStartAudioTimeRef.current = getCurrentTime()
    }
  }, [activeSongId, getCurrentTime, songWorkspaceSettingsQuery.data])

  // Fetch all songs as full data for the library mini-previews
  const songPreviewQueries = useQuery({
    queryKey: [
      'song-previews',
      workspaceId,
      songsQuery.data?.songs.map((s) => s.id).join(','),
    ],
    enabled: Boolean(songsQuery.data?.songs.length),
    queryFn: async () => {
      const ids = songsQuery.data?.songs.map((s) => s.id) ?? []
      const previews = await Promise.all(
        ids.map(async (id): Promise<[string, PianoSong['notes']]> => {
          const res = await fetchWithWorkspace(`/api/songs/${id}`)
          if (!res.ok) return [id, []]
          const song = (await res.json()) as PianoSong
          return [id, song.notes.slice(0, 32)]
        }),
      )
      return new Map(previews)
    },
  })

  const notePreviewBySong = useMemo(
    () => songPreviewQueries.data ?? new Map<string, PianoSong['notes']>(),
    [songPreviewQueries.data],
  )

  useEffect(() => {
    const revision = libraryRevisionQuery.data?.revision
    if (!revision) return
    if (lastLibraryRevisionRef.current === null) {
      lastLibraryRevisionRef.current = revision
      return
    }
    if (lastLibraryRevisionRef.current === revision) return
    lastLibraryRevisionRef.current = revision

    void queryClient.invalidateQueries({ queryKey: ['songs', workspaceId] })
    void queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] })
    void queryClient.invalidateQueries({
      queryKey: ['song-previews', workspaceId],
    })
    if (activeSongId) {
      void queryClient.invalidateQueries({
        queryKey: ['song', activeSongId, workspaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['song-sound-settings', activeSongId, workspaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['song-workspace-settings', activeSongId, workspaceId],
      })
    }
  }, [
    activeSongId,
    libraryRevisionQuery.data?.revision,
    queryClient,
    workspaceId,
  ])

  const song = songQuery.data ?? null
  const loadedSongId = song?.id ?? null
  const duration = song ? getSongDuration(song) : 0
  const isSelectedSongSoundReady = useMemo(() => {
    const effective = songSoundSettingsQuery.data?.effective
    if (!effective) return songSoundSettingsQuery.isError

    const presetReady =
      !effective.presetId ||
      !isPianoPresetId(effective.presetId) ||
      presetId === effective.presetId
    const requestedPack = effective.instrumentPackId
      ? instrumentPacks.find(
          (candidate) => candidate.id === effective.instrumentPackId,
        )
      : null
    const installedInstrumentReady =
      !requestedPack ||
      requestedPack.status !== 'installed' ||
      (activePackId === requestedPack.id &&
        (!effective.instrumentId ||
          activeInstrument?.id === effective.instrumentId ||
          requestedPack.instruments.every(
            (candidate) =>
              candidate.id !== effective.instrumentId || !candidate.playable,
          )))
    return presetReady && installedInstrumentReady
  }, [
    activeInstrument?.id,
    activePackId,
    instrumentPacks,
    presetId,
    songSoundSettingsQuery.data?.effective,
    songSoundSettingsQuery.isError,
  ])
  const activeFolder = useMemo(
    () =>
      activeFolderId
        ? (folders.find((folder) => folder.id === activeFolderId) ?? null)
        : null,
    [activeFolderId, folders],
  )
  const practiceNotes = useMemo(() => {
    if (!song) return []
    const selectedNotes =
      practicePart === 'all'
        ? song.notes
        : song.notes.filter((note) =>
            noteMatchesPracticePart(note, practicePart, splitMidi),
          )
    return sortNotesForPlayback(selectedNotes)
  }, [practicePart, song, splitMidi])
  const suggestedSplitMidi = useMemo(() => {
    if (!song) return DEFAULT_SPLIT_MIDI
    return suggestSplitMidi(song.notes)
  }, [song])
  const songSplitMidi = song?.practiceSettings?.splitMidi ?? DEFAULT_SPLIT_MIDI

  useEffect(() => {
    if (!activeSongId) {
      setSongSoundLoadingLabel(null)
      return
    }
    const effective = songSoundSettingsQuery.data?.effective
    if (!effective) return

    if (
      isPianoPresetId(effective.presetId) &&
      presetId !== effective.presetId
    ) {
      setPresetId(effective.presetId)
    }

    if (!effective.instrumentPackId || !effective.instrumentId) return
    const pack = instrumentPacks.find(
      (candidate) => candidate.id === effective.instrumentPackId,
    )
    if (!pack) return

    if (pack.status !== 'installed') {
      if (
        pack.download.enabled &&
        pack.downloadUrl &&
        !installingPackIds.has(pack.id) &&
        !automaticSongSoundInstallRef.current.has(pack.id)
      ) {
        automaticSongSoundInstallRef.current.add(pack.id)
        setSongSoundLoadingLabel(`Installing suggested piano · ${pack.name}…`)
        void handleInstallPack(pack.id, { select: false, persist: false })
          .catch((error) => {
            setSongSoundLoadingLabel(
              error instanceof Error
                ? error.message
                : `Could not install ${pack.name}`,
            )
          })
          .finally(() => {
            automaticSongSoundInstallRef.current.delete(pack.id)
            setTimeout(() => setSongSoundLoadingLabel(null), 1200)
          })
      }
      return
    }

    const instrument =
      pack.instruments.find(
        (candidate) =>
          candidate.id === effective.instrumentId && candidate.playable,
      ) ?? pack.instruments.find((candidate) => candidate.playable)
    if (!instrument) return

    if (activePackId !== pack.id || activeInstrumentId !== instrument.id) {
      setActiveInstrumentChoice(pack.id, instrument.id, { persist: false })
    }
    setSongSoundLoadingLabel(null)
  }, [
    activeInstrumentId,
    activePackId,
    activeSongId,
    handleInstallPack,
    installingPackIds,
    instrumentPacks,
    presetId,
    setActiveInstrumentChoice,
    songSoundSettingsQuery.data?.effective,
  ])

  const chatInstructions = useMemo(() => {
    const downloadablePacks = instrumentPacks
      .filter((pack) => pack.download.enabled && pack.downloadUrl)
      .map((pack) => `${pack.name} (${pack.id}) -> ${pack.downloadUrl}`)
      .join('; ')
    const songsFolder =
      songsQuery.data?.songsDir ?? 'the Piano app data songs folder'
    const currentFolderContext = activeFolder
      ? `Current folder: "${activeFolder.name}" (id ${activeFolder.id}). If creating a song in the current folder, prefer Piano RPC methods such as piano.songs.upsert, piano.songs.patch, piano.songs.upsertFromFile, or piano.songs.patchFromFile and assign folderId ${activeFolder.id}. For large generated songs, write a temporary JSON payload outside the songs folder and call piano.songs.upsertFromFile or piano.songs.patchFromFile so the app validates and persists once.`
      : `Current folder: Library root (no folder is open). If creating a song in the current folder, prefer Piano RPC methods such as piano.songs.upsert, piano.songs.patch, piano.songs.upsertFromFile, or piano.songs.patchFromFile and do not add it to any folder unless the user names one. For large generated songs, write a temporary JSON payload outside the songs folder and call piano.songs.upsertFromFile or piano.songs.patchFromFile so the app validates and persists once.`
    const songContext = song
      ? `The user is practicing ${song.title}. Song JSON files are stored in ${songsFolder}. Current cursor: ${formatDuration(cursor)} of ${formatDuration(duration)}. ${currentFolderContext}`
      : `The user is browsing the Piano app library. ${currentFolderContext}`

    return `${songContext}

If the user asks to install a piano instrument pack, do not use shell curl/wget. Prefer the app installer endpoint: POST /api/audio/instrument-packs/{pack-id}/install. The app installs packs under ${INSTRUMENTS_STORAGE_PATH}/{pack-id} and then GET /api/audio/options reflects installed status from the local manifest. Playable SFZ instruments expose GET /api/audio/instrument-packs/{pack-id}/instruments/{instrument-id}/preset for the browser sampler. Use only packs returned by GET /api/audio/options with download.enabled=true and a direct downloadUrl. Current downloadable packs: ${downloadablePacks || 'none'}. Preserve license/attribution files. If changing code, run pnpm check-types, pnpm lint, pnpm test, and pnpm build from ${APP_SOURCE_PATH}. Reference model: ${AUDIO_MODEL_PATH}.`
  }, [
    activeFolder,
    cursor,
    duration,
    instrumentPacks,
    song,
    songsQuery.data?.songsDir,
  ])

  useEffect(() => {
    commitCursor(0)
    setPlaybackSpeedState(1)
    playbackSpeedRef.current = 1
    setPlaybackPlaying(false)
    playedNotesRef.current = new Set()
    playStartPerformanceRef.current = 0
    playStartAudioTimeRef.current = null
  }, [activeSongId, commitCursor, setPlaybackPlaying])

  useEffect(() => {
    if (!loadedSongId) return
    setSplitMidi(songSplitMidi)
    playedNotesRef.current = new Set()
  }, [loadedSongId, songSplitMidi])

  useEffect(() => {
    stopAll()
    commitCursor(lastCursorRef.current)
    setPlaybackPlaying(false)
  }, [
    activeInstrument?.id,
    activePackId,
    commitCursor,
    setPlaybackPlaying,
    stopAll,
  ])

  const resetPlayedNotesForPart = useCallback(
    (nextPart: PracticePart, nextSplitMidi: number) => {
      if (!song) {
        playedNotesRef.current = new Set()
        return
      }
      const currentCursor = lastCursorRef.current
      playedNotesRef.current = new Set(
        song.notes
          .filter(
            (note) =>
              noteMatchesPracticePart(note, nextPart, nextSplitMidi) &&
              note.start + note.duration < currentCursor,
          )
          .map((note) => note.id),
      )
    },
    [song],
  )

  const handlePracticePartChange = useCallback(
    (nextPart: PracticePart) => {
      setPracticePart(nextPart)
      stopAll()
      resetPlayedNotesForPart(nextPart, splitMidi)
    },
    [resetPlayedNotesForPart, splitMidi, stopAll],
  )

  const handleSplitMidiChange = useCallback(
    (nextSplitMidi: number) => {
      const bounded = Math.max(21, Math.min(108, nextSplitMidi))
      setSplitMidi(bounded)
      stopAll()
      resetPlayedNotesForPart(practicePart, bounded)
      if (isPlaying) {
        const currentCursor = lastCursorRef.current
        stopAll()
        playStartCursorRef.current = currentCursor
        playStartPerformanceRef.current = performance.now()
        playStartAudioTimeRef.current = getCurrentTime()
      }
      if (activeSongId) {
        void fetchWithWorkspace(
          `/api/songs/${activeSongId}/practice-settings`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ splitMidi: bounded }),
          },
        )
          .then((res) => {
            if (!res.ok) throw new Error('Failed to save split note')
            return queryClient.invalidateQueries({
              queryKey: ['song', activeSongId, workspaceId],
            })
          })
          .catch((error) => {
            console.error('Failed to save split note', error)
          })
      }
    },
    [
      activeSongId,
      fetchWithWorkspace,
      getCurrentTime,
      isPlaying,
      practicePart,
      queryClient,
      resetPlayedNotesForPart,
      stopAll,
      workspaceId,
    ],
  )

  useEffect(() => {
    window.parent.postMessage(
      {
        type: 'moldable:set-chat-instructions',
        text: chatInstructions,
      },
      '*',
    )
  }, [chatInstructions])

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  useEffect(() => {
    if (activeSongId) return
    if (audioOptionsQuery.isLoading || audioSettingsQuery.isLoading) return
    void prewarm().catch(() => undefined)
  }, [
    activeSongId,
    audioOptionsQuery.isLoading,
    audioSettingsQuery.isLoading,
    prewarm,
  ])

  const reportPlaybackIntent = useCallback(
    async (
      intentId: string,
      attemptId: string,
      status: Extract<
        PianoPlaybackStatus,
        'playing' | 'completed' | 'interaction-required' | 'failed'
      >,
      message?: string,
    ) => {
      const response = await fetchWithWorkspace(
        `/api/moldable/ui-intent/${encodeURIComponent(intentId)}/playback`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            consumerId: playbackConsumerId,
            status,
            message,
          }),
        },
      )
      if (!response.ok) {
        throw new Error('Could not persist Piano playback status.')
      }
    },
    [fetchWithWorkspace, playbackConsumerId],
  )

  const completePlaybackOwnership = useCallback(
    async (
      ownership: ActivePlaybackOwnership,
      options: { keepalive?: boolean } = {},
    ) => {
      if (settlingPlaybackAttemptIdRef.current === ownership.attemptId) return
      settlingPlaybackAttemptIdRef.current = ownership.attemptId
      try {
        const response = await fetchWithWorkspace(
          `/api/moldable/ui-intent/${encodeURIComponent(ownership.intentId)}/playback`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attemptId: ownership.attemptId,
              consumerId: ownership.consumerId,
              status: 'completed',
            }),
            keepalive: options.keepalive,
          },
        )
        if (!response.ok) {
          throw new Error('Could not settle Piano playback status.')
        }
        if (
          activePlaybackOwnershipRef.current?.attemptId === ownership.attemptId
        ) {
          activePlaybackOwnershipRef.current = null
        }
        if (
          startedVoicePlaybackRef.current?.attemptId === ownership.attemptId
        ) {
          startedVoicePlaybackRef.current = null
        }
      } finally {
        if (settlingPlaybackAttemptIdRef.current === ownership.attemptId) {
          settlingPlaybackAttemptIdRef.current = null
        }
      }
    },
    [fetchWithWorkspace],
  )

  const releasePlaybackOwnership = useCallback(
    (
      ownership: ActivePlaybackOwnership | null,
      options: { keepalive?: boolean } = {},
    ) => {
      if (!ownership) return
      if (
        activePlaybackOwnershipRef.current?.attemptId === ownership.attemptId
      ) {
        activePlaybackOwnershipRef.current = null
      }
      if (
        recoverablePlaybackIntentRef.current?.attemptId === ownership.attemptId
      ) {
        recoverablePlaybackIntentRef.current = null
      }
      if (startedVoicePlaybackRef.current?.attemptId === ownership.attemptId) {
        startedVoicePlaybackRef.current = null
      }
      stopAll()
      void fetchWithWorkspace(
        `/api/moldable/ui-intent/${encodeURIComponent(ownership.intentId)}/release-playback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId: ownership.attemptId,
            consumerId: ownership.consumerId,
          }),
          keepalive: options.keepalive,
        },
      ).catch(() => undefined)
    },
    [fetchWithWorkspace, stopAll],
  )

  const scheduleUiIntentCheck = useCallback((delayMs: number) => {
    if (uiIntentCheckTimerRef.current !== null) {
      window.clearTimeout(uiIntentCheckTimerRef.current)
    }
    uiIntentCheckTimerRef.current = window.setTimeout(() => {
      uiIntentCheckTimerRef.current = null
      void checkUiIntentRef.current()
    }, delayMs)
  }, [])

  useEffect(
    () => () => {
      if (uiIntentCheckTimerRef.current !== null) {
        window.clearTimeout(uiIntentCheckTimerRef.current)
      }
    },
    [],
  )

  const abandonPlaybackOwnership = useCallback(
    (ownership: ActivePlaybackOwnership) => {
      const afterLoss = playbackOwnershipAfterLoss(
        {
          active: activePlaybackOwnershipRef.current,
          recoverable: recoverablePlaybackIntentRef.current,
          started: startedVoicePlaybackRef.current,
          abandonedAttemptIds: abandonedPlaybackAttemptIdsRef.current,
        },
        ownership,
      )
      activePlaybackOwnershipRef.current = afterLoss.active
      recoverablePlaybackIntentRef.current = afterLoss.recoverable
      startedVoicePlaybackRef.current = afterLoss.started
      abandonedPlaybackAttemptIdsRef.current = new Set(
        afterLoss.abandonedAttemptIds,
      )
      // Clear "started" ownership before flipping isPlaying. Otherwise the
      // stopped-renderer effect could falsely mark this cut-off attempt
      // completed, and the next GET could zombie-adopt its silent lease.
      playbackRecoveryIntentIdRef.current = ownership.intentId
      startedPlaybackIntentIdsRef.current.delete(ownership.intentId)
      seenUiIntentIdsRef.current.delete(ownership.intentId)
      stopAll()
      commitCursor(lastCursorRef.current)
      setPlaybackPlaying(false)
      releasePlaybackOwnership(ownership, { keepalive: true })
    },
    [commitCursor, releasePlaybackOwnership, setPlaybackPlaying, stopAll],
  )

  const completeStoppedPlaybackOrRecover = useCallback(
    async (ownership: ActivePlaybackOwnership) => {
      try {
        await completePlaybackOwnership(ownership, { keepalive: true })
      } catch {
        if (
          !isPlayingRef.current &&
          isCurrentPlaybackOwnership(
            ownership,
            activePlaybackOwnershipRef.current,
            abandonedPlaybackAttemptIdsRef.current,
          ) &&
          startedVoicePlaybackRef.current?.attemptId === ownership.attemptId
        ) {
          abandonPlaybackOwnership(ownership)
          scheduleUiIntentCheck(250)
        }
      }
    },
    [
      abandonPlaybackOwnership,
      completePlaybackOwnership,
      scheduleUiIntentCheck,
    ],
  )

  useEffect(() => {
    if (isPlaying) return
    const ownership = startedVoicePlaybackRef.current
    if (!ownership) return
    let cancelled = false
    let retryTimer: number | null = null
    const settle = async () => {
      try {
        await completePlaybackOwnership(ownership, { keepalive: true })
      } catch {
        if (
          cancelled ||
          isPlayingRef.current ||
          !isCurrentPlaybackOwnership(
            ownership,
            activePlaybackOwnershipRef.current,
            abandonedPlaybackAttemptIdsRef.current,
          ) ||
          startedVoicePlaybackRef.current?.attemptId !== ownership.attemptId
        ) {
          return
        }
        retryTimer = window.setTimeout(() => void settle(), 500)
      }
    }
    void settle()
    return () => {
      cancelled = true
      if (retryTimer !== null) window.clearTimeout(retryTimer)
    }
  }, [completePlaybackOwnership, isPlaying])

  const startPlayback = useCallback(
    async (
      options: { restart?: boolean; canStart?: () => boolean } = {},
    ): Promise<PlaybackStartResult> => {
      if (!song) {
        return {
          status: 'failed',
          message: 'The requested song is not ready.',
        }
      }
      // Clear stale scheduled notes before starting. Server restarts can leave
      // the browser audio graph alive, so each play gets one fresh scheduler
      // anchor after the selected song and instrument are both ready.
      stopAll()
      try {
        const preparation = await prepare()
        if (preparation.status !== 'ready') {
          setPlaybackNotice(preparation.message)
          return preparation
        }
        if (options.canStart && !options.canStart()) {
          stopAll()
          return {
            status: 'failed',
            message: 'Playback moved to the active Piano window.',
          }
        }
        const currentCursor = playbackTimeline.getCursor()
        const startCursor =
          options.restart || currentCursor >= duration - 0.05
            ? 0
            : currentCursor
        commitCursor(startCursor)
        playedNotesRef.current = new Set(
          practiceNotes
            .filter((note) => note.start + note.duration < startCursor)
            .map((note) => note.id),
        )
        playStartCursorRef.current = startCursor
        playStartPerformanceRef.current = performance.now()
        playStartAudioTimeRef.current = getCurrentTime()
        setPlaybackNotice(null)
        setPlaybackPlaying(true)
        return { status: 'playing' }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Piano could not prepare audio playback.'
        setPlaybackNotice(message)
        return { status: 'failed', message }
      }
    },
    [
      commitCursor,
      duration,
      getCurrentTime,
      playbackTimeline,
      practiceNotes,
      prepare,
      setPlaybackPlaying,
      song,
      stopAll,
    ],
  )

  const pausePlayback = useCallback(() => {
    commitCursor(lastCursorRef.current)
    setPlaybackPlaying(false)
    stopAll()
    playStartPerformanceRef.current = 0
    playStartAudioTimeRef.current = null
  }, [commitCursor, setPlaybackPlaying, stopAll])

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pausePlayback()
    } else {
      void startPlayback().then((result) => {
        const pending = recoverablePlaybackIntentRef.current
        if (!pending || result.status !== 'playing') return
        recoverablePlaybackIntentRef.current = null
        void reportPlaybackIntent(
          pending.intentId,
          pending.attemptId,
          'playing',
        )
          .then(() => {
            if (
              !isCurrentPlaybackOwnership(
                pending,
                activePlaybackOwnershipRef.current,
                abandonedPlaybackAttemptIdsRef.current,
              )
            ) {
              return
            }
            startedVoicePlaybackRef.current = pending
            if (!isPlayingRef.current) {
              void completeStoppedPlaybackOrRecover(pending)
            }
          })
          .catch(() => {
            if (
              activePlaybackOwnershipRef.current?.attemptId ===
              pending.attemptId
            ) {
              abandonPlaybackOwnership(pending)
              scheduleUiIntentCheck(250)
            }
          })
      })
    }
  }, [
    abandonPlaybackOwnership,
    completeStoppedPlaybackOrRecover,
    isPlaying,
    pausePlayback,
    reportPlaybackIntent,
    scheduleUiIntentCheck,
    startPlayback,
  ])

  const restartPlayback = useCallback(() => {
    setPlaybackPlaying(false)
    stopAll()
    commitCursor(0)
    playedNotesRef.current = new Set()
    playStartPerformanceRef.current = 0
    playStartAudioTimeRef.current = null
  }, [commitCursor, setPlaybackPlaying, stopAll])

  const seekTo = useCallback(
    (nextCursor: number) => {
      const bounded = Math.min(Math.max(nextCursor, 0), duration)
      commitCursor(bounded)
      if (song) {
        playedNotesRef.current = new Set(
          practiceNotes
            .filter((note) => note.start + note.duration < bounded)
            .map((note) => note.id),
        )
      }
      if (isPlaying) {
        stopAll()
        playStartCursorRef.current = bounded
        playStartPerformanceRef.current = performance.now()
        playStartAudioTimeRef.current = getCurrentTime()
      }
    },
    [
      commitCursor,
      duration,
      getCurrentTime,
      isPlaying,
      practiceNotes,
      song,
      stopAll,
    ],
  )

  const startScrubbing = useCallback(() => {
    setIsScrubbing(true)
    stopAll()
  }, [stopAll])

  const endScrubbing = useCallback(
    (nextCursor: number) => {
      seekTo(nextCursor)
      setIsScrubbing(false)
    },
    [seekTo],
  )

  useEffect(() => {
    if (!isPlaying || !song || isScrubbing) return

    const tick = () => {
      const speed = playbackSpeedRef.current
      const audioNow = getCurrentTime()
      const audioStart = playStartAudioTimeRef.current
      const elapsed =
        audioNow !== null && audioStart !== null
          ? Math.max(0, audioNow - audioStart)
          : Math.max(
              0,
              (performance.now() - playStartPerformanceRef.current) / 1000,
            )
      const nextCursor = Math.min(
        duration,
        playStartCursorRef.current + elapsed * speed,
      )
      const previousCursor = lastCursorRef.current
      const audioLookahead = AUDIO_SCHEDULE_LOOKAHEAD_SECONDS * speed

      // Pre-encoded pause points on the song (e.g. tutorial section
      // audio-end times) — tutorials always carry these now, so we use them
      // directly without any fallback.
      const pausePoints = song.pausePoints ?? []
      let scheduleCap = nextCursor + audioLookahead
      let pauseAtBoundary: number | null = null
      for (const boundary of pausePoints) {
        if (boundary <= previousCursor) continue
        if (boundary > nextCursor + audioLookahead) break
        scheduleCap = Math.min(scheduleCap, boundary)
        if (boundary <= nextCursor) pauseAtBoundary = boundary
        break
      }

      const firstScheduledNoteIndex = findFirstNoteStartingAtOrAfter(
        practiceNotes,
        previousCursor - 0.02,
      )
      for (
        let noteIndex = firstScheduledNoteIndex;
        noteIndex < practiceNotes.length;
        noteIndex += 1
      ) {
        const note = practiceNotes[noteIndex]
        if (note.start >= scheduleCap) break
        if (playedNotesRef.current.has(note.id)) continue
        // Note.start strictly less-than the cap: a note that starts exactly at
        // a section boundary belongs to the next section and should wait.
        const musicDelay = Math.max(0, note.start - nextCursor)
        // Audio delay/duration are in wall-clock seconds, so divide by speed.
        playMidi(
          note.midi,
          note.duration / speed,
          note.velocity,
          musicDelay / speed,
        )
        playedNotesRef.current.add(note.id)
      }

      if (pauseAtBoundary !== null) {
        // Rewind cursor to the start of the section that just played, so
        // the user can read its content and hit Play again to re-listen
        // (or click the next section to advance). Look up the section by
        // RANGE (since the pause point is now an audio-end time, not the
        // nominal section.end) so we still find the right section.
        const justFinished = (song.tutorial?.sections ?? []).find(
          (section) =>
            pauseAtBoundary >= section.start &&
            pauseAtBoundary <= section.end + 0.001,
        )
        const rewindTarget = justFinished?.start ?? pauseAtBoundary
        commitCursor(rewindTarget)
        if (justFinished) {
          // Allow the section's notes to play again on the next Play.
          for (const note of practiceNotes) {
            if (note.start >= justFinished.start) {
              playedNotesRef.current.delete(note.id)
            }
          }
        }
        setPlaybackPlaying(false)
        playStartPerformanceRef.current = 0
        playStartAudioTimeRef.current = null
        return
      }

      if (nextCursor >= duration) {
        const tutorialSections = song.tutorial?.sections ?? []
        const finalSection = tutorialSections[tutorialSections.length - 1]
        if (finalSection && previousCursor >= finalSection.start - 0.02) {
          commitCursor(finalSection.start)
          // Let the last section replay immediately, matching earlier
          // tutorial section pauses.
          for (const note of practiceNotes) {
            if (note.start >= finalSection.start) {
              playedNotesRef.current.delete(note.id)
            }
          }
          setPlaybackPlaying(false)
          playStartPerformanceRef.current = 0
          playStartAudioTimeRef.current = null
          return
        }

        commitCursor(nextCursor)
        setPlaybackPlaying(false)
        playStartPerformanceRef.current = 0
        playStartAudioTimeRef.current = null
        return
      }

      lastCursorRef.current = nextCursor
      playbackTimeline.setCursor(nextCursor)

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [
    commitCursor,
    duration,
    getCurrentTime,
    isPlaying,
    isScrubbing,
    playbackTimeline,
    playMidi,
    practiceNotes,
    setPlaybackPlaying,
    song,
  ])

  const previewKey = useCallback(
    async (midi: number) => {
      await resume()
      await prepare()
      playMidi(midi, 0.45, 0.65)
    },
    [playMidi, prepare, resume],
  )

  // Lesson breadcrumb: every Continue pushes the previous (lesson, song)
  // pair so the Moldable back button unwinds through prior lessons before
  // returning to the course outline. Declared before closeSong so the
  // closure can safely reference it.
  const lessonHistoryRef = useRef<Array<{ lessonId: string; songId: string }>>(
    [],
  )

  const closeSong = useCallback(
    (sync: 'pop' | 'none' = 'pop') => {
      if (sync === 'pop') popMoldableNavigation()
      setPlaybackPlaying(false)
      stopAll()
      setPlaybackNotice(null)
      recoverablePlaybackIntentRef.current = null
      commitCursor(0)
      setActiveSongId(null)
      // Reaching here means we exited the lesson without going to the previous
      // one — the breadcrumb is no longer relevant.
      lessonHistoryRef.current = []
    },
    [commitCursor, setPlaybackPlaying, stopAll],
  )

  const closeFolder = useCallback((sync: 'pop' | 'none' = 'pop') => {
    if (sync === 'pop') popMoldableNavigation()
    setActiveFolderId(null)
  }, [])

  const openFolder = useCallback((folder: Folder) => {
    pushMoldableNavigation({
      id: `folder:${folder.id}`,
      title: folder.name,
    })
    setActiveFolderId(folder.id)
  }, [])

  const openSong = useCallback((nextSong: SongSummary) => {
    pushMoldableNavigation({
      id: `song:${nextSong.id}`,
      title: nextSong.title,
    })
    setActiveSongId(nextSong.id)
  }, [])

  const openCourse = useCallback((courseId: string) => {
    pushMoldableNavigation({
      id: `course:${courseId}`,
      title: 'Course',
    })
    setActiveCourseId(courseId)
    setLibraryTab('courses')
  }, [])

  const closeCourse = useCallback((sync: 'pop' | 'none' = 'pop') => {
    if (sync === 'pop') popMoldableNavigation()
    setActiveCourseId(null)
    setActiveCourseLessonId(null)
  }, [])

  const openLessonFromCourse = useCallback(
    (lessonId: string, songId: string, courseId: string) => {
      const continuingWithinSameCourse =
        activeSongId !== null &&
        activeCourseId === courseId &&
        activeCourseLessonId !== null &&
        activeCourseLessonId !== lessonId
      if (continuingWithinSameCourse && activeCourseLessonId && activeSongId) {
        lessonHistoryRef.current.push({
          lessonId: activeCourseLessonId,
          songId: activeSongId,
        })
      }
      pushMoldableNavigation({
        id: `song:${songId}`,
        title: 'Lesson',
      })
      setActiveCourseId(courseId)
      setActiveCourseLessonId(lessonId)
      setActiveSongId(songId)
      setLibraryTab('courses')
      void fetchWithWorkspace(`/api/courses/${courseId}/current`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      })
    },
    [activeCourseId, activeCourseLessonId, activeSongId, fetchWithWorkspace],
  )

  const openSongFromCommand = useCallback(
    (songId: string, folderId?: string) => {
      const nextSong = songsQuery.data?.songs.find((item) => item.id === songId)
      if (!nextSong || nextSong.id === activeSongId) return

      resetMoldableNavigation()
      const originFolder = folderId
        ? folders.find((folder) => folder.id === folderId)
        : undefined
      if (originFolder) {
        pushMoldableNavigation({
          id: `folder:${originFolder.id}`,
          title: originFolder.name,
        })
      }
      pushMoldableNavigation({
        id: `song:${nextSong.id}`,
        title: nextSong.title,
      })
      setPlaybackPlaying(false)
      stopAll()
      setPlaybackNotice(null)
      recoverablePlaybackIntentRef.current = null
      commitCursor(0)
      setActiveFolderId(originFolder?.id ?? null)
      setActiveCourseId(null)
      setActiveCourseLessonId(null)
      lessonHistoryRef.current = []
      setLibraryTab('library')
      setActiveSongId(nextSong.id)
    },
    [
      activeSongId,
      commitCursor,
      folders,
      setPlaybackPlaying,
      songsQuery.data?.songs,
      stopAll,
    ],
  )

  const pianoCommands = useMemo<AppCommand[]>(() => {
    const songs = songsQuery.data?.songs ?? []
    return songs
      .filter((entry) => entry.id !== activeSongId)
      .map((entry) => ({
        id: `piano.open-song.${entry.id}`,
        label: entry.title,
        description: songCommandDescription(entry),
        icon: '🎵',
        indicator: entry.isTutorial
          ? {
              label: 'Tutorial',
              color: 'var(--primary)',
            }
          : undefined,
        group: 'Songs',
        action: {
          type: 'message',
          command: 'piano.open-song',
          payload: { songId: entry.id },
        },
      }))
  }, [activeSongId, songsQuery.data?.songs])

  useMoldableAppCommands('piano', pianoCommands)
  useMoldableCommands({
    'piano.open-song': (payload?: unknown) => {
      if (!payload || typeof payload !== 'object') return
      const songId = (payload as { songId?: unknown }).songId
      if (typeof songId !== 'string') return
      openSongFromCommand(songId)
    },
  })

  useMoldableNavigationPop(() => {
    if (activeSongId) {
      // If we're inside a course lesson with prior lessons in the breadcrumb,
      // pop to the previous lesson instead of all the way back to the outline.
      if (activeCourseId && lessonHistoryRef.current.length > 0) {
        const previous = lessonHistoryRef.current.pop()
        if (previous) {
          setPlaybackPlaying(false)
          stopAll()
          commitCursor(0)
          setActiveCourseLessonId(previous.lessonId)
          setActiveSongId(previous.songId)
          void fetchWithWorkspace(`/api/courses/${activeCourseId}/current`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lessonId: previous.lessonId }),
          })
          return
        }
      }
      closeSong('none')
      return
    }
    if (activeCourseId) {
      lessonHistoryRef.current = []
      closeCourse('none')
      return
    }
    if (activeFolderId) {
      closeFolder('none')
    }
  })

  const coursesQuery = useCourses()
  const courseSummaries = useMemo(
    () => coursesQuery.data?.courses ?? [],
    [coursesQuery.data?.courses],
  )

  // ─── Moldable drive contract (OB-008) ───────────────────────────────
  // A1: refresh queries when chat/agent RPC calls mutate this workspace.
  // A2: poll the per-workspace ui-intent slot (on mount and on every
  // app-api-changed message), apply the navigation visibly, then ack it.

  const seenUiIntentIdsRef = useRef<Set<string>>(new Set())
  const appliedUiIntentIdsRef = useRef<Set<string>>(new Set())
  const startedPlaybackIntentIdsRef = useRef<Set<string>>(new Set())
  const [pendingUiIntent, setPendingUiIntent] = useState<PianoUiIntent | null>(
    null,
  )

  const checkUiIntent = useCallback(async () => {
    try {
      const res = await fetchWithWorkspace('/api/moldable/ui-intent')
      if (!res.ok) throw new Error('Could not refresh Piano UI intent')
      const intent = (await res.json()) as PianoUiIntent | null
      if (
        !intent ||
        typeof intent.id !== 'string' ||
        typeof intent.view !== 'string'
      ) {
        playbackRecoveryIntentIdRef.current = null
        return
      }
      const recoveryIntentId = playbackRecoveryIntentIdRef.current
      if (recoveryIntentId && recoveryIntentId !== intent.id) {
        playbackRecoveryIntentIdRef.current = null
      }
      if (
        seenUiIntentIdsRef.current.has(intent.id) &&
        recoveryIntentId !== intent.id
      ) {
        return
      }
      setPendingUiIntent(intent)
    } catch {
      if (playbackRecoveryIntentIdRef.current) {
        scheduleUiIntentCheck(1_000)
      }
    }
  }, [fetchWithWorkspace, scheduleUiIntentCheck])
  checkUiIntentRef.current = checkUiIntent

  useEffect(() => {
    void checkUiIntent()
  }, [checkUiIntent])

  const invalidateForAppApiMethod = useCallback(
    (method: string) => {
      const readOnlyMethods = new Set([
        'piano.songs.list',
        'piano.songs.get',
        'piano.songs.getSoundSettings',
        'piano.folders.list',
        'piano.library.revision',
        'piano.ui.describe',
        'piano.ui.read',
        // Navigation methods only write the ui-intent slot, which
        // checkUiIntent picks up separately.
        'piano.ui.navigate',
        'piano.ui.openPiece',
        'piano.ui.practiceMode',
        'piano.ui.playPiece',
        'piano.ui.playbackStatus',
      ])
      if (readOnlyMethods.has(method)) return

      if (method.startsWith('piano.songs.')) {
        // Song mutations can touch song documents, folder placement, and
        // per-song sound settings.
        void queryClient.invalidateQueries({
          queryKey: ['songs', workspaceId],
        })
        void queryClient.invalidateQueries({
          queryKey: ['folders', workspaceId],
        })
        void queryClient.invalidateQueries({
          queryKey: ['song-previews', workspaceId],
        })
        void queryClient.invalidateQueries({
          queryKey: ['library-revision', workspaceId],
        })
        void queryClient.invalidateQueries({ queryKey: ['song'] })
        void queryClient.invalidateQueries({
          queryKey: ['song-sound-settings'],
        })
        void queryClient.invalidateQueries({
          queryKey: ['song-workspace-settings'],
        })
        return
      }

      // Unknown or future method — refresh every workspace-scoped query.
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.includes(workspaceId),
      })
    },
    [queryClient, workspaceId],
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: unknown
        targetAppId?: unknown
        workspaceId?: unknown
        method?: unknown
      } | null
      if (!data || data.type !== 'moldable:app-api-changed') return
      if (data.targetAppId !== 'piano') return
      if (
        typeof data.workspaceId === 'string' &&
        data.workspaceId !== workspaceId
      ) {
        return
      }
      invalidateForAppApiMethod(
        typeof data.method === 'string' ? data.method : '',
      )
      void checkUiIntent()
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [checkUiIntent, invalidateForAppApiMethod, workspaceId])

  useEffect(() => {
    let heartbeatInFlight = false
    let disposed = false

    const loseOwnership = (ownership: ActivePlaybackOwnership) => {
      if (
        activePlaybackOwnershipRef.current?.attemptId !== ownership.attemptId
      ) {
        return
      }
      abandonPlaybackOwnership(ownership)
      setPendingUiIntent(null)
      if (!disposed) scheduleUiIntentCheck(250)
    }

    const heartbeat = async () => {
      const ownership = activePlaybackOwnershipRef.current
      if (!ownership || heartbeatInFlight || disposed) return
      heartbeatInFlight = true
      try {
        const response = await fetchWithWorkspace(
          `/api/moldable/ui-intent/${encodeURIComponent(ownership.intentId)}/playback-heartbeat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attemptId: ownership.attemptId,
              consumerId: ownership.consumerId,
            }),
          },
        )
        if (!response.ok) loseOwnership(ownership)
      } catch {
        // Continuing audio without a renewable lease could overlap a
        // replacement renderer. Stop conservatively and let the durable
        // queued intent be reclaimed when the local server responds again.
        loseOwnership(ownership)
      } finally {
        heartbeatInFlight = false
      }
    }

    const releaseForRendererExit = () => {
      const ownership = activePlaybackOwnershipRef.current
      if (!ownership) return
      stopAll()
      if (
        shouldCompletePlaybackOnRendererExit(
          ownership,
          startedVoicePlaybackRef.current,
        )
      ) {
        void completePlaybackOwnership(ownership, {
          keepalive: true,
        }).catch(() => undefined)
        return
      }
      releasePlaybackOwnership(ownership, { keepalive: true })
    }

    const heartbeatId = window.setInterval(
      () => void heartbeat(),
      PIANO_PLAYBACK_HEARTBEAT_MS,
    )
    window.addEventListener('pagehide', releaseForRendererExit)
    window.addEventListener('beforeunload', releaseForRendererExit)

    return () => {
      disposed = true
      window.clearInterval(heartbeatId)
      window.removeEventListener('pagehide', releaseForRendererExit)
      window.removeEventListener('beforeunload', releaseForRendererExit)
      releaseForRendererExit()
    }
  }, [
    abandonPlaybackOwnership,
    completePlaybackOwnership,
    fetchWithWorkspace,
    releasePlaybackOwnership,
    scheduleUiIntentCheck,
    stopAll,
  ])

  const applyUiIntent = useCallback(
    (intent: PianoUiIntent): 'applied' | 'waiting' | 'stale' => {
      const resetToLibraryRoot = () => {
        resetMoldableNavigation()
        setPlaybackPlaying(false)
        stopAll()
        setPlaybackNotice(null)
        recoverablePlaybackIntentRef.current = null
        commitCursor(0)
        setActiveSongId(null)
        setActiveFolderId(null)
        setActiveCourseId(null)
        setActiveCourseLessonId(null)
        lessonHistoryRef.current = []
      }

      if (intent.view === 'library' || intent.view === 'courses') {
        resetToLibraryRoot()
        setLibraryTab(intent.view === 'courses' ? 'courses' : 'library')
        return 'applied'
      }

      if (!intent.entityId) return 'stale'

      if (intent.view === 'folder') {
        if (foldersLoading) return 'waiting'
        const folder = folders.find(
          (candidate) => candidate.id === intent.entityId,
        )
        if (!folder) return 'stale'
        resetToLibraryRoot()
        setLibraryTab('library')
        openFolder(folder)
        return 'applied'
      }

      if (intent.view === 'course') {
        if (coursesQuery.isLoading) return 'waiting'
        const summary = courseSummaries.find(
          (candidate) => candidate.course.id === intent.entityId,
        )
        if (!summary) return 'stale'
        resetToLibraryRoot()
        openCourse(summary.course.id)
        return 'applied'
      }

      if (intent.view === 'lesson') {
        if (coursesQuery.isLoading) return 'waiting'
        const courseIdHint =
          typeof intent.params?.courseId === 'string'
            ? intent.params.courseId
            : undefined
        for (const summary of courseSummaries) {
          if (courseIdHint && summary.course.id !== courseIdHint) continue
          const lesson = summary.course.modules
            .flatMap((module) => module.lessons)
            .find((candidate) => candidate.id === intent.entityId)
          if (!lesson) continue
          resetToLibraryRoot()
          openCourse(summary.course.id)
          openLessonFromCourse(lesson.id, lesson.songId, summary.course.id)
          return 'applied'
        }
        return 'stale'
      }

      if (intent.view === 'practice') {
        if (songsQuery.isLoading) return 'waiting'
        const target = songsQuery.data?.songs.find(
          (candidate) => candidate.id === intent.entityId,
        )
        if (!target) return 'stale'
        const part = intent.params?.part
        const practiceModeRequested = intent.params?.mode === 'practice'
        const playbackRequested = intent.playback?.type === 'play'
        if (target.id === activeSongId) {
          if (practiceModeRequested || playbackRequested) {
            setPlaybackPlaying(false)
            stopAll()
            commitCursor(0)
            playedNotesRef.current = new Set()
          }
        } else {
          const folderId =
            typeof intent.params?.folderId === 'string'
              ? intent.params.folderId
              : undefined
          openSongFromCommand(target.id, folderId)
          return 'waiting'
        }
        if (part === 'all' || part === 'bass' || part === 'melody') {
          setPracticePart(part)
        } else if (practiceModeRequested) {
          setPracticePart('all')
        }
        return 'applied'
      }

      return 'stale'
    },
    [
      activeSongId,
      commitCursor,
      courseSummaries,
      coursesQuery.isLoading,
      folders,
      foldersLoading,
      openCourse,
      openFolder,
      openLessonFromCourse,
      openSongFromCommand,
      setPlaybackPlaying,
      songsQuery.data?.songs,
      songsQuery.isLoading,
      stopAll,
    ],
  )

  useEffect(() => {
    if (!pendingUiIntent) return
    const intent = pendingUiIntent

    // Final playback state is durable for agent status queries, but it is not
    // a new navigation command. A fresh renderer must not reopen an old song.
    if (intent.playback && isTerminalPianoPlayback(intent.playback)) {
      if (playbackRecoveryIntentIdRef.current === intent.id) {
        playbackRecoveryIntentIdRef.current = null
      }
      if (
        intent.playback.status === 'failed' &&
        !isExpiredPianoPlaybackFailure(intent.playback)
      ) {
        setPlaybackNotice(
          intent.playback.message ?? 'Piano could not start playback.',
        )
      }
      seenUiIntentIdsRef.current.add(intent.id)
      setPendingUiIntent(null)
      return
    }

    if (!appliedUiIntentIdsRef.current.has(intent.id)) {
      const navigationStatus = applyUiIntent(intent)
      if (navigationStatus === 'waiting') return
      appliedUiIntentIdsRef.current.add(intent.id)

      if (navigationStatus === 'stale') {
        seenUiIntentIdsRef.current.add(intent.id)
        setPendingUiIntent(null)
        void fetchWithWorkspace(
          `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
          { method: 'DELETE' },
        ).catch(() => undefined)
        return
      }
    }

    if (!intent.playback) {
      seenUiIntentIdsRef.current.add(intent.id)
      setPendingUiIntent(null)
      void fetchWithWorkspace(
        `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
        { method: 'DELETE' },
      ).catch(() => undefined)
      return
    }

    const ownedByThisRenderer = canAdoptPersistedPlaybackLease(
      intent.playback,
      playbackConsumerId,
      abandonedPlaybackAttemptIdsRef.current,
    )
    if (ownedByThisRenderer && intent.playback.attemptId) {
      const ownership: ActivePlaybackOwnership = {
        intentId: intent.id,
        attemptId: intent.playback.attemptId,
        consumerId: playbackConsumerId,
      }
      activePlaybackOwnershipRef.current = ownership
      if (intent.playback.status === 'interaction-required') {
        recoverablePlaybackIntentRef.current = ownership
        setPlaybackNotice(
          intent.playback.message ??
            'Piano is ready. Press Play once to allow audio.',
        )
      }
      seenUiIntentIdsRef.current.add(intent.id)
      setPendingUiIntent(null)
      return
    }

    const audioUiReady =
      loadedSongId === intent.entityId &&
      !songQuery.isLoading &&
      !audioOptionsQuery.isLoading &&
      !audioSettingsQuery.isLoading &&
      !songSoundSettingsQuery.isLoading &&
      !songWorkspaceSettingsQuery.isLoading &&
      isSelectedSongSoundReady &&
      !songSoundLoadingLabel
    if (!audioUiReady) return
    if (startedPlaybackIntentIdsRef.current.has(intent.id)) return
    startedPlaybackIntentIdsRef.current.add(intent.id)

    void (async () => {
      try {
        const response = await fetchWithWorkspace(
          `/api/moldable/ui-intent/${encodeURIComponent(intent.id)}/claim-playback`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consumerId: playbackConsumerId }),
          },
        )
        if (!response.ok) throw new Error('Could not claim playback intent.')
        const body = (await response.json()) as {
          claimed: boolean
          intent: PianoUiIntent
        }
        if (!body.claimed) {
          startedPlaybackIntentIdsRef.current.delete(intent.id)
          setPendingUiIntent(null)
          const previousRetry = playbackClaimRetryRef.current
          const retryCount =
            previousRetry.intentId === intent.id ? previousRetry.count : 0
          const retryDelays = [100, 250, 500, 1_000] as const
          const retryDelay =
            retryDelays[Math.min(retryCount, retryDelays.length - 1)]
          playbackClaimRetryRef.current = {
            intentId: intent.id,
            count: retryCount + 1,
          }
          scheduleUiIntentCheck(retryDelay)
          return
        }

        playbackClaimRetryRef.current = { intentId: null, count: 0 }
        playbackRecoveryIntentIdRef.current = null
        abandonedPlaybackAttemptIdsRef.current.clear()
        const attemptId = body.intent.playback?.attemptId
        if (!attemptId) throw new Error('Playback claim did not return an id.')
        const ownership: ActivePlaybackOwnership = {
          intentId: intent.id,
          attemptId,
          consumerId: playbackConsumerId,
        }
        activePlaybackOwnershipRef.current = ownership
        const result = await startPlayback({
          restart: true,
          canStart: () =>
            activePlaybackOwnershipRef.current?.attemptId === attemptId,
        })
        await reportPlaybackIntent(
          intent.id,
          attemptId,
          result.status,
          'message' in result ? result.message : undefined,
        )
        if (
          !isCurrentPlaybackOwnership(
            ownership,
            activePlaybackOwnershipRef.current,
            abandonedPlaybackAttemptIdsRef.current,
          )
        ) {
          return
        }
        if (result.status === 'interaction-required') {
          recoverablePlaybackIntentRef.current = ownership
        } else {
          recoverablePlaybackIntentRef.current = null
        }
        if (result.status === 'playing') {
          startedVoicePlaybackRef.current = ownership
          if (!isPlayingRef.current) {
            void completeStoppedPlaybackOrRecover(ownership)
          }
        }
        if (result.status === 'failed') {
          activePlaybackOwnershipRef.current = null
        }
        seenUiIntentIdsRef.current.add(intent.id)
        setPendingUiIntent(null)
      } catch (error) {
        const ownership = activePlaybackOwnershipRef.current
        if (ownership?.intentId === intent.id) {
          abandonPlaybackOwnership(ownership)
        } else {
          playbackRecoveryIntentIdRef.current = intent.id
        }
        startedPlaybackIntentIdsRef.current.delete(intent.id)
        setPlaybackNotice(
          error instanceof Error
            ? error.message
            : 'Piano could not process the playback request.',
        )
        setPendingUiIntent(null)
        scheduleUiIntentCheck(500)
      }
    })()
  }, [
    applyUiIntent,
    abandonPlaybackOwnership,
    audioOptionsQuery.isLoading,
    audioSettingsQuery.isLoading,
    completeStoppedPlaybackOrRecover,
    fetchWithWorkspace,
    isSelectedSongSoundReady,
    loadedSongId,
    pendingUiIntent,
    playbackConsumerId,
    reportPlaybackIntent,
    scheduleUiIntentCheck,
    songQuery.isLoading,
    songSoundLoadingLabel,
    songSoundSettingsQuery.isLoading,
    songWorkspaceSettingsQuery.isLoading,
    startPlayback,
  ])

  const activeCourseSummary = useMemo(
    () =>
      activeCourseId
        ? (courseSummaries.find((s) => s.course.id === activeCourseId) ?? null)
        : null,
    [activeCourseId, courseSummaries],
  )

  const courseContext = useMemo<CourseContext | null>(() => {
    if (!activeCourseSummary || !activeCourseLessonId || !activeSongId)
      return null
    const { course, progress } = activeCourseSummary
    const allLessons = course.modules.flatMap((module) => module.lessons)
    const lessonIndex = allLessons.findIndex(
      (lesson) => lesson.id === activeCourseLessonId,
    )
    if (lessonIndex === -1) return null
    const isLessonComplete =
      progress.completedLessonIds.includes(activeCourseLessonId)
    const isLastLesson = lessonIndex >= allLessons.length - 1

    const popBackToOutline = () => {
      popMoldableNavigation()
      setPlaybackPlaying(false)
      stopAll()
      commitCursor(0)
      setActiveSongId(null)
      setActiveCourseLessonId(null)
      // Keep activeCourseId — CourseView renders
    }

    return {
      courseId: course.id,
      courseTitle: course.title,
      courseTone: course.tone,
      lessonId: activeCourseLessonId,
      lessonIndex,
      lessonCount: allLessons.length,
      isLessonComplete,
      isLastLesson,
      onContinue: () => {
        const advance = () => {
          const next = allLessons[lessonIndex + 1]
          if (next) {
            openLessonFromCourse(next.id, next.songId, course.id)
          } else {
            popBackToOutline()
          }
        }
        if (isLessonComplete) {
          // Already done — just advance (or back to outline if last).
          advance()
          return
        }
        // Mark complete first, then advance.
        void fetchWithWorkspace(`/api/courses/${course.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId: activeCourseLessonId }),
        }).then(() => {
          void queryClient.invalidateQueries({
            queryKey: ['courses', workspaceId],
          })
          advance()
        })
      },
      // Part fields are placeholders here — TutorialPanel knows the song's
      // tutorial sections and overrides these with real values.
      partCount: 1,
      currentPartIndex: 0,
      onNextPart: () => {},
      onSeekPart: () => {},
    }
  }, [
    activeCourseSummary,
    activeCourseLessonId,
    activeSongId,
    commitCursor,
    openLessonFromCourse,
    fetchWithWorkspace,
    queryClient,
    setPlaybackPlaying,
    stopAll,
    workspaceId,
  ])

  return (
    <AppFrameContent
      scrollable={false}
      chatSafe={false}
      className="text-foreground flex flex-col overflow-hidden bg-transparent"
    >
      {activeSongId && song ? (
        <PracticeView
          song={song}
          practiceNotes={practiceNotes}
          practicePart={practicePart}
          splitMidi={splitMidi}
          suggestedSplitMidi={suggestedSplitMidi}
          onPracticePartChange={handlePracticePartChange}
          onSplitMidiChange={handleSplitMidiChange}
          duration={duration}
          timeline={playbackTimeline}
          isPlaying={isPlaying}
          presetId={presetId}
          loadState={loadState}
          soundLoadingLabel={songSoundLoadingLabel}
          playbackNotice={playbackNotice}
          isSongLoading={songQuery.isLoading}
          isSongError={songQuery.isError}
          onBack={closeSong}
          onTogglePlay={togglePlay}
          onRestart={restartPlayback}
          onSeek={seekTo}
          onScrubStart={startScrubbing}
          onScrubEnd={endScrubbing}
          onPresetChange={handlePresetChange}
          onPreviewKey={previewKey}
          playbackSpeed={playbackSpeed}
          onPlaybackSpeedChange={setPlaybackSpeed}
          instrumentPacks={instrumentPacks}
          activePackId={activePackId}
          activeInstrumentId={activeInstrument?.id ?? null}
          onActiveInstrumentChange={handleActiveInstrumentChange}
          onInstallPack={handleInstallPack}
          installingPackIds={installingPackIds}
          isAudioOptionsLoading={audioOptionsQuery.isLoading}
          courseContext={courseContext}
        />
      ) : activeCourseId ? (
        <CourseView
          courseId={activeCourseId}
          onBack={() => closeCourse('pop')}
          onOpenLesson={(lesson, courseId) =>
            openLessonFromCourse(lesson.id, lesson.songId, courseId)
          }
        />
      ) : (
        <LibraryView
          songs={songsQuery.data?.songs ?? []}
          isLoading={songsQuery.isLoading}
          isError={songsQuery.isError}
          notePreviewBySong={notePreviewBySong}
          openFolderId={activeFolderId}
          onOpenFolder={openFolder}
          onCloseFolder={closeFolder}
          onSelect={openSong}
          courseSummaries={courseSummaries}
          onOpenCourse={openCourse}
          tab={libraryTab}
          onTabChange={setLibraryTab}
        />
      )}
    </AppFrameContent>
  )
}
