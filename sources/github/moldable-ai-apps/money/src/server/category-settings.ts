import { readJson, safePath, writeJson } from '@moldable-ai/storage'
import { getDataDir } from './moldable'
import {
  patchTransactions,
  readVisibleMoneyData,
  searchVisibleTransactions,
} from './money-storage'
import type { Context } from 'hono'

export type UserCategorySource = 'custom' | 'observed'

export interface UserCategory {
  id: string
  label: string
  emoji?: string
  source: UserCategorySource
  createdAt: string
  updatedAt: string
}

export interface CategoryPreference {
  key: string
  label?: string
  emoji?: string
  hidden?: boolean
  mappedTo?: string
  updatedAt: string
}

export interface CategoryRule {
  id: string
  pattern: string
  matchType: 'contains' | 'regex'
  category: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CategoryRecent {
  label: string
  categoryKey?: string
  emoji?: string
  usedAt: string
}

export interface CategoryUsageStat {
  key: string
  label: string
  transactionCount: number
  lastUsedAt?: string
}

interface CategorySettingsFile {
  version: 1
  customCategories: UserCategory[]
  preferences: CategoryPreference[]
  rules: CategoryRule[]
  recents: CategoryRecent[]
  updatedAt: string
}

interface LegacyCategoriesFile {
  categories?: Array<{
    id?: string
    label?: string
    emoji?: string
    source?: UserCategorySource
    createdAt?: string
    updatedAt?: string
  }>
}

export interface CategoriesResponse {
  categories: UserCategory[]
  preferences: CategoryPreference[]
  rules: CategoryRule[]
  recents: CategoryRecent[]
  stats: CategoryUsageStat[]
  updatedAt: string
}

const EMPTY_SETTINGS: CategorySettingsFile = {
  version: 1,
  customCategories: [],
  preferences: [],
  rules: [],
  recents: [],
  updatedAt: new Date(0).toISOString(),
}

function categoriesPath(c: Context): string {
  return safePath(getDataDir(c), 'categories.json')
}

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 64)
}

function normalizeEmoji(value?: string): string | undefined {
  const emoji = value?.trim()
  return emoji ? emoji.slice(0, 16) : undefined
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'category'
  )
}

function uniqueId(base: string, ids: Set<string>): string {
  let next = base
  let suffix = 2
  while (ids.has(next)) {
    next = `${base}-${suffix}`
    suffix += 1
  }
  ids.add(next)
  return next
}

function normalizeCategory(
  input: Partial<UserCategory> & { label?: string },
  fallbackDate: string,
): UserCategory | null {
  const label = normalizeLabel(input.label ?? '')
  if (!label) return null
  return {
    id: input.id?.trim() || slugify(label),
    label,
    emoji: normalizeEmoji(input.emoji),
    source: input.source === 'observed' ? 'observed' : 'custom',
    createdAt: input.createdAt ?? fallbackDate,
    updatedAt: input.updatedAt ?? fallbackDate,
  }
}

function normalizeSettings(raw: unknown): CategorySettingsFile {
  const now = new Date().toISOString()
  const legacy = raw as LegacyCategoriesFile
  const input = raw as Partial<CategorySettingsFile>
  const rawCategories = Array.isArray(input.customCategories)
    ? input.customCategories
    : Array.isArray(legacy.categories)
      ? legacy.categories
      : []
  const ids = new Set<string>()
  const byLabel = new Map<string, UserCategory>()
  for (const rawCategory of rawCategories) {
    const category = normalizeCategory(rawCategory, now)
    if (!category) continue
    const labelKey = category.label.toLowerCase()
    const existing = byLabel.get(labelKey)
    if (existing) {
      byLabel.set(labelKey, {
        ...existing,
        ...category,
        id: existing.id,
        source:
          existing.source === 'custom' || category.source === 'custom'
            ? 'custom'
            : 'observed',
      })
      continue
    }
    byLabel.set(labelKey, {
      ...category,
      id: uniqueId(category.id, ids),
    })
  }

  return {
    version: 1,
    customCategories: [...byLabel.values()].sort(compareLabels),
    preferences: normalizePreferences(input.preferences, now),
    rules: normalizeRules(input.rules, now),
    recents: normalizeRecents(input.recents),
    updatedAt: input.updatedAt ?? now,
  }
}

