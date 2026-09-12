import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FolderClosed,
  Heart,
  ImagePlus,
  Layers,
  Loader2,
  MoreVertical,
  Paintbrush,
  PanelTop,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  DragEvent,
  ReactNode,
  PointerEvent as ReactPointerEvent,
} from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AppFrameContent,
  AppHeader,
  Button,
  DesktopOnly,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  ToolbarContent,
  ToolbarTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  downloadFile,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  useMoldableNavigationPop,
  useMoldablePlatform,
  useWorkspace,
} from '@moldable-ai/ui'
import { type Catalog, StyleLibrary } from './components/style-library'
import { ZoomableImage } from './components/zoomable-image'
import type { PromptTemplate, SpaceKind, StylePreset } from '../shared/catalog'
import type { RedecorateUiIntent } from '../shared/ui-intent'
import { parseJson, parseJsonArray } from './api-response'

// ─── Types (mirror the server's serialized shapes) ───────────────────────────

type AspectRatioId =
  | 'square'
  | 'portrait'
  | 'story'
  | 'landscape'
  | 'widescreen'

type Iteration = {
  id: string
  prompt: string
  kind: 'generation' | 'edit' | 'upload' | 'background-removal'
  aspectRatio: AspectRatioId
  mimeType: string
  parentIterationId?: string
  imageUrl: string
  imagePath?: string
  createdAt: string
}

type PendingIteration = {
  id?: string
  kind: 'generation' | 'edit'
  prompt: string
  aspectRatio: AspectRatioId
  startedAt: string
}

type Design = {
  id: string
  title: string
  prompt: string
  aspectRatio: AspectRatioId
  status: 'generating' | 'ready' | 'failed'
  errorMessage?: string
  titlePending?: boolean
  folderId?: string | null
  favorite?: boolean
  archived?: boolean
  presetId?: string
  coverIterationId?: string
  pendingIteration?: PendingIteration
  pendingIterations?: PendingIteration[]
  createdAt: string
  updatedAt: string
  latestImageUrl: string | null
  iterations: Iteration[]
}

type Folder = {
  id: string
  name: string
  emoji: string
  tone: string
  space: SpaceKind
  blurb?: string
  sortOrder?: number
  designCount: number
  covers: string[]
}

function FolderGlyph({
  emoji,
  className,
  fallbackClassName,
}: {
  emoji: string
  className?: string
  fallbackClassName?: string
}) {
  const platform = useMoldablePlatform()
  const isMobileWeb = platform === 'mobileWeb'

  return isMobileWeb ? (
    <FolderClosed aria-hidden className={fallbackClassName} />
  ) : (
    <span className={cn('rd-emoji', className)}>{emoji}</span>
  )
}

const ASPECT_RATIOS: { id: AspectRatioId; label: string; ratio: string }[] = [
  { id: 'square', label: 'Square', ratio: '1:1' },
  { id: 'landscape', label: 'Landscape', ratio: '4:3' },
  { id: 'widescreen', label: 'Widescreen', ratio: '16:9' },
  { id: 'portrait', label: 'Portrait', ratio: '3:4' },
  { id: 'story', label: 'Tall', ratio: '9:16' },
]

const ASPECT_PREVIEW_CLASS: Record<AspectRatioId, string> = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  story: 'aspect-[9/16]',
  landscape: 'aspect-[4/3]',
  widescreen: 'aspect-[16/9]',
}

const SUPPORTED_SOURCE_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/gif',
  'image/bmp',
  'image/jp2',
  'image/jpx',
])
const SUPPORTED_SOURCE_IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'avif',
  'heic',
  'heif',
  'tif',
  'tiff',
  'gif',
  'bmp',
  'jp2',
  'j2k',
  'jpf',
  'jpx',
])
const SUPPORTED_SOURCE_IMAGE_LABEL =
  'PNG, JPEG, WEBP, AVIF, HEIC, HEIF, TIFF, GIF, BMP, or JPEG 2000'

function aspectLabel(id: AspectRatioId) {
  return ASPECT_RATIOS.find((ratio) => ratio.id === id) ?? ASPECT_RATIOS[0]
}

// ─── Small helpers ───────────────────────────────────────────────────────────

function sendChatInstructions(text: string) {
  window.parent.postMessage(
    { type: 'moldable:set-chat-instructions', text },
    '*',
  )
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
}

type RpcResponse<T> =
  | { ok: true; result: T }
  | { ok: false; error?: { message?: string } }

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

async function downloadIteration(iteration: Iteration) {
  const response = await fetch(iteration.imageUrl)
  if (!response.ok) throw new Error('Failed to read image for download')
  const mimeType = response.headers.get('content-type') ?? iteration.mimeType
  const extension = mimeType.includes('jpeg')
    ? 'jpg'
    : mimeType.includes('webp')
      ? 'webp'
      : 'png'
  await downloadFile({
    filename: `redecorate-${iteration.id}.${extension}`,
    data: arrayBufferToBase64(await response.arrayBuffer()),
    mimeType,
    isBase64: true,
  })
}

function extensionForName(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name)
  return match?.[1]?.toLowerCase() ?? ''
}

function sourceImageImportError(rejectedNames: string[]): string {
  const shownNames = rejectedNames.slice(0, 3).join(', ')
  const suffix =
    rejectedNames.length > 3 ? `, and ${rejectedNames.length - 3} more` : ''
  const subject = shownNames ? `${shownNames}${suffix}` : 'That file'
  return `${subject} cannot be imported. Redecorate supports ${SUPPORTED_SOURCE_IMAGE_LABEL} images for remix sources.`
}

function imageFilesFromList(fileList: FileList): {
  files: File[]
  rejectedNames: string[]
} {
  const files: File[] = []
  const rejectedNames: string[] = []
  for (const file of Array.from(fileList)) {
    const extension = extensionForName(file.name)
    if (
      SUPPORTED_SOURCE_IMAGE_TYPES.has(file.type.toLowerCase()) ||
      SUPPORTED_SOURCE_IMAGE_EXTENSIONS.has(extension)
    ) {
      files.push(file)
    } else {
      rejectedNames.push(file.name || 'File')
    }
  }
  return { files, rejectedNames }
}

function imagePathsFromList(paths: string[]): {
  paths: string[]
  rejectedNames: string[]
} {
  const supportedPaths: string[] = []
  const rejectedNames: string[] = []
  for (const imagePath of paths) {
    if (SUPPORTED_SOURCE_IMAGE_EXTENSIONS.has(extensionForName(imagePath))) {
      supportedPaths.push(imagePath)
    } else {
      rejectedNames.push(imagePath.split(/[\\/]/).pop() || imagePath)
    }
  }
  return { paths: supportedPaths, rejectedNames }
}

function hasFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files')
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.isContentEditable ||
      target.closest(
        'input, textarea, select, [contenteditable="true"], [role="textbox"]',
      ),
  )
}

function baseIterationFor(design: Design): Iteration | null {
  const upload = design.iterations.find(
    (iteration) => iteration.kind === 'upload',
  )
  return upload ?? design.iterations[0] ?? null
}

function pendingCount(design: Design): number {
  if (design.status !== 'generating') return 0
  const list = design.pendingIterations ?? []
  return (design.pendingIteration ? 1 : 0) + list.length
}

// ─── Shimmer ─────────────────────────────────────────────────────────────────

function Shimmer({
  aspectRatio = 'landscape',
  className,
  label,
}: {
  aspectRatio?: AspectRatioId
  className?: string
  label?: string | null
}) {
  return (
    <div
      role="img"
      className={cn(
        'rd-render relative overflow-hidden rounded-2xl',
        ASPECT_PREVIEW_CLASS[aspectRatio],
        className,
      )}
      aria-label={label ?? 'Rendering'}
    >
      <div className="rd-render-sweep" />
      {label ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
          <span className="bg-background/55 text-foreground/90 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-md">
            <Loader2 className="text-primary size-4 animate-spin" />
            {label}
            <span className="rd-render-dots ml-0.5 inline-flex items-center gap-1">
              <i />
              <i />
              <i />
            </span>
          </span>
        </div>
      ) : null}
    </div>
  )
}

// ─── Move-to-folder menu ─────────────────────────────────────────────────────

