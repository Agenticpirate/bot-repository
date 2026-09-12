import {
  ArrowLeft,
  ChevronDown,
  Combine,
  Eye,
  EyeOff,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Wand2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@moldable-ai/ui'
import { FOCUS_RING, ICON_BTN } from '../../../ui-kit/lib/styles'
import {
  type CategoryCatalogLike,
  type CategoryOption,
  DETAILED_CATEGORY_OPTIONS,
  UNCATEGORIZED_CATEGORY,
  applyCategoryPreferences,
  categoryPreferenceFor,
} from '../../lib/categories'
import { MicroLabel } from '../../../ui-kit/cards/atoms'
import {
  type CategoryRule,
  type UserCategory,
  useCreateCategoryRule,
  useDeleteCategory,
  useDeleteCategoryRule,
  useMergeCategory,
  useUpdateCategory,
  useUserCategories,
} from '../../data-access/categories'
import { CategoryMenu } from '../CategoryMenu'
import { showToast } from '../Toaster'
import { CategoryEmojiPicker } from './CategoryEmojiPicker'

type Tab = 'categories' | 'rules'
type CategoryRowModel =
  | {
      type: 'custom'
      key: string
      label: string
      emoji?: string
      transactionCount: number
      lastUsedAt?: string
      source: UserCategory['source']
    }
  | {
      type: 'provider'
      key: string
      label: string
      defaultLabel: string
      emoji?: string
      groupLabel?: string
      hidden?: boolean
      mappedTo?: string
      transactionCount: number
      lastUsedAt?: string
    }

function searchKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function compareLabels(a: { label: string }, b: { label: string }): number {
  return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
}

function errMsg(e: unknown): string | undefined {
  return e instanceof Error ? e.message : undefined
}

function txCountLabel(count: number): string {
  return count === 0 ? 'Unused' : count.toLocaleString()
}

export function CategorySettingsView({
  demoMode,
  onBack,
}: {
  demoMode: boolean
  onBack: () => void
}) {
  const [tab, setTab] = useState<Tab>('categories')
  const [query, setQuery] = useState('')
  const categoriesQuery = useUserCategories(!demoMode)
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const mergeCategory = useMergeCategory()

  const response = categoriesQuery.data
  const preferences = useMemo(
    () => response?.preferences ?? [],
    [response?.preferences],
  )
  const statsByKey = useMemo(
    () => new Map((response?.stats ?? []).map((stat) => [stat.key, stat])),
    [response?.stats],
  )
  const statsByLabel = useMemo(
    () =>
      new Map(
        (response?.stats ?? []).map((stat) => [stat.label.toLowerCase(), stat]),
      ),
    [response?.stats],
  )
  const customRows = useMemo<CategoryRowModel[]>(
    () =>
      [...(response?.categories ?? [])].sort(compareLabels).map((category) => {
        const stat =
          statsByKey.get(category.id) ??
          statsByLabel.get(category.label.toLowerCase())
        return {
          type: 'custom',
          key: category.id,
          label: category.label,
          emoji: category.emoji,
          transactionCount: stat?.transactionCount ?? 0,
          lastUsedAt: stat?.lastUsedAt,
          source: category.source,
        }
      }),
    [response?.categories, statsByKey, statsByLabel],
  )

  const providerRows = useMemo<CategoryRowModel[]>(
    () =>
      DETAILED_CATEGORY_OPTIONS.map((option) => {
        const preference = categoryPreferenceFor(option.key, preferences)
        const stat = statsByKey.get(option.key)
        return {
          type: 'provider',
          key: option.key,
          label: preference?.label?.trim() || option.label,
          defaultLabel: option.label,
          emoji: preference?.emoji || option.emoji,
          groupLabel: option.groupLabel,
          hidden: preference?.hidden,
          mappedTo: preference?.mappedTo,
          transactionCount: stat?.transactionCount ?? 0,
          lastUsedAt: stat?.lastUsedAt,
        }
      }),
    [preferences, statsByKey],
  )

  const targetOptions = useMemo(
    () => buildTargetOptions(response?.categories ?? [], preferences),
    [preferences, response?.categories],
  )

  const catalog = useMemo(
    () => ({ categories: response?.categories ?? [], preferences }),
    [preferences, response?.categories],
  )

  const rows = useMemo(() => {
    const q = searchKey(query.trim())
    const all = [...customRows, ...providerRows]
    if (!q) return all
    return all.filter((row) =>
      searchKey(
        `${row.label} ${row.type === 'provider' ? row.defaultLabel : ''} ${
          row.type === 'provider' ? (row.groupLabel ?? '') : row.source
        }`,
      ).includes(q),
    )
  }, [customRows, providerRows, query])

  const handleSave = (
    row: CategoryRowModel,
    patch: { label?: string; emoji?: string },
  ) =>
    updateCategory.mutate(
      { id: row.key, ...patch },
      {
        onSuccess: () =>
          showToast({ tone: 'success', title: 'Category updated' }),
        onError: (e) =>
          showToast({
            tone: 'error',
            title: 'Couldn’t update category',
            description: errMsg(e),
          }),
      },
    )

  const handleHide = (row: CategoryRowModel, hidden: boolean) =>
    updateCategory.mutate(
      { id: row.key, hidden, mappedTo: undefined },
      {
        onSuccess: () =>
          showToast(
            hidden
              ? {
                  tone: 'info',
                  title: `${row.label} hidden`,
                  description: 'Its transactions show as Uncategorized.',
                }
              : { tone: 'success', title: `${row.label} is back` },
          ),
        onError: (e) =>
          showToast({
            tone: 'error',
            title: 'Couldn’t update category',
            description: errMsg(e),
          }),
      },
    )

  const handleMerge = (row: CategoryRowModel, to: string) =>
    mergeCategory.mutate(
      { from: row.key, to },
      {
        onSuccess: () =>
          showToast({
            tone: 'success',
            title: 'Folded in',
            description: `${row.label} → ${to}`,
          }),
        onError: (e) =>
          showToast({
            tone: 'error',
            title: 'Couldn’t fold categories',
            description: errMsg(e),
          }),
      },
    )

  const handleDelete = (row: CategoryRowModel, reassignTo: string) =>
    deleteCategory.mutate(
      { id: row.key, reassignTo },
      {
        onSuccess: () =>
          showToast({
            tone: 'success',
            title: `Deleted ${row.label}`,
            description: `Transactions moved to ${reassignTo}.`,
          }),
        onError: (e) =>
          showToast({
            tone: 'error',
            title: 'Couldn’t delete category',
            description: errMsg(e),
          }),
      },
    )

  return (
    <div className="mx-auto max-w-3xl px-4 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-6 sm:px-6">
      <div className="mb-5 flex items-start gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="mt-0.5 size-8 cursor-pointer"
          aria-label="Back to settings"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Make categories yours — rename, set an emoji, fold duplicates
            together, and auto-tag merchants.
          </p>
        </div>
      </div>

      {demoMode ? (
        <div className="border-border/60 bg-card rounded-xl border p-4 text-sm">
          Category management is available after connecting live data.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="money-category-controls bg-background border-border/40 sticky top-0 z-20 -mx-4 space-y-3 border-b px-4 pb-3 pt-1 sm:-mx-6 sm:px-6">
            <div className="flex gap-2">
              <TabButton
                active={tab === 'categories'}
                onClick={() => setTab('categories')}
              >
                Categories
              </TabButton>
              <TabButton
                active={tab === 'rules'}
                onClick={() => setTab('rules')}
              >
                Rules
              </TabButton>
            </div>
            {tab === 'categories' ? (
              <div className="relative">
                <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search categories..."
                  className="h-10 rounded-xl pl-9"
                />
              </div>
            ) : null}
          </div>

          {tab === 'categories' ? (
            <div className="space-y-5">
              {categoriesQuery.isLoading ? (
                <LoadingState />
              ) : categoriesQuery.isError ? (
                <ErrorState onRetry={() => void categoriesQuery.refetch()} />
              ) : (
                <>
                  <CategoryGroup
                    title="Your categories"
                    rows={rows.filter((row) => row.type === 'custom')}
                    targetOptions={targetOptions}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onMerge={handleMerge}
                  />
                  <ProviderCategorySections
                    rows={rows.filter((row) => row.type === 'provider')}
                    targetOptions={targetOptions}
                    onSave={handleSave}
                    onHide={(row) => handleHide(row, true)}
                    onUnhide={(row) => handleHide(row, false)}
                    onMerge={handleMerge}
                  />
                  {rows.length === 0 ? (
                    <p className="text-muted-foreground py-10 text-center text-sm">
                      No categories match “{query}”.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <CategoryRulesPanel
              rules={response?.rules ?? []}
              targetOptions={targetOptions}
              catalog={catalog}
              loading={categoriesQuery.isLoading}
            />
          )}
        </div>
      )}
    </div>
  )
}

function buildTargetOptions(
  customCategories: UserCategory[],
  preferences: Array<{
    key: string
    label?: string
    emoji?: string
    hidden?: boolean
    mappedTo?: string
  }>,
): CategoryOption[] {
  const byLabel = new Map<string, CategoryOption>()
  const push = (option: CategoryOption) => {
    const key = option.label.toLowerCase()
    if (!byLabel.has(key)) byLabel.set(key, option)
  }
  push(UNCATEGORIZED_CATEGORY)
  for (const category of [...customCategories].sort(compareLabels)) {
    push({
      key: category.id,
      label: category.label,
      emoji: category.emoji,
      groupLabel: 'Custom',
      kind: 'custom',
    })
  }
  for (const option of DETAILED_CATEGORY_OPTIONS) {
    const resolved = applyCategoryPreferences(option, preferences)
    if (resolved) push(resolved)
  }
  return [...byLabel.values()]
}

function CategoryGroup({
  title,
  rows,
  targetOptions,
  onSave,
  onDelete,
  onHide,
  onUnhide,
  onMerge,
}: {
  title: string
  rows: CategoryRowModel[]
  targetOptions: CategoryOption[]
  onSave: (
    row: CategoryRowModel,
    patch: { label?: string; emoji?: string },
  ) => void
  onDelete?: (row: CategoryRowModel, reassignTo: string) => void
  onHide?: (row: CategoryRowModel) => void
  onUnhide?: (row: CategoryRowModel) => void
  onMerge: (row: CategoryRowModel, to: string) => void
}) {
  if (rows.length === 0) return null
  return (
    <section>
      <MicroLabel className="mb-2">{title}</MicroLabel>
      <div className="divide-border/50 border-border/60 bg-card divide-y overflow-hidden rounded-xl border">
        {rows.map((row) => (
          <CategoryManagerRow
            key={`${row.type}:${row.key}`}
            row={row}
            targetOptions={targetOptions.filter(
              (option) => option.label !== row.label,
            )}
            onSave={onSave}
            onDelete={onDelete}
            onHide={onHide}
            onUnhide={onUnhide}
            onMerge={onMerge}
          />
        ))}
      </div>
    </section>
  )
}

function ProviderCategorySections({
  rows,
  targetOptions,
  onSave,
  onHide,
  onUnhide,
  onMerge,
}: {
  rows: CategoryRowModel[]
  targetOptions: CategoryOption[]
  onSave: (
    row: CategoryRowModel,
    patch: { label?: string; emoji?: string },
  ) => void
  onHide: (row: CategoryRowModel) => void
  onUnhide: (row: CategoryRowModel) => void
  onMerge: (row: CategoryRowModel, to: string) => void
}) {
  if (rows.length === 0) return null

  const sections = new Map<string, CategoryRowModel[]>()
  for (const row of rows) {
    const label = row.type === 'provider' ? row.groupLabel || 'Other' : 'Other'
    sections.set(label, [...(sections.get(label) ?? []), row])
  }

  return (
    <div className="space-y-5">
      {[...sections.entries()].map(([label, sectionRows]) => (
        <section key={label}>
          <MicroLabel className="money-category-group-heading bg-background/95 sticky top-[6.75rem] z-10 -mx-1 mb-2 px-1 py-2 backdrop-blur">
            {label}
          </MicroLabel>
          <div className="divide-border/50 border-border/60 bg-card divide-y overflow-hidden rounded-xl border">
            {sectionRows.map((row) => (
              <CategoryManagerRow
                key={`${row.type}:${row.key}`}
                row={row}
                targetOptions={targetOptions.filter(
                  (option) => option.label !== row.label,
                )}
                onSave={onSave}
                onHide={onHide}
                onUnhide={onUnhide}
                onMerge={onMerge}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function CategoryManagerRow({
  row,
  targetOptions,
  onSave,
  onDelete,
  onHide,
  onUnhide,
  onMerge,
}: {
  row: CategoryRowModel
  targetOptions: CategoryOption[]
  onSave: (
    row: CategoryRowModel,
    patch: { label?: string; emoji?: string },
  ) => void
  onDelete?: (row: CategoryRowModel, reassignTo: string) => void
  onHide?: (row: CategoryRowModel) => void
  onUnhide?: (row: CategoryRowModel) => void
  onMerge: (row: CategoryRowModel, to: string) => void
}) {
  const [label, setLabel] = useState(row.label)
  const [dialog, setDialog] = useState<null | 'merge' | 'delete'>(null)
  const hidden = row.type === 'provider' && row.hidden
  const showProviderMeta =
    row.type === 'provider' &&
    (row.defaultLabel !== row.label || hidden || Boolean(row.mappedTo))

  useEffect(() => {
    setLabel(row.label)
  }, [row.label])

  const commitLabel = () => {
    const next = label.trim()
    if (next && next !== row.label) onSave(row, { label: next })
    else setLabel(row.label)
  }

  return (
    <div className={cn('px-3 py-2.5', hidden && 'opacity-60')}>
      <div className="flex items-center gap-2">
        <CategoryEmojiPicker
          value={row.emoji}
          onChange={(emoji) => onSave(row, { emoji })}
        />
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onBlur={commitLabel}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              setLabel(row.label)
              event.currentTarget.blur()
            }
          }}
          aria-label={`Rename ${row.label}`}
          className={cn(
            'hover:bg-muted/60 focus-visible:bg-background focus-visible:border-border focus-visible:ring-ring min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none transition-colors focus-visible:ring-2',
          )}
        />

        <span
          title={
            row.lastUsedAt
              ? `Last used ${row.lastUsedAt.slice(0, 10)}`
              : undefined
          }
          className="text-muted-foreground shrink-0 text-xs tabular-nums"
        >
          {txCountLabel(row.transactionCount)}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${row.label}`}
              className={cn('shrink-0', ICON_BTN)}
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onSelect={() => setDialog('merge')}
              className="gap-2 text-sm"
            >
              <Combine className="size-3.5" />
              Fold into…
            </DropdownMenuItem>
            {row.type === 'provider' ? (
              hidden ? (
                <DropdownMenuItem
                  onSelect={() => onUnhide?.(row)}
                  className="gap-2 text-sm"
                >
                  <Eye className="size-3.5" />
                  Unhide
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={() => onHide?.(row)}
                  className="gap-2 text-sm"
                >
                  <EyeOff className="size-3.5" />
                  Hide
                </DropdownMenuItem>
              )
            ) : (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setDialog('delete')}
                  className="text-destructive focus:text-destructive gap-2 text-sm"
                >
                  <Trash2 className="size-3.5" />
                  Delete…
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {row.type === 'provider' ? (
        showProviderMeta ? (
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 pl-11 pt-1 text-xs">
            {row.defaultLabel !== row.label ? (
              <span>Default: {row.defaultLabel}</span>
            ) : null}
            {hidden ? <span>Shows as Uncategorized</span> : null}
            {row.mappedTo ? <span>Folded into {row.mappedTo}</span> : null}
          </div>
        ) : null
      ) : (
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 pl-11 pt-1 text-xs">
          <Badge variant="secondary" className="text-[10px] uppercase">
            {row.source === 'observed' ? 'In use' : 'Custom'}
          </Badge>
        </div>
      )}

      <MergeDialog
        open={dialog === 'merge'}
        onOpenChange={(open) => setDialog(open ? 'merge' : null)}
        row={row}
        targetOptions={targetOptions}
        onConfirm={(to) => onMerge(row, to)}
      />
      {row.type === 'custom' ? (
        <DeleteDialog
          open={dialog === 'delete'}
          onOpenChange={(open) => setDialog(open ? 'delete' : null)}
          row={row}
          targetOptions={targetOptions}
          onConfirm={(to) => onDelete?.(row, to)}
        />
      ) : null}
    </div>
  )
}

function MergeDialog({
  open,
  onOpenChange,
  row,
  targetOptions,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: CategoryRowModel
  targetOptions: CategoryOption[]
  onConfirm: (to: string) => void
}) {
  const [target, setTarget] = useState('')
  useEffect(() => {
    if (open) setTarget('')
  }, [open])
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Fold “{row.label}” into…</AlertDialogTitle>
          <AlertDialogDescription>
            Everything in {row.label} moves to the category you pick — its
            transactions{row.type === 'custom' ? ' and rules' : ''} come along.
            This can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <TargetSelect
          label="Choose a category"
          value={target || undefined}
          options={targetOptions}
          triggerClassName="w-full"
          onChange={setTarget}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!target}
            onClick={() => target && onConfirm(target)}
          >
            Fold in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteDialog({
  open,
  onOpenChange,
  row,
  targetOptions,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: CategoryRowModel
  targetOptions: CategoryOption[]
  onConfirm: (to: string) => void
}) {
  const [target, setTarget] = useState(UNCATEGORIZED_CATEGORY.label)
  useEffect(() => {
    if (open) setTarget(UNCATEGORIZED_CATEGORY.label)
  }, [open])
  const inUse = row.transactionCount > 0
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{row.label}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {inUse
              ? `“${row.label}” is used by ${txCountLabel(row.transactionCount)} transactions — choose where they should go.`
              : `This removes “${row.label}”. Any transactions still using it move to the category you pick.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <TargetSelect
          label="Move transactions to"
          value={target}
          options={targetOptions}
          triggerClassName="w-full"
          onChange={setTarget}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!target}
            onClick={() => target && onConfirm(target)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function TargetSelect({
  label,
  value,
  options,
  disabled,
  triggerClassName,
  onChange,
}: {
  label: string
  value?: string
  options: CategoryOption[]
  disabled?: boolean
  triggerClassName?: string
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn('h-9', triggerClassName ?? 'w-40')}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((option) => (
          <SelectItem key={option.key} value={option.label}>
            <span className="inline-flex items-center gap-2">
              {option.emoji ? <span>{option.emoji}</span> : null}
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CategoryRulesPanel({
  rules,
  targetOptions,
  catalog,
  loading,
}: {
  rules: CategoryRule[]
  targetOptions: CategoryOption[]
  catalog: CategoryCatalogLike
  loading: boolean
}) {
  const [pattern, setPattern] = useState('')
  const [matchType, setMatchType] = useState<'contains' | 'regex'>('contains')
  const [category, setCategory] = useState('')
  const createRule = useCreateCategoryRule()
  const deleteRule = useDeleteCategoryRule()

  const emojiByLabel = useMemo(
    () => new Map(targetOptions.map((o) => [o.label, o.emoji])),
    [targetOptions],
  )

  // A rule is just `{ pattern, matchType, category }`. This composer keeps it
  // sentence-shaped, not form-shaped — and that same payload is what chat / an
  // LLM could generate or edit from natural language later (à la Mail triage),
  // so the data path doesn't change when we add that.
  const submit = () => {
    if (!pattern.trim() || !category.trim()) return
    const target = category
    createRule.mutate(
      { pattern: pattern.trim(), matchType, category: target },
      {
        onSuccess: () => {
          setPattern('')
          setCategory('')
          setMatchType('contains')
          showToast({
            tone: 'success',
            title: 'Rule added',
            description: `Matching merchants → ${target}`,
          })
        },
        onError: (e) =>
          showToast({
            tone: 'error',
            title: 'Couldn’t add rule',
            description: errMsg(e),
          }),
      },
    )
  }

  return (
    <div className="space-y-5">
      <section>
        <MicroLabel className="mb-2">New rule</MicroLabel>
        <div className="border-border/60 bg-card rounded-xl border px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
            <span className="text-muted-foreground shrink-0">When name</span>
            <button
              type="button"
              onClick={() =>
                setMatchType((m) => (m === 'contains' ? 'regex' : 'contains'))
              }
              title="Switch between a simple text match and a regex"
              className={cn(
                'text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 rounded-md px-1.5 py-0.5 font-medium transition-colors',
                FOCUS_RING,
              )}
            >
              {matchType === 'regex' ? 'matches regex' : 'contains'}
            </button>
            <input
              value={pattern}
              onChange={(event) => setPattern(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit()
              }}
              placeholder={
                matchType === 'regex' ? 'pattern…' : 'Uber, Starbucks…'
              }
              aria-label="Rule pattern"
              className={cn(
                'hover:bg-muted/60 focus-visible:bg-background focus-visible:border-border focus-visible:ring-ring min-w-[7rem] flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 font-medium outline-none transition-colors focus-visible:ring-2',
              )}
            />
            <span className="text-muted-foreground shrink-0" aria-hidden="true">
              →
            </span>
            <CategoryMenu
              tx={{}}
              options={targetOptions}
              catalog={catalog}
              onSelect={setCategory}
              onClear={() => setCategory('')}
            >
              <button
                type="button"
                aria-label="Choose category"
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  category
                    ? 'border-foreground/25 text-foreground'
                    : 'border-border/70 text-muted-foreground hover:text-foreground',
                  FOCUS_RING,
                )}
              >
                {category ? (
                  <>
                    {emojiByLabel.get(category) ? (
                      <span>{emojiByLabel.get(category)}</span>
                    ) : null}
                    <span className="max-w-[8rem] truncate">{category}</span>
                  </>
                ) : (
                  'Pick category'
                )}
                <ChevronDown className="size-3 opacity-50" />
              </button>
            </CategoryMenu>
            <button
              type="button"
              onClick={submit}
              disabled={createRule.isPending || !pattern.trim() || !category}
              aria-label="Add rule"
              className={cn(
                'bg-foreground text-background ml-auto inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40',
                FOCUS_RING,
              )}
            >
              {createRule.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
            </button>
          </div>
          {createRule.isError ? (
            <p className="text-destructive mt-2 text-xs">
              {(createRule.error as Error).message}
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <MicroLabel className="mb-2">Rules</MicroLabel>
        <div className="divide-border/50 border-border/60 bg-card divide-y overflow-hidden rounded-xl border">
          {loading ? (
            <LoadingState />
          ) : rules.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-1 px-4 py-8 text-center text-sm">
              <Wand2 className="text-muted-foreground/60 size-5" />
              No auto-tag rules yet.
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm">
                    <span className="text-muted-foreground">
                      When name{' '}
                      {rule.matchType === 'regex' ? 'matches' : 'contains'}{' '}
                    </span>
                    <span className="font-medium">“{rule.pattern}”</span>
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    → {emojiByLabel.get(rule.category) ?? ''} {rule.category}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    deleteRule.mutate(rule.id, {
                      onSuccess: () =>
                        showToast({ tone: 'success', title: 'Rule removed' }),
                      onError: (e) =>
                        showToast({
                          tone: 'error',
                          title: 'Couldn’t remove rule',
                          description: errMsg(e),
                        }),
                    })
                  }
                  disabled={deleteRule.isPending}
                  className={cn(
                    'text-muted-foreground hover:text-destructive inline-flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    FOCUS_RING,
                  )}
                  aria-label={`Delete rule ${rule.pattern}`}
                >
                  {deleteRule.isPending && deleteRule.variables === rule.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 cursor-pointer items-center rounded-full px-3 text-sm font-medium transition-colors',
        active
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        FOCUS_RING,
      )}
    >
      {children}
    </button>
  )
}

function LoadingState() {
  return (
    <div className="text-muted-foreground flex items-center justify-center gap-2 px-4 py-8 text-sm">
      <Loader2 className="size-4 animate-spin" />
      Loading categories
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="border-border/60 bg-card rounded-xl border p-4">
      <div className="text-sm font-medium">Couldn’t load categories.</div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="mt-3 cursor-pointer"
      >
        Try again
      </Button>
    </div>
  )
}