function normalizePreferences(
  preferences: unknown,
  fallbackDate: string,
): CategoryPreference[] {
  if (!Array.isArray(preferences)) return []
  const byKey = new Map<string, CategoryPreference>()
  for (const preference of preferences) {
    if (!preference || typeof preference !== 'object') continue
    const input = preference as Partial<CategoryPreference>
    const key = input.key?.trim()
    if (!key) continue
    byKey.set(key, {
      key,
      label: normalizeLabel(input.label ?? '') || undefined,
      emoji: normalizeEmoji(input.emoji),
      hidden: input.hidden === true,
      mappedTo: normalizeLabel(input.mappedTo ?? '') || undefined,
      updatedAt: input.updatedAt ?? fallbackDate,
    })
  }
  return [...byKey.values()]
}

function normalizeRules(rules: unknown, fallbackDate: string): CategoryRule[] {
  if (!Array.isArray(rules)) return []
  const ids = new Set<string>()
  const normalized: CategoryRule[] = []
  for (const rule of rules) {
    if (!rule || typeof rule !== 'object') continue
    const input = rule as Partial<CategoryRule>
    const pattern = input.pattern?.trim()
    const category = normalizeLabel(input.category ?? '')
    if (!pattern || !category) continue
    const id = uniqueId(input.id?.trim() || slugify(pattern), ids)
    normalized.push({
      id,
      pattern: pattern.slice(0, 160),
      matchType: input.matchType === 'regex' ? 'regex' : 'contains',
      category,
      enabled: input.enabled !== false,
      createdAt: input.createdAt ?? fallbackDate,
      updatedAt: input.updatedAt ?? fallbackDate,
    })
  }
  return normalized.sort((a, b) => a.pattern.localeCompare(b.pattern))
}

function normalizeRecents(recents: unknown): CategoryRecent[] {
  if (!Array.isArray(recents)) return []
  const byLabel = new Map<string, CategoryRecent>()
  for (const recent of recents) {
    if (!recent || typeof recent !== 'object') continue
    const input = recent as Partial<CategoryRecent>
    const label = normalizeLabel(input.label ?? '')
    if (!label) continue
    byLabel.set(label.toLowerCase(), {
      label,
      categoryKey: input.categoryKey?.trim() || undefined,
      emoji: normalizeEmoji(input.emoji),
      usedAt: input.usedAt ?? new Date(0).toISOString(),
    })
  }
  return [...byLabel.values()]
    .sort((a, b) => b.usedAt.localeCompare(a.usedAt))
    .slice(0, 10)
}

async function readCategorySettings(c: Context): Promise<CategorySettingsFile> {
  const raw = await readJson<unknown>(categoriesPath(c), EMPTY_SETTINGS)
  const settings = normalizeSettings(raw)
  if (JSON.stringify(settings) !== JSON.stringify(raw)) {
    await writeCategorySettings(c, settings)
  }
  return settings
}

async function writeCategorySettings(
  c: Context,
  settings: CategorySettingsFile,
): Promise<void> {
  const next = normalizeSettings({
    ...settings,
    updatedAt: new Date().toISOString(),
  })
  await writeJson(categoriesPath(c), next)
}

export async function buildCategoriesResponse(
  c: Context,
): Promise<CategoriesResponse> {
  const [settings, data] = await Promise.all([
    readCategorySettings(c),
    readVisibleMoneyData(c),
  ])
  const byLabel = new Map<string, UserCategory>()
  for (const category of settings.customCategories) {
    byLabel.set(category.label.toLowerCase(), category)
  }
  const ids = new Set(settings.customCategories.map((category) => category.id))
  const now = new Date().toISOString()
  let promotedObserved = false
  for (const transaction of data.transactions ?? []) {
    const label = normalizeLabel(transaction.userCategory ?? '')
    if (!label || byLabel.has(label.toLowerCase())) continue
    byLabel.set(label.toLowerCase(), {
      id: uniqueId(slugify(label), ids),
      label,
      source: 'observed',
      createdAt: now,
      updatedAt: now,
    })
    promotedObserved = true
  }
  if (promotedObserved) {
    await writeCategorySettings(c, {
      ...settings,
      customCategories: [...byLabel.values()],
    })
  }

  return {
    categories: [...byLabel.values()].sort(compareLabels),
    preferences: settings.preferences,
    rules: settings.rules,
    recents: settings.recents,
    stats: buildCategoryUsageStats(data.transactions ?? [], settings, [
      ...byLabel.values(),
    ]),
    updatedAt: settings.updatedAt,
  }
}

