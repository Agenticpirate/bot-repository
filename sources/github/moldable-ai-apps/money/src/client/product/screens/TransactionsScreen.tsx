import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Landmark,
  List,
  Loader2,
  Repeat,
  Search,
  Tags,
  X,
} from 'lucide-react'
import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Input,
  cn,
} from '@moldable-ai/ui'
import { formatDate, formatMoney } from '../../ui-kit/lib/format'
import { FOCUS_RING } from '../../ui-kit/lib/styles'
import type {
  MoneyTransactionRow,
  TransactionCategoryRollup,
  TransactionFilters,
  TransactionsPage,
} from '../../ui-kit/lib/types'
import {
  CATEGORY_OPTIONS,
  CATEGORY_PICKER_OPTIONS,
  type CategoryOption,
  DETAILED_CATEGORY_OPTIONS,
  UNCATEGORIZED_CATEGORY,
  applyCategoryPreferences,
  categoryEmoji,
  categoryEmojiForKey,
  categoryEmojiForLabel,
  categoryLabel,
  friendlyCategory,
  isPlaidDetailedCategory,
} from '../lib/categories'
import { CategoryMenu } from '../components/CategoryMenu'
import { showToast } from '../components/Toaster'
import { TransactionDetailSheet } from '../components/TransactionDetailSheet'
import { CardShell } from '../../ui-kit/cards'
import { MerchantChip } from '../../ui-kit/cards/MerchantChip'
import { MicroLabel } from '../../ui-kit/cards/atoms'
import {
  useCreateCategory,
  useRecordCategoryRecent,
  useSeedDefaultRecents,
  useUserCategories,
} from '../data-access/categories'
import { useApplyCategory, useClearCategory } from '../data-access/labeling'
import {
  useTransactionCategoryRollups,
  useTransactions,
} from '../data-access/transactions'
import { SubscriptionsScreen } from './SubscriptionsScreen'

type Direction = 'all' | 'income' | 'expense' | 'transfer'
type Period = 'all' | 'month' | '30d' | 'year'
export type TransactionViewMode = 'list' | 'categories' | 'subscriptions'
type Option = { value: string; label: string }
type CategoryDrilldown = {
  rollup: TransactionCategoryRollup
  label: string
  parentScrollY: number
}

