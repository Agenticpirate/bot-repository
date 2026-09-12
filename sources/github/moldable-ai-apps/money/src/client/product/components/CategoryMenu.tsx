import { Plus, RotateCcw, Search } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  cn,
} from '@moldable-ai/ui'
import {
  CATEGORY_PICKER_OPTIONS,
  type CategoryCatalogLike,
  type CategoryOption,
  applyCategoryPreferences,
  categoryLabel,
} from '../lib/categories'

function searchKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/**
 * The category override picker. Wraps any trigger (`children`) in a dropdown of
 * the friendly Plaid categories — the current one is checked, picking another
 * writes it as the transaction's `userCategory`, and "Reset to bank category"
 * clears the override. Shared by the Transactions row chip and the detail sheet.
 */
export function CategoryMenu({
  tx,
  onSelect,
  onClear,
  options,
  catalog,
  onCreate,
  creating = false,
  disabled = false,
  children,
}: {
  tx: {
    userCategory?: string
    category?: string[]
    providerCategoryPrimary?: string
    providerCategoryDetailed?: string
  }
  onSelect: (label: string) => void
  onClear: () => void
  options?: CategoryOption[]
  catalog?: CategoryCatalogLike
  onCreate?: (label: string) => void
  creating?: boolean
  disabled?: boolean
  children: ReactNode
}) {
  const [query, setQuery] = useState('')
  const current = categoryLabel(tx, catalog)
  const hasOverride = Boolean(tx.userCategory?.trim())
  const allOptions = useMemo(
    () =>
      (options ?? CATEGORY_PICKER_OPTIONS)
        .map((option) => applyCategoryPreferences(option, catalog?.preferences))
        .filter((option): option is CategoryOption => option !== null),
    [catalog?.preferences, options],
  )
  const q = searchKey(query.trim())
  const groupedOptions = useMemo(
    () => groupCategoryOptions(allOptions, q),
    [allOptions, q],
  )
  const createLabel = query.trim()
  const canCreate =
    Boolean(onCreate) &&
    createLabel.length > 0 &&
    !allOptions.some(
      (option) => searchKey(option.label) === searchKey(createLabel),
    )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[min(24rem,70vh)] w-64 overflow-y-auto"
      >
        <DropdownMenuLabel className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
          Category
        </DropdownMenuLabel>
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Search or create..."
              className="h-8 rounded-lg pl-8 text-sm"
            />
          </div>
        </div>
        <DropdownMenuRadioGroup value={current} onValueChange={onSelect}>
          {groupedOptions.map((group, groupIndex) => (
            <div key={group.key}>
              {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide">
                {group.label}
              </DropdownMenuLabel>
              {group.options.map((o) => (
                <DropdownMenuRadioItem
                  key={o.key}
                  value={o.label}
                  className="gap-2 pl-6 text-sm"
                >
                  {o.emoji ? (
                    <span className="w-5 shrink-0 text-center">{o.emoji}</span>
                  ) : null}
                  {o.label}
                </DropdownMenuRadioItem>
              ))}
            </div>
          ))}
        </DropdownMenuRadioGroup>
        {canCreate ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onCreate?.(createLabel)}
              disabled={creating}
              className="gap-2 text-sm"
            >
              <Plus className="size-3.5" />
              <span className="min-w-0 flex-1 truncate">
                Create “{createLabel}”
              </span>
            </DropdownMenuItem>
          </>
        ) : null}
        {hasOverride ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onClear}
              className={cn('text-muted-foreground gap-2 text-sm')}
            >
              <RotateCcw className="size-3.5" />
              Reset to bank category
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function groupCategoryOptions(
  options: CategoryOption[],
  query: string,
): Array<{ key: string; label: string; options: CategoryOption[] }> {
  const groups = new Map<
    string,
    { key: string; label: string; options: CategoryOption[] }
  >()
  for (const option of options) {
    const groupLabel = option.groupLabel ?? 'Custom'
    const haystack = `${option.label} ${groupLabel}`
    if (query && !searchKey(haystack).includes(query)) continue
    const groupKey = option.groupKey ?? `custom:${groupLabel}`
    const group = groups.get(groupKey) ?? {
      key: groupKey,
      label: groupLabel,
      options: [],
    }
    group.options.push(option)
    groups.set(groupKey, group)
  }
  return [...groups.values()]
}