export async function createUserCategory(
  c: Context,
  input: { label: string; emoji?: string },
): Promise<UserCategory> {
  const settings = await readCategorySettings(c)
  const label = normalizeLabel(input.label)
  if (!label) throw new Error('Category is required')
  const now = new Date().toISOString()
  const existing = settings.customCategories.find(
    (category) => category.label.toLowerCase() === label.toLowerCase(),
  )
  if (existing) {
    const next = {
      ...existing,
      label,
      emoji: normalizeEmoji(input.emoji) ?? existing.emoji,
      source: 'custom' as const,
      updatedAt: now,
    }
    await writeCategorySettings(c, {
      ...settings,
      customCategories: settings.customCategories.map((category) =>
        category.id === existing.id ? next : category,
      ),
    })
    return next
  }

  const ids = new Set(settings.customCategories.map((category) => category.id))
  const category: UserCategory = {
    id: uniqueId(slugify(label), ids),
    label,
    emoji: normalizeEmoji(input.emoji),
    source: 'custom',
    createdAt: now,
    updatedAt: now,
  }
  await writeCategorySettings(c, {
    ...settings,
    customCategories: [...settings.customCategories, category],
  })
  return category
}

export async function updateCategory(
  c: Context,
  id: string,
  input: {
    label?: string
    emoji?: string
    hidden?: boolean
    mappedTo?: string
  },
): Promise<{ category?: UserCategory; preference?: CategoryPreference }> {
  const settings = await readCategorySettings(c)
  const now = new Date().toISOString()
  const existing = settings.customCategories.find(
    (category) => category.id === id,
  )
  if (existing) {
    const label =
      input.label === undefined ? existing.label : normalizeLabel(input.label)
    if (!label) throw new Error('Category is required')
    const next: UserCategory = {
      ...existing,
      label,
      emoji:
        input.emoji === undefined
          ? existing.emoji
          : normalizeEmoji(input.emoji),
      source: 'custom',
      updatedAt: now,
    }
    if (existing.label !== next.label) {
      await reassignCategory(c, existing.label, next.label)
    }
    await writeCategorySettings(c, {
      ...settings,
      customCategories: settings.customCategories.map((category) =>
        category.id === id ? next : category,
      ),
    })
    return { category: next }
  }

  const preference = upsertPreference(settings.preferences, {
    key: id,
    label: input.label === undefined ? undefined : normalizeLabel(input.label),
    emoji: input.emoji === undefined ? undefined : normalizeEmoji(input.emoji),
    hidden: input.hidden,
    mappedTo:
      input.mappedTo === undefined ? undefined : normalizeLabel(input.mappedTo),
    updatedAt: now,
  })
  await writeCategorySettings(c, {
    ...settings,
    preferences: preference.preferences,
  })
  return { preference: preference.value }
}

export async function deleteCategory(
  c: Context,
  id: string,
  input: { reassignTo?: string } = {},
): Promise<{ deleted?: UserCategory; preference?: CategoryPreference }> {
  const settings = await readCategorySettings(c)
  const existing = settings.customCategories.find(
    (category) => category.id === id,
  )
  if (!existing) {
    const result = upsertPreference(settings.preferences, {
      key: id,
      hidden: true,
      mappedTo: undefined,
      updatedAt: new Date().toISOString(),
    })
    await writeCategorySettings(c, {
      ...settings,
      preferences: result.preferences,
    })
    return { preference: result.value }
  }

  const reassignTo = normalizeLabel(input.reassignTo ?? '')
  if (reassignTo) {
    await reassignCategory(c, existing.label, reassignTo)
  }
  const customCategories = reassignTo
    ? ensureCategory(settings.customCategories, reassignTo)
    : settings.customCategories
  await writeCategorySettings(c, {
    ...settings,
    customCategories: customCategories.filter((category) => category.id !== id),
  })
  return { deleted: existing }
}

export async function mergeCategories(
  c: Context,
  input: { from: string; to: string },
): Promise<{ from: string; to: string }> {
  const settings = await readCategorySettings(c)
  const from = input.from.trim()
  const to = normalizeLabel(input.to)
  if (!from || !to) throw new Error('Both categories are required')
  const fromCategory = settings.customCategories.find(
    (category) => category.id === from || category.label === from,
  )
  if (fromCategory) {
    await reassignCategory(c, fromCategory.label, to)
    const customCategories = ensureCategory(settings.customCategories, to)
    await writeCategorySettings(c, {
      ...settings,
      customCategories: customCategories.filter(
        (category) => category.id !== fromCategory.id,
      ),
    })
  } else {
    const result = upsertPreference(settings.preferences, {
      key: from,
      mappedTo: to,
      hidden: false,
      updatedAt: new Date().toISOString(),
    })
    await writeCategorySettings(c, {
      ...settings,
      preferences: result.preferences,
    })
  }
  return { from, to }
}