const PAGE = 50
const DIRECTION_OPTIONS: Option[] = [
  { value: 'all', label: 'All types' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
]
const PERIOD_OPTIONS: Option[] = [
  { value: 'all', label: 'All time' },
  { value: 'month', label: 'This month' },
  { value: '30d', label: '30 days' },
  { value: 'year', label: 'This year' },
]
const CATEGORY_OPTION_BY_KEY = new Map(
  [...CATEGORY_OPTIONS, ...DETAILED_CATEGORY_OPTIONS].map((option) => [
    option.key,
    option,
  ]),
)
const CATEGORY_GROUP_ORDER = new Map(
  CATEGORY_OPTIONS.map((option, index) => [option.label, index + 1]),
)

function compareLabels(a: { label: string }, b: { label: string }): number {
  return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Map a period to a closed [startDate, endDate] (or undefined for all time). */
function periodRange(period: Period): { startDate?: string; endDate?: string } {
  if (period === 'all') return {}
  const now = new Date()
  const end = iso(now)
  if (period === 'month')
    return {
      startDate: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
      endDate: end,
    }
  if (period === 'year')
    return { startDate: iso(new Date(now.getFullYear(), 0, 1)), endDate: end }
  const back = new Date(now)
  back.setDate(back.getDate() - 30)
  return { startDate: iso(back), endDate: end }
}

/** Full transactions list: search, compact filters, day-grouped rows, paging. */
export function TransactionsScreen({
  demo = false,
  onConnect,
  viewMode: controlledViewMode,
  onViewModeChange,
}: {
  demo?: boolean
  onConnect?: () => void
  viewMode?: TransactionViewMode
  onViewModeChange?: (mode: TransactionViewMode) => void
}) {
  const [internalViewMode, setInternalViewMode] =
    useState<TransactionViewMode>('list')
  const viewMode = controlledViewMode ?? internalViewMode
  const setViewMode = onViewModeChange ?? setInternalViewMode
  const [direction, setDirection] = useState<Direction>('all')
  const [period, setPeriod] = useState<Period>('all')
  const [category, setCategory] = useState<string>('all')
  const [categoryDrilldown, setCategoryDrilldown] =
    useState<CategoryDrilldown | null>(null)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [detail, setDetail] = useState<MoneyTransactionRow | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [allMatchingSelected, setAllMatchingSelected] = useState(false)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set())
  const controlsRef = useRef<HTMLDivElement | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [sectionStickyTop, setSectionStickyTop] = useState(0)
  // Category options accumulate as you page/filter, so the picker stays stable
  // even once a single category is selected (which would otherwise collapse it).
  const [seenCategories, setSeenCategories] = useState<string[]>([])

  const userCategories = useUserCategories(!demo)
  useSeedDefaultRecents(!demo, userCategories.data?.recents)
  const createCategory = useCreateCategory()
  const recordCategoryRecent = useRecordCategoryRecent()
  const applyCategory = useApplyCategory()
  const clearCategory = useClearCategory()

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const node = controlsRef.current
    if (!node || typeof window === 'undefined') return

    const update = () =>
      setSectionStickyTop(Math.ceil(node.getBoundingClientRect().height))
    update()

    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(node)
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  const baseFilters = useMemo<TransactionFilters>(
    () => ({
      q: debounced || undefined,
      direction: direction === 'all' ? undefined : direction,
      ...periodRange(period),
    }),
    [debounced, direction, period],
  )

  const listCategory = categoryDrilldown?.rollup.filterCategory ?? category
  const inCategoryDrilldown =
    viewMode === 'categories' && Boolean(categoryDrilldown)

  const bulkFilters = useMemo<TransactionFilters>(
    () => ({
      ...baseFilters,
      category: listCategory === 'all' ? undefined : listCategory,
    }),
    [baseFilters, listCategory],
  )

  const filters = useMemo<TransactionFilters>(
    () => ({
      ...bulkFilters,
      limit: PAGE,
      offset: 0,
    }),
    [bulkFilters],
  )

  const query = useTransactions(
    filters,
    !demo && (viewMode === 'list' || Boolean(inCategoryDrilldown)),
  )
  const categoryRollupsQuery = useTransactionCategoryRollups(
    baseFilters,
    !demo && viewMode === 'categories' && !inCategoryDrilldown,
  )
  const pages = useMemo<TransactionsPage[]>(
    () => query.data?.pages ?? [],
    [query.data?.pages],
  )
  const page = pages[0]
  const totalCount = page?.total ?? 0
  const screenTotal = inCategoryDrilldown
    ? (page?.total ?? categoryDrilldown?.rollup.transactionCount)
    : viewMode === 'categories'
      ? categoryRollupsQuery.data?.total
      : page?.total
  const screenSubtitle =
    typeof screenTotal === 'number'
      ? inCategoryDrilldown
        ? `${screenTotal.toLocaleString()} ${
            screenTotal === 1 ? 'transaction' : 'transactions'
          }`
        : `${screenTotal.toLocaleString()} total`
      : undefined
  const rows = useMemo(
    () => pages.flatMap((entry) => entry.transactions),
    [pages],
  )
  const groups = useMemo(() => groupByDay(rows), [rows])
  const visibleIds = useMemo(() => rows.map((row) => row.id), [rows])
  const selectedCount = allMatchingSelected
    ? Math.max(totalCount - excludedIds.size, 0)
    : selectedIds.size
  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) =>
      allMatchingSelected ? !excludedIds.has(id) : selectedIds.has(id),
    )
  const fetchNextPage = query.fetchNextPage
  const hasNextPage = query.hasNextPage
  const isFetchingNextPage = query.isFetchingNextPage
  const pendingCategoryIds = useMemo(() => {
    const ids = new Set<string>()
    if (applyCategory.isPending) {
      if (applyCategory.variables?.filters) {
        for (const tx of rows) {
          if (!applyCategory.variables.excludeTransactionIds?.includes(tx.id)) {
            ids.add(tx.id)
          }
        }
      } else {
        for (const id of applyCategory.variables?.transactionIds ?? []) {
          ids.add(id)
        }
      }
    }
    if (clearCategory.isPending && clearCategory.variables) {
      ids.add(clearCategory.variables)
    }
    return ids
  }, [
    applyCategory.isPending,
    applyCategory.variables,
    clearCategory.isPending,
    clearCategory.variables,
    rows,
  ])

  // Merge any new primary categories into the stable option list.
  useEffect(() => {
    const fresh = new Set<string>()
    for (const tx of rows) {
      const providerDetailed =
        tx.providerCategoryDetailed ??
        tx.category?.find((entry) => isPlaidDetailedCategory(entry))
      const providerPrimary = tx.providerCategoryPrimary ?? tx.category?.[0]
      if (providerDetailed) fresh.add(providerDetailed)
      else if (providerPrimary) fresh.add(providerPrimary)
    }
    if (fresh.size === 0) return
    setSeenCategories((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const c of fresh)
        if (!next.has(c)) {
          next.add(c)
          changed = true
        }
      return changed ? [...next].sort() : prev
    })
  }, [rows])

  useEffect(() => {
    setSelectedIds(new Set())
    setExcludedIds(new Set())
    setAllMatchingSelected(false)
  }, [debounced, direction, period, category, categoryDrilldown])

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || !hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { rootMargin: '420px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const categoryCatalog = useMemo(
    () => ({
      categories: userCategories.data?.categories ?? [],
      preferences: userCategories.data?.preferences ?? [],
    }),
    [userCategories.data?.categories, userCategories.data?.preferences],
  )

  const categoryOptions = useMemo<Option[]>(() => {
    const options = new Map<string, Option>()
    options.set('all', { value: 'all', label: 'All categories' })
    const visibleCategoryKeys = new Set(seenCategories)
    if (listCategory !== 'all') visibleCategoryKeys.add(listCategory)
    for (const c of visibleCategoryKeys) {
      options.set(c, {
        value: c,
        label: friendlyCategory(c, categoryCatalog.preferences),
      })
    }
    for (const c of userCategories.data?.categories ?? []) {
      options.set(c.label, { value: c.label, label: c.label })
    }
    const [all, ...categories] = [...options.values()]
    return [all, ...categories.sort(compareLabels)]
  }, [
    categoryCatalog.preferences,
    listCategory,
    seenCategories,
    userCategories.data?.categories,
  ])

  const pickerCategories = useMemo<CategoryOption[]>(() => {
    const byLabel = new Map<string, CategoryOption>()
    const push = (option: CategoryOption) => {
      const key = option.label.toLowerCase()
      if (!byLabel.has(key)) byLabel.set(key, option)
    }

    for (const recent of userCategories.data?.recents ?? []) {
      push({
        key: `recent:${recent.categoryKey ?? recent.label}`,
        label: recent.label,
        emoji: recent.emoji,
        groupLabel: 'Recents',
        kind: 'custom',
      })
    }
    push(UNCATEGORIZED_CATEGORY)

    const customCategories = [...(userCategories.data?.categories ?? [])].sort(
      compareLabels,
    )
    for (const category of customCategories) {
      const label = category.label.trim()
      if (!label) continue
      push({
        key: category.id,
        label,
        emoji: category.emoji,
        groupLabel: 'Custom',
        kind: 'custom',
      })
    }
    for (const option of CATEGORY_PICKER_OPTIONS) {
      const resolved = applyCategoryPreferences(
        option,
        userCategories.data?.preferences,
      )
      if (resolved) push(resolved)
    }
    return [...byLabel.values()]
  }, [
    userCategories.data?.categories,
    userCategories.data?.preferences,
    userCategories.data?.recents,
  ])

  const rememberCategory = (label: string) => {
    const option = pickerCategories.find((entry) => entry.label === label)
    recordCategoryRecent.mutate({
      label,
      categoryKey: option?.key.startsWith('recent:') ? undefined : option?.key,
      emoji: option?.emoji,
    })
  }

  const handleSetCategory = (tx: MoneyTransactionRow, label: string) => {
    if (categoryLabel(tx, categoryCatalog) === label) return
    applyCategory.mutate(
      { transactionIds: [tx.id], userCategory: label },
      {
        onSuccess: () => {
          rememberCategory(label)
          showToast({
            tone: 'success',
            title: 'Category updated',
            description: `${tx.merchantName || tx.name} → ${label}`,
          })
        },
        onError: (e) =>
          showToast({
            tone: 'error',
            title: 'Couldn’t update category',
            description: e instanceof Error ? e.message : undefined,
          }),
      },
    )
  }

  const handleBulkSetCategory = (label: string) => {
    const ids = [...selectedIds]
    const excluded = [...excludedIds]
    const count = selectedCount
    if (count === 0) return
    applyCategory.mutate(
      allMatchingSelected
        ? {
            filters: bulkFilters,
            excludeTransactionIds: excluded,
            userCategory: label,
          }
        : { transactionIds: ids, userCategory: label },
      {
        onSuccess: (result) => {
          rememberCategory(label)
          const updated =
            typeof result?.matched === 'number'
              ? result.matched
              : typeof result?.updated === 'number'
                ? result.updated
                : count
          showToast({
            tone: 'success',
            title: 'Categories updated',
            description: `${updated} ${updated === 1 ? 'transaction' : 'transactions'} → ${label}`,
          })
          clearSelection()
        },
        onError: (e) =>
          showToast({
            tone: 'error',
            title: 'Couldn’t update categories',
            description: e instanceof Error ? e.message : undefined,
          }),
      },
    )
  }

  const handleCreateCategory = (tx: MoneyTransactionRow, label: string) => {
    createCategory.mutate(label, {
      onSuccess: (category) => handleSetCategory(tx, category.label),
      onError: (e) =>
        showToast({
          tone: 'error',
          title: 'Couldn’t create category',
          description: e instanceof Error ? e.message : undefined,
        }),
    })
  }

  const handleBulkCreateCategory = (label: string) => {
    createCategory.mutate(label, {
      onSuccess: (category) => handleBulkSetCategory(category.label),
      onError: (e) =>
        showToast({
          tone: 'error',
          title: 'Couldn’t create category',
          description: e instanceof Error ? e.message : undefined,
        }),
    })
  }

  const toggleSelected = (id: string) => {
    if (allMatchingSelected) {
      setExcludedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      return
    }

    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectVisible = () => {
    const select = !allVisibleSelected
    if (allMatchingSelected) {
      setExcludedIds((prev) => {
        const next = new Set(prev)
        for (const id of visibleIds) {
          if (select) next.delete(id)
          else next.add(id)
        }
        return next
      })
      return
    }

    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of visibleIds) {
        if (select) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const selectAllMatching = () => {
    setSelectedIds(new Set())
    setExcludedIds(new Set())
    setAllMatchingSelected(true)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setExcludedIds(new Set())
    setAllMatchingSelected(false)
  }

  const handleViewModeChange = (mode: TransactionViewMode) => {
    setViewMode(mode)
    setCategoryDrilldown(null)
    clearSelection()
    if (mode === 'categories') setCategory('all')
  }

  const handleOpenCategory = (row: CategoryRollupRowModel) => {
    setCategoryDrilldown({
      rollup: row.rollup,
      label: row.label,
      parentScrollY: typeof window === 'undefined' ? 0 : window.scrollY,
    })
    setViewMode('categories')
    clearSelection()
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => window.scrollTo({ top: 0 }))
    }
  }

  const handleCloseCategory = () => {
    const y = categoryDrilldown?.parentScrollY ?? 0
    setCategoryDrilldown(null)
    clearSelection()
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.scrollTo({ top: y }))
      })
    }
  }

  const handleResetCategory = (tx: MoneyTransactionRow) => {
    clearCategory.mutate(tx.id, {
      onSuccess: () =>
        showToast({ tone: 'info', title: 'Reverted to bank category' }),
      onError: (e) =>
        showToast({
          tone: 'error',
          title: 'Couldn’t reset category',
          description: e instanceof Error ? e.message : undefined,
        }),
    })
  }

  if (demo) {
    return (
      <ScreenFrame
        title={viewMode === 'subscriptions' ? 'Subscriptions' : 'Transactions'}
        action={
          <TransactionsViewToggle
            value={viewMode}
            onChange={handleViewModeChange}
          />
        }
      >
        {viewMode === 'subscriptions' ? (
          <SubscriptionsScreen demo={demo} />
        ) : (
          <div className="border-border/70 bg-card/40 flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center">
            <Landmark className="text-muted-foreground size-8" />
            <div>
              <p className="font-medium">Your transactions live here</p>
              <p className="text-muted-foreground text-sm">
                Connect an account to see and search every transaction.
              </p>
            </div>
            {onConnect ? (
              <Button onClick={onConnect}>
                <Landmark className="size-4" />
                Connect an account
              </Button>
            ) : null}
          </div>
        )}
      </ScreenFrame>
    )
  }

  if (viewMode === 'subscriptions') {
    return (
      <ScreenFrame
        title="Subscriptions"
        subtitle="Detected recurring charges and bills."
        action={
          <TransactionsViewToggle
            value={viewMode}
            onChange={handleViewModeChange}
          />
        }
      >
        <SubscriptionsScreen demo={demo} />
      </ScreenFrame>
    )
  }

  return (
    <ScreenFrame
      leading={
        inCategoryDrilldown ? (
          <button
            type="button"
            onClick={handleCloseCategory}
            aria-label="Back to categories"
            className={cn(
              'border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-8 cursor-pointer items-center justify-center rounded-full border transition-colors',
              FOCUS_RING,
            )}
          >
            <ArrowLeft className="size-4" />
          </button>
        ) : undefined
      }
      title={
        inCategoryDrilldown
          ? (categoryDrilldown?.label ?? 'Transactions')
          : 'Transactions'
      }
      subtitle={screenSubtitle}
      action={
        inCategoryDrilldown ? undefined : (
          <TransactionsViewToggle
            value={viewMode}
            onChange={handleViewModeChange}
          />
        )
      }
    >
      <div
        ref={controlsRef}
        className="money-transaction-controls bg-background sticky top-0 z-40 -mx-4 mb-3 space-y-2.5 px-4 pb-3 pt-1 sm:-mx-6 sm:px-6"
      >
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchant or description…"
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            ariaLabel="Filter by type"
            value={direction}
            options={DIRECTION_OPTIONS}
            onChange={(v) => setDirection(v as Direction)}
          />
          <FilterPill
            ariaLabel="Filter by time"
            value={period}
            options={PERIOD_OPTIONS}
            onChange={(v) => setPeriod(v as Period)}
          />
          {viewMode === 'list' && categoryOptions.length > 1 ? (
            <FilterPill
              ariaLabel="Filter by category"
              value={listCategory}
              options={categoryOptions}
              onChange={setCategory}
            />
          ) : null}
        </div>
        {(viewMode === 'list' || inCategoryDrilldown) && selectedCount > 0 ? (
          <BulkActionBar
            selectedCount={selectedCount}
            visibleCount={visibleIds.length}
            totalCount={totalCount}
            allVisibleSelected={allVisibleSelected}
            allMatchingSelected={allMatchingSelected}
            pending={applyCategory.isPending || createCategory.isPending}
            categories={pickerCategories}
            catalog={categoryCatalog}
            onToggleVisible={selectVisible}
            onSelectAllMatching={selectAllMatching}
            onClear={clearSelection}
            onSetCategory={handleBulkSetCategory}
            onCreateCategory={handleBulkCreateCategory}
          />
        ) : null}
      </div>

      {viewMode === 'categories' && !inCategoryDrilldown ? (
        <CategoryRollupOverview
          query={categoryRollupsQuery}
          catalog={categoryCatalog}
          stickyTop={sectionStickyTop}
          onOpenCategory={handleOpenCategory}
        />
      ) : query.isLoading ? (
        <RowSkeletons />
      ) : query.isError ? (
        <CardShell
          title="Transactions"
          state="error"
          errorMessage="Couldn’t load transactions."
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No transactions match this view.
        </p>
      ) : (
        <div
          className={cn(
            'space-y-5 transition-opacity',
            query.isFetching && !query.isFetchingNextPage && 'opacity-60',
          )}
        >
          {groups.map((g) => (
            <div key={g.date}>
              <MicroLabel className="mb-1.5">
                {formatDate(g.date, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </MicroLabel>
              <ul className="divide-border/50 border-border/50 bg-card divide-y overflow-hidden rounded-xl border">
                {g.rows.map((tx) => (
                  <Row
                    key={tx.id}
                    tx={tx}
                    onClick={() => setDetail(tx)}
                    onSetCategory={handleSetCategory}
                    onCreateCategory={handleCreateCategory}
                    onResetCategory={handleResetCategory}
                    pending={pendingCategoryIds.has(tx.id)}
                    categories={pickerCategories}
                    catalog={categoryCatalog}
                    creatingCategory={createCategory.isPending}
                    selected={
                      allMatchingSelected
                        ? !excludedIds.has(tx.id)
                        : selectedIds.has(tx.id)
                    }
                    onToggleSelected={() => toggleSelected(tx.id)}
                  />
                ))}
              </ul>
            </div>
          ))}

          {hasNextPage ? (
            <div
              ref={loadMoreRef}
              className="text-muted-foreground flex justify-center py-2 text-xs"
            >
              {isFetchingNextPage ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading more
                </span>
              ) : (
                <span>More transactions below</span>
              )}
            </div>
          ) : null}
        </div>
      )}

      <TransactionDetailSheet
        tx={detail}
        categoryCatalog={categoryCatalog}
        onClose={() => setDetail(null)}
      />
    </ScreenFrame>
  )
}

