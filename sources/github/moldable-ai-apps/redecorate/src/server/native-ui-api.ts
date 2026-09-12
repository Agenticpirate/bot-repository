import { z } from 'zod'

const MAX_NATIVE_ASSETS = 16

export const nativeReadParamsSchema = z
  .object({
    route: z.enum(['home', 'collection', 'design']),
    view: z.enum(['all', 'favorites', 'folder']).optional(),
    id: z.string().trim().optional(),
    limit: z.number().int().min(1).max(MAX_NATIVE_ASSETS).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.route === 'collection' && !value.view) {
      context.addIssue({
        code: 'custom',
        path: ['view'],
        message: 'view is required for a design collection.',
      })
    }
    if ((value.route === 'design' || value.view === 'folder') && !value.id) {
      context.addIssue({
        code: 'custom',
        path: ['id'],
        message: 'id is required for this design route.',
      })
    }
  })

export const nativeMutateParamsSchema = z
  .object({
    action: z.literal('favorite'),
    id: z.string().trim().min(1),
    favorite: z.boolean(),
  })
  .strict()

export type NativeReadParams = z.infer<typeof nativeReadParamsSchema>

export type NativeIteration = {
  id: string
  prompt: string
  kind: string
  aspectRatio: string
  fileName: string
  createdAt: string
}

export type NativeDesign = {
  id: string
  title: string
  prompt: string
  folderId?: string | null
  favorite?: boolean
  archived?: boolean
  status?: 'generating' | 'ready' | 'failed'
  errorMessage?: string
  presetId?: string
  coverIterationId?: string
  updatedAt: string
  iterations: NativeIteration[]
}

export type NativeFolder = {
  id: string
  name: string
  emoji: string
  blurb?: string
}