export async function recordCategoryRecent(
  c: Context,
  input: { label: string; categoryKey?: string; emoji?: string },
): Promise<CategoryRecent[]> {
  const settings = await readCategorySettings(c)
  const label = normalizeLabel(input.label)
  if (!label) return settings.recents
  const recent: CategoryRecent = {
    label,
    categoryKey: input.categoryKey?.trim() || undefined,
    emoji: normalizeEmoji(input.emoji),
    usedAt: new Date().toISOString(),
  }
  const recents = [
    recent,
    ...settings.recents.filter(
      (entry) => entry.label.toLowerCase() !== label.toLowerCase(),
    ),
  ].slice(0, 10)
  await writeCategorySettings(c, { ...settings, recents })
  return recents
}

export async function createCategoryRule(
  c: Context,
  input: {
    pattern: string
    matchType?: 'contains' | 'regex'
    category: string
    enabled?: boolean
  },
): Promise<CategoryRule> {
  const settings = await readCategorySettings(c)
  const pattern = input.pattern.trim().slice(0, 160)
  const category = normalizeLabel(input.category)
  if (!pattern || !category)
    throw new Error('Rule pattern and category are required')
  if (input.matchType === 'regex') {
    try {
      new RegExp(pattern)
    } catch {
      throw new Error('Regex pattern is invalid')
    }
  }
  const now = new Date().toISOString()
  const ids = new Set(settings.rules.map((rule) => rule.id))
  const rule: CategoryRule = {
    id: uniqueId(slugify(`${pattern}-${category}`), ids),
    pattern,
    matchType: input.matchType === 'regex' ? 'regex' : 'contains',
    category,
    enabled: input.enabled !== false,
    createdAt: now,
    updatedAt: now,
  }
  await writeCategorySettings(c, {
    ...settings,
    rules: [...settings.rules, rule],
  })
  await applyCategoryRules(c)
  return rule
}

export async function deleteCategoryRule(
  c: Context,
  id: string,
): Promise<{ deleted: boolean }> {
  const settings = await readCategorySettings(c)
  const next = settings.rules.filter((rule) => rule.id !== id)
  await writeCategorySettings(c, { ...settings, rules: next })
  return { deleted: next.length !== settings.rules.length }
}

export async function applyCategoryRules(
  c: Context,
): Promise<{ matched: number; updated: number }> {
  const settings = await readCategorySettings(c)
  const rules = settings.rules.filter((rule) => rule.enabled)
  if (rules.length === 0) return { matched: 0, updated: 0 }

  const data = await readVisibleMoneyData(c)
  const idsByCategory = new Map<string, string[]>()
  for (const transaction of data.transactions ?? []) {
    const rule = rules.find((candidate) =>
      categoryRuleMatches(candidate, [
        transaction.merchantName,
        transaction.name,
        transaction.notes,
      ]),
    )
    if (!rule) continue
    if (
      transaction.userCategory?.trim().toLowerCase() ===
      rule.category.toLowerCase()
    ) {
      continue
    }
    idsByCategory.set(rule.category, [
      ...(idsByCategory.get(rule.category) ?? []),
      transaction.id,
    ])
  }

  let matched = 0
  let updated = 0
  for (const [category, ids] of idsByCategory) {
    matched += ids.length
    await createUserCategory(c, { label: category })
    updated += (await patchTransactions(c, ids, { userCategory: category }))
      .length
  }
  return { matched, updated }
}

function upsertPreference(
  preferences: CategoryPreference[],
  input: Partial<CategoryPreference> & { key: string; updatedAt: string },
): { preferences: CategoryPreference[]; value: CategoryPreference } {
  const existing = preferences.find(
    (preference) => preference.key === input.key,
  )
  const next: CategoryPreference = {
    key: input.key,
    label:
      input.label === undefined ? existing?.label : input.label || undefined,
    emoji: input.emoji === undefined ? existing?.emoji : input.emoji,
    hidden: input.hidden === undefined ? existing?.hidden : input.hidden,
    mappedTo:
      input.mappedTo === undefined
        ? existing?.mappedTo
        : input.mappedTo || undefined,
    updatedAt: input.updatedAt,
  }
  const compact: CategoryPreference = Object.fromEntries(
    Object.entries(next).filter(([, value]) => value !== undefined),
  ) as CategoryPreference
  return {
    value: compact,
    preferences: existing
      ? preferences.map((preference) =>
          preference.key === input.key ? compact : preference,
        )
      : [...preferences, compact],
  }
}