function TransactionsViewToggle({
  value,
  onChange,
}: {
  value: TransactionViewMode
  onChange: (mode: TransactionViewMode) => void
}) {
  const options: Array<{
    value: TransactionViewMode
    label: string
    icon: ComponentType<{ className?: string }>
  }> = [
    { value: 'list', label: 'Transaction list', icon: List },
    { value: 'categories', label: 'Grouped by category', icon: Tags },
    { value: 'subscriptions', label: 'Subscriptions', icon: Repeat },
  ]
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  return (
    <div
      className="border-border bg-muted/70 relative inline-flex items-center rounded-full border p-0.5"
      role="group"
      aria-label="Transaction view"
    >
      <span
        aria-hidden="true"
        className="bg-background absolute inset-y-0.5 rounded-full shadow-sm transition-all duration-200 ease-out"
        style={{
          width: `calc((100% - 0.25rem) / ${options.length})`,
          left: '0.125rem',
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((option) => {
        const Icon = option.icon
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-label={option.label}
            aria-pressed={active}
            title={option.label}
            className={cn(
              'relative z-10 inline-flex min-h-7 cursor-pointer items-center justify-center rounded-full px-3 transition-colors',
              FOCUS_RING,
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
          </button>
        )
      })}
    </div>
  )
}

function CategoryRollupOverview({
  query,
  catalog,
  stickyTop,
  onOpenCategory,
}: {
  query: ReturnType<typeof useTransactionCategoryRollups>
  catalog: {
    categories: Array<{ id: string; label: string; emoji?: string }>
    preferences: Array<{
      key: string
      label?: string
      emoji?: string
      hidden?: boolean
      mappedTo?: string
    }>
  }
  stickyTop: number
  onOpenCategory: (row: CategoryRollupRowModel) => void
}) {
  const sections = useMemo(
    () => buildCategoryRollupSections(query.data?.categories ?? [], catalog),
    [catalog, query.data?.categories],
  )

  if (query.isLoading) return <CategoryRollupSkeletons />

  if (query.isError) {
    return (
      <CardShell
        title="Categories"
        state="error"
        errorMessage="Couldn’t load category totals."
        onRetry={() => void query.refetch()}
      />
    )
  }

  if (sections.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No categories match this view.
      </p>
    )
  }

  return (
    <div
      className={cn(
        'space-y-5 transition-opacity',
        query.isFetching && 'opacity-60',
      )}
    >
      {sections.map((section) => (
        <section key={section.label}>
          <div
            className="money-transaction-section-heading bg-background sticky z-30 -mx-4 mb-1.5 px-4 py-1 sm:-mx-6 sm:px-6"
            style={{ top: stickyTop }}
          >
            <MicroLabel>{section.label}</MicroLabel>
          </div>
          <ul className="divide-border/50 border-border/50 bg-card divide-y overflow-hidden rounded-xl border">
            {section.rows.map((row) => (
              <CategoryRollupRow
                key={row.rollup.key}
                row={row}
                onClick={() => onOpenCategory(row)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

interface CategoryRollupRowModel {
  rollup: TransactionCategoryRollup
  label: string
  emoji?: string
  groupLabel: string
}

function buildCategoryRollupSections(
  rollups: TransactionCategoryRollup[],
  catalog: {
    categories: Array<{ id: string; label: string; emoji?: string }>
    preferences: Array<{
      key: string
      label?: string
      emoji?: string
      hidden?: boolean
      mappedTo?: string
    }>
  },
): Array<{ label: string; rows: CategoryRollupRowModel[] }> {
  const bySection = new Map<string, CategoryRollupRowModel[]>()
  for (const rollup of rollups) {
    if (rollup.transactionCount <= 0) continue
    const row = categoryRollupRow(rollup, catalog)
    bySection.set(row.groupLabel, [
      ...(bySection.get(row.groupLabel) ?? []),
      row,
    ])
  }

  return [...bySection.entries()]
    .map(([label, rows]) => ({
      label,
      rows: rows.sort(compareLabels),
    }))
    .sort((a, b) => {
      const aOrder = CATEGORY_GROUP_ORDER.get(a.label) ?? 0
      const bOrder = CATEGORY_GROUP_ORDER.get(b.label) ?? 0
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
    })
}

function categoryRollupRow(
  rollup: TransactionCategoryRollup,
  catalog: {
    categories: Array<{ id: string; label: string; emoji?: string }>
    preferences: Array<{
      key: string
      label?: string
      emoji?: string
      hidden?: boolean
      mappedTo?: string
    }>
  },
): CategoryRollupRowModel {
  if (rollup.kind === 'custom') {
    const custom = catalog.categories.find(
      (category) =>
        category.label.trim().toLowerCase() === rollup.category.toLowerCase(),
    )
    return {
      rollup,
      label: rollup.category,
      emoji: custom?.emoji ?? categoryEmojiForLabel(rollup.category),
      groupLabel: 'Custom',
    }
  }

  if (rollup.kind === 'uncategorized') {
    return {
      rollup,
      label: UNCATEGORIZED_CATEGORY.label,
      emoji: UNCATEGORIZED_CATEGORY.emoji,
      groupLabel: 'Custom',
    }
  }

  const option = CATEGORY_OPTION_BY_KEY.get(rollup.category)
  const label = friendlyCategory(rollup.category, catalog.preferences)
  const customForMappedLabel = catalog.categories.find(
    (category) => category.label.trim().toLowerCase() === label.toLowerCase(),
  )
  return {
    rollup,
    label,
    emoji:
      customForMappedLabel?.emoji ??
      categoryEmojiForKey(rollup.category, catalog.preferences),
    groupLabel: option?.groupLabel ?? option?.label ?? 'Bank categories',
  }
}

function CategoryRollupRow({
  row,
  onClick,
}: {
  row: CategoryRollupRowModel
  onClick: () => void
}) {
  const { rollup } = row
  const amount = formatMoney(rollup.totalAmount, {
    currency: rollup.currencyCode,
    compact: true,
  })
  const countLabel = `${rollup.transactionCount.toLocaleString()} ${
    rollup.transactionCount === 1 ? 'transaction' : 'transactions'
  }`

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'hover:bg-muted/40 flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors',
          FOCUS_RING,
        )}
      >
        <MerchantChip name={row.label} emoji={row.emoji} size={36} muted />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{row.label}</div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            {countLabel}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="uk-nums text-sm font-semibold tabular-nums">
            {amount}
          </span>
          <ChevronRight className="text-muted-foreground size-4" />
        </div>
      </button>
    </li>
  )
}

/** Contextual toolbar shown only while ≥1 transaction is selected. */
function BulkActionBar({
  selectedCount,
  visibleCount,
  totalCount,
  allVisibleSelected,
  allMatchingSelected,
  pending,
  categories,
  catalog,
  onToggleVisible,
  onSelectAllMatching,
  onClear,
  onSetCategory,
  onCreateCategory,
}: {
  selectedCount: number
  visibleCount: number
  totalCount: number
  allVisibleSelected: boolean
  allMatchingSelected: boolean
  pending: boolean
  categories: CategoryOption[]
  catalog: {
    categories: Array<{ id: string; label: string; emoji?: string }>
    preferences: Array<{
      key: string
      label?: string
      emoji?: string
      hidden?: boolean
      mappedTo?: string
    }>
  }
  onToggleVisible: () => void
  onSelectAllMatching: () => void
  onClear: () => void
  onSetCategory: (label: string) => void
  onCreateCategory: (label: string) => void
}) {
  return (
    <div className="border-border/50 flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-2.5">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <button
        type="button"
        onClick={onToggleVisible}
        className={cn(
          'text-muted-foreground hover:text-foreground cursor-pointer rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors',
          FOCUS_RING,
        )}
      >
        {allVisibleSelected
          ? 'Clear shown'
          : `Select shown (${visibleCount.toLocaleString()})`}
      </button>
      {!allMatchingSelected && selectedCount < totalCount ? (
        <button
          type="button"
          onClick={onSelectAllMatching}
          className={cn(
            'text-muted-foreground hover:text-foreground cursor-pointer rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors',
            FOCUS_RING,
          )}
        >
          Select all matching ({totalCount.toLocaleString()})
        </button>
      ) : null}
      <div className="ml-auto flex items-center gap-1.5">
        <CategoryMenu
          tx={{}}
          options={categories}
          catalog={catalog}
          onSelect={onSetCategory}
          onCreate={onCreateCategory}
          onClear={() => undefined}
          creating={pending}
          disabled={pending}
        >
          <button
            type="button"
            disabled={pending}
            className={cn(
              'bg-foreground text-background inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
              FOCUS_RING,
            )}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Tags className="size-3.5" />
            )}
            Set category
          </button>
        </CategoryMenu>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className={cn(
            'text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors',
            FOCUS_RING,
          )}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

/** A compact, consistent filter dropdown pill (type / time / category). */
function FilterPill({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}) {
  // The first option is the "all" default; anything else means a filter is on.
  const active = value !== options[0]?.value
  const current = options.find((o) => o.value === value)?.label ?? ariaLabel
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            FOCUS_RING,
            active
              ? 'border-foreground/25 bg-foreground/[0.06] text-foreground'
              : 'border-border/70 text-muted-foreground hover:text-foreground',
          )}
        >
          {current}
          <ChevronDown className="size-3.5 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[min(20rem,60vh)] w-48 overflow-y-auto"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem
              key={o.value}
              value={o.value}
              className="text-sm"
            >
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ScreenFrame({
  leading,
  title,
  subtitle,
  action,
  children,
}: {
  leading?: ReactNode
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-6 sm:px-6">
      {leading || title || action ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          {leading ? <div className="shrink-0 pt-0.5">{leading}</div> : null}
          {title ? (
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
              ) : null}
            </div>
          ) : null}
          {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

function Row({
  tx,
  onClick,
  onSetCategory,
  onCreateCategory,
  onResetCategory,
  pending,
  categories,
  catalog,
  creatingCategory,
  selected,
  onToggleSelected,
}: {
  tx: MoneyTransactionRow
  onClick: () => void
  onSetCategory: (tx: MoneyTransactionRow, label: string) => void
  onCreateCategory: (tx: MoneyTransactionRow, label: string) => void
  onResetCategory: (tx: MoneyTransactionRow) => void
  pending: boolean
  categories: CategoryOption[]
  catalog: {
    categories: Array<{ id: string; label: string; emoji?: string }>
    preferences: Array<{
      key: string
      label?: string
      emoji?: string
      hidden?: boolean
      mappedTo?: string
    }>
  }
  creatingCategory: boolean
  selected: boolean
  onToggleSelected: () => void
}) {
  const label = tx.merchantName || tx.name
  const cat = categoryLabel(tx, catalog)
  const catEmoji = categoryEmoji(tx, catalog)
  // Show the category emoji in the avatar; keep the merchant monogram when it's
  // the generic Uncategorized glyph so the row still reads as that merchant.
  const avatarEmoji =
    catEmoji && catEmoji !== UNCATEGORIZED_CATEGORY.emoji ? catEmoji : undefined
  const hasOverride = Boolean(tx.userCategory?.trim())
  const money = formatMoney(Math.abs(tx.amount), {
    currency: tx.isoCurrencyCode,
    cents: true,
  })
  const sign =
    tx.direction === 'income' ? '+' : tx.direction === 'expense' ? '−' : ''
  const tone =
    tx.direction === 'income'
      ? 'text-success'
      : tx.direction === 'transfer'
        ? 'text-muted-foreground'
        : 'text-foreground'
  return (
    <li
      className={cn(
        'hover:bg-muted/40 relative transition-colors',
        selected && 'bg-muted/50',
      )}
    >
      {/* Full-row overlay always opens the detail sheet; the avatar (which sits
          above it) is the selection toggle. */}
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}, ${cat}, view details`}
        className="absolute inset-0 z-0"
      />
      <div className="pointer-events-none relative z-[1] flex items-center gap-3 px-3.5 py-2.5">
        {/* Avatar doubles as the select control: shows the avatar by default,
            a checkbox ring on hover, a filled check when selected. */}
        <button
          type="button"
          onClick={onToggleSelected}
          aria-pressed={selected}
          aria-label={`${selected ? 'Unselect' : 'Select'} ${label}`}
          className={cn(
            'group/av pointer-events-auto relative size-8 shrink-0 cursor-pointer rounded-full',
            FOCUS_RING,
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-0 transition-opacity duration-150',
              selected ? 'opacity-0' : 'opacity-100 group-hover/av:opacity-0',
            )}
          >
            <MerchantChip name={label} emoji={avatarEmoji} size={32} muted />
          </span>
          <span
            aria-hidden="true"
            className={cn(
              'border-muted-foreground/50 text-muted-foreground absolute inset-0 flex items-center justify-center rounded-full border-2 transition-opacity duration-150',
              selected ? 'opacity-0' : 'opacity-0 group-hover/av:opacity-100',
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              'bg-foreground text-background absolute inset-0 flex items-center justify-center rounded-full transition-opacity duration-150',
              selected ? 'opacity-100' : 'opacity-0',
            )}
          >
            <Check className="size-4" />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{label}</div>
          <div className="pointer-events-auto mt-0.5 flex">
            <CategoryMenu
              tx={tx}
              onSelect={(l) => onSetCategory(tx, l)}
              onCreate={(l) => onCreateCategory(tx, l)}
              onClear={() => onResetCategory(tx)}
              options={categories}
              catalog={catalog}
              creating={creatingCategory}
              disabled={pending || creatingCategory}
            >
              <button
                type="button"
                aria-label={`Category: ${cat}. Tap to change.`}
                className={cn(
                  'hover:bg-muted hover:text-foreground -ml-1.5 inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors',
                  hasOverride ? 'text-foreground/80' : 'text-muted-foreground',
                  FOCUS_RING,
                )}
              >
                {pending ? (
                  <Loader2 className="size-3 shrink-0 animate-spin" />
                ) : null}
                <span className="truncate">{cat}</span>
                <ChevronDown className="size-3 shrink-0 opacity-50" />
              </button>
            </CategoryMenu>
          </div>
        </div>
        <div
          className={cn(
            'uk-nums shrink-0 text-sm font-semibold tabular-nums',
            tone,
          )}
        >
          {sign}
          {money}
        </div>
      </div>
    </li>
  )
}

function groupByDay(
  rows: MoneyTransactionRow[],
): Array<{ date: string; rows: MoneyTransactionRow[] }> {
  const map = new Map<string, MoneyTransactionRow[]>()
  for (const r of rows) {
    const day = (r.date || '').slice(0, 10)
    map.set(day, [...(map.get(day) ?? []), r])
  }
  return [...map.entries()].map(([date, rs]) => ({ date, rows: rs }))
}

function CategoryRollupSkeletons() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <div key={sectionIndex}>
          <div className="bg-muted/70 mb-2 h-3 w-24 animate-pulse rounded" />
          <div className="border-border/50 bg-card divide-border/50 divide-y overflow-hidden rounded-xl border">
            {Array.from({ length: 4 }).map((__, rowIndex) => (
              <div
                key={rowIndex}
                className="flex items-center gap-3 px-3.5 py-2.5"
              >
                <div className="bg-muted size-9 animate-pulse rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="bg-muted h-3.5 w-1/2 animate-pulse rounded" />
                  <div className="bg-muted/70 h-3 w-1/3 animate-pulse rounded" />
                </div>
                <div className="bg-muted h-3.5 w-16 animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function RowSkeletons() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="border-border/50 bg-card flex items-center gap-3 rounded-xl border px-3.5 py-2.5"
        >
          <div className="bg-muted size-8 animate-pulse rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="bg-muted h-3.5 w-1/2 animate-pulse rounded" />
            <div className="bg-muted/70 h-3 w-1/3 animate-pulse rounded" />
          </div>
          <div className="bg-muted h-3.5 w-14 animate-pulse rounded" />
        </div>
      ))}
    </div>
  )
}