function plainText(text: string | undefined): string {
  return (text ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_~`#>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function safeAssetPath(designId: string, fileName: string): string | null {
  if (
    !designId ||
    !fileName ||
    designId.includes('/') ||
    fileName.includes('/') ||
    fileName.includes('\\') ||
    fileName.includes(':') ||
    !/\.(?:png|jpe?g|webp)$/i.test(fileName)
  ) {
    return null
  }
  return `assets/${designId}/${fileName}`
}

function displayIteration(design: NativeDesign): NativeIteration | undefined {
  return (
    design.iterations.find(
      (iteration) => iteration.id === design.coverIterationId,
    ) ?? design.iterations.at(-1)
  )
}

function designCard(design: NativeDesign) {
  const iteration = displayIteration(design)
  const path = iteration ? safeAssetPath(design.id, iteration.fileName) : null
  const status = design.status ?? (iteration ? 'ready' : 'generating')
  const statusLabel =
    status === 'generating'
      ? 'Rendering'
      : status === 'failed'
        ? 'Render failed'
        : `${design.iterations.length} ${design.iterations.length === 1 ? 'version' : 'versions'}`
  return {
    id: design.id,
    title: design.title || 'Untitled design',
    subtitle: statusLabel,
    imageURL: path ?? '',
    favoriteLabel: design.favorite ? 'Remove favorite' : 'Add to favorites',
    favoriteValue: !design.favorite,
    archiveLabel: 'Archive design',
    designName: design.title || 'Untitled design',
  }
}

function collectionCover(designs: NativeDesign[]) {
  for (const design of designs) {
    const iteration = displayIteration(design)
    const path = iteration ? safeAssetPath(design.id, iteration.fileName) : null
    if (path) return { path, title: design.title }
  }
  return null
}

export function projectNativeHome(
  designs: NativeDesign[],
  folders: NativeFolder[],
) {
  const live = designs
    .filter((design) => !design.archived)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const favorites = live.filter((design) => design.favorite)
  const allCover = collectionCover(live)
  const favoriteCover = collectionCover(favorites)
  const builtIn = [
    {
      view: 'all',
      id: '',
      title: 'All designs',
      subtitle: `${live.length} ${live.length === 1 ? 'design' : 'designs'}`,
      imageURL: allCover?.path ?? '',
      icon: 'square.grid.2x2',
    },
    ...(favorites.length > 0
      ? [
          {
            view: 'favorites',
            id: '',
            title: 'Favorites',
            subtitle: `${favorites.length} saved`,
            imageURL: favoriteCover?.path ?? '',
            icon: 'heart.fill',
          },
        ]
      : []),
  ]
  const visibleFolders = folders.slice(0, 10).map((folder) => {
    const inFolder = live.filter((design) => design.folderId === folder.id)
    const cover = collectionCover(inFolder)
    return {
      view: 'folder',
      id: folder.id,
      title: folder.name,
      subtitle: `${inFolder.length} ${inFolder.length === 1 ? 'design' : 'designs'}`,
      imageURL: cover?.path ?? '',
      icon: 'folder',
    }
  })
  return {
    summary: `${live.length} ${live.length === 1 ? 'design' : 'designs'} across ${folders.length} spaces`,
    collections: [...builtIn, ...visibleFolders],
    folderNotice:
      folders.length > visibleFolders.length
        ? `Showing ${visibleFolders.length} of ${folders.length} spaces.`
        : '',
    emptyStates:
      live.length === 0
        ? [
            {
              title: 'No designs yet',
              description:
                'Generate from a prompt on iPhone, or import a room photo from Redecorate on your Mac.',
            },
          ]
        : [],
  }
}

export function projectNativeCollection(
  designs: NativeDesign[],
  folders: NativeFolder[],
  params: NativeReadParams,
) {
  const live = designs
    .filter((design) => !design.archived)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  let title = 'All designs'
  let subtitle = `${live.length} designs`
  let selected = live
  let selectedFolder: NativeFolder | undefined
  if (params.view === 'favorites') {
    title = 'Favorites'
    selected = live.filter((design) => design.favorite)
    subtitle = `${selected.length} saved designs`
  } else if (params.view === 'folder') {
    const folder = folders.find((item) => item.id === params.id)
    if (!folder) return null
    selectedFolder = folder
    title = `${folder.emoji} ${folder.name}`
    selected = live.filter((design) => design.folderId === folder.id)
    subtitle = folder.blurb || `${selected.length} designs`
  }
  const limit = params.limit ?? MAX_NATIVE_ASSETS
  const visible = selected.slice(0, limit)
  return {
    title,
    subtitle,
    designs: visible.map(designCard),
    folderEdits: selectedFolder
      ? [{ folderId: selectedFolder.id, name: selectedFolder.name }]
      : [],
    folderDeleteActions: selectedFolder
      ? [
          {
            folderId: selectedFolder.id,
            folderName: selectedFolder.name,
            label: 'Delete space',
          },
        ]
      : [],
    truncationNotice:
      selected.length > visible.length
        ? `Showing ${visible.length} of ${selected.length} designs.`
        : '',
    emptyStates:
      selected.length === 0
        ? [
            {
              title:
                params.view === 'favorites'
                  ? 'No favorites yet'
                  : 'No designs here',
              description:
                'Import a photo or generate a redesign from the desktop app.',
            },
          ]
        : [],
  }
}

export function projectNativeDesign(
  design: NativeDesign,
  folders: NativeFolder[] = [],
) {
  const displayed = displayIteration(design)
  const heroPath = displayed
    ? safeAssetPath(design.id, displayed.fileName)
    : null
  const variants = [...design.iterations]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((iteration) => iteration.id !== displayed?.id)
    .slice(0, MAX_NATIVE_ASSETS - (heroPath ? 1 : 0))
    .map((iteration) => {
      const path = safeAssetPath(design.id, iteration.fileName)
      return {
        id: iteration.id,
        title:
          iteration.kind === 'upload'
            ? 'Original'
            : `${iteration.kind.charAt(0).toUpperCase()}${iteration.kind.slice(1)}`,
        subtitle: `${iteration.aspectRatio} · ${new Date(iteration.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        imageURL: path ?? '',
      }
    })
  const status = design.status ?? (displayed ? 'ready' : 'generating')
  return {
    id: design.id,
    title: design.title || 'Untitled design',
    imageURL: heroPath ?? '',
    displayedIterationId: displayed?.id ?? '',
    canCancel: status === 'generating',
    canRetry: status === 'failed',
    canFavorite: status === 'ready',
    canRemix: status === 'ready' && Boolean(displayed),
    canManage: true,
    favoriteLabel: design.favorite ? 'Remove favorite' : 'Favorite',
    favoriteValue: !design.favorite,
    stateTags: [
      status === 'generating'
        ? 'Rendering'
        : status === 'failed'
          ? 'Needs attention'
          : 'Ready',
      ...(design.favorite ? ['Favorite'] : []),
    ],
    favoriteActions: [
      {
        label: design.favorite ? 'Remove favorite' : 'Add to favorites',
        designId: design.id,
        favorite: !design.favorite,
      },
    ],
    moveActions: [
      {
        label: design.folderId ? 'Move to All designs' : 'In All designs',
        designId: design.id,
        folderId: null,
      },
      ...folders.map((folder) => ({
        label:
          design.folderId === folder.id
            ? `In ${folder.name}`
            : `Move to ${folder.name}`,
        designId: design.id,
        folderId: folder.id,
      })),
    ],
    archiveActions: [
      { label: 'Archive design', designId: design.id, archived: true },
    ],
    deleteActions: [{ label: 'Delete design', designId: design.id }],
    retryActions:
      status === 'failed'
        ? [{ label: 'Retry render', designId: design.id }]
        : [],
    cancelActions:
      status === 'generating'
        ? [{ label: 'Cancel render', designId: design.id }]
        : [],
    promptCards: plainText(design.prompt)
      ? [{ title: 'Design direction', text: plainText(design.prompt) }]
      : [],
    failureNotices:
      status === 'failed'
        ? [
            {
              title: 'This render needs attention',
              message:
                plainText(design.errorMessage) ||
                'Open Redecorate on desktop to retry this design.',
            },
          ]
        : [],
    renderingNotices:
      status === 'generating'
        ? [
            {
              title: 'Rendering on your Mac',
              message:
                'Reopen or refresh this design after the render completes.',
            },
          ]
        : [],
    variantSections:
      variants.length > 0
        ? [
            {
              title: 'Earlier versions',
              subtitle: `${design.iterations.length} total versions`,
              items: variants,
            },
          ]
        : [],
  }
}