function categoryRuleMatches(rule: CategoryRule, values: unknown[]): boolean {
  const haystack = values
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
  if (!haystack) return false
  if (rule.matchType === 'regex') {
    try {
      return new RegExp(rule.pattern, 'i').test(haystack)
    } catch {
      return false
    }
  }
  return haystack.toLowerCase().includes(rule.pattern.toLowerCase())
}

function buildCategoryUsageStats(
  transactions: Array<{
    id: string
    date?: string
    userCategory?: string
    providerCategoryPrimary?: string
    providerCategoryDetailed?: string
    category?: string[]
  }>,
  settings: CategorySettingsFile,
  categories: UserCategory[],
): CategoryUsageStat[] {
  const stats = new Map<string, CategoryUsageStat>()
  const categoryByLabel = new Map(
    categories.map((category) => [category.label.toLowerCase(), category]),
  )
  const preferenceByKey = new Map(
    settings.preferences.map((preference) => [preference.key, preference]),
  )

  const add = (key: string, label: string, date?: string) => {
    const existing = stats.get(key)
    if (!existing) {
      stats.set(key, {
        key,
        label,
        transactionCount: 1,
        lastUsedAt: date,
      })
      return
    }
    stats.set(key, {
      ...existing,
      transactionCount: existing.transactionCount + 1,
      lastUsedAt:
        date && (!existing.lastUsedAt || date > existing.lastUsedAt)
          ? date
          : existing.lastUsedAt,
    })
  }

  for (const transaction of transactions) {
    const userLabel = normalizeLabel(transaction.userCategory ?? '')
    if (userLabel) {
      const category = categoryByLabel.get(userLabel.toLowerCase())
      add(
        category?.id ?? `label:${userLabel.toLowerCase()}`,
        userLabel,
        transaction.date,
      )
      continue
    }

    const providerKey = providerCategoryKey(transaction)
    if (!providerKey) {
      add('UNCATEGORIZED', 'Uncategorized', transaction.date)
      continue
    }

    // Direct bank-category stats power the provider rows, even when that bank
    // category is hidden or folded into a custom category.
    add(providerKey, providerKey, transaction.date)

    const preference = preferenceByKey.get(providerKey)
    const mappedTo = normalizeLabel(preference?.mappedTo ?? '')
    if (preference?.hidden) {
      add('UNCATEGORIZED', 'Uncategorized', transaction.date)
    } else if (mappedTo) {
      const category = categoryByLabel.get(mappedTo.toLowerCase())
      add(
        category?.id ?? `label:${mappedTo.toLowerCase()}`,
        mappedTo,
        transaction.date,
      )
    }
  }

  return [...stats.values()].sort((a, b) => a.label.localeCompare(b.label))
}

function providerCategoryKey(transaction: {
  providerCategoryPrimary?: string
  providerCategoryDetailed?: string
  category?: string[]
}): string | undefined {
  return (
    transaction.providerCategoryDetailed?.trim() ||
    transaction.providerCategoryPrimary?.trim() ||
    transaction.category?.find((entry) => entry.trim().length > 0)?.trim()
  )
}

async function reassignCategory(
  c: Context,
  fromLabel: string,
  toLabel: string,
): Promise<void> {
  for (;;) {
    const result = await searchVisibleTransactions(c, {
      category: fromLabel,
      limit: 500,
    })
    const ids = result.transactions
      .filter(
        (transaction) =>
          transaction.userCategory?.trim().toLowerCase() ===
          fromLabel.trim().toLowerCase(),
      )
      .map((transaction) => transaction.id)
    if (ids.length === 0) return
    await patchTransactions(c, ids, { userCategory: toLabel })
  }
}

function ensureCategory(
  categories: UserCategory[],
  rawLabel: string,
  emoji?: string,
): UserCategory[] {
  const label = normalizeLabel(rawLabel)
  if (!label) return categories
  const existing = categories.find(
    (category) => category.label.toLowerCase() === label.toLowerCase(),
  )
  if (existing) return categories
  const now = new Date().toISOString()
  const ids = new Set(categories.map((category) => category.id))
  return [
    ...categories,
    {
      id: uniqueId(slugify(label), ids),
      label,
      emoji: normalizeEmoji(emoji),
      source: 'custom',
      createdAt: now,
      updatedAt: now,
    },
  ]
}

function compareLabels(a: { label: string }, b: { label: string }): number {
  return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
}
