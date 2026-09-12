'use client'

import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChefHat,
  Clock,
  ExternalLink,
  Flame,
  Heart,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  AppHeader,
  Badge,
  Button,
  DesktopOnly,
  Markdown,
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  ToolbarContent,
  ToolbarTitle,
  cn,
} from '@moldable-ai/ui'
import {
  formatCookedDate,
  isPlannedThisWeek,
  montrealCalendarDate,
} from '@/lib/cooking'
import type { Folder, Recipe } from '@/lib/types'
import { MoveToMenu } from './move-to-menu'
import { useRecipeMedia, useResolvedMarkdown } from '@/client/use-recipe-media'

interface RecipeDetailProps {
  recipe: Recipe
  initialCookMode?: boolean
  folders: Folder[]
  currentFolderId: string | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  onTogglePlannedForWeek: () => void
  onRecordCooked: () => void
  onMove: (folderId: string | null) => void
  onNewFolder: () => void
}

/** Rewrite relative asset refs in markdown to served URLs so inline step
 *  images render both here and in Cook Mode. External URLs pass through. */
/** Split instruction markdown into discrete steps for Cook Mode. */
function splitSteps(markdown: string): string[] {
  const text = markdown.trim()
  if (!text) return []
  const orderedMatches = text.match(/^\s*\d+[.)]\s+.+(?:\n(?!\s*\d+[.)]).*)*/gm)
  if (orderedMatches && orderedMatches.length > 1) {
    return orderedMatches.map((s) => s.replace(/^\s*\d+[.)]\s+/, '').trim())
  }
  return text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function MetaChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock
  label: string
  value: string
}) {
  return (
    <div className="border-border/70 bg-muted/30 flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5">
      <Icon className="text-primary size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

const FALLBACK_GRADIENT =
  'linear-gradient(135deg, rgba(120,120,120,0.18), rgba(120,120,120,0.06))'

export function RecipeDetail({
  recipe,
  initialCookMode = false,
  folders,
  currentFolderId,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTogglePlannedForWeek,
  onRecordCooked,
  onMove,
  onNewFolder,
}: RecipeDetailProps) {
  const { resolveMediaUrl } = useRecipeMedia()
  const resolvedInstructions = useResolvedMarkdown(recipe.instructions)
  const steps = useMemo(
    () => splitSteps(recipe.instructions),
    [recipe.instructions],
  )
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [cooking, setCooking] = useState(initialCookMode)

  const heroUrl = resolveMediaUrl(recipe.imageUrl)
  const plannedThisWeek = isPlannedThisWeek(recipe.plannedForWeek)
  const cookedOn = recipe.cookedOn ?? []
  const cookedToday = cookedOn.includes(montrealCalendarDate())

  const meta: { icon: typeof Clock; label: string; value: string }[] = []
  if (recipe.servings)
    meta.push({ icon: Users, label: 'Serves', value: recipe.servings })
  if (recipe.prepTime)
    meta.push({ icon: Clock, label: 'Prep', value: recipe.prepTime })
  if (recipe.cookingTime)
    meta.push({ icon: Flame, label: 'Cook', value: recipe.cookingTime })
  if (recipe.difficulty)
    meta.push({ icon: ChefHat, label: 'Difficulty', value: recipe.difficulty })

  const toggleChecked = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  if (cooking && steps.length > 0) {
    return (
      <CookMode
        recipe={recipe}
        steps={steps}
        onClose={() => setCooking(false)}
      />
    )
  }

  return (
    <div className="recipe-detail-scroll flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain bg-transparent">
      <AppHeader
        title={recipe.title}
        back={onClose}
        desktop={false}
        actions={[
          {
            id: 'recipe.favorite',
            label: recipe.isFavorite ? 'Unfavorite' : 'Favorite',
            icon: Heart,
            onPress: onToggleFavorite,
          },
          {
            id: 'recipe.edit',
            label: 'Edit recipe',
            icon: Pencil,
            onPress: onEdit,
          },
          {
            id: 'recipe.delete',
            label: 'Delete recipe',
            icon: Trash2,
            onPress: onDelete,
            placement: 'overflow',
          },
        ]}
      />
      <DesktopOnly>
        <Toolbar variant="plain" material="none" position="top">
          <ToolbarButton
            material="ultra-thin"
            type="button"
            size="icon-xl"
            className="cursor-pointer"
            aria-label="Back to recipes"
            onClick={onClose}
          >
            <ArrowLeft className="size-4" />
          </ToolbarButton>
          <ToolbarContent>
            <ToolbarTitle>{recipe.title}</ToolbarTitle>
          </ToolbarContent>
          <ToolbarActions>
            <ToolbarButton
              material="ultra-thin"
              type="button"
              size="icon-xl"
              className="cursor-pointer"
              onClick={onToggleFavorite}
              aria-label={recipe.isFavorite ? 'Unfavorite' : 'Favorite'}
            >
              <Heart
                className={cn('size-4', recipe.isFavorite && 'fill-current')}
              />
            </ToolbarButton>
            <MoveToMenu
              folders={folders}
              currentFolderId={currentFolderId}
              onMove={onMove}
              onNewFolder={onNewFolder}
              onDelete={onDelete}
              trigger={
                <ToolbarButton
                  material="ultra-thin"
                  type="button"
                  size="icon-xl"
                  className="cursor-pointer"
                  aria-label="Move to folder or delete"
                >
                  <MoreVertical className="size-4" />
                </ToolbarButton>
              }
            />
          </ToolbarActions>
        </Toolbar>
      </DesktopOnly>

      {/* Hero */}
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden">
        {heroUrl ? (
          <img
            src={heroUrl}
            alt={recipe.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full" style={{ background: FALLBACK_GRADIENT }}>
            <UtensilsCrossed className="text-muted-foreground/40 absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Title block */}
        <div className="absolute inset-x-0 bottom-0 p-6">
          {recipe.category && (
            <Badge className="mb-2 border-none bg-white/90 text-[10px] font-bold uppercase tracking-widest text-black">
              {recipe.category}
            </Badge>
          )}
          <h1 className="text-3xl font-semibold tracking-tight text-white drop-shadow">
            {recipe.title}
          </h1>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-3xl px-6 pb-[var(--chat-safe-padding)] pt-6">
        {/* Action row */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {steps.length > 0 && (
            <Button
              onClick={() => setCooking(true)}
              className="rounded-full px-5"
            >
              <ChefHat className="mr-1.5 size-4" />
              Cook mode
            </Button>
          )}
          <Button
            type="button"
            variant={plannedThisWeek ? 'secondary' : 'outline'}
            className="cursor-pointer rounded-full"
            onClick={onTogglePlannedForWeek}
          >
            <CalendarCheck className="mr-1.5 size-4" />
            {plannedThisWeek ? 'Cooking this week' : 'Cook this week'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer rounded-full"
            onClick={onRecordCooked}
            disabled={cookedToday}
          >
            <CheckCircle2 className="mr-1.5 size-4" />
            {cookedToday ? 'Cooked today' : 'Mark cooked today'}
          </Button>
          <Button variant="outline" className="rounded-full" onClick={onEdit}>
            <Pencil className="mr-1.5 size-4" />
            Edit
          </Button>
          {recipe.sourceUrl && (
            <a
              href={
                /^https?:\/\//.test(recipe.sourceUrl)
                  ? recipe.sourceUrl
                  : undefined
              }
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm"
            >
              <ExternalLink className="size-3.5" />
              Source
            </a>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive ml-auto inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-colors"
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
        </div>

        {recipe.description && (
          <p className="text-muted-foreground mb-6 text-base leading-relaxed">
            {recipe.description}
          </p>
        )}

        {(plannedThisWeek || cookedOn.length > 0) && (
          <div className="border-border/70 mb-7 border-y py-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              {plannedThisWeek ? (
                <Badge variant="secondary">
                  <CalendarCheck />
                  Cooking this week
                </Badge>
              ) : null}
              {cookedOn.length > 0 ? (
                <p className="text-muted-foreground">
                  Cooked {cookedOn.length}{' '}
                  {cookedOn.length === 1 ? 'time' : 'times'}
                  {` · Last ${formatCookedDate(cookedOn[0]!)}`}
                </p>
              ) : null}
            </div>
            {cookedOn.length > 1 ? (
              <p className="text-muted-foreground mt-2 text-xs">
                History: {cookedOn.map(formatCookedDate).join(' · ')}
              </p>
            ) : null}
          </div>
        )}

        {meta.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {meta.map((m) => (
              <MetaChip key={m.label} {...m} />
            ))}
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Ingredients */}
          <div>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">
              Ingredients
            </h2>
            {recipe.ingredients.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No ingredients yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {recipe.ingredients.map((ingredient, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => toggleChecked(i)}
                      className="hover:bg-muted/40 group flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors"
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                          checked.has(i)
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/40 group-hover:border-foreground/60',
                        )}
                      >
                        {checked.has(i) && (
                          <svg
                            viewBox="0 0 12 12"
                            className="size-3"
                            fill="none"
                          >
                            <path
                              d="M2.5 6.5l2.5 2.5 4.5-5"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span
                        className={cn(
                          'text-sm leading-relaxed',
                          checked.has(i) &&
                            'text-muted-foreground line-through',
                        )}
                      >
                        {ingredient}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Instructions */}
          <div>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">
              Instructions
            </h2>
            {recipe.instructions.trim() ? (
              <Markdown
                markdown={resolvedInstructions}
                proseSize="base"
                className="recipe-rich-markdown max-w-none [&_li]:my-1.5 [&_ol]:space-y-2 [&_p]:leading-relaxed"
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                No instructions yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cook Mode — hands-free, one step at a time.
// ---------------------------------------------------------------------------

function CookMode({
  recipe,
  steps,
  onClose,
}: {
  recipe: Recipe
  steps: string[]
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const resolved = useResolvedMarkdown(steps[index] ?? '')
  const atEnd = index >= steps.length - 1
  const atStart = index <= 0

  const next = () => setIndex((i) => Math.min(steps.length - 1, i + 1))
  const prev = () => setIndex((i) => Math.max(0, i - 1))

  return (
    <div
      className="recipe-cook-mode animate-recipe-fade-in flex h-full min-h-0 flex-col bg-transparent"
      role="dialog"
      aria-label="Cook mode"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') next()
        if (e.key === 'ArrowLeft') prev()
        if (e.key === 'Escape') onClose()
      }}
      tabIndex={-1}
      ref={(el) => el?.focus()}
    >
      <AppHeader
        title={recipe.title}
        nativeTitle={`Cook · ${recipe.title}`}
        back={onClose}
        desktop={false}
      />

      {/* Progress */}
      <div className="recipe-cook-progress bg-muted h-1 w-full shrink-0">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${((index + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="recipe-cook-step flex min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <div className="w-full max-w-2xl">
          <p className="text-muted-foreground mb-4 text-sm font-medium">
            Step {index + 1} of {steps.length}
          </p>
          <Markdown
            markdown={resolved}
            proseSize="lg"
            className="recipe-rich-markdown max-w-none text-2xl leading-relaxed [&_p]:text-2xl [&_p]:leading-relaxed"
          />
        </div>
      </div>

      {/* Footer nav */}
      <div className="recipe-cook-footer border-border flex shrink-0 items-center justify-between gap-3 border-t px-6 py-4">
        <Button
          variant="outline"
          className="rounded-full"
          onClick={prev}
          disabled={atStart}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn(
                'size-1.5 rounded-full transition-colors',
                i === index ? 'bg-primary w-4' : 'bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
        {atEnd ? (
          <Button className="rounded-full" onClick={onClose}>
            Done
          </Button>
        ) : (
          <Button className="rounded-full" onClick={next}>
            Next
            <ArrowRight className="ml-1.5 size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
