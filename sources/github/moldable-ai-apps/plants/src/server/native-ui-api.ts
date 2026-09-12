import { randomMemorialEulogy } from '../lib/memorial-eulogies'
import { type Plant, dueState, nextDueAt } from '../lib/types'
import { z } from 'zod'

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_NATIVE_ASSETS = 16

const collectionViewSchema = z.enum([
  'all',
  'favorites',
  'needswater',
  'wishlist',
  'memorials',
  'unplaced',
  'room',
  'search',
])

const optionalRouteTextSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().max(120).optional(),
)

export const nativeReadParamsSchema = z
  .object({
    route: z.enum(['home', 'collection', 'plant', 'care', 'journal']),
    id: z.string().min(1).optional(),
    view: collectionViewSchema.optional(),
    room: optionalRouteTextSchema,
    query: optionalRouteTextSchema,
    limit: z.number().int().min(1).max(MAX_NATIVE_ASSETS).optional(),
  })
  .superRefine((value, context) => {
    if (['plant', 'care', 'journal'].includes(value.route) && !value.id) {
      context.addIssue({
        code: 'custom',
        path: ['id'],
        message: 'id is required for plant, care, and journal routes.',
      })
    }
    if (value.route === 'collection' && !value.view) {
      context.addIssue({
        code: 'custom',
        path: ['view'],
        message: 'view is required for collection routes.',
      })
    }
    if (value.view === 'room' && !value.room?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['room'],
        message: 'room is required for the room collection.',
      })
    }
    if (value.view === 'search' && !value.query?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['query'],
        message: 'query is required for the search collection.',
      })
    }
  })

export const nativeMutateParamsSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('water'),
    id: z.string().min(1),
    at: z.string().datetime().optional(),
  }),
  z.object({
    action: z.literal('favorite'),
    id: z.string().min(1),
    isFavorite: z.boolean(),
  }),
  z.object({
    action: z.literal('refreshMemorialEulogy'),
    id: z.string().min(1),
  }),
])

export const nativeAcquireParamsSchema = z
  .object({ id: z.string().min(1) })
  .strict()

export const nativeGenerateCareParamsSchema = z
  .object({ id: z.string().min(1) })
  .strict()

const optionalNativeText = (maximum: number) =>
  z
    .string()
    .max(maximum)
    .transform((value) => value.trim() || undefined)

export const nativeCreateParamsSchema = z
  .object({
    commonName: z.string().trim().min(1).max(120),
    ownershipStatus: z.enum(['owned', 'wishlist']),
    scientificName: optionalNativeText(160),
    room: optionalNativeText(120),
  })
  .strict()

export const nativeUpdateParamsSchema = z
  .object({
    id: z.string().min(1),
    commonName: z.string().trim().min(1).max(120),
    scientificName: optionalNativeText(160),
    room: optionalNativeText(120),
    location: optionalNativeText(160),
    notes: optionalNativeText(12_000),
    waterIntervalDays: z.number().int().min(0).max(365),
  })
  .strict()

export const nativeDeleteParamsSchema = z
  .object({ id: z.string().min(1) })
  .strict()

export const nativeSnoozeParamsSchema = z
  .object({ id: z.string().min(1), days: z.number().int().min(1).max(14) })
  .strict()

export const nativeSetHeroParamsSchema = z
  .object({ id: z.string().min(1), path: z.string().min(1).max(1_024) })
  .strict()

export const nativeConfirmIdentificationParamsSchema = z
  .object({
    id: z.string().min(1),
    scientificName: z.string().trim().min(1).max(200),
    commonName: z.string().trim().min(1).max(200).optional(),
  })
  .strict()

export type NativeReadParams = z.infer<typeof nativeReadParamsSchema>
type NativeCollectionView = z.infer<typeof collectionViewSchema>

function wholeDaysBetween(fromMs: number, toMs: number): number {
  return Math.round((toMs - fromMs) / DAY_MS)
}

function needsWaterNow(plant: Plant, now: Date): boolean {
  const state = dueState(plant, now)
  return state === 'overdue' || state === 'today'
}

