import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { randomUUID } from 'node:crypto'

const FILTER_STORE_FILE = 'filters-v1.json'

export type MailFilterMatch = {
  fromAddresses?: string[]
  fromDomains?: string[]
  subjectContains?: string[]
  subjectEquals?: string[]
}

export type MailFilter = {
  id: string
  name: string
  accountId?: string
  enabled: boolean
  match: MailFilterMatch
  action: 'archive'
  createdAt: string
  updatedAt: string
}

type MailFilterStore = {
  version: 1
  filters: MailFilter[]
}

export type MailFilterInput = {
  name: string
  accountId?: string
  enabled?: boolean
  match: MailFilterMatch
}

export type InboundMessageForFilter = {
  id: string
  from: string
  subject: string
  labelIds: string[]
}

function storePath(workspaceId: string) {
  return safePath(getAppDataDir(workspaceId), FILTER_STORE_FILE)
}

export async function listMailFilters(workspaceId: string) {
  const store = await readMailFilterStore(workspaceId)
  return store.filters.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  )
}

export async function createMailFilter(
  workspaceId: string,
  input: MailFilterInput,
) {
  const store = await readMailFilterStore(workspaceId)
  const now = new Date().toISOString()
  const filter: MailFilter = {
    id: randomUUID(),
    name: input.name,
    ...(input.accountId ? { accountId: input.accountId } : {}),
    enabled: input.enabled ?? true,
    match: normalizeMatch(input.match),
    action: 'archive',
    createdAt: now,
    updatedAt: now,
  }
  store.filters.push(filter)
  await writeMailFilterStore(workspaceId, store)
  return filter
}

export async function updateMailFilter(
  workspaceId: string,
  id: string,
  input: Omit<Partial<MailFilterInput>, 'accountId'> & {
    accountId?: string | null
  },
) {
  const store = await readMailFilterStore(workspaceId)
  const index = store.filters.findIndex((filter) => filter.id === id)
  if (index < 0) return null

  const current = store.filters[index]
  const next: MailFilter = {
    ...current,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.accountId !== undefined
      ? { ...(input.accountId ? { accountId: input.accountId } : {}) }
      : {}),
    ...(input.accountId === null ? { accountId: undefined } : {}),
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    ...(input.match !== undefined
      ? { match: normalizeMatch(input.match) }
      : {}),
    updatedAt: new Date().toISOString(),
  }
  // Do not serialize an undefined account binding; its absence means all accounts.
  if (!next.accountId) delete next.accountId
  store.filters[index] = next
  await writeMailFilterStore(workspaceId, store)
  return next
}

export async function deleteMailFilter(workspaceId: string, id: string) {
  const store = await readMailFilterStore(workspaceId)
  const index = store.filters.findIndex((filter) => filter.id === id)
  if (index < 0) return false
  store.filters.splice(index, 1)
  await writeMailFilterStore(workspaceId, store)
  return true
}

/**
 * Applies the first matching native filter to a newly received Inbox message.
 * A filter only archives mail; it never deletes, marks spam, unsubscribes, or
 * replies. The caller owns the Gmail mutation so account credentials stay in
 * the Gmail service boundary.
 */
export async function applyInboundMailFilters(input: {
  workspaceId: string
  accountId: string
  message: InboundMessageForFilter
  archive: (messageId: string) => Promise<void>
}) {
  if (!input.message.labelIds.includes('INBOX')) {
    return { archived: false, filterIds: [] as string[] }
  }
  const filters = await listMailFilters(input.workspaceId)
  const matches = filters.filter(
    (filter) =>
      filter.enabled &&
      (!filter.accountId || filter.accountId === input.accountId) &&
      matchesMailFilter(filter.match, input.message),
  )
  if (matches.length === 0)
    return { archived: false, filterIds: [] as string[] }

  await input.archive(input.message.id)
  return { archived: true, filterIds: matches.map((filter) => filter.id) }
}

