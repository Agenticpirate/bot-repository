'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Sprout } from 'lucide-react'
import {
  type DragEvent,
  type JSX,
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AppHeader,
  DesktopOnly,
  MoldableLoadingScreen,
  SearchField,
  Toolbar,
  ToolbarActions,
  ToolbarBackButton,
  ToolbarContent,
  ToolbarIconButton,
  ToolbarTitle,
  cn,
  isInMoldable,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  sendToMoldable,
  useMoldableCommands,
  useMoldableNavigationPop,
  useWorkspace,
} from '@moldable-ai/ui'
import type { MediaResult, Plant } from '../lib/types'
import { dueState } from '../lib/types'
import { AddPlant } from './components/add-plant'
import { AlertsHeader } from './components/alerts-header'
import { EmptyState } from './components/empty-state'
import { NotificationPermissionBanner } from './components/notification-permission-banner'
import { PlantCard } from './components/plant-card'
import { PlantDetail } from './components/plant-detail'
import { PlantGallery } from './components/plant-gallery'
import { usePlantMedia } from './use-plant-media'
import {
  type PlantCreateInput,
  resolveMediaUrl,
  useAddPlantPhoto,
  useCreatePlant,
  useDeletePlant,
  useFavoritePlant,
  useGenerateCare,
  useIdentifyPlantFromImage,
  usePlants,
  useUpdatePlant,
  useWaterPlant,
} from './use-plants'

// A folder is the home unit of navigation. `null` = the folder grid (home).
type FolderKey =
  | { kind: 'all' }
  | { kind: 'favorites' }
  | { kind: 'needswater' }
  | { kind: 'wishlist' }
  | { kind: 'memorials' }
  | { kind: 'unplaced' }
  | { kind: 'room'; room: string }

// Plants that need water now or soon — used for badges and the Today route.
function isDue(p: Plant): boolean {
  const s = dueState(p)
  return s === 'overdue' || s === 'today' || s === 'soon'
}

// Plants that genuinely need water right now — drives the alert bar and
// "Water all". Excludes "soon" so we never push the user to water early.
function needsWaterNow(p: Plant): boolean {
  const s = dueState(p)
  return s === 'overdue' || s === 'today'
}

function folderKeyId(folder: FolderKey): string {
  return folder.kind === 'room' ? `room:${folder.room}` : folder.kind
}

function folderTitle(folder: FolderKey): string {
  switch (folder.kind) {
    case 'all':
      return 'All plants'
    case 'favorites':
      return 'Favorites'
    case 'needswater':
      return 'Needs water'
    case 'wishlist':
      return 'Future Plants'
    case 'memorials':
      return 'In memory of…'
    case 'unplaced':
      return 'Unplaced'
    case 'room':
      return folder.room
  }
}

function emptyVariant(
  folder: FolderKey,
): 'all' | 'room' | 'favorites' | 'today' | 'wishlist' | 'memorials' {
  switch (folder.kind) {
    case 'room':
      return 'room'
    case 'favorites':
      return 'favorites'
    case 'needswater':
      return 'today'
    case 'wishlist':
      return 'wishlist'
    case 'memorials':
      return 'memorials'
    default:
      return 'all'
  }
}

// Host-driven navigation intent queued by the server (drive contract). The
// client polls the single slot, applies the newest unseen intent, and acks it.
type UiIntent = {
  id: string
  view: string
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}

type MoldableFileDropMessage =
  | {
      type: 'moldable:file-drag-over'
      paths?: string[]
      position?: { x: number; y: number }
    }
  | { type: 'moldable:file-drag-leave' }
  | {
      type: 'moldable:file-drop'
      paths?: string[]
      position?: { x: number; y: number }
    }

function isImagePath(path: string): boolean {
  return /\.(png|jpe?g|gif|webp)$/i.test(path)
}

function isSupportedImageFile(file: File): boolean {
  if (isImagePath(file.name)) return true
  return ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
    file.type,
  )
}

function imagePathsFromList(paths: string[]): string[] {
  return paths.filter(isImagePath)
}