function MoveMenu({
  folders,
  design,
  onMove,
  onFavorite,
  onDelete,
}: {
  folders: Folder[]
  design: Design
  onMove: (folderId: string | null) => void
  onFavorite: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Design options"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'border-border/50 bg-background/80 text-foreground/80 hover:bg-background hover:text-foreground inline-flex size-7 cursor-pointer items-center justify-center rounded-full border backdrop-blur transition-all',
            'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
            open && 'opacity-100',
          )}
        >
          <MoreVertical className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        onClick={(event) => event.stopPropagation()}
        className="w-[230px] p-1"
      >
        <button
          type="button"
          onClick={() => {
            onFavorite()
            setOpen(false)
          }}
          className="hover:bg-muted/55 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]"
        >
          <Heart
            className={cn(
              'size-3.5',
              design.favorite
                ? 'fill-rose-500 text-rose-500'
                : 'text-muted-foreground',
            )}
          />
          {design.favorite ? 'Remove favorite' : 'Add to favorites'}
        </button>
        <div className="bg-border/40 my-1 h-px" />
        <p className="text-muted-foreground/80 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em]">
          Move to
        </p>
        {design.folderId ? (
          <button
            type="button"
            onClick={() => {
              onMove(null)
              setOpen(false)
            }}
            className="hover:bg-muted/55 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]"
          >
            <Layers className="text-muted-foreground size-3.5" />
            All designs (no folder)
          </button>
        ) : null}
        {folders.map((folder) => {
          const isCurrent = folder.id === design.folderId
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => {
                if (!isCurrent) onMove(folder.id)
                setOpen(false)
              }}
              className="hover:bg-muted/55 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <FolderGlyph
                  emoji={folder.emoji}
                  className="text-sm leading-none"
                  fallbackClassName="text-muted-foreground size-3.5"
                />
                <span className="truncate">{folder.name}</span>
              </span>
              {isCurrent ? (
                <Check className="text-muted-foreground size-3.5" />
              ) : null}
            </button>
          )
        })}
        <div className="bg-border/40 my-1 h-px" />
        <button
          type="button"
          onClick={() => {
            onDelete()
            setOpen(false)
          }}
          className="text-destructive hover:bg-destructive/10 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]"
        >
          <Trash2 className="size-3.5" />
          Delete design…
        </button>
      </PopoverContent>
    </Popover>
  )
}

// ─── Design cards ───────────────────────────────────────────────────────────

function DesignCard({
  design,
  index,
  folders,
  onOpen,
  onMove,
  onFavorite,
  onDelete,
  onRetry,
}: {
  design: Design
  index: number
  folders: Folder[]
  onOpen: () => void
  onMove: (folderId: string | null) => void
  onFavorite: () => void
  onDelete: () => void
  onRetry: () => void
}) {
  const cover =
    design.iterations.find((it) => it.id === design.coverIterationId) ??
    design.iterations.at(-1)
  const generating = design.status === 'generating'
  const failed = design.status === 'failed'
  const pendingAspect =
    design.pendingIterations?.at(-1)?.aspectRatio ??
    design.pendingIteration?.aspectRatio ??
    design.aspectRatio
  const variants = design.iterations.length

  return (
    <div className="animate-rd-card-in group relative min-w-0">
      <button
        type="button"
        onClick={onOpen}
        disabled={generating && !cover && !failed}
        style={{ animationDelay: `${Math.min(index, 16) * 28}ms` }}
        className="focus-visible:ring-ring relative block w-full cursor-pointer overflow-hidden rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 disabled:cursor-default"
      >
        <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 transition-[transform,box-shadow] duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-black/25">
          {generating && !cover ? (
            <Shimmer
              aspectRatio={pendingAspect}
              className="size-full rounded-none"
              label={null}
            />
          ) : cover ? (
            <img
              src={cover.imageUrl}
              alt={design.title}
              draggable="false"
              className="size-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
            />
          ) : failed ? (
            <div className="bg-muted/50 flex size-full flex-col justify-between p-3">
              <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                Render failed
              </span>
              <span className="text-foreground line-clamp-3 text-xs font-medium leading-5">
                {design.title}
              </span>
            </div>
          ) : null}

          {generating && cover ? (
            <div className="bg-background/75 text-foreground absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur">
              <Loader2 className="size-3 animate-spin" />
              Rendering
            </div>
          ) : null}

          {variants > 1 ? (
            <span className="border-border/60 bg-background/85 text-foreground absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur">
              <Layers className="size-2.5" />
              {variants}
            </span>
          ) : null}

          {design.favorite ? (
            <span className="bg-background/85 absolute left-2 top-2 inline-flex size-6 items-center justify-center rounded-full shadow-sm backdrop-blur">
              <Heart className="size-3.5 fill-rose-500 text-rose-500" />
            </span>
          ) : null}

          {cover && (design.titlePending || design.title.trim()) ? (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex min-h-16 items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 pt-12">
              {design.titlePending ? (
                <span className="h-4 w-2/3 max-w-[9rem] animate-pulse rounded bg-white/40" />
              ) : (
                <span className="line-clamp-2 text-sm font-semibold leading-5 text-white drop-shadow-sm">
                  {design.title}
                </span>
              )}
            </span>
          ) : null}
        </div>
      </button>

      <div className="absolute right-2 top-2 z-10">
        <MoveMenu
          folders={folders}
          design={design}
          onMove={onMove}
          onFavorite={onFavorite}
          onDelete={onDelete}
        />
      </div>

      {failed ? (
        <button
          type="button"
          onClick={onRetry}
          className="border-border/60 bg-muted/35 text-muted-foreground hover:bg-muted hover:text-foreground mt-2 flex h-7 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors"
        >
          <RotateCcw className="size-3.5" />
          Retry
        </button>
      ) : null}
    </div>
  )
}

// ─── New folder dialog ───────────────────────────────────────────────────────

const FOLDER_EMOJIS = [
  '🛋️',
  '🍳',
  '🛏️',
  '🛁',
  '🖥️',
  '🌳',
  '🏡',
  '📐',
  '🚪',
  '🪟',
  '🌿',
  '🔥',
  '🛀',
  '🧺',
  '🎮',
  '📚',
]

function NewFolderDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string, emoji: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(FOLDER_EMOJIS[0])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setEmoji(FOLDER_EMOJIS[Math.floor(Math.random() * FOLDER_EMOJIS.length)])
    }
  }, [open])

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    try {
      await onCreate(trimmed, emoji)
      onOpenChange(false)
    } catch {
      // Parent mutation handlers surface the error.
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(24rem,calc(100vw-2rem))] rounded-xl p-5">
        <DialogTitle className="rd-serif text-lg font-semibold">
          New folder
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-[13px]">
          Group designs by room or zone — a kitchen, a backyard, a whole floor.
        </DialogDescription>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FOLDER_EMOJIS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setEmoji(option)}
              className={cn(
                'rd-folder-glyph-option flex size-8 cursor-pointer items-center justify-center rounded-lg text-lg transition-colors',
                emoji === option
                  ? 'bg-foreground/10 ring-foreground/30 ring-2'
                  : 'hover:bg-muted/60',
              )}
            >
              <FolderGlyph emoji={option} fallbackClassName="size-4" />
            </button>
          ))}
        </div>
        <Input
          autoFocus
          value={name}
          placeholder="Folder name"
          className="mt-3"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submit()
          }}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={!name.trim() || busy}
            onClick={() => void submit()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Create folder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Aspect menu ─────────────────────────────────────────────────────────────

function AspectMenu({
  value,
  busy,
  onChange,
}: {
  value: AspectRatioId
  busy: boolean
  onChange: (value: AspectRatioId) => void
}) {
  const [open, setOpen] = useState(false)
  const current = aspectLabel(value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton
          material="ultra-thin"
          type="button"
          aria-label={`Aspect ratio · ${current.ratio}`}
          disabled={busy}
          className="cursor-pointer gap-1.5"
        >
          <PanelTop className="size-4" />
          <span className="rd-mono text-[11px]">{current.ratio}</span>
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="w-52 p-1.5"
      >
        <p className="text-muted-foreground mb-1 px-1.5 text-[11px]">
          Render a new aspect ratio
        </p>
        {ASPECT_RATIOS.map((ratio) => (
          <button
            key={ratio.id}
            type="button"
            onClick={() => {
              setOpen(false)
              if (ratio.id !== value) onChange(ratio.id)
            }}
            className="hover:bg-muted flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-xs"
          >
            <span className="min-w-0 flex-1 truncate font-medium">
              {ratio.label}
            </span>
            <span className="text-muted-foreground rd-mono">{ratio.ratio}</span>
            {ratio.id === value ? (
              <Check className="text-muted-foreground size-3.5" />
            ) : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

// ─── Unified toolbar icon button ─────────────────────────────────────────────

function ToolBtn({
  label,
  onClick,
  disabled,
  destructive,
  active,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
  active?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ToolbarButton
          material="ultra-thin"
          size="icon-xl"
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            'inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors disabled:cursor-default disabled:opacity-40',
            destructive
              ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
              : active
                ? 'text-foreground hover:bg-muted'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {children}
        </ToolbarButton>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

// ─── Shared top nav bar (same position across gallery / collection / viewer) ──

function ViewHeader({
  onBack,
  backLabel = 'Back',
  title,
  subtitle,
  actions,
}: {
  onBack?: () => void
  backLabel?: string
  emoji?: string
  title?: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <AppHeader
      title={title ?? 'Redecorate'}
      description={subtitle}
      back={onBack}
      backLabel={backLabel}
      desktop={
        <Toolbar
          position="top"
          variant="plain"
          material="none"
          className="relative z-10 gap-3 px-3 sm:px-4"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {onBack ? (
              <ToolBtn label={backLabel} onClick={onBack}>
                <ArrowLeft className="size-4" />
              </ToolBtn>
            ) : null}
            {title ? (
              <ToolbarContent>
                <ToolbarTitle className="rd-serif text-lg font-semibold">
                  {title}
                </ToolbarTitle>
                {subtitle ? (
                  <span className="text-muted-foreground rd-mono truncate text-[11px]">
                    {subtitle}
                  </span>
                ) : null}
              </ToolbarContent>
            ) : null}
          </div>
          {actions ? (
            <ToolbarActions className="gap-2">{actions}</ToolbarActions>
          ) : null}
        </Toolbar>
      }
    />
  )
}

// ─── Main app ────────────────────────────────────────────────────────────────

type ImportMessage =
  | { type: 'moldable:file-drag-over'; paths?: string[] }
  | { type: 'moldable:file-drag-leave' }
  | { type: 'moldable:file-drop'; paths?: string[] }

type AppApiChangedMessage = {
  type: 'moldable:app-api-changed'
  workspaceId?: string
  targetAppId?: string
  method?: string
}

const ALL_DESIGNS = '__all__'
const FAVORITES = '__favorites__'

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  const [collectionId, setCollectionId] = useState<string | null>(null)
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null)
  const [selectedIterationId, setSelectedIterationId] = useState<string | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragDepth = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [styleOpen, setStyleOpen] = useState(false)
  const [remixOpen, setRemixOpen] = useState(false)
  const [remixPrompt, setRemixPrompt] = useState('')
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [pendingDeleteDesign, setPendingDeleteDesign] = useState<Design | null>(
    null,
  )
  const [pendingDeleteFolder, setPendingDeleteFolder] = useState<Folder | null>(
    null,
  )
  const [showOriginal, setShowOriginal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [designTitleDraft, setDesignTitleDraft] = useState('')
  const [pendingUiIntent, setPendingUiIntent] =
    useState<RedecorateUiIntent | null>(null)
  const seenUiIntentIdsRef = useRef(new Set<string>())
  const skipNextTitleSaveRef = useRef(false)
  const selectedCoverRef = useRef<{
    designId: string
    coverIterationId: string | null
  } | null>(null)

  const refreshUiIntent = useCallback(async () => {
    const response = await fetchWithWorkspace('/api/moldable/ui-intent')
    if (!response.ok) return
    const intent = (await response.json()) as RedecorateUiIntent | null
    if (!intent || seenUiIntentIdsRef.current.has(intent.id)) return
    setPendingUiIntent(intent)
  }, [fetchWithWorkspace])

  useEffect(() => {
    seenUiIntentIdsRef.current.clear()
    setPendingUiIntent(null)
    void refreshUiIntent()
  }, [refreshUiIntent, workspaceId])

  useEffect(() => {
    const handleMessage = (event: MessageEvent<AppApiChangedMessage>) => {
      const message = event.data
      if (
        message?.type !== 'moldable:app-api-changed' ||
        message.targetAppId !== 'redecorate' ||
        message.workspaceId !== workspaceId
      ) {
        return
      }
      void queryClient.invalidateQueries({
        queryKey: ['designs', workspaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['folders', workspaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['presets', workspaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['style-panel-state', workspaceId],
      })
      void refreshUiIntent()
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [queryClient, refreshUiIntent, workspaceId])

  // ── Queries ──
  const designsQuery = useQuery({
    queryKey: ['designs', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/designs')
      return parseJsonArray<Design>(response, 'Failed to load designs')
    },
    refetchInterval: 2_000,
  })
  const foldersQuery = useQuery({
    queryKey: ['folders', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/folders')
      return parseJsonArray<Folder>(response, 'Failed to load folders')
    },
    refetchInterval: 4_000,
  })
  const presetsQuery = useQuery({
    queryKey: ['presets', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/presets')
      return parseJson<Catalog>(response, 'Failed to load styles')
    },
    staleTime: 30_000,
  })
  // Remembered style-library filters/search per image set, persisted to the workspace.
  const panelStateQuery = useQuery({
    queryKey: ['style-panel-state', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/style-panel-state')
      return parseJson<Record<string, { room: string | null; query: string }>>(
        response,
        'Failed to load panel state',
      )
    },
    staleTime: Infinity,
  })

  const designs = useMemo(() => designsQuery.data ?? [], [designsQuery.data])
  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data])

  const activeDesigns = useMemo(
    () => designs.filter((design) => !design.archived),
    [designs],
  )

  const selectedDesign = useMemo(
    () => designs.find((design) => design.id === selectedDesignId) ?? null,
    [designs, selectedDesignId],
  )
  const openFolder = useMemo(
    () =>
      collectionId && collectionId !== ALL_DESIGNS && collectionId !== FAVORITES
        ? (folders.find((folder) => folder.id === collectionId) ?? null)
        : null,
    [collectionId, folders],
  )

  useEffect(() => {
    setDesignTitleDraft(selectedDesign?.title ?? '')
  }, [selectedDesign?.id, selectedDesign?.title])

  const collectionDesigns = useMemo(() => {
    if (collectionId === ALL_DESIGNS) return activeDesigns
    if (collectionId === FAVORITES) {
      return activeDesigns.filter((design) => design.favorite)
    }
    if (openFolder) {
      return activeDesigns.filter((design) => design.folderId === openFolder.id)
    }
    return []
  }, [activeDesigns, collectionId, openFolder])

  const collectionSpace: SpaceKind | 'all' = openFolder
    ? openFolder.space
    : 'all'

  // Folders are sections of one browsable library, not a navigation layer.
  // Keeping the “All designs” and “Favorites” sections mirrors the old useful
  // smart groups while every folder's actual designs remain one tap away.
  const gallerySections = useMemo(() => {
    const sections: {
      id: string
      title: string
      emoji: string
      designs: Design[]
      folder?: Folder
    }[] = []

    if (activeDesigns.length > 0) {
      sections.push({
        id: ALL_DESIGNS,
        title: 'All designs',
        emoji: '🗂️',
        designs: activeDesigns,
      })
    }

    const favorites = activeDesigns.filter((design) => design.favorite)
    if (favorites.length > 0) {
      sections.push({
        id: FAVORITES,
        title: 'Favorites',
        emoji: '❤️',
        designs: favorites,
      })
    }

    for (const folder of folders) {
      sections.push({
        id: folder.id,
        title: folder.name,
        emoji: folder.emoji,
        designs: activeDesigns.filter(
          (design) => design.folderId === folder.id,
        ),
        folder,
      })
    }

    return sections
  }, [activeDesigns, folders])

  // ── Navigation (Moldable back gesture) ──
  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  useMoldableNavigationPop(() => {
    if (selectedDesignId) {
      setSelectedDesignId(null)
      setSelectedIterationId(null)
    } else if (collectionId) {
      setCollectionId(null)
    }
  })

  const openDesign = useCallback((design: Design) => {
    pushMoldableNavigation({
      id: `design:${design.id}`,
      title: design.title || 'Design',
    })
    setSelectedDesignId(design.id)
    setSelectedIterationId(null)
    setShowOriginal(false)
  }, [])

  const closeDesign = useCallback(() => {
    popMoldableNavigation()
    setSelectedDesignId(null)
    setSelectedIterationId(null)
  }, [])

  const closeCollection = useCallback(() => {
    popMoldableNavigation()
    setCollectionId(null)
  }, [])

  useEffect(() => {
    const intent = pendingUiIntent
    if (!intent || seenUiIntentIdsRef.current.has(intent.id)) return

    if (intent.view === 'design') {
      const design = intent.entityId
        ? designs.find((item) => item.id === intent.entityId && !item.archived)
        : undefined
      if (!design) return
      resetMoldableNavigation()
      pushMoldableNavigation({
        id: `design:${design.id}`,
        title: design.title || 'Design',
      })
      setCollectionId(null)
      setSelectedDesignId(design.id)
      setSelectedIterationId(null)
      setShowOriginal(false)
    } else if (intent.view === 'folder') {
      const folder = intent.entityId
        ? folders.find((item) => item.id === intent.entityId)
        : undefined
      if (!folder) return
      resetMoldableNavigation()
      pushMoldableNavigation({
        id: `collection:${folder.id}`,
        title: folder.name,
      })
      setSelectedDesignId(null)
      setSelectedIterationId(null)
      setCollectionId(folder.id)
    } else {
      resetMoldableNavigation()
      setSelectedDesignId(null)
      setSelectedIterationId(null)
      setCollectionId(
        intent.view === 'all'
          ? ALL_DESIGNS
          : intent.view === 'favorites'
            ? FAVORITES
            : null,
      )
    }

    seenUiIntentIdsRef.current.add(intent.id)
    setPendingUiIntent(null)
    void fetchWithWorkspace(
      `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
      { method: 'DELETE' },
    )
  }, [designs, fetchWithWorkspace, folders, pendingUiIntent])

  const upsertDesignInCache = useCallback(
    (design: Design) => {
      queryClient.setQueryData<Design[]>(
        ['designs', workspaceId],
        (current) => [
          design,
          ...(current ?? []).filter((item) => item.id !== design.id),
        ],
      )
    },
    [queryClient, workspaceId],
  )

  // Keep selected iteration valid; default to latest render.
  useEffect(() => {
    if (!selectedDesign) {
      selectedCoverRef.current = null
      return
    }
    const ids = selectedDesign.iterations.map((it) => it.id)
    const coverIterationId =
      selectedDesign.coverIterationId ??
      selectedDesign.iterations.at(-1)?.id ??
      null
    const previousCover = selectedCoverRef.current
    const coverChanged =
      previousCover?.designId === selectedDesign.id &&
      previousCover.coverIterationId !== null &&
      previousCover.coverIterationId !== coverIterationId
    selectedCoverRef.current = {
      designId: selectedDesign.id,
      coverIterationId,
    }
    if (!selectedIterationId || !ids.includes(selectedIterationId)) {
      setSelectedIterationId(coverIterationId)
    } else if (
      coverChanged &&
      selectedIterationId === previousCover.coverIterationId
    ) {
      setSelectedIterationId(coverIterationId)
    }
  }, [selectedDesign, selectedIterationId])

  // Drop the detail view if its design disappears.
  useEffect(() => {
    if (selectedDesignId && !selectedDesign && designsQuery.isFetched) {
      popMoldableNavigation()
      setSelectedDesignId(null)
      setSelectedIterationId(null)
    }
  }, [designsQuery.isFetched, selectedDesign, selectedDesignId])

  const selectedIteration = useMemo(() => {
    if (!selectedDesign) return null
    return (
      selectedDesign.iterations.find((it) => it.id === selectedIterationId) ??
      selectedDesign.iterations.at(-1) ??
      null
    )
  }, [selectedDesign, selectedIterationId])

  const baseIteration = selectedDesign ? baseIterationFor(selectedDesign) : null
  const designPending = selectedDesign
    ? pendingCount(selectedDesign) > 0
    : false

  // ── Chat context ──
  useEffect(() => {
    let context: string
    if (selectedDesign) {
      const base = baseIterationFor(selectedDesign)
      context = `Redecorate is open to design "${selectedDesign.title}" (id ${selectedDesign.id}). Drive this app only through app RPC methods. To restyle the original space, call redecorate.designs.remix with { id: "${selectedDesign.id}", baseIterationId: "${base?.id ?? ''}", prompt }. To tweak the currently shown render as a child, call redecorate.designs.remix with the shown iteration id as baseIterationId. To produce a distinct variant, call redecorate.designs.generateFromReference. To favorite it, call redecorate.designs.favorite with { id }. To move it to a folder, call redecorate.designs.move with { id, folderId }. Use redecorate.designs.get to inspect renders.`
    } else if (openFolder) {
      context = `Redecorate is open to the "${openFolder.name}" folder (id ${openFolder.id}). Drive this app only through app RPC methods. To add a redesign from a style, call redecorate.designs.generate with { prompt, folderId: "${openFolder.id}", presetId? }. To import a room photo from disk, call redecorate.images.import with { imagePath, id?, prompt? } then redecorate.designs.move into this folder. List built-in styles with redecorate.presets.list.`
    } else {
      context = `Redecorate is open to the folder gallery. Drive this app only through app RPC methods. List folders with redecorate.folders.list, designs with redecorate.designs.list, and built-in styles with redecorate.presets.list. Create a folder with redecorate.folders.create, generate a redesign with redecorate.designs.generate, and import a photo with redecorate.images.import.`
    }
    sendChatInstructions(context)
  }, [openFolder, selectedDesign])

  // ── Mutations ──
  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['designs', workspaceId] })
    void queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] })
  }, [queryClient, workspaceId])

  const rpc = useCallback(
    async <T,>(method: string, params: unknown): Promise<T> => {
      const response = await fetchWithWorkspace('/api/moldable/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, params }),
      })
      const json = await parseJson<RpcResponse<T>>(response, 'Request failed')
      if (!json.ok) throw new Error(json.error?.message ?? 'Request failed')
      return json.result
    },
    [fetchWithWorkspace],
  )

  const importMutation = useMutation({
    mutationFn: async ({
      files,
      paths,
      folderId,
    }: {
      files?: File[]
      paths?: string[]
      folderId: string | null
    }) => {
      if (files && files.length > 0) {
        const form = new FormData()
        form.set('mode', 'separate')
        if (folderId) form.set('folderId', folderId)
        for (const file of files) form.append('files', file, file.name)
        const response = await fetchWithWorkspace('/api/designs/import', {
          method: 'POST',
          body: form,
        })
        return parseJsonArray<Design>(response, 'Failed to import photos')
      }
      const response = await fetchWithWorkspace('/api/designs/import-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths, mode: 'separate', folderId }),
      })
      return parseJsonArray<Design>(response, 'Failed to import photos')
    },
    onSuccess: (imported) => {
      setError(null)
      if (imported.length === 1) {
        upsertDesignInCache(imported[0])
        openDesign(imported[0])
      }
      invalidate()
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to import photos',
      ),
  })

  const patchDesign = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: Record<string, unknown>
    }) => {
      const response = await fetchWithWorkspace(`/api/designs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      return parseJson<Design>(response, 'Failed to update design')
    },
    onSuccess: invalidate,
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to update design',
      ),
  })

  const saveDesignTitle = useCallback(
    (design: Design, nextTitle: string) => {
      if (skipNextTitleSaveRef.current) {
        skipNextTitleSaveRef.current = false
        return
      }

      const trimmed = nextTitle.trim()
      const currentTitle = design.title.trim()
      if (!trimmed) {
        setDesignTitleDraft(design.title ?? '')
        return
      }
      if (trimmed === currentTitle) {
        setDesignTitleDraft(trimmed)
        return
      }

      setDesignTitleDraft(trimmed)
      patchDesign.mutate(
        { id: design.id, patch: { title: trimmed } },
        {
          onError: () => setDesignTitleDraft(design.title ?? ''),
        },
      )
    },
    [patchDesign],
  )

  const generateMutation = useMutation({
    mutationFn: (params: {
      prompt: string
      folderId: string | null
      presetId?: string
      aspectRatio?: AspectRatioId
    }) => rpc<Design>('redecorate.designs.generate', params),
    onSuccess: (design) => {
      setError(null)
      upsertDesignInCache(design)
      openDesign(design)
      invalidate()
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to generate render',
      ),
  })

  const editMutation = useMutation({
    mutationFn: (params: {
      method: string
      id: string
      baseIterationId?: string
      prompt: string
    }) =>
      rpc<Design>(params.method, {
        id: params.id,
        baseIterationId: params.baseIterationId,
        prompt: params.prompt,
      }),
    onSuccess: () => {
      setError(null)
      invalidate()
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to render',
      ),
  })

  const simpleRpc = useMutation({
    mutationFn: (params: { method: string; params: unknown }) =>
      rpc<unknown>(params.method, params.params),
    onSuccess: invalidate,
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Request failed',
      ),
  })

  const createFolderMutation = useMutation({
    mutationFn: async ({ name, emoji }: { name: string; emoji: string }) => {
      const response = await fetchWithWorkspace('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji }),
      })
      return parseJson<Folder>(response, 'Failed to create folder')
    },
    onSuccess: invalidate,
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to create folder',
      ),
  })

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithWorkspace(`/api/folders/${id}`, {
        method: 'DELETE',
      })
      return parseJson(response, 'Failed to delete folder')
    },
    onSuccess: invalidate,
    onError: (mutationError) =>
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to delete folder',
      ),
  })

  // ── Drag & drop import ──
  const targetFolderId = openFolder?.id ?? null

  const importFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return
      setError(null)
      importMutation.mutate({ files, folderId: targetFolderId })
    },
    [importMutation, targetFolderId],
  )
  const importPaths = useCallback(
    (paths: string[]) => {
      if (paths.length === 0) return
      setError(null)
      importMutation.mutate({ paths, folderId: targetFolderId })
    },
    [importMutation, targetFolderId],
  )
  const importFileList = useCallback(
    (fileList: FileList) => {
      const { files, rejectedNames } = imageFilesFromList(fileList)
      if (rejectedNames.length > 0) {
        setError(sourceImageImportError(rejectedNames))
      }
      importFiles(files)
    },
    [importFiles],
  )
  const importPathList = useCallback(
    (rawPaths: string[]) => {
      const { paths, rejectedNames } = imagePathsFromList(rawPaths)
      if (rejectedNames.length > 0) {
        setError(sourceImageImportError(rejectedNames))
      }
      importPaths(paths)
    },
    [importPaths],
  )

  useEffect(() => {
    const handler = (event: MessageEvent<ImportMessage>) => {
      if (styleOpen) {
        dragDepth.current = 0
        setIsDragging(false)
        return
      }
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.type === 'moldable:file-drag-over') {
        setIsDragging(true)
      } else if (data.type === 'moldable:file-drag-leave') {
        dragDepth.current = 0
        setIsDragging(false)
      } else if (data.type === 'moldable:file-drop') {
        dragDepth.current = 0
        setIsDragging(false)
        importPathList(data.paths ?? [])
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [importPathList, styleOpen])

  useEffect(() => {
    if (!styleOpen) return
    dragDepth.current = 0
    setIsDragging(false)
  }, [styleOpen])

  const onDragEnter = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (styleOpen) return
      if (event.defaultPrevented) return
      if (!hasFileDrag(event)) return
      event.preventDefault()
      dragDepth.current += 1
      setIsDragging(true)
    },
    [styleOpen],
  )
  const onDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (styleOpen) return
      if (event.defaultPrevented) return
      if (!hasFileDrag(event)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    },
    [styleOpen],
  )
  const onDragLeave = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (styleOpen) return
      if (event.defaultPrevented) return
      if (!hasFileDrag(event)) return
      event.preventDefault()
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setIsDragging(false)
    },
    [styleOpen],
  )
  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (styleOpen) return
      if (event.defaultPrevented) return
      if (!hasFileDrag(event)) return
      event.preventDefault()
      dragDepth.current = 0
      setIsDragging(false)
      importFileList(event.dataTransfer.files)
    },
    [importFileList, styleOpen],
  )

  // ── Style / remix application ──
  const applyPreset = useCallback(
    (preset: StylePreset, promptOverride?: string) => {
      const stylePrompt = (promptOverride ?? preset.prompt).trim()
      if (!stylePrompt) return
      setStyleOpen(false)
      if (selectedDesign) {
        const base = baseIterationFor(selectedDesign)
        editMutation.mutate({
          method: 'redecorate.designs.remix',
          id: selectedDesign.id,
          baseIterationId: base?.id,
          prompt: stylePrompt,
        })
      } else {
        const space =
          collectionSpace === 'interior'
            ? 'interior'
            : collectionSpace === 'exterior'
              ? 'exterior'
              : 'space'
        generateMutation.mutate({
          prompt: `A photorealistic ${space} render. ${stylePrompt}`,
          folderId: targetFolderId,
          presetId: preset.id,
        })
      }
    },
    [
      collectionSpace,
      editMutation,
      generateMutation,
      selectedDesign,
      targetFolderId,
    ],
  )

  // Custom styles — create manually, from an inspiration image, or delete.
  const describeStyleImage = useCallback(
    async (file: File) => {
      const form = new FormData()
      form.set('file', file, file.name)
      const response = await fetchWithWorkspace('/api/styles/describe', {
        method: 'POST',
        body: form,
      })
      return parseJson<{
        id: string
        thumbnail: string
        draft: {
          name: string
          blurb: string
          prompt: string
          applies: SpaceKind
          accent: string
          tags: string[]
          subtypes: string[]
        }
      }>(response, 'Could not read a style from that image.')
    },
    [fetchWithWorkspace],
  )

  const describeStyleImagePath = useCallback(
    async (path: string) => {
      const response = await fetchWithWorkspace('/api/styles/describe-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      return parseJson<{
        id: string
        thumbnail: string
        draft: {
          name: string
          blurb: string
          prompt: string
          applies: SpaceKind
          accent: string
          tags: string[]
          subtypes: string[]
        }
      }>(response, 'Could not read a style from that image.')
    },
    [fetchWithWorkspace],
  )

  const createStyle = useCallback(
    async (input: {
      id?: string
      name: string
      blurb?: string
      prompt: string
      applies?: SpaceKind
      accent?: string
      tags?: string[]
      subtypes?: string[]
    }) => {
      const response = await fetchWithWorkspace('/api/styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      await parseJson(response, 'Failed to save style')
      void queryClient.invalidateQueries({ queryKey: ['presets', workspaceId] })
    },
    [fetchWithWorkspace, queryClient, workspaceId],
  )

  const deleteStyle = useCallback(
    async (id: string) => {
      const response = await fetchWithWorkspace(`/api/styles/${id}`, {
        method: 'DELETE',
      })
      await parseJson(response, 'Failed to delete style')
      void queryClient.invalidateQueries({ queryKey: ['presets', workspaceId] })
    },
    [fetchWithWorkspace, queryClient, workspaceId],
  )

  // Persist style-panel filters/search: optimistic cache update + debounced write.
  const panelSavePending = useRef<
    Record<string, { room: string | null; query: string }>
  >({})
  const panelSaveTimer = useRef<number | null>(null)
  const savePanelState = useCallback(
    (key: string, state: { room: string | null; query: string }) => {
      queryClient.setQueryData<
        Record<string, { room: string | null; query: string }>
      >(['style-panel-state', workspaceId], (prev) => {
        const next = { ...(prev ?? {}) }
        if (!state.room && !state.query.trim()) delete next[key]
        else next[key] = state
        return next
      })
      panelSavePending.current[key] = state
      if (panelSaveTimer.current) window.clearTimeout(panelSaveTimer.current)
      panelSaveTimer.current = window.setTimeout(() => {
        const pending = panelSavePending.current
        panelSavePending.current = {}
        for (const [contextKey, value] of Object.entries(pending)) {
          void fetchWithWorkspace('/api/style-panel-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contextKey, ...value }),
          }).catch(() => {})
        }
      }, 500)
    },
    [fetchWithWorkspace, queryClient, workspaceId],
  )

  const applyTemplate = useCallback(
    (_template: PromptTemplate, prompt: string) => {
      setStyleOpen(false)
      const trimmedPrompt = prompt.trim()
      if (!trimmedPrompt) return
      if (selectedDesign && selectedIteration) {
        editMutation.mutate({
          method: 'redecorate.designs.remix',
          id: selectedDesign.id,
          baseIterationId: selectedIteration.id,
          prompt: trimmedPrompt,
        })
      } else {
        generateMutation.mutate({
          prompt: trimmedPrompt,
          folderId: targetFolderId,
        })
      }
    },
    [
      editMutation,
      generateMutation,
      selectedDesign,
      selectedIteration,
      targetFolderId,
    ],
  )

  const submitRemix = useCallback(() => {
    const prompt = remixPrompt.trim()
    if (!prompt || !selectedDesign || !selectedIteration) return
    editMutation.mutate({
      method: 'redecorate.designs.remix',
      id: selectedDesign.id,
      baseIterationId: selectedIteration.id,
      prompt,
    })
    setRemixPrompt('')
    setRemixOpen(false)
  }, [editMutation, remixPrompt, selectedDesign, selectedIteration])

  // Keyboard shortcuts for the design viewer.
  useEffect(() => {
    if (!selectedDesign) return
    const design = selectedDesign
    const iterations = design.iterations
    const overlayOpen =
      styleOpen || remixOpen || Boolean(pendingDeleteDesign) || newFolderOpen

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTextEntryTarget(event.target)) return
      if (overlayOpen) return

      const current = selectedIteration
      const index = current
        ? iterations.findIndex((it) => it.id === current.id)
        : -1

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown': {
          if (iterations.length < 2) return
          event.preventDefault()
          setShowOriginal(false)
          const next =
            index < 0 ? 0 : Math.min(iterations.length - 1, index + 1)
          setSelectedIterationId(iterations[next].id)
          break
        }
        case 'ArrowLeft':
        case 'ArrowUp': {
          if (iterations.length < 2) return
          event.preventDefault()
          setShowOriginal(false)
          const prev = index <= 0 ? 0 : index - 1
          setSelectedIterationId(iterations[prev].id)
          break
        }
        case 'Escape':
          event.preventDefault()
          closeDesign()
          break
        case 'r':
        case 'R':
          if (designPending) return
          event.preventDefault()
          setStyleOpen(true)
          break
        case 'm':
        case 'M':
          if (designPending || !selectedIteration) return
          event.preventDefault()
          setRemixPrompt('')
          setRemixOpen(true)
          break
        case 'f':
        case 'F':
          event.preventDefault()
          patchDesign.mutate({
            id: design.id,
            patch: { favorite: !design.favorite },
          })
          break
        case 'd':
        case 'D': {
          if (!selectedIteration) return
          event.preventDefault()
          const target = selectedIteration
          void downloadIteration(target).catch((downloadError) =>
            setError(
              downloadError instanceof Error
                ? downloadError.message
                : 'Failed to download',
            ),
          )
          break
        }
        case 'c':
        case 'C':
          if (!selectedIteration?.prompt) return
          event.preventDefault()
          void copyText(selectedIteration.prompt).then(() => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
          })
          break
        case 'Backspace':
        case 'Delete':
          event.preventDefault()
          setPendingDeleteDesign(design)
          break
        case ' ':
          if (
            baseIteration &&
            selectedIteration &&
            baseIteration.id !== selectedIteration.id
          ) {
            event.preventDefault()
            if (!event.repeat) setShowOriginal(true)
          }
          break
        default:
          break
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.key === ' ') setShowOriginal(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [
    selectedDesign,
    selectedIteration,
    baseIteration,
    designPending,
    styleOpen,
    remixOpen,
    pendingDeleteDesign,
    newFolderOpen,
    patchDesign,
    closeDesign,
  ])

  const dropOverlay = isDragging ? (
    <div className="bg-background/72 pointer-events-none absolute inset-0 z-40 flex items-center justify-center backdrop-blur-sm">
      <div className="border-border/70 bg-background/95 text-foreground rounded-2xl border px-6 py-5 text-center shadow-xl">
        <Upload className="mx-auto mb-2 size-5" />
        <p className="rd-serif text-lg font-semibold">
          {openFolder ? `Drop photos into ${openFolder.name}` : 'Drop photos'}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          Rooms, exteriors, backyards, or floorplans — then redesign them.
        </p>
      </div>
    </div>
  ) : null

  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif,image/tiff,image/gif,image/bmp,image/jp2,.png,.jpg,.jpeg,.webp,.avif,.heic,.heif,.tif,.tiff,.gif,.bmp,.jp2,.j2k,.jpf,.jpx"
      multiple
      className="hidden"
      onChange={(event) => {
        const files = event.target.files
        if (files) {
          importFileList(files)
        }
        event.target.value = ''
      }}
    />
  )

  const styleLibrary = (
    <StyleLibrary
      open={styleOpen}
      onOpenChange={setStyleOpen}
      catalog={presetsQuery.data}
      space={collectionSpace}
      busy={editMutation.isPending || generateMutation.isPending}
      applyLabel={selectedDesign ? 'Redesign' : 'Create'}
      contextKey={
        selectedDesign
          ? `design:${selectedDesign.id}`
          : collectionId
            ? `collection:${collectionId}`
            : 'gallery'
      }
      contextImage={selectedDesign ? selectedIteration?.imageUrl : null}
      contextTitle={selectedDesign ? selectedDesign.title : null}
      panelState={panelStateQuery.data}
      onSavePanelState={savePanelState}
      onApplyPreset={applyPreset}
      onApplyTemplate={applyTemplate}
      onDescribeImage={describeStyleImage}
      onDescribeImagePath={describeStyleImagePath}
      onCreateStyle={createStyle}
      onDeleteStyle={deleteStyle}
    />
  )

  const queryError = designsQuery.error ?? foldersQuery.error
  const errorMessage =
    error ?? (queryError instanceof Error ? queryError.message : null)
  const errorToast = errorMessage ? (
    <div className="border-destructive/40 bg-destructive/10 text-destructive absolute bottom-[calc(var(--chat-safe-padding,0px)+1rem)] left-1/2 z-40 w-[min(720px,calc(100%-2rem))] -translate-x-1/2 rounded-lg border px-3 py-2 text-sm shadow-lg">
      {errorMessage}
    </div>
  ) : null

  // ════════════════════════════════════════════════════════════════════════
  // DESIGN DETAIL
  // ════════════════════════════════════════════════════════════════════════
  if (selectedDesign) {
    const design = selectedDesign
    const displayIteration =
      showOriginal && baseIteration ? baseIteration : selectedIteration
    const pendingAspect =
      design.pendingIterations?.at(-1)?.aspectRatio ??
      design.pendingIteration?.aspectRatio ??
      null
    const isRendering = design.status === 'generating' && !selectedIteration
    const isFailed = design.status === 'failed' && !selectedIteration
    const shimmerAspect = pendingAspect ?? design.aspectRatio
    const canCompare =
      baseIteration &&
      selectedIteration &&
      baseIteration.id !== selectedIteration.id

    const showOriginalWhilePressed = (
      event: ReactPointerEvent<HTMLButtonElement>,
    ) => {
      if (
        !event.isPrimary ||
        (event.pointerType === 'mouse' && event.button !== 0)
      ) {
        return
      }

      event.currentTarget.setPointerCapture(event.pointerId)
      setShowOriginal(true)
    }

    const hideOriginalAfterPress = (
      event: ReactPointerEvent<HTMLButtonElement>,
    ) => {
      if (!event.isPrimary) return

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      setShowOriginal(false)
    }

    return (
      <AppFrameContent
        scrollable={false}
        chatSafe={false}
        className="animate-rd-view-in text-foreground relative flex h-full min-h-0 flex-col overflow-hidden"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <AppHeader
          title={design.title || 'Design'}
          back={closeDesign}
          desktop={false}
          actions={[
            {
              id: 'redecorate.redesign',
              label: 'Redesign',
              icon: Paintbrush,
              onPress: () => setStyleOpen(true),
            },
            {
              id: 'redecorate.favorite',
              label: design.favorite ? 'Unfavorite' : 'Favorite',
              icon: Heart,
              onPress: () =>
                patchDesign.mutate({
                  id: design.id,
                  patch: { favorite: !design.favorite },
                }),
            },
            {
              id: 'redecorate.delete',
              label: 'Delete design',
              icon: Trash2,
              onPress: () => setPendingDeleteDesign(design),
              placement: 'overflow',
            },
          ]}
        />
        <DesktopOnly>
          <Toolbar
            position="top"
            variant="plain"
            material="none"
            className="relative z-10 gap-3 px-3 sm:px-4"
          >
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <ToolBtn label="Back (Esc)" onClick={closeDesign}>
                <ArrowLeft className="size-4" />
              </ToolBtn>
              {design.titlePending ? (
                <div
                  className="flex h-9 min-w-0 flex-1 items-center"
                  aria-label="Generating title"
                  aria-busy="true"
                >
                  <div className="bg-muted/70 h-5 w-44 max-w-full animate-pulse rounded-md" />
                </div>
              ) : (
                <Input
                  value={designTitleDraft}
                  onChange={(event) => setDesignTitleDraft(event.target.value)}
                  onBlur={() => saveDesignTitle(design, designTitleDraft)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      event.currentTarget.blur()
                    } else if (event.key === 'Escape') {
                      event.preventDefault()
                      skipNextTitleSaveRef.current = true
                      setDesignTitleDraft(design.title ?? '')
                      event.currentTarget.blur()
                    }
                  }}
                  aria-label="Design title"
                  placeholder="Untitled design"
                  className="rd-serif text-foreground h-auto w-full min-w-0 truncate border-none !bg-transparent px-0 py-0 text-lg font-semibold shadow-none outline-none focus-visible:!bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:text-lg"
                />
              )}
            </div>
            <ToolbarActions className="gap-2">
              <ToolbarButton
                material="ultra-thin"
                type="button"
                disabled={designPending}
                onClick={() => setStyleOpen(true)}
                title="Redesign (R)"
                className="bg-primary text-primary-foreground inline-flex cursor-pointer items-center gap-1.5 px-4 text-[13px] font-medium shadow-sm transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-50"
              >
                <Paintbrush className="size-4" />
                Redesign
              </ToolbarButton>
              <div className="flex items-center gap-2">
                <AspectMenu
                  value={displayIteration?.aspectRatio ?? design.aspectRatio}
                  busy={designPending}
                  onChange={(aspectRatio) =>
                    simpleRpc.mutate({
                      method: 'redecorate.designs.setAspectRatio',
                      params: {
                        id: design.id,
                        baseIterationId: displayIteration?.id,
                        aspectRatio,
                      },
                    })
                  }
                />
                <ToolBtn
                  label="Quick remix (M)"
                  disabled={designPending || !selectedIteration}
                  onClick={() => {
                    setRemixPrompt('')
                    setRemixOpen(true)
                  }}
                >
                  <Wand2 className="size-4" />
                </ToolBtn>
                <ToolBtn
                  label="Copy prompt (C)"
                  disabled={!selectedIteration?.prompt}
                  onClick={async () => {
                    if (!selectedIteration?.prompt) return
                    await copyText(selectedIteration.prompt)
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 1500)
                  }}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </ToolBtn>
                <ToolBtn
                  label="Download (D)"
                  disabled={!displayIteration}
                  onClick={async () => {
                    if (!displayIteration) return
                    try {
                      await downloadIteration(displayIteration)
                    } catch (downloadError) {
                      setError(
                        downloadError instanceof Error
                          ? downloadError.message
                          : 'Failed to download',
                      )
                    }
                  }}
                >
                  <Download className="size-4" />
                </ToolBtn>
                <ToolBtn
                  label={
                    design.favorite ? 'Remove favorite (F)' : 'Favorite (F)'
                  }
                  active={design.favorite}
                  onClick={() =>
                    patchDesign.mutate({
                      id: design.id,
                      patch: { favorite: !design.favorite },
                    })
                  }
                >
                  <Heart
                    className={cn(
                      'size-4',
                      design.favorite && 'fill-rose-500 text-rose-500',
                    )}
                  />
                </ToolBtn>
                <span className="bg-border/60 mx-0.5 h-5 w-px" />
                <ToolBtn
                  label="Delete design (⌫)"
                  destructive
                  onClick={() => setPendingDeleteDesign(design)}
                >
                  <Trash2 className="size-4" />
                </ToolBtn>
              </div>
            </ToolbarActions>
          </Toolbar>
        </DesktopOnly>

        <section className="redecorate-viewer relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-5 pb-2 sm:px-8">
          {isRendering ? (
            <Shimmer
              aspectRatio={shimmerAspect}
              className="h-[calc(100dvh-var(--chat-safe-padding,0px)-12rem)] max-h-full w-auto max-w-full shadow-2xl shadow-black/40"
              label="Rendering your redesign"
            />
          ) : isFailed ? (
            <div className="border-border/60 bg-muted/20 flex max-w-md flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center">
              <div className="bg-destructive/10 text-destructive mb-3 flex size-11 items-center justify-center rounded-full">
                <RotateCcw className="size-5" />
              </div>
              <p className="rd-serif text-foreground text-lg">
                This render didn’t finish
              </p>
              <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                {design.errorMessage ??
                  'Something interrupted the render. Try again.'}
              </p>
              <Button
                type="button"
                className="mt-4 cursor-pointer gap-1.5 rounded-full"
                disabled={simpleRpc.isPending}
                onClick={() =>
                  simpleRpc.mutate({
                    method: 'redecorate.designs.retry',
                    params: { id: design.id },
                  })
                }
              >
                <RotateCcw className="size-4" />
                Retry render
              </Button>
            </div>
          ) : displayIteration ? (
            <div className="relative flex max-h-full max-w-full items-center justify-center">
              <ZoomableImage
                src={displayIteration.imageUrl}
                alt={design.title}
                imageClassName="max-h-[calc(100dvh-var(--chat-safe-padding,0px)-12rem)] max-w-full rounded-2xl object-contain shadow-2xl shadow-black/40"
              />
              {showOriginal ? (
                <span className="bg-foreground text-background absolute left-1/2 top-3 -translate-x-1/2 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-md">
                  Original photo
                </span>
              ) : null}
            </div>
          ) : null}

          {canCompare ? (
            <button
              type="button"
              onPointerDown={showOriginalWhilePressed}
              onPointerUp={hideOriginalAfterPress}
              onPointerCancel={hideOriginalAfterPress}
              onLostPointerCapture={() => setShowOriginal(false)}
              onContextMenu={(event) => event.preventDefault()}
              className="bg-background/80 text-muted-foreground hover:text-foreground absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 cursor-pointer touch-none select-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium shadow-sm backdrop-blur transition-colors"
            >
              <Layers className="size-3.5" />
              Hold to see the original
            </button>
          ) : null}
        </section>

        {/* Render strip — chromeless, centered */}
        <div className="shrink-0 px-4 pb-[calc(var(--chat-safe-padding,0px)+0.75rem)] pt-1">
          <div className="rd-no-scrollbar mx-auto flex w-fit max-w-full items-center gap-2 overflow-x-auto">
            {design.iterations.map((iteration) => {
              const isOriginal = iteration.kind === 'upload'
              const isSelected = iteration.id === selectedIteration?.id
              return (
                <button
                  key={iteration.id}
                  type="button"
                  onClick={() => {
                    setShowOriginal(false)
                    setSelectedIterationId(iteration.id)
                  }}
                  className={cn(
                    'relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-xl transition-[opacity,transform] duration-200',
                    isSelected ? 'opacity-100' : 'opacity-45 hover:opacity-90',
                  )}
                >
                  <img
                    src={iteration.imageUrl}
                    alt=""
                    draggable="false"
                    className="size-full object-cover"
                  />
                  {isOriginal ? (
                    <span className="bg-foreground/80 text-background absolute inset-x-0 bottom-0 py-0.5 text-center text-[8px] font-semibold uppercase tracking-wide">
                      Original
                    </span>
                  ) : null}
                </button>
              )
            })}
            {pendingCount(design) > 0 ? (
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                <Shimmer className="size-full rounded-none" label={null} />
              </div>
            ) : null}
            <button
              type="button"
              disabled={designPending}
              onClick={() => setStyleOpen(true)}
              className="border-border/60 text-muted-foreground hover:border-foreground/40 hover:text-foreground flex size-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed transition-colors disabled:opacity-50"
            >
              <Plus className="size-4" />
              <span className="text-[9px] font-medium">Style</span>
            </button>
          </div>
        </div>

        {dropOverlay}
        {errorToast}
        {styleLibrary}

        {/* Quick remix dialog */}
        <Dialog open={remixOpen} onOpenChange={setRemixOpen}>
          <DialogContent className="w-[min(30rem,calc(100vw-2rem))] rounded-xl p-5">
            <DialogTitle className="rd-serif text-lg font-semibold">
              Describe a change
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-[13px]">
              Edits the render you’re viewing. Try “make the walls sage green”
              or “add a large arched window.”
            </DialogDescription>
            <textarea
              autoFocus
              value={remixPrompt}
              onChange={(event) => setRemixPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  submitRemix()
                }
              }}
              placeholder="What should change?"
              className="border-border/70 bg-muted/20 focus:bg-background focus:border-foreground/30 mt-3 h-24 w-full resize-none rounded-lg border p-3 text-sm outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer"
                onClick={() => setRemixOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="cursor-pointer gap-1.5"
                disabled={!remixPrompt.trim()}
                onClick={submitRemix}
              >
                <Wand2 className="size-4" />
                Render
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <DeleteDesignDialog
          design={pendingDeleteDesign}
          busy={simpleRpc.isPending}
          onClose={() => setPendingDeleteDesign(null)}
          onConfirm={(target) => {
            simpleRpc.mutate(
              {
                method: 'redecorate.designs.delete',
                params: { id: target.id },
              },
              {
                onSuccess: () => {
                  setPendingDeleteDesign(null)
                  closeDesign()
                },
              },
            )
          }}
        />
      </AppFrameContent>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // COLLECTION (designs in a folder / all / favorites)
  // ════════════════════════════════════════════════════════════════════════
  if (collectionId) {
    const title =
      collectionId === ALL_DESIGNS
        ? 'All designs'
        : collectionId === FAVORITES
          ? 'Favorites'
          : (openFolder?.name ?? 'Folder')
    const emoji =
      collectionId === ALL_DESIGNS
        ? '🗂️'
        : collectionId === FAVORITES
          ? '❤️'
          : (openFolder?.emoji ?? '📁')

    return (
      <AppFrameContent
        scrollable={false}
        chatSafe={false}
        className="animate-rd-view-in relative flex h-full min-h-0 flex-col overflow-hidden"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <ViewHeader
          onBack={closeCollection}
          backLabel="Gallery"
          emoji={emoji}
          title={title}
          subtitle={`${collectionDesigns.length} ${collectionDesigns.length === 1 ? 'design' : 'designs'}`}
          actions={
            <>
              {openFolder ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-9 cursor-pointer gap-1.5 rounded-full px-3 text-[12.5px]"
                  onClick={() => setPendingDeleteFolder(openFolder)}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 cursor-pointer gap-1.5 rounded-full px-3.5 text-[12.5px]"
                onClick={() => setStyleOpen(true)}
              >
                <Paintbrush className="size-3.5" />
                Browse styles
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 cursor-pointer gap-1.5 rounded-full px-3.5 text-[12.5px]"
                onClick={() => fileInputRef.current?.click()}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="size-3.5" />
                )}
                Add a photo
              </Button>
            </>
          }
        />

        <div className="redecorate-route-scroll rd-no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--chat-safe-padding,0px)+4rem)] pt-1 sm:px-5">
          {collectionDesigns.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-border/60 hover:border-foreground/30 hover:bg-muted/20 mt-6 flex w-full cursor-pointer flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center transition-colors"
            >
              <div className="bg-muted/50 mb-3 flex size-12 items-center justify-center rounded-full">
                <Upload className="text-muted-foreground size-5" />
              </div>
              <p className="rd-serif text-foreground text-lg">
                Drop a photo of your space
              </p>
              <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                A room, exterior, backyard, or floorplan — then tap a style to
                reimagine it. Or browse styles to start from scratch.
              </p>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {collectionDesigns.map((design, index) => (
                <DesignCard
                  key={design.id}
                  design={design}
                  index={index}
                  folders={folders}
                  onOpen={() => openDesign(design)}
                  onMove={(folderId) =>
                    patchDesign.mutate({ id: design.id, patch: { folderId } })
                  }
                  onFavorite={() =>
                    patchDesign.mutate({
                      id: design.id,
                      patch: { favorite: !design.favorite },
                    })
                  }
                  onDelete={() => setPendingDeleteDesign(design)}
                  onRetry={() =>
                    simpleRpc.mutate({
                      method: 'redecorate.designs.retry',
                      params: { id: design.id },
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>

        {dropOverlay}
        {errorToast}
        {hiddenFileInput}
        {styleLibrary}

        <DeleteDesignDialog
          design={pendingDeleteDesign}
          busy={simpleRpc.isPending}
          onClose={() => setPendingDeleteDesign(null)}
          onConfirm={(target) =>
            simpleRpc.mutate(
              {
                method: 'redecorate.designs.delete',
                params: { id: target.id },
              },
              { onSuccess: () => setPendingDeleteDesign(null) },
            )
          }
        />
        <DeleteFolderDialog
          folder={pendingDeleteFolder}
          busy={deleteFolderMutation.isPending}
          onClose={() => setPendingDeleteFolder(null)}
          onConfirm={(target) => {
            deleteFolderMutation.mutate(target.id, {
              onSuccess: () => {
                setPendingDeleteFolder(null)
                closeCollection()
              },
            })
          }}
        />
      </AppFrameContent>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // GALLERY (folders)
  // ════════════════════════════════════════════════════════════════════════
  const loading = designsQuery.isLoading || foldersQuery.isLoading

  return (
    <AppFrameContent
      scrollable={false}
      chatSafe={false}
      className="animate-rd-view-back relative flex h-full min-h-0 flex-col overflow-hidden"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <ViewHeader
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 cursor-pointer gap-1.5 rounded-full px-3.5 text-[12.5px]"
              onClick={() => setStyleOpen(true)}
            >
              <Paintbrush className="size-3.5" />
              Browse styles
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 cursor-pointer gap-1.5 rounded-full px-3.5 text-[12.5px]"
              onClick={() => setNewFolderOpen(true)}
            >
              <Plus className="size-3.5" />
              New folder
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 cursor-pointer gap-1.5 rounded-full px-3.5 text-[12.5px]"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ImagePlus className="size-3.5" />
              )}
              Add a photo
            </Button>
          </>
        }
      />

      <div className="redecorate-route-scroll rd-no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--chat-safe-padding,0px)+4rem)] pt-1 sm:px-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-muted/30 aspect-[4/5] animate-pulse rounded-2xl"
              />
            ))}
          </div>
        ) : gallerySections.length > 0 ? (
          <div className="space-y-8 pb-4">
            {gallerySections.map((section, sectionIndex) => (
              <section key={section.id} aria-label={section.title}>
                <div className="redecorate-gallery-section-header bg-background/95 border-border/60 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20 -mx-4 flex min-h-12 items-center justify-between gap-3 border-y px-4 py-2.5 backdrop-blur sm:-mx-5 sm:px-5">
                  <div className="flex min-w-0 items-center gap-2">
                    <FolderGlyph
                      emoji={section.emoji}
                      className="text-base leading-none"
                      fallbackClassName="text-muted-foreground size-4"
                    />
                    <h2 className="rd-serif truncate text-[18px] font-semibold">
                      {section.title}
                    </h2>
                    <span className="text-muted-foreground shrink-0 text-[12.5px] font-medium tabular-nums">
                      {section.designs.length}
                    </span>
                  </div>
                  {section.folder ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-8 shrink-0 cursor-pointer rounded-full"
                      onClick={() => setPendingDeleteFolder(section.folder!)}
                      aria-label={`Delete ${section.title} folder`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>

                {section.designs.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 px-0 pt-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {section.designs.map((design, index) => (
                      <DesignCard
                        key={design.id}
                        design={design}
                        index={sectionIndex * 2 + index}
                        folders={folders}
                        onOpen={() => openDesign(design)}
                        onMove={(folderId) =>
                          patchDesign.mutate({
                            id: design.id,
                            patch: { folderId },
                          })
                        }
                        onFavorite={() =>
                          patchDesign.mutate({
                            id: design.id,
                            patch: { favorite: !design.favorite },
                          })
                        }
                        onDelete={() => setPendingDeleteDesign(design)}
                        onRetry={() =>
                          simpleRpc.mutate({
                            method: 'redecorate.designs.retry',
                            params: { id: design.id },
                          })
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground px-1 pt-4 text-sm">
                    No designs in this folder yet.
                  </p>
                )}
              </section>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNewFolderOpen(true)}
            className="border-border/60 text-muted-foreground hover:border-foreground/30 hover:bg-muted/20 hover:text-foreground mt-6 flex w-full cursor-pointer flex-col items-center rounded-2xl border border-dashed px-6 py-12 transition-colors"
          >
            <Plus className="size-5" />
            <span className="mt-2 text-[12.5px] font-medium">New folder</span>
          </button>
        )}
      </div>

      {dropOverlay}
      {errorToast}
      {hiddenFileInput}
      {styleLibrary}

      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        onCreate={async (name, emoji) => {
          await createFolderMutation.mutateAsync({ name, emoji })
        }}
      />
    </AppFrameContent>
  )
}

function DeleteDesignDialog({
  design,
  busy,
  onClose,
  onConfirm,
}: {
  design: Design | null
  busy: boolean
  onClose: () => void
  onConfirm: (design: Design) => void
}) {
  return (
    <AlertDialog
      open={Boolean(design)}
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <AlertDialogContent className="w-[min(24rem,calc(100vw-2rem))]">
        <AlertDialogHeader>
          <AlertDialogTitle className="rd-serif text-lg">
            Delete “{design?.title || 'this design'}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This removes the design and all of its renders. This can’t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={busy}
            onClick={(event) => {
              event.preventDefault()
              if (design) onConfirm(design)
            }}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteFolderDialog({
  folder,
  busy,
  onClose,
  onConfirm,
}: {
  folder: Folder | null
  busy: boolean
  onClose: () => void
  onConfirm: (folder: Folder) => void
}) {
  return (
    <AlertDialog
      open={Boolean(folder)}
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <AlertDialogContent className="w-[min(24rem,calc(100vw-2rem))]">
        <AlertDialogHeader>
          <AlertDialogTitle className="rd-serif text-lg">
            Delete “{folder?.name}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The folder is removed.{' '}
            {folder && folder.designCount > 0
              ? `Its ${folder.designCount} ${
                  folder.designCount === 1 ? 'design' : 'designs'
                } move to All designs — nothing is deleted.`
              : 'It has no designs inside.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={busy}
            onClick={(event) => {
              event.preventDefault()
              if (folder) onConfirm(folder)
            }}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Delete folder
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