export function matchesMailFilter(
  match: MailFilterMatch,
  message: Pick<InboundMessageForFilter, 'from' | 'subject'>,
) {
  const address = senderAddress(message.from)
  const domain = address.split('@')[1] ?? ''
  const subject = message.subject.trim().toLocaleLowerCase()

  const addresses = match.fromAddresses ?? []
  if (addresses.length > 0 && !addresses.some((value) => value === address)) {
    return false
  }

  const domains = match.fromDomains ?? []
  if (
    domains.length > 0 &&
    !domains.some((value) => domain === value || domain.endsWith(`.${value}`))
  ) {
    return false
  }

  const exactSubjects = match.subjectEquals ?? []
  if (
    exactSubjects.length > 0 &&
    !exactSubjects.some((value) => value === subject)
  ) {
    return false
  }

  const subjectParts = match.subjectContains ?? []
  if (
    subjectParts.length > 0 &&
    !subjectParts.some((value) => subject.includes(value))
  ) {
    return false
  }

  return true
}

async function readMailFilterStore(
  workspaceId: string,
): Promise<MailFilterStore> {
  const raw = await readJson<unknown>(storePath(workspaceId), null)
  if (raw === null) return { version: 1, filters: [] }
  if (!isMailFilterStore(raw)) {
    throw new Error('Stored Mail filters are invalid and need repair.')
  }
  return raw
}

async function writeMailFilterStore(
  workspaceId: string,
  store: MailFilterStore,
) {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(storePath(workspaceId), store)
}

function normalizeMatch(match: MailFilterMatch): MailFilterMatch {
  const normalized = {
    ...(match.fromAddresses?.length
      ? { fromAddresses: normalizeArray(match.fromAddresses, normalizeAddress) }
      : {}),
    ...(match.fromDomains?.length
      ? { fromDomains: normalizeArray(match.fromDomains, normalizeDomain) }
      : {}),
    ...(match.subjectContains?.length
      ? {
          subjectContains: normalizeArray(
            match.subjectContains,
            normalizeSubject,
          ),
        }
      : {}),
    ...(match.subjectEquals?.length
      ? { subjectEquals: normalizeArray(match.subjectEquals, normalizeSubject) }
      : {}),
  }
  if (Object.keys(normalized).length === 0) {
    throw new Error('A Mail filter needs at least one matching condition.')
  }
  return normalized
}

function normalizeArray(
  values: string[],
  normalize: (value: string) => string,
) {
  return [...new Set(values.map(normalize).filter(Boolean))]
}

function normalizeAddress(value: string) {
  return senderAddress(value)
}

function normalizeDomain(value: string) {
  return value.trim().toLocaleLowerCase().replace(/^@/, '').replace(/\.+$/, '')
}

function normalizeSubject(value: string) {
  return value.trim().replaceAll(/\s+/g, ' ').toLocaleLowerCase()
}

function senderAddress(value: string) {
  const match = value.match(/<([^>]+)>/)
  return (match?.[1] ?? value).trim().toLocaleLowerCase()
}

function isMailFilterStore(value: unknown): value is MailFilterStore {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    record.version === 1 &&
    Array.isArray(record.filters) &&
    record.filters.every(isMailFilter)
  )
}

function isMailFilter(value: unknown): value is MailFilter {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    (record.accountId === undefined || typeof record.accountId === 'string') &&
    typeof record.enabled === 'boolean' &&
    record.action === 'archive' &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string' &&
    isMailFilterMatch(record.match)
  )
}

function isMailFilterMatch(value: unknown): value is MailFilterMatch {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  const supported = [
    'fromAddresses',
    'fromDomains',
    'subjectContains',
    'subjectEquals',
  ]
  if (Object.keys(record).some((key) => !supported.includes(key))) return false
  return supported.some(
    (key) =>
      Array.isArray(record[key]) &&
      record[key].length > 0 &&
      record[key].every((item) => typeof item === 'string' && item.length > 0),
  )
}
