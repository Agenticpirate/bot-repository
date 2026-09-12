'use client'

import {
  Bookmark,
  Flower2,
  Heart,
  ImageOff,
  MapPin,
  MoreVertical,
  RefreshCw,
  Sprout,
  Sun,
  Trash2,
} from 'lucide-react'
import {
  type JSX,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { MarkdownEditor } from '@moldable-ai/editor'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AppHeader,
  Button,
  DesktopOnly,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Toolbar,
  ToolbarActions,
  ToolbarBackButton,
  ToolbarIconButton,
  cn,
} from '@moldable-ai/ui'
import { randomMemorialEulogy } from '../../lib/memorial-eulogies'
import type { IdCandidate, Plant } from '../../lib/types'
import { CareView } from './care-view'
import { IdConfirm } from './id-confirm'
import { EditableChip, InlineInput } from './inline-edit'
import { fallbackGradient } from './plant-card'
import { PlantJournal } from './plant-journal'
import { WaterStatus } from './water-status'

// ── Hero: full-bleed photo (slow Ken-Burns) or a tonal gradient + sprout ──
function Hero({
  url,
  name,
  children,
}: {
  url: string | undefined
  name: string
  children: React.ReactNode
}): JSX.Element {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [url])
  const showImage = Boolean(url) && !broken

  return (
    <div className="relative h-[42vh] max-h-[460px] min-h-[280px] w-full overflow-hidden">
      {showImage ? (
        <img
          src={url}
          alt={name}
          className="plant-kenburns absolute inset-0 size-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: fallbackGradient(name || 'plant') }}
        >
          {url && broken ? (
            <ImageOff className="size-12 text-white/40" />
          ) : (
            <Sprout className="size-16 text-white/30" />
          )}
        </div>
      )}

      {/* Bottom scrim keeps the editable title legible over the photo. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

      {children}
    </div>
  )
}

export function PlantDetail(props: {
  plant: Plant
  mediaUrl: (path?: string) => string | undefined
  onBack: () => void
  onPatch: (patch: Partial<Plant>) => void
  onAcquire: () => void
  acquiring?: boolean
  onWater: () => void
  onSnooze: (untilISO: string) => void
  onGenerateCare: () => void
  regenerating: boolean
  onFavorite: (next: boolean) => void
  onMarkDeceased: () => void
  onRestore: () => void
  onDelete: () => void
  onAddPhoto: (file: File) => Promise<void> | void
  onSetHero: (path: string) => void
  addingPhoto?: boolean
  deleteRequestID?: number
}): JSX.Element {
  const {
    plant,
    mediaUrl,
    onBack,
    onPatch,
    onAcquire,
    acquiring,
    onWater,
    onSnooze,
    onGenerateCare,
    regenerating,
    onFavorite,
    onMarkDeceased,
    onRestore,
    onDelete,
    onAddPhoto,
    onSetHero,
    addingPhoto,
    deleteRequestID = 0,
  } = props

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmMemorial, setConfirmMemorial] = useState(false)
  const [memorialEulogy, setMemorialEulogy] = useState(() =>
    randomMemorialEulogy(plant.commonName),
  )

  useEffect(() => {
    if (plant.lifeStatus === 'deceased') {
      setMemorialEulogy(randomMemorialEulogy(plant.commonName))
    }
  }, [plant.commonName, plant.lifeStatus])

  useEffect(() => {
    if (deleteRequestID > 0) setConfirmDelete(true)
  }, [deleteRequestID])

  // Always open a plant at the very top. Depending on the host the scroller may
  // be our own container, the window, or the document — reset all of them before
  // paint, and again next frame (the host posts chat-state/safe-padding right
  // after load, which can nudge layout), so navigating in never lands mid-page.
  const scrollRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const toTop = () => {
      scrollRef.current?.scrollTo?.({ top: 0 })
      if (scrollRef.current) scrollRef.current.scrollTop = 0
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0)
        const doc = document.scrollingElement as HTMLElement | null
        if (doc) doc.scrollTop = 0
        if (document.body) document.body.scrollTop = 0
      }
    }
    toTop()
    const raf = requestAnimationFrame(toTop)
    return () => cancelAnimationFrame(raf)
  }, [plant.id])

  // Older editor bundles select their initial content even with autoFocus off.
  // WebKit treats that selection as an input focus, so dismiss it once the
  // detail view is mounted. The shared editor fix keeps this from being needed
  // after the next editor release, while this guard protects the installed app.
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('moldableMobile' in (window as Window & { moldableMobile?: unknown }))
    ) {
      return
    }

    const dismissInitialEditorFocus = () => {
      const active = document.activeElement
      if (
        active instanceof HTMLElement &&
        active.matches('[contenteditable="true"]') &&
        scrollRef.current?.contains(active)
      ) {
        active.blur()
      }
    }

    const frame = requestAnimationFrame(dismissInitialEditorFocus)
    return () => cancelAnimationFrame(frame)
  }, [plant.id])

  // Notes: debounced save with a quiet "Saved" flash.
  const [notes, setNotes] = useState(plant.notes ?? '')
  const [saved, setSaved] = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setNotes(plant.notes ?? '')
  }, [plant.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const onNotesChange = useCallback(
    (next: string) => {
      setNotes(next)
      if (notesTimer.current) clearTimeout(notesTimer.current)
      notesTimer.current = setTimeout(() => {
        onPatch({ notes: next })
        setSaved(true)
        if (savedTimer.current) clearTimeout(savedTimer.current)
        savedTimer.current = setTimeout(() => setSaved(false), 1500)
      }, 600)
    },
    [onPatch],
  )

  useEffect(
    () => () => {
      if (notesTimer.current) clearTimeout(notesTimer.current)
      if (savedTimer.current) clearTimeout(savedTimer.current)
    },
    [],
  )

  const heroUrl = mediaUrl(plant.heroImageUrl)
  const isWishlist = plant.ownershipStatus === 'wishlist'
  const isMemorial = plant.lifeStatus === 'deceased'
  const confirmName = (plant.scientificName ?? plant.commonName ?? '').trim()
  const idSource = plant.identification?.source
  // Only nudge for confirmation on machine guesses that haven't been confirmed.
  const needsConfirm =
    (idSource === 'chat' || idSource === 'vision') &&
    !plant.identification?.confirmedAt

  const confirmId = useCallback(() => {
    onPatch({
      identification: {
        ...plant.identification,
        confirmedAt: new Date().toISOString(),
      },
    })
  }, [onPatch, plant.identification])

  const pickCandidate = useCallback(
    (c: IdCandidate) => {
      onPatch({
        commonName: c.commonName?.trim() || c.name.trim(),
        scientificName: c.name.trim(),
        identification: {
          ...plant.identification,
          confirmedAt: new Date().toISOString(),
        },
      })
    },
    [onPatch, plant.identification],
  )

  // Per-block entrance stagger.
  let block = 0
  const rise = () => ({
    className: 'animate-plant-rise',
    style: { animationDelay: `${Math.min(block++, 6) * 60}ms` },
  })

  return (
    <main className="animate-plant-view-in relative flex h-full min-h-0 flex-col bg-transparent">
      <AppHeader
        title={plant.commonName}
        back={onBack}
        desktop={false}
        actions={[
          {
            id: 'plants.favorite',
            icon: Heart,
            label: plant.isFavorite
              ? 'Remove from favorites'
              : 'Add to favorites',
            onPress: () => onFavorite(!plant.isFavorite),
          },
          {
            id: 'plants.memorial',
            icon: Flower2,
            label: isMemorial ? 'Return to my plants' : 'Mark as deceased',
            placement: 'overflow',
            onPress: () => {
              if (isMemorial) onRestore()
              else setConfirmMemorial(true)
            },
          },
          {
            id: 'plants.delete',
            icon: Trash2,
            label: 'Delete plant',
            placement: 'overflow',
            onPress: () => setConfirmDelete(true),
          },
        ]}
      />
      <DesktopOnly>
        <Toolbar
          variant="plain"
          position="top"
          material="none"
          className="plants-detail-toolbar moldable-mobile-web-native-toolbar sticky top-0 border-b bg-transparent"
        >
          <ToolbarBackButton
            onClick={onBack}
            label="Back to plants"
            tooltip={false}
          />
          <ToolbarActions>
            <ToolbarIconButton
              label={
                plant.isFavorite ? 'Remove from favorites' : 'Add to favorites'
              }
              tooltip={false}
              onClick={() => onFavorite(!plant.isFavorite)}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Heart
                className={cn(
                  'size-[18px]',
                  plant.isFavorite && 'fill-rose-400 text-rose-400',
                )}
              />
            </ToolbarIconButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ToolbarIconButton
                  label="More actions"
                  tooltip={false}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <MoreVertical className="size-[18px]" />
                </ToolbarIconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    if (isMemorial) onRestore()
                    else setConfirmMemorial(true)
                  }}
                  className="cursor-pointer"
                >
                  <Flower2 className="mr-2 size-4" />
                  {isMemorial ? 'Return to my plants' : 'Mark as deceased'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setConfirmDelete(true)}
                  className="cursor-pointer"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete plant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ToolbarActions>
        </Toolbar>
      </DesktopOnly>
      <div
        ref={scrollRef}
        className="plants-detail-scroll min-h-0 flex-1 overflow-y-auto"
      >
        <Hero url={heroUrl} name={plant.commonName}>
          {/* Title block over the scrim */}
          <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
            <div className="mx-auto w-full max-w-[640px]">
              <InlineInput
                value={plant.commonName}
                placeholder="Name your plant"
                ariaLabel="Plant name"
                onCommit={(v) => onPatch({ commonName: v })}
                className="plant-serif text-[28px] font-semibold leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] placeholder:text-white/45 focus:bg-black/25 focus-visible:ring-white/60 sm:text-[32px]"
              />
              <InlineInput
                value={plant.scientificName ?? ''}
                placeholder="Add a scientific name"
                ariaLabel="Scientific name"
                allowEmpty
                onCommit={(v) => onPatch({ scientificName: v || undefined })}
                className="mt-0.5 text-[13px] italic text-white/75 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] placeholder:text-white/40 focus:bg-black/25 focus-visible:ring-white/60"
              />
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {isMemorial ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                    <Flower2 className="size-3.5" />
                    In memory of…
                  </span>
                ) : isWishlist ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                    <Bookmark className="size-3.5" />
                    Future plant
                  </span>
                ) : (
                  <>
                    <EditableChip
                      variant="hero"
                      icon={<MapPin />}
                      value={plant.room ?? ''}
                      placeholder="Add a room"
                      ariaLabel="Room"
                      onCommit={(v) => onPatch({ room: v || undefined })}
                    />
                    <EditableChip
                      variant="hero"
                      icon={<Sun />}
                      value={plant.location ?? ''}
                      placeholder="Add a spot"
                      ariaLabel="Spot"
                      onCommit={(v) => onPatch({ location: v || undefined })}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </Hero>

        {/* Content column */}
        <div className="mx-auto w-full max-w-[640px] space-y-5 px-4 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-5">
          <div {...rise()}>
            {isMemorial ? (
              <div className="border-border bg-muted/30 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Flower2 className="text-muted-foreground size-4" />
                    In loving memory
                  </p>
                  <p className="plant-serif mt-1 text-[15px] leading-snug">
                    {memorialEulogy}
                  </p>
                  {plant.deceasedAt ? (
                    <p className="text-muted-foreground mt-2 text-[11px]">
                      Remembered since{' '}
                      {new Date(plant.deceasedAt).toLocaleDateString()}
                    </p>
                  ) : null}
                </div>
                <IconButton
                  type="button"
                  label="Show another epitaph"
                  tooltip="Show another epitaph"
                  size="sm"
                  variant="outline"
                  className="shrink-0 cursor-pointer"
                  onClick={() =>
                    setMemorialEulogy(randomMemorialEulogy(plant.commonName))
                  }
                >
                  <RefreshCw className="size-4" />
                </IconButton>
              </div>
            ) : isWishlist ? (
              <div className="border-border bg-muted/30 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Saved for the future</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Care is ready, but watering reminders stay off until this
                    plant joins your collection.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 cursor-pointer"
                  onClick={onAcquire}
                  disabled={acquiring}
                >
                  {acquiring ? 'Moving…' : 'Move to my plants'}
                </Button>
              </div>
            ) : (
              <WaterStatus
                plant={plant}
                onWater={onWater}
                onSnooze={onSnooze}
                onSetInterval={(days) => onPatch({ waterIntervalDays: days })}
                onGenerateCare={onGenerateCare}
                generating={regenerating}
              />
            )}
          </div>

          <div {...rise()}>
            <PlantJournal
              plant={plant}
              mediaUrl={mediaUrl}
              onAddPhoto={onAddPhoto}
              onSetHero={onSetHero}
              busy={addingPhoto}
            />
          </div>

          {needsConfirm && confirmName && (
            <div {...rise()}>
              <IdConfirm
                name={confirmName}
                confirmed={false}
                candidates={plant.identification?.candidates}
                onConfirm={confirmId}
                onPickCandidate={pickCandidate}
              />
            </div>
          )}

          <div {...rise()}>
            <CareView
              plant={plant}
              onRegenerate={onGenerateCare}
              generating={regenerating}
            />
          </div>

          {/* Notes — quiet journal, not a boxed form field */}
          <div {...rise()}>
            <div className="mb-1.5 flex items-baseline justify-between px-1">
              <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.12em]">
                Notes
              </span>
              <span
                className={cn(
                  'text-muted-foreground text-[11px] transition-opacity',
                  saved ? 'opacity-100' : 'opacity-0',
                )}
              >
                Saved
              </span>
            </div>
            <div className="bg-muted/30 focus-within:bg-muted/45 rounded-xl px-3 py-1 transition-colors">
              <MarkdownEditor
                value={notes}
                onChange={onNotesChange}
                placeholder="Where it came from, how it's doing, anything to remember…"
                minHeight="120px"
                className="text-sm"
                hideMarkdownHint
                autoFocus={false}
              />
            </div>
          </div>

          {/* Confirmed plants keep a quiet reference-photo disclosure */}
          {!needsConfirm && confirmName && (
            <div {...rise()}>
              <IdConfirm
                name={confirmName}
                confirmed
                onConfirm={confirmId}
                onPickCandidate={pickCandidate}
              />
            </div>
          )}
        </div>
      </div>

      {/* Memorial confirmation */}
      <AlertDialog open={confirmMemorial} onOpenChange={setConfirmMemorial}>
        <AlertDialogContent
          size="sm"
          className="max-h-[calc(100dvh-var(--chat-safe-padding,0px)-2rem)] overflow-y-auto"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              In memory of {plant.commonName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              We&apos;ll keep every photo, note, and care memory, but stop
              watering reminders and move this plant into a memorial collection.
              You can return it to your plants anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={() => {
                setConfirmMemorial(false)
                onMarkDeceased()
              }}
            >
              Remember this plant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent
          size="sm"
          className="plants-delete-dialog max-h-[calc(100dvh-var(--chat-safe-padding,0px)-2rem)] overflow-y-auto"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plant?</AlertDialogTitle>
            <AlertDialogDescription>
              {plant.commonName} and its watering history will be removed. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="cursor-pointer"
              onClick={() => {
                setConfirmDelete(false)
                onDelete()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