function fileUrlToPath(value: string): string {
  if (!value.startsWith('file://')) return value
  const encoded = value.replace(/^file:\/\//, '')
  try {
    return decodeURIComponent(encoded)
  } catch {
    return encoded
  }
}

// ---------------------------------------------------------------------------
// Chat context: both the Add-plant dialog and gallery drops identify plants
// in-app via the vision endpoint (no chat handoff). We still give the desktop
// chat context about the selected plant so the assistant can help and diagnose.
// ---------------------------------------------------------------------------

function buildChatInstructions(selected: Plant | null): string {
  const lines = [
    'You are assisting inside the Plants app, which helps the user keep house plants alive.',
    'To add a plant from a photo, call the Plants RPC plants.identifyAndCreate with',
    '{ commonName, scientificName?, confidence?, candidates?, heroImagePath?, ownershipStatus?, room?, location? }.',
    'To create without identification, use plants.create. Other methods: plants.list,',
    'plants.get, plants.update, plants.water, plants.generateCare, plants.favorite, plants.delete. To preserve a dead plant as a memorial, use plants.update with lifeStatus: "deceased", deceasedAt, and optional memorialNote.',
  ]
  if (selected) {
    const sci = selected.scientificName ? ` (${selected.scientificName})` : ''
    const where = [selected.room, selected.location].filter(Boolean).join(', ')
    lines.push(
      `The user is currently viewing "${selected.commonName}"${sci}${where ? ` in ${where}` : ''} (id: ${selected.id}).`,
    )
  }
  return lines.join(' ')
}

// ---------------------------------------------------------------------------

export default function PlantsPage(): JSX.Element {
  const queryClient = useQueryClient()
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  const plantsQuery = usePlants()
  const createPlant = useCreatePlant()
  const updatePlant = useUpdatePlant()
  const waterPlant = useWaterPlant()
  const generateCare = useGenerateCare()
  const identifyPlantFromImage = useIdentifyPlantFromImage()
  const favoritePlant = useFavoritePlant()
  const deletePlant = useDeletePlant()
  const addPhoto = useAddPlantPhoto()
  const { uploadFile, importPaths, uploading } = usePlantMedia()

  const [folder, setFolder] = useState<FolderKey | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const deferredSearch = useDeferredValue(search)
  const [addOpen, setAddOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  const [pendingIntent, setPendingIntent] = useState<UiIntent | null>(null)
  const [photoFocus, setPhotoFocus] = useState(false)
  const [nativeDeleteRequestID] = useState(0)
  const seenIntentIds = useRef<Set<string>>(new Set())

  const mediaUrl = useCallback(
    (path?: string) => resolveMediaUrl(workspaceId, path),
    [workspaceId],
  )

  // --- Drive contract: fetch the queued UI intent (single slot, last-wins). ---
  const refreshUiIntent = useCallback(async () => {
    try {
      const res = await fetchWithWorkspace('/api/moldable/ui-intent')
      if (!res.ok) return
      const intent = (await res.json()) as UiIntent | null
      if (!intent?.id || seenIntentIds.current.has(intent.id)) return
      setPendingIntent(intent)
    } catch {
      // Best-effort: ignore transient fetch failures.
    }
  }, [fetchWithWorkspace])

  useEffect(() => {
    void refreshUiIntent()
  }, [refreshUiIntent])

  // --- Live updates: chat mutations post `moldable:app-api-changed`. Only
  // react to events targeting this app in the active workspace, then refetch
  // the workspace-scoped queries and check for a queued navigation intent. ---
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as
        | { type?: string; targetAppId?: string; workspaceId?: string }
        | null
        | undefined
      if (data?.type !== 'moldable:app-api-changed') return
      if (data.targetAppId !== 'plants') return
      if (data.workspaceId && data.workspaceId !== workspaceId) return
      void queryClient.invalidateQueries({ queryKey: ['plants', workspaceId] })
      void refreshUiIntent()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [queryClient, workspaceId, refreshUiIntent])

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  // --- Derived data ---
  const livePlants = useMemo(
    () => (plantsQuery.data ?? []).filter((p) => !p.isDeleted),
    [plantsQuery.data],
  )

  const memorialPlants = useMemo(
    () => livePlants.filter((p) => p.lifeStatus === 'deceased'),
    [livePlants],
  )
  const activePlants = useMemo(
    () => livePlants.filter((p) => p.lifeStatus !== 'deceased'),
    [livePlants],
  )
  const ownedPlants = useMemo(
    () => activePlants.filter((p) => p.ownershipStatus !== 'wishlist'),
    [activePlants],
  )
  const wishlistPlants = useMemo(
    () => activePlants.filter((p) => p.ownershipStatus === 'wishlist'),
    [activePlants],
  )
  const hasWateringSchedules = useMemo(
    () =>
      ownedPlants.some(
        (plant) =>
          Number.isInteger(plant.waterIntervalDays) &&
          (plant.waterIntervalDays ?? 0) > 0,
      ),
    [ownedPlants],
  )
  const waterNow = useMemo(
    () => ownedPlants.filter(needsWaterNow),
    [ownedPlants],
  )
  const overdueCount = useMemo(
    () => ownedPlants.filter((p) => dueState(p) === 'overdue').length,
    [ownedPlants],
  )
  const favorites = useMemo(
    () => ownedPlants.filter((p) => p.isFavorite),
    [ownedPlants],
  )
  const unplaced = useMemo(
    () => ownedPlants.filter((p) => !p.room?.trim()),
    [ownedPlants],
  )
  const rooms = useMemo(() => {
    const map = new Map<string, Plant[]>()
    for (const p of ownedPlants) {
      const room = p.room?.trim()
      if (!room) continue
      const arr = map.get(room)
      if (arr) arr.push(p)
      else map.set(room, [p])
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([room, plants]) => ({ room, plants }))
  }, [ownedPlants])

  // Keep groups visible in the main collection. A plant can deliberately
  // appear in “All plants” and in its room, making every grouping immediately
  // scannable without a second navigation step.
  const homeSections = useMemo(() => {
    const list: {
      key: FolderKey
      title: string
      plants: Plant[]
    }[] = []
    if (ownedPlants.length > 0) {
      list.push({
        key: { kind: 'all' },
        title: 'All plants',
        plants: ownedPlants,
      })
    }
    if (wishlistPlants.length > 0) {
      list.push({
        key: { kind: 'wishlist' },
        title: 'Future Plants',
        plants: wishlistPlants,
      })
    }
    if (favorites.length > 0) {
      list.push({
        key: { kind: 'favorites' },
        title: 'Favorites',
        plants: favorites,
      })
    }
    if (memorialPlants.length > 0) {
      list.push({
        key: { kind: 'memorials' },
        title: 'In memory of…',
        plants: memorialPlants,
      })
    }
    for (const { room, plants } of rooms) {
      list.push({
        key: { kind: 'room', room },
        title: room,
        plants,
      })
    }
    if (unplaced.length > 0) {
      list.push({
        key: { kind: 'unplaced' },
        title: 'Unplaced',
        plants: unplaced,
      })
    }
    return list
  }, [ownedPlants, wishlistPlants, favorites, memorialPlants, rooms, unplaced])

  const matchesQuery = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return (p: Plant) => {
      if (!q) return true
      return [
        p.commonName,
        p.scientificName,
        p.nickname,
        p.room,
        p.location,
        p.family,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    }
  }, [deferredSearch])

  const hasQuery = deferredSearch.trim().length > 0

  // Plants for the currently open folder (ignored while searching).
  const openPlants = useMemo(() => {
    if (!folder) return []
    switch (folder.kind) {
      case 'all':
        return ownedPlants
      case 'wishlist':
        return wishlistPlants
      case 'memorials':
        return memorialPlants
      case 'favorites':
        return favorites
      case 'needswater':
        return waterNow
      case 'unplaced':
        return unplaced
      case 'room':
        return ownedPlants.filter((p) => p.room?.trim() === folder.room)
    }
  }, [
    folder,
    ownedPlants,
    wishlistPlants,
    memorialPlants,
    favorites,
    waterNow,
    unplaced,
  ])

  const searchResults = useMemo(
    () => (hasQuery ? livePlants.filter(matchesQuery) : []),
    [hasQuery, livePlants, matchesQuery],
  )

  const selectedPlant = useMemo(
    () =>
      selectedId ? (livePlants.find((p) => p.id === selectedId) ?? null) : null,
    [selectedId, livePlants],
  )

  // If the selected plant disappears (deleted elsewhere), drop back to the
  // gallery and keep the desktop nav stack in sync.
  useEffect(() => {
    if (selectedId && !livePlants.some((p) => p.id === selectedId)) {
      popMoldableNavigation()
      setSelectedId(null)
    }
  }, [selectedId, livePlants])

  // --- Chat context: refresh instructions as the selection changes. ---
  useEffect(() => {
    if (!isInMoldable()) return
    sendToMoldable({
      type: 'moldable:set-chat-instructions',
      text: buildChatInstructions(selectedPlant),
    })
    return () => {
      sendToMoldable({ type: 'moldable:set-chat-instructions', text: '' })
    }
  }, [selectedPlant])

  // --- Mutations wired for the detail pane ---
  const patchTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pendingPatches = useRef(new Map<string, Partial<Plant>>())

  const handlePatch = useCallback(
    (id: string, patch: Partial<Plant>) => {
      const timers = patchTimers.current
      const pending = pendingPatches.current
      const existing = timers.get(id)
      if (existing) clearTimeout(existing)
      pending.set(id, { ...(pending.get(id) ?? {}), ...patch })
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id)
          const merged = pending.get(id)
          pending.delete(id)
          if (!merged) return
          void updatePlant.mutateAsync({ id, ...merged }).catch(() => undefined)
        }, 500),
      )
    },
    [updatePlant],
  )

  useEffect(() => {
    const timers = patchTimers.current
    const pending = pendingPatches.current
    return () => {
      for (const t of timers.values()) clearTimeout(t)
      timers.clear()
      pending.clear()
    }
  }, [])

  const handleWater = useCallback(
    (id: string) => {
      void waterPlant.mutateAsync({ id }).catch(() => undefined)
    },
    [waterPlant],
  )

  // "Still moist" skip — push the next reminder without logging a watering.
  const handleSnooze = useCallback(
    (id: string, untilISO: string) => {
      void updatePlant
        .mutateAsync({ id, snoozeUntil: untilISO })
        .catch(() => undefined)
    },
    [updatePlant],
  )

  // Growth journal: upload a photo then append it (it becomes the new hero).
  const handleAddPhoto = useCallback(
    async (id: string, file: File) => {
      setDropError(null)
      try {
        const media = await uploadFile(file)
        await addPhoto.mutateAsync({ id, path: media.path })
      } catch (error) {
        setDropError(
          error instanceof Error ? error.message : "Couldn't add that photo.",
        )
      }
    },
    [addPhoto, uploadFile],
  )

  const handleSetHero = useCallback(
    (id: string, path: string) => {
      void updatePlant
        .mutateAsync({ id, heroImageUrl: path })
        .catch(() => undefined)
    },
    [updatePlant],
  )

  const waterAllNow = useCallback(() => {
    for (const p of waterNow) handleWater(p.id)
  }, [waterNow, handleWater])

  const syncNotificationSchedules = useCallback(async () => {
    const response = await fetchWithWorkspace('/api/notifications/sync', {
      method: 'POST',
    })
    if (!response.ok) {
      const detail = (await response.text()).trim()
      throw new Error(detail || 'Couldn’t schedule watering reminders.')
    }
  }, [fetchWithWorkspace])

  const handleToggleFavorite = useCallback(
    (p: Plant) => {
      void favoritePlant
        .mutateAsync({ id: p.id, isFavorite: !p.isFavorite })
        .catch(() => undefined)
    },
    [favoritePlant],
  )

  const handleGenerateCare = useCallback(
    (id: string) => {
      void generateCare.mutateAsync(id).catch(() => undefined)
    },
    [generateCare],
  )

  const handleFavorite = useCallback(
    (id: string, isFavorite: boolean) => {
      void favoritePlant.mutateAsync({ id, isFavorite }).catch(() => undefined)
    },
    [favoritePlant],
  )

  const handleDelete = useCallback(
    (id: string) => {
      popMoldableNavigation()
      setSelectedId(null)
      void deletePlant.mutateAsync(id).catch(() => undefined)
    },
    [deletePlant],
  )

  // --- Add-plant helpers passed into the dialog ---
  const createManual = useCallback(
    async (input: {
      commonName: string
      scientificName?: string
      ownershipStatus: 'owned' | 'wishlist'
      room?: string
      heroImagePath?: string
    }) => {
      const body: PlantCreateInput = {
        commonName: input.commonName,
        scientificName: input.scientificName,
        ownershipStatus: input.ownershipStatus,
        room: input.ownershipStatus === 'owned' ? input.room : undefined,
        heroImagePath: input.heroImagePath,
        identification: { source: 'manual' },
      }
      const created = await createPlant.mutateAsync(body)
      if (selectedId) popMoldableNavigation()
      pushMoldableNavigation({
        id: `plant:${created.id}`,
        title: created.commonName || 'Plant',
      })
      setSelectedId(created.id)
    },
    [createPlant, selectedId],
  )

  // --- Window-level drag & drop (image files + Finder paths) ---
  const dragDepth = useRef(0)

  const createFromMedia = useCallback(
    async (
      media: MediaResult,
      ownershipStatus: 'owned' | 'wishlist' = folder?.kind === 'wishlist'
        ? 'wishlist'
        : 'owned',
    ) => {
      return identifyPlantFromImage.mutateAsync({
        heroImagePath: media.path,
        imagePath: media.absPath,
        ownershipStatus,
        room:
          ownershipStatus === 'owned' && folder?.kind === 'room'
            ? folder.room
            : undefined,
      })
    },
    [folder, identifyPlantFromImage],
  )

  const createFromMediaList = useCallback(
    async (mediaList: MediaResult[]) => {
      if (mediaList.length === 0) return
      setDropError(null)
      const errors: string[] = []
      let lastCreated: Plant | null = null
      for (const media of mediaList) {
        try {
          lastCreated = await createFromMedia(media)
        } catch (error) {
          errors.push(
            error instanceof Error
              ? error.message
              : "Couldn't create a plant from that image.",
          )
        }
      }
      if (lastCreated) {
        if (selectedId) popMoldableNavigation()
        pushMoldableNavigation({
          id: `plant:${lastCreated.id}`,
          title: lastCreated.commonName || 'Plant',
        })
        setSelectedId(lastCreated.id)
      }
      if (errors.length > 0) {
        setDropError(
          mediaList.length === errors.length
            ? errors[0]!
            : `Created ${mediaList.length - errors.length} of ${mediaList.length} plants. ${errors[0]!}`,
        )
      }
    },
    [createFromMedia, selectedId],
  )

  const handleDroppedImages = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      try {
        const mediaList: MediaResult[] = []
        for (const file of files) {
          mediaList.push(await uploadFile(file))
        }
        await createFromMediaList(mediaList)
      } catch (error) {
        setDropError(
          error instanceof Error
            ? error.message
            : "Couldn't import those images.",
        )
      }
    },
    [createFromMediaList, uploadFile],
  )

  const handleDroppedPaths = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return
      try {
        const results = await importPaths(paths)
        await createFromMediaList(results)
      } catch (error) {
        setDropError(
          error instanceof Error
            ? error.message
            : "Couldn't import those images.",
        )
      }
    },
    [createFromMediaList, importPaths],
  )

  const onWindowDrop = useCallback(
    (event: DragEvent) => {
      if (addOpen) return // the Add-plant dialog owns its own drop zone
      event.preventDefault()
      dragDepth.current = 0
      setDragging(false)

      const files = Array.from(event.dataTransfer.files ?? []).filter((f) =>
        isSupportedImageFile(f),
      )
      if (files.length > 0) {
        void handleDroppedImages(files)
        return
      }
      if ((event.dataTransfer.files?.length ?? 0) > 0) {
        setDropError('Use PNG, JPEG, WebP, or GIF plant photos.')
        return
      }

      const uriList = event.dataTransfer.getData('text/uri-list')
      const plain = event.dataTransfer.getData('text/plain')
      const raw = uriList || plain
      const paths = raw
        .split(/[\r\n]+/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map(fileUrlToPath)
        .filter(isImagePath)
      if (paths.length > 0) void handleDroppedPaths(paths)
      else if (raw.trim())
        setDropError('Use PNG, JPEG, WebP, or GIF plant photos.')
    },
    [handleDroppedImages, handleDroppedPaths, addOpen],
  )

  function hasDropPayload(event: DragEvent): boolean {
    const types = Array.from(event.dataTransfer.types)
    return (
      types.includes('Files') ||
      types.includes('text/uri-list') ||
      types.includes('text/plain')
    )
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent<MoldableFileDropMessage>) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      // The Add-plant dialog owns drag & drop while it's open; stay out of its way.
      if (addOpen) {
        dragDepth.current = 0
        setDragging(false)
        return
      }

      if (data.type === 'moldable:file-drag-over') {
        setDragging(true)
        return
      }

      if (data.type === 'moldable:file-drag-leave') {
        dragDepth.current = 0
        setDragging(false)
        return
      }

      if (data.type !== 'moldable:file-drop') return

      dragDepth.current = 0
      setDragging(false)
      const paths = imagePathsFromList(data.paths ?? [])
      if (paths.length > 0) void handleDroppedPaths(paths)
      else if ((data.paths ?? []).length > 0) {
        setDropError('Use PNG, JPEG, WebP, or GIF plant photos.')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleDroppedPaths, addOpen])

  // While the Add-plant dialog is open it owns drag & drop — clear any
  // window-level drag overlay so it can't hijack drops meant for the dialog.
  useEffect(() => {
    if (!addOpen) return
    dragDepth.current = 0
    setDragging(false)
  }, [addOpen])

  // --- Navigation helpers ---
  const openFolder = useCallback((key: FolderKey) => {
    pushMoldableNavigation({
      id: `folder:${folderKeyId(key)}`,
      title: folderTitle(key),
    })
    setFolder(key)
    setSelectedId(null)
  }, [])

  const goHome = useCallback(() => {
    if (folder) popMoldableNavigation()
    setFolder(null)
    setSelectedId(null)
  }, [folder])

  // Opening a plant pushes a desktop nav entry so the host's back button (and
  // our hero back chip) both return to the gallery. Close paths pop it to keep
  // the desktop header in sync.
  const openPlant = useCallback((p: Plant) => {
    pushMoldableNavigation({
      id: `plant:${p.id}`,
      title: p.commonName || 'Plant',
    })
    setSelectedId(p.id)
  }, [])

  const closePlant = useCallback(() => {
    popMoldableNavigation()
    setSelectedId(null)
  }, [])

  // Desktop header back button — it has already popped its own stack.
  useMoldableNavigationPop(() => {
    if (selectedId) {
      setSelectedId(null)
      return
    }
    if (hasQuery || mobileSearchOpen) {
      setSearch('')
      setMobileSearchOpen(false)
      return
    }
    if (folder) setFolder(null)
  })

  // --- Drive contract: apply a queued navigation intent so the UI visibly
  // changes (switch folder, open a plant, run a search, focus a photo). ---
  const applyUiIntent = useCallback(
    (intent: UiIntent) => {
      const params = intent.params ?? {}
      setAddOpen(false)
      setPhotoFocus(false)

      if (intent.view === 'plant') {
        const plant = intent.entityId
          ? livePlants.find((p) => p.id === intent.entityId)
          : undefined
        if (!plant) {
          // The plant is gone (or never loaded) — fall back to the gallery.
          setSearch('')
          openFolder({ kind: 'all' })
          return
        }
        setSearch('')
        if (selectedId && selectedId !== plant.id) popMoldableNavigation()
        if (selectedId !== plant.id) openPlant(plant)
        if (params.fullscreen === true) setPhotoFocus(true)
        return
      }

      if (selectedId) popMoldableNavigation()

      if (intent.view === 'search') {
        setSelectedId(null)
        setFolder(null)
        setSearch(typeof params.query === 'string' ? params.query : '')
        return
      }

      if (intent.view === 'room') {
        const room =
          typeof params.room === 'string' && params.room.trim()
            ? params.room
            : undefined
        setSearch('')
        if (room) openFolder({ kind: 'room', room })
        else goHome()
        return
      }

      const folderKeys: Record<string, FolderKey> = {
        all: { kind: 'all' },
        favorites: { kind: 'favorites' },
        needswater: { kind: 'needswater' },
        wishlist: { kind: 'wishlist' },
        memorials: { kind: 'memorials' },
        unplaced: { kind: 'unplaced' },
      }
      setSearch('')
      const key = folderKeys[intent.view]
      if (key) openFolder(key)
      else goHome() // "home" and anything unrecognized
    },
    [livePlants, selectedId, openPlant, openFolder, goHome],
  )

  // Apply once the plant list is loaded (so opening a plant sticks), then ack.
  useEffect(() => {
    if (!pendingIntent || !plantsQuery.isSuccess) return
    const intent = pendingIntent
    seenIntentIds.current.add(intent.id)
    setPendingIntent(null)
    applyUiIntent(intent)
    void fetchWithWorkspace(
      `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
      { method: 'DELETE' },
    ).catch(() => undefined)
  }, [pendingIntent, plantsQuery.isSuccess, applyUiIntent, fetchWithWorkspace])

  // Photo focus only makes sense while its plant is on screen.
  useEffect(() => {
    if (!selectedPlant) setPhotoFocus(false)
  }, [selectedPlant])

  useEffect(() => {
    if (!photoFocus) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPhotoFocus(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [photoFocus])

  // --- Desktop command-menu handlers (Cmd+K). Safe no-op if not in Moldable. ---
  useMoldableCommands({
    'add-plant': () => setAddOpen(true),
    add: () => setAddOpen(true),
    'water-due': () => {
      for (const p of livePlants.filter(isDue)) handleWater(p.id)
    },
    search: () => {
      goHome()
      const el = document.getElementById(
        'plants-search',
      ) as HTMLInputElement | null
      el?.focus()
    },
    refresh: () => {
      void queryClient.invalidateQueries({ queryKey: ['plants', workspaceId] })
    },
  })

  // --- Render ---
  const showDetail = selectedPlant !== null
  const showAlert =
    !hasQuery && folder?.kind !== 'needswater' && waterNow.length > 0
  const dropPending = uploading || identifyPlantFromImage.isPending
  const photoFocusUrl =
    photoFocus && selectedPlant
      ? mediaUrl(selectedPlant.heroImageUrl)
      : undefined

  return (
    <div
      className="text-foreground flex h-full min-h-0 overflow-hidden bg-transparent"
      onDragEnter={(e) => {
        if (addOpen) return
        if (!hasDropPayload(e)) return
        e.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(e) => {
        if (addOpen) return
        if (!hasDropPayload(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={(e) => {
        if (addOpen) return
        if (!hasDropPayload(e)) return
        e.preventDefault()
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDrop={onWindowDrop}
    >
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        {showDetail ? (
          <div key={selectedPlant.id} className="flex min-h-0 flex-1 flex-col">
            <PlantDetail
              plant={selectedPlant}
              mediaUrl={mediaUrl}
              onBack={closePlant}
              onPatch={(patch) => handlePatch(selectedPlant.id, patch)}
              onAcquire={() => {
                void updatePlant
                  .mutateAsync({
                    id: selectedPlant.id,
                    ownershipStatus: 'owned',
                  })
                  .catch(() => undefined)
              }}
              acquiring={
                updatePlant.isPending &&
                updatePlant.variables?.id === selectedPlant.id
              }
              onWater={() => handleWater(selectedPlant.id)}
              onSnooze={(until) => handleSnooze(selectedPlant.id, until)}
              onGenerateCare={() => handleGenerateCare(selectedPlant.id)}
              regenerating={
                generateCare.isPending &&
                generateCare.variables === selectedPlant.id
              }
              onFavorite={(next) => handleFavorite(selectedPlant.id, next)}
              onMarkDeceased={() => {
                void updatePlant
                  .mutateAsync({
                    id: selectedPlant.id,
                    lifeStatus: 'deceased',
                    deceasedAt: new Date().toISOString(),
                  })
                  .catch(() => undefined)
              }}
              onRestore={() => {
                void updatePlant
                  .mutateAsync({ id: selectedPlant.id, lifeStatus: 'active' })
                  .catch(() => undefined)
              }}
              onDelete={() => handleDelete(selectedPlant.id)}
              onAddPhoto={(file) => handleAddPhoto(selectedPlant.id, file)}
              onSetHero={(path) => handleSetHero(selectedPlant.id, path)}
              addingPhoto={uploading || addPhoto.isPending}
              deleteRequestID={nativeDeleteRequestID}
            />
          </div>
        ) : (
          <>
            <AppHeader
              title={folder && !hasQuery ? folderTitle(folder) : 'Plants'}
              back={
                folder || hasQuery || mobileSearchOpen
                  ? () => {
                      if (hasQuery || mobileSearchOpen) {
                        setSearch('')
                        setMobileSearchOpen(false)
                      } else {
                        goHome()
                      }
                    }
                  : undefined
              }
              desktop={false}
              actions={
                mobileSearchOpen
                  ? []
                  : [
                      {
                        id: 'plants.search',
                        icon: Search,
                        label: 'Search plants',
                        onPress: () => {
                          pushMoldableNavigation({
                            id: 'search',
                            title: 'Search plants',
                          })
                          setMobileSearchOpen(true)
                          requestAnimationFrame(() => {
                            document
                              .querySelector<HTMLInputElement>('#plants-search')
                              ?.focus()
                          })
                        },
                      },
                      {
                        id: 'plants.add',
                        icon: Plus,
                        label: 'Add plant',
                        onPress: () => setAddOpen(true),
                      },
                    ]
              }
              mobileControls={
                mobileSearchOpen ? (
                  <SearchField
                    id="plants-search-mobile"
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Search plants"
                    aria-label="Search plants"
                    autoFocus
                    className="w-full"
                  />
                ) : undefined
              }
            />
            {/* Top rail: back + scope title, then search + add */}
            <DesktopOnly>
              <Toolbar
                variant="plain"
                position="top"
                material="none"
                className={cn(
                  'plants-collection-toolbar moldable-mobile-web-native-toolbar sticky top-0 shrink-0 gap-2 border-b bg-transparent',
                  mobileSearchOpen && 'plants-mobile-search-open',
                )}
              >
                {folder && !hasQuery ? (
                  <ToolbarBackButton
                    onClick={goHome}
                    label="Back to plant spaces"
                    tooltip={false}
                  />
                ) : null}
                <ToolbarContent>
                  {folder && !hasQuery ? (
                    <ToolbarTitle>
                      {folderTitle(folder)}
                      <span className="text-muted-foreground ml-1.5 font-normal tabular-nums">
                        {openPlants.length}
                      </span>
                    </ToolbarTitle>
                  ) : null}
                </ToolbarContent>

                <ToolbarActions>
                  <SearchField
                    id="plants-search"
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Search"
                    aria-label="Search plants"
                    className="plants-search-field bg-muted/70 ml-1 flex w-36 shrink border-transparent shadow-none sm:w-44 sm:shrink-0"
                    inputClassName="rounded-full border-0"
                  />
                  <ToolbarIconButton
                    label="Add plant"
                    tooltip
                    onClick={() => setAddOpen(true)}
                    className="size-10 shrink-0 cursor-pointer"
                  >
                    <Plus className="size-4" />
                  </ToolbarIconButton>
                </ToolbarActions>
              </Toolbar>
            </DesktopOnly>

            <div className="plants-collection-scroll min-h-0 flex-1 overflow-y-auto">
              <NotificationPermissionBanner
                enabled={hasWateringSchedules}
                onGranted={syncNotificationSchedules}
              />

              {/* Watering alert bar */}
              {showAlert && (
                <AlertsHeader
                  count={waterNow.length}
                  overdueCount={overdueCount}
                  onWaterAll={waterAllNow}
                  onReview={() => openFolder({ kind: 'needswater' })}
                />
              )}

              {/* Keep the first render on the shared loading treatment until the
                  workspace-scoped collection arrives. `data ?? []` below is
                  intentionally useful after a completed response, but must not
                  masquerade as a real empty collection while it is pending. */}
              {plantsQuery.isPending ? (
                <MoldableLoadingScreen
                  className="min-h-full"
                  label="Loading plants"
                />
              ) : hasQuery ? (
                searchResults.length > 0 ? (
                  <PlantGallery
                    key="search"
                    plants={searchResults}
                    mediaUrl={mediaUrl}
                    onOpen={openPlant}
                    onWater={(p) => handleWater(p.id)}
                    onToggleFavorite={handleToggleFavorite}
                    emptyAction={() => setAddOpen(true)}
                  />
                ) : (
                  <NoMatches query={deferredSearch.trim()} />
                )
              ) : folder ? (
                openPlants.length > 0 ? (
                  <PlantGallery
                    key={folderKeyId(folder)}
                    plants={openPlants}
                    mediaUrl={mediaUrl}
                    onOpen={openPlant}
                    onWater={(p) => handleWater(p.id)}
                    onToggleFavorite={handleToggleFavorite}
                    emptyAction={() => setAddOpen(true)}
                  />
                ) : (
                  <CenteredEmpty>
                    <EmptyState
                      onAdd={() => setAddOpen(true)}
                      variant={emptyVariant(folder)}
                    />
                  </CenteredEmpty>
                )
              ) : homeSections.length > 0 ? (
                <div className="space-y-7 pb-[calc(var(--chat-safe-padding,0px)+6rem)]">
                  {homeSections.map((section, sectionIndex) => (
                    <PlantSection
                      key={folderKeyId(section.key)}
                      title={section.title}
                      plants={section.plants}
                      indexOffset={sectionIndex * 2}
                      mediaUrl={mediaUrl}
                      onOpen={openPlant}
                      onWater={(plant) => handleWater(plant.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <CenteredEmpty>
                  <EmptyState onAdd={() => setAddOpen(true)} variant="all" />
                </CenteredEmpty>
              )}
            </div>
          </>
        )}
      </div>

      {/* Photo-focused fullscreen presentation (plants.ui.showPlant) */}
      {photoFocus && selectedPlant && (
        <button
          type="button"
          aria-label="Close photo view"
          onClick={() => setPhotoFocus(false)}
          className="fixed inset-0 z-[60] flex cursor-zoom-out flex-col items-center justify-center gap-4 bg-black p-6"
        >
          {photoFocusUrl ? (
            <img
              src={photoFocusUrl}
              alt={selectedPlant.commonName}
              className="min-h-0 max-w-full flex-1 rounded-lg object-contain"
            />
          ) : (
            <div className="flex size-40 items-center justify-center rounded-3xl bg-white/10">
              <Sprout className="size-16 text-white/40" />
            </div>
          )}
          <div className="shrink-0 text-center">
            <p className="text-lg font-semibold text-white">
              {selectedPlant.commonName}
            </p>
            {selectedPlant.scientificName && (
              <p className="text-sm italic text-white/60">
                {selectedPlant.scientificName}
              </p>
            )}
            <p className="mt-1 text-xs text-white/40">
              Click anywhere to close
            </p>
          </div>
        </button>
      )}

      {/* Window drop overlay */}
      {(dragging || dropPending) && (
        <div className="bg-background/80 pointer-events-none fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="border-primary bg-card flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-10 py-12 text-center shadow-lg">
            <div className="bg-primary/10 flex size-14 items-center justify-center rounded-2xl">
              <Sprout
                className={cn(
                  'text-primary size-7',
                  dropPending && 'animate-pulse',
                )}
              />
            </div>
            <div className="space-y-1">
              <p className="text-foreground text-base font-medium">
                {dropPending ? 'Creating plant' : 'Drop plant photos'}
              </p>
              <p className="text-muted-foreground text-sm">
                {dropPending
                  ? 'Identifying the photo and generating care.'
                  : "We'll identify and add them here."}
              </p>
            </div>
          </div>
        </div>
      )}

      {dropError && !dropPending && (
        <div className="pointer-events-none fixed bottom-[calc(var(--chat-safe-padding,0px)+1rem)] left-1/2 z-50 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2">
          <div className="border-destructive/30 bg-background text-destructive rounded-lg border px-3 py-2 text-sm shadow-lg">
            {dropError}
          </div>
        </div>
      )}

      {/* Add plant dialog */}
      <AddPlant
        open={addOpen}
        onClose={() => setAddOpen(false)}
        uploadFile={uploadFile}
        createManual={createManual}
        importPaths={importPaths}
        onIdentifyPhoto={async (media, ownershipStatus) => {
          const plant = await createFromMedia(media, ownershipStatus)
          openPlant(plant)
        }}
      />
    </div>
  )
}

function CenteredEmpty({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="plants-collection-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="flex h-full items-center justify-center pb-[calc(var(--chat-safe-padding,0px)+6rem)]">
        {children}
      </div>
    </div>
  )
}

function PlantSection({
  title,
  plants,
  indexOffset,
  mediaUrl,
  onOpen,
  onWater,
  onToggleFavorite,
}: {
  title: string
  plants: Plant[]
  indexOffset: number
  mediaUrl: (path?: string) => string | undefined
  onOpen: (plant: Plant) => void
  onWater: (plant: Plant) => void
  onToggleFavorite: (plant: Plant) => void
}): JSX.Element {
  return (
    <section aria-label={title}>
      <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-5">
        <h2 className="text-foreground text-[22px] font-semibold tracking-tight">
          {title}
        </h2>
        <span className="text-muted-foreground text-[15px] font-medium tabular-nums">
          {plants.length} {plants.length === 1 ? 'plant' : 'plants'}
        </span>
      </div>
      <div className="plant-mobile-grid grid gap-3 px-4 pt-1">
        {plants.map((plant, index) => (
          <PlantCard
            key={plant.id}
            index={indexOffset + index}
            plant={plant}
            mediaUrl={mediaUrl}
            onOpen={() => onOpen(plant)}
            onWater={() => onWater(plant)}
            onToggleFavorite={() => onToggleFavorite(plant)}
          />
        ))}
      </div>
    </section>
  )
}

function NoMatches({ query }: { query: string }): JSX.Element {
  return (
    <CenteredEmpty>
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="bg-muted flex size-14 items-center justify-center rounded-2xl">
          <Sprout className="text-muted-foreground size-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-foreground text-base font-medium">No matches</h2>
          <p className="text-muted-foreground max-w-xs text-sm">
            No plants match “{query}”.
          </p>
        </div>
      </div>
    </CenteredEmpty>
  )
}