function plainText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_`#>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function shortDate(iso: string | undefined, now: Date): string {
  if (!iso) return 'Not yet'
  const timestamp = new Date(iso).getTime()
  if (Number.isNaN(timestamp)) return 'Not yet'
  const days = wholeDaysBetween(timestamp, now.getTime())
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function isSameLocalDay(iso: string | undefined, now: Date): boolean {
  if (!iso) return false
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function nextWateringLabel(iso: string | null, now: Date): string | null {
  if (!iso) return null
  const timestamp = new Date(iso).getTime()
  if (Number.isNaN(timestamp)) return null
  const days = Math.ceil((timestamp - now.getTime()) / DAY_MS)
  if (days <= 0) return 'Next watering is due now'
  if (days === 1) return 'Next watering tomorrow'
  if (days <= 14) return `Next watering in ${days} days`
  return `Next watering ${new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`
}

function waterStatus(plant: Plant, now: Date): string {
  if (plant.lifeStatus === 'deceased') return 'Remembered'
  if (plant.ownershipStatus === 'wishlist') return 'Saved for later'
  const due = nextDueAt(plant, now)
  if (!due) return 'No watering schedule'
  if (!plant.lastWateredAt) return 'Ready to start'
  const state = dueState(plant, now)
  const days = wholeDaysBetween(now.getTime(), new Date(due).getTime())
  if (state === 'overdue') {
    const overdue = Math.max(1, Math.abs(days))
    return `Overdue ${overdue} ${overdue === 1 ? 'day' : 'days'}`
  }
  if (state === 'today') return 'Water today'
  if (state === 'soon') return days <= 1 ? 'Water tomorrow' : 'Water soon'
  return days <= 6
    ? `Happy for ${days} more ${days === 1 ? 'day' : 'days'}`
    : 'Happy and hydrated'
}

function plantCard(plant: Plant, now: Date) {
  return {
    id: plant.id,
    commonName: plant.commonName,
    scientificName: plant.scientificName ?? '',
    heroImageUrl: plant.heroImageUrl ?? '',
    room: plant.room ?? '',
    location: plant.location ?? '',
    waterStatus: waterStatus(plant, now),
    favoriteLabel: plant.isFavorite
      ? 'Remove from Favorites'
      : 'Add to Favorites',
    favoriteValue: !plant.isFavorite,
  }
}

function folderSubtitle(plants: Plant[], now: Date): string {
  const due = plants.filter((plant) => needsWaterNow(plant, now)).length
  const count = `${plants.length} ${plants.length === 1 ? 'plant' : 'plants'}`
  return due > 0 ? `${count} · ${due} need water` : count
}

export function projectNativeHome(live: Plant[], now: Date) {
  const active = live.filter((plant) => plant.lifeStatus !== 'deceased')
  const memorials = live.filter((plant) => plant.lifeStatus === 'deceased')
  const owned = active.filter((plant) => plant.ownershipStatus !== 'wishlist')
  const wishlist = active.filter(
    (plant) => plant.ownershipStatus === 'wishlist',
  )
  const favorites = owned.filter((plant) => plant.isFavorite)
  const unplaced = owned.filter((plant) => !plant.room?.trim())
  const due = owned.filter((plant) => needsWaterNow(plant, now))
  const rooms = new Map<string, Plant[]>()
  for (const plant of owned) {
    const room = plant.room?.trim()
    if (!room) continue
    const roomPlants = rooms.get(room)
    if (roomPlants) roomPlants.push(plant)
    else rooms.set(room, [plant])
  }

  const folder = (
    view: NativeCollectionView,
    title: string,
    plants: Plant[],
    room = '',
  ) => ({
    view,
    room,
    title,
    subtitle: folderSubtitle(plants, now),
    heroImageUrl:
      plants.find((plant) => plant.heroImageUrl)?.heroImageUrl ?? '',
  })

  const folders = []
  if (owned.length > 0) folders.push(folder('all', 'All plants', owned))
  if (wishlist.length > 0) {
    folders.push({
      ...folder('wishlist', 'Future Plants', wishlist),
      subtitle: `${wishlist.length} saved for later`,
    })
  }
  if (favorites.length > 0) {
    folders.push(folder('favorites', 'Favorites', favorites))
  }
  if (memorials.length > 0) {
    folders.push({
      ...folder('memorials', 'In memory of…', memorials),
      subtitle: `${memorials.length} remembered`,
    })
  }
  for (const [room, plants] of [...rooms.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    folders.push(folder('room', room, plants, room))
  }
  if (unplaced.length > 0) {
    folders.push(folder('unplaced', 'Unplaced', unplaced))
  }

  return {
    collectionSummary:
      owned.length === 0
        ? 'Your collection'
        : `${owned.length} ${owned.length === 1 ? 'plant' : 'plants'} across your spaces`,
    waterAlerts:
      due.length === 0
        ? []
        : [
            {
              title:
                due.length === 1
                  ? '1 plant needs water'
                  : `${due.length} plants need water`,
              message:
                dueState(due[0]!, now) === 'overdue'
                  ? 'Review the thirsty plants.'
                  : 'Today’s watering is ready when you are.',
            },
          ],
    folders: folders.slice(0, 12),
    folderNotices:
      folders.length > 12
        ? [
            {
              text: 'Showing 12 spaces. Open All plants to see the full collection.',
            },
          ]
        : [],
    emptyStates:
      live.length === 0
        ? [
            {
              title: 'No plants yet',
              description:
                'Use Add plant to enter a name now, or use desktop when you want photo identification.',
            },
          ]
        : [],
  }
}

export function projectNativeCollection(
  live: Plant[],
  params: NativeReadParams,
  now: Date,
) {
  const active = live.filter((plant) => plant.lifeStatus !== 'deceased')
  const memorials = live.filter((plant) => plant.lifeStatus === 'deceased')
  const owned = active.filter((plant) => plant.ownershipStatus !== 'wishlist')
  const room = params.room?.trim() ?? ''
  let title = 'All plants'
  let sectionTitle = 'Your collection'
  let emptyTitle = 'No plants yet'
  let emptyDescription =
    'Use Add plant to enter a name now, or use desktop when you want photo identification.'
  let selected = owned

  switch (params.view) {
    case 'favorites':
      title = 'Favorites'
      sectionTitle = 'Saved favorites'
      selected = owned.filter((plant) => plant.isFavorite)
      emptyTitle = 'No favorites'
      emptyDescription = 'Favorite a plant to keep it close at hand.'
      break
    case 'needswater':
      title = 'Needs water'
      sectionTitle = 'Watering queue'
      selected = owned.filter((plant) => needsWaterNow(plant, now))
      emptyTitle = 'All watered'
      emptyDescription = 'Nothing needs water right now.'
      break
    case 'wishlist':
      title = 'Future Plants'
      sectionTitle = 'Saved for later'
      selected = active.filter((plant) => plant.ownershipStatus === 'wishlist')
      emptyTitle = 'No future plants'
      emptyDescription =
        'Use Add plant and choose Future plants to save one for later.'
      break
    case 'memorials':
      title = 'In memory of…'
      sectionTitle = 'Remembered plants'
      selected = memorials
      emptyTitle = 'No memorials'
      emptyDescription = 'Plants marked as deceased will be remembered here.'
      break
    case 'unplaced':
      title = 'Unplaced'
      sectionTitle = 'Choose a space'
      selected = owned.filter((plant) => !plant.room?.trim())
      emptyTitle = 'Everything has a place'
      emptyDescription = 'Every plant in your collection has a room.'
      break
    case 'room':
      title = room
      sectionTitle = 'In this space'
      selected = owned.filter(
        (plant) => plant.room?.trim().toLowerCase() === room.toLowerCase(),
      )
      emptyTitle = 'Nothing here'
      emptyDescription = 'Edit a plant and assign it to this room.'
      break
    case 'search': {
      const query = params.query?.trim().toLowerCase() ?? ''
      title = `Results for “${params.query?.trim() ?? ''}”`
      sectionTitle = 'Search results'
      selected = live.filter((plant) =>
        [
          plant.commonName,
          plant.scientificName,
          plant.nickname,
          plant.room,
          plant.location,
          plant.family,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query),
      )
      emptyTitle = 'No matching plants'
      emptyDescription = 'Try a plant name, room, nickname, or growing spot.'
      break
    }
    default:
      break
  }

  const limit = params.limit ?? MAX_NATIVE_ASSETS
  const ordered = [...selected].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )
  const visible = ordered.slice(0, limit)
  return {
    title,
    sectionTitle,
    subtitle: folderSubtitle(selected, now),
    truncationNotices:
      selected.length > visible.length
        ? [
            {
              text: `Showing the ${visible.length} most recently updated plants.`,
            },
          ]
        : [],
    plants: visible.map((plant) => plantCard(plant, now)),
    emptyStates:
      selected.length === 0
        ? [{ title: emptyTitle, description: emptyDescription }]
        : [],
  }
}

function temperatureLabel(
  value: { min?: number; max?: number } | undefined,
): string {
  if (!value || (value.min == null && value.max == null)) return ''
  if (value.min != null && value.max != null) {
    return `${value.min}–${value.max}°F`
  }
  return value.min != null ? `At least ${value.min}°F` : `Up to ${value.max}°F`
}

export function projectNativeDetail(
  plant: Plant,
  now: Date,
  view: 'plant' | 'care' | 'journal',
) {
  const isWishlist = plant.ownershipStatus === 'wishlist'
  const isMemorial = plant.lifeStatus === 'deceased'
  const statusTags = [
    isMemorial
      ? 'In memory of…'
      : isWishlist
        ? 'Future plant'
        : plant.room?.trim(),
    isWishlist ? undefined : plant.location?.trim(),
    plant.isFavorite ? 'Favorite' : undefined,
  ].filter((value): value is string => Boolean(value))
  const due = nextDueAt(plant, now)
  const cadence = plant.waterIntervalDays ?? plant.care?.water?.intervalDays
  const wateredToday =
    !isWishlist && !isMemorial && isSameLocalDay(plant.lastWateredAt, now)
  const nextWatering = nextWateringLabel(due, now)
  const memorialEulogy = isMemorial
    ? randomMemorialEulogy(plant.commonName)
    : undefined
  const waterDetail = isMemorial
    ? memorialEulogy!
    : isWishlist
      ? 'Care is ready, but watering reminders stay off until this plant joins your collection.'
      : [
          plant.lastWateredAt
            ? `Watered ${shortDate(plant.lastWateredAt, now).toLowerCase()}`
            : 'No watering recorded yet',
          cadence ? `Every ${cadence} ${cadence === 1 ? 'day' : 'days'}` : null,
          nextWatering,
        ]
          .filter(Boolean)
          .join(' · ')
  const recentWaterings = [...(plant.waterHistory ?? [])]
    .reverse()
    .slice(0, 5)
    .map((event) => ({ title: 'Watered', timestamp: shortDate(event.at, now) }))
  const sourcePhotos =
    plant.photos && plant.photos.length > 0
      ? plant.photos
      : plant.heroImageUrl
        ? [{ path: plant.heroImageUrl, addedAt: plant.createdAt }]
        : []
  const photos = [...sourcePhotos]
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .slice(0, MAX_NATIVE_ASSETS)
    .map((photo) => ({
      plantId: plant.id,
      path: photo.path,
      caption: plainText(photo.caption?.trim() || 'Growth photo'),
      dateLabel: shortDate(photo.addedAt, now),
      heroLabel: photo.path === plant.heroImageUrl ? 'Current portrait' : '',
      setHeroLabel:
        photo.path === plant.heroImageUrl
          ? 'Keep as portrait'
          : 'Use as portrait',
    }))
  const care = plant.care
  const careTiles = [
    care?.light ? { label: 'Light', value: plainText(care.light) } : null,
    temperatureLabel(care?.temperatureF)
      ? { label: 'Temperature', value: temperatureLabel(care?.temperatureF) }
      : null,
    care?.humidity
      ? { label: 'Humidity', value: plainText(care.humidity) }
      : null,
    care?.soil ? { label: 'Soil', value: plainText(care.soil) } : null,
    care?.feeding
      ? {
          label: 'Feeding',
          value: plainText(
            [
              care.feeding.intervalDays
                ? `Every ${care.feeding.intervalDays} days`
                : null,
              care.feeding.fertilizer,
              care.feeding.season,
            ]
              .filter(Boolean)
              .join(' · '),
          ),
        }
      : null,
    care?.dormancy
      ? { label: 'Dormancy', value: plainText(care.dormancy) }
      : null,
    care?.toxicity
      ? { label: 'Toxicity', value: plainText(care.toxicity) }
      : null,
  ].filter((value): value is { label: string; value: string } =>
    Boolean(value?.value),
  )
  const careGuideSections = [
    care?.water?.method || care?.water?.notes || care?.water?.amountMl
      ? {
          title: 'Watering',
          text: plainText(
            [
              care.water.amountMl ? `${care.water.amountMl} ml` : null,
              care.water.method,
              care.water.notes,
            ]
              .filter(Boolean)
              .join(' — '),
          ),
        }
      : null,
    care?.feeding?.notes
      ? { title: 'Feeding', text: plainText(care.feeding.notes) }
      : null,
    care?.careMarkdown
      ? { title: 'Full guide', text: plainText(care.careMarkdown) }
      : null,
  ].filter((value): value is { title: string; text: string } =>
    Boolean(value?.text),
  )
  const hasCare = Boolean(
    care?.summary || careTiles.length > 0 || careGuideSections.length > 0,
  )

  if (view === 'journal') {
    return {
      id: plant.id,
      commonName: plant.commonName,
      photos,
      photoCountLabel: `${sourcePhotos.length} ${sourcePhotos.length === 1 ? 'photo' : 'photos'}`,
      journalNotice:
        sourcePhotos.length > photos.length
          ? `Showing the ${photos.length} most recent photos. Tap one to use it as the portrait; add photos on desktop.`
          : 'Tap a photo to use it as the portrait. Add photos on desktop.',
      journalEmptyStates:
        sourcePhotos.length === 0
          ? [
              {
                title: 'No growth photos yet',
                description:
                  'Add the first journal photo from the desktop app.',
              },
            ]
          : [],
    }
  }

  if (view === 'care') {
    return {
      id: plant.id,
      commonName: plant.commonName,
      careSummary: care?.summary ? [{ message: plainText(care.summary) }] : [],
      careTiles,
      careGuideSections,
      careProblems:
        care?.commonProblems && care.commonProblems.length > 0
          ? [{ tags: care.commonProblems.slice(0, 12).map(plainText) }]
          : [],
      careEmptyStates: hasCare
        ? []
        : [
            {
              title: 'Add a care guide',
              description:
                'Generate a watering rhythm, light, feeding, and more below.',
            },
          ],
      careGeneratedLabels: care?.generatedAt
        ? [
            {
              text: `Generated ${shortDate(care.generatedAt, now).toLowerCase()}`,
            },
          ]
        : [],
      generateCareActions: [
        {
          plantId: plant.id,
          label: hasCare ? 'Refresh care guide' : 'Generate care guide',
        },
      ],
    }
  }

  return {
    id: plant.id,
    commonName: plant.commonName,
    isMemorial,
    scientificNames: plant.scientificName
      ? [{ text: plant.scientificName }]
      : [],
    heroImageUrl: plant.heroImageUrl ?? '',
    statusTags,
    waterInfoPanels: wateredToday
      ? []
      : [
          {
            title: isMemorial
              ? 'In loving memory'
              : isWishlist
                ? 'Saved for the future'
                : waterStatus(plant, now),
            message: waterDetail,
          },
        ],
    waterSuccessPanels: wateredToday
      ? [
          {
            title: 'Watered today',
            message: [
              cadence
                ? `Every ${cadence} ${cadence === 1 ? 'day' : 'days'}`
                : null,
              nextWatering,
            ]
              .filter(Boolean)
              .join(' · '),
          },
        ]
      : [],
    waterActions:
      isWishlist || isMemorial
        ? []
        : wateredToday
          ? []
          : [{ plantId: plant.id, label: 'Water now' }],
    memorialEulogyActions: isMemorial
      ? [{ plantId: plant.id, label: 'Show another epitaph' }]
      : [],
    favoriteActions: [
      {
        plantId: plant.id,
        label: plant.isFavorite ? 'Remove favorite' : 'Add to favorites',
        isFavorite: !plant.isFavorite,
      },
    ],
    acquireActions: isWishlist
      ? [{ plantId: plant.id, label: 'Add to my plants' }]
      : [],
    editActions: [{ plantId: plant.id, label: 'Edit plant' }],
    snoozeActions:
      !isWishlist && !isMemorial && needsWaterNow(plant, now)
        ? [
            {
              plantId: plant.id,
              days: 2,
              label: 'Still moist · remind me in 2 days',
            },
          ]
        : [],
    deleteActions: [{ plantId: plant.id, label: 'Delete plant' }],
    identificationSections:
      (plant.identification?.source === 'vision' ||
        plant.identification?.source === 'chat') &&
      !plant.identification.confirmedAt &&
      plant.scientificName?.trim()
        ? [{ title: 'Confirm identification' }]
        : [],
    identificationActions:
      (plant.identification?.source === 'vision' ||
        plant.identification?.source === 'chat') &&
      !plant.identification.confirmedAt &&
      plant.scientificName?.trim()
        ? [
            {
              plantId: plant.id,
              scientificName: plant.scientificName,
              commonName: plant.commonName,
              label: `Confirm ${plant.scientificName}`,
            },
          ]
        : [],
    identificationCandidates: !plant.identification?.confirmedAt
      ? (plant.identification?.candidates ?? [])
          .slice(0, 5)
          .map((candidate) => ({
            plantId: plant.id,
            scientificName: candidate.name,
            commonName: candidate.commonName ?? candidate.name,
            label: candidate.commonName
              ? `${candidate.commonName} · ${candidate.name}`
              : candidate.name,
          }))
      : [],
    commonNameDraft: plant.commonName,
    scientificNameDraft: plant.scientificName ?? '',
    roomDraft: isWishlist ? '' : (plant.room ?? ''),
    locationDraft: isWishlist ? '' : (plant.location ?? ''),
    notesDraft: plant.notes ?? '',
    waterIntervalDaysDraft: isWishlist ? 0 : (plant.waterIntervalDays ?? 0),
    waterHistorySections:
      recentWaterings.length > 0 ? [{ items: recentWaterings }] : [],
    notes: plant.notes?.trim()
      ? [{ title: 'Notes', text: plainText(plant.notes.trim()) }]
      : [],
  }
}
