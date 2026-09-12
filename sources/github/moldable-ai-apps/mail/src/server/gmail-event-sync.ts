import { ensureDir, readJson, safePath, writeJson } from '@moldable-ai/storage'
import { applyInboundMailFilters } from './filters'
import {
  type MailMessageDetail,
  applyMessageAction,
  getMessage,
  getProfile,
  isAuthError,
  listGmailHistoryPage,
  listGmailRecoveryMessagePage,
} from './gmail-service'
import {
  getMailAccountDataDir,
  runWithMailAccountContext,
} from './mail-account-context'
import type { MailAccount } from './mail-accounts'
import { removeCachedMessage, updateCachedMessageLabels } from './message-cache'
import {
  type ProactiveEventPayload,
  emitProactiveEvents,
  reportProactiveSourceHealth,
} from './moldable'
import { isRegisteredMailWorkspace } from './workspace-registry'
import type { gmail_v1 } from 'googleapis'
import { createHash } from 'node:crypto'

const HISTORY_SYNC_INTERVAL_MS = 60_000
const HISTORY_PAGE_LIMIT = 100
const HISTORY_PAGES_PER_TICK = 10
const DETAIL_CONCURRENCY = 4
const RECOVERY_PAGE_LIMIT = 500
const RECOVERY_PAGES_PER_TICK = 10
const RECOVERY_OVERLAP_MS = 5 * 60_000
const CURSOR_HEARTBEAT_INTERVAL_MS = 6 * 60 * 60_000
const CURSOR_FILE = 'gmail-event-cursor-v1.json'

class GmailHistoryCursorExpiredError extends Error {
  constructor() {
    super('The Gmail history cursor expired')
    this.name = 'GmailHistoryCursorExpiredError'
  }
}

export interface GmailEventCursorState {
  version: 1
  historyId: string
  establishedAt: string
  lastSuccessfulAt: string
  pending?: {
    startHistoryId: string
    pageToken: string
  }
  recovery?: {
    targetHistoryId: string
    cutoffInternalDate: number
    startedAt: string
    processedCount: number
    pageToken?: string
  }
}

export interface GmailEventSyncDependencies {
  getProfile: typeof getProfile
  listHistoryPage: typeof listGmailHistoryPage
  listRecoveryMessagePage: typeof listGmailRecoveryMessagePage
  getMessage: typeof getMessage
  removeMessage: typeof removeCachedMessage
  updateMessageLabels: typeof updateCachedMessageLabels
  emit: typeof emitProactiveEvents
  reportHealth: typeof reportProactiveSourceHealth
  readState: (workspaceId: string) => Promise<GmailEventCursorState | null>
  writeState: (
    workspaceId: string,
    state: GmailEventCursorState,
  ) => Promise<void>
  now: () => Date
}

const defaultDependencies: GmailEventSyncDependencies = {
  getProfile,
  listHistoryPage: listGmailHistoryPage,
  listRecoveryMessagePage: listGmailRecoveryMessagePage,
  getMessage,
  removeMessage: removeCachedMessage,
  updateMessageLabels: updateCachedMessageLabels,
  emit: emitProactiveEvents,
  reportHealth: reportProactiveSourceHealth,
  readState: readCursorState,
  writeState: writeCursorState,
  now: () => new Date(),
}

const eventSyncIntervals = new Map<string, ReturnType<typeof setInterval>>()
const eventSyncs = new Map<string, Promise<void>>()
const eventSyncBackoff = new Map<
  string,
  { consecutiveFailures: number; nextAttemptAt: number }
>()
const eventSyncReportedHealth = new Map<
  string,
  'healthy' | 'degraded' | 'blocked'
>()

export function startGmailEventSync(account: MailAccount) {
  const scopeKey = eventSyncScopeKey(account)
  if (eventSyncIntervals.has(scopeKey)) return
  const refresh = async () => {
    if (!(await isRegisteredMailWorkspace(account.workspaceId))) {
      stopGmailEventSync(account)
      return
    }
    const backoff = eventSyncBackoff.get(scopeKey)
    if (backoff && backoff.nextAttemptAt > Date.now()) return
    await syncGmailEventAccountNow(account).catch((error) => {
      if (!isAuthError(error)) {
        console.warn(
          `Failed to sync Gmail events for ${account.emailAddress}:`,
          error,
        )
      }
    })
  }
  const interval = setInterval(() => void refresh(), HISTORY_SYNC_INTERVAL_MS)
  interval.unref?.()
  eventSyncIntervals.set(scopeKey, interval)
  void refresh()
}

export function stopGmailEventSync(account: MailAccount) {
  const scopeKey = eventSyncScopeKey(account)
  const interval = eventSyncIntervals.get(scopeKey)
  if (interval) clearInterval(interval)
  eventSyncIntervals.delete(scopeKey)
  eventSyncBackoff.delete(scopeKey)
  eventSyncReportedHealth.delete(scopeKey)
}

export function syncGmailEventAccountNow(
  account: MailAccount,
  dependencies: GmailEventSyncDependencies = defaultDependencies,
) {
  const scopeKey = eventSyncScopeKey(account)
  const existing = eventSyncs.get(scopeKey)
  if (existing) return existing
  const trackedDependencies: GmailEventSyncDependencies = {
    ...dependencies,
    reportHealth: async (health) => {
      const result = await dependencies.reportHealth(health)
      eventSyncReportedHealth.set(scopeKey, health.status)
      return result
    },
  }
  const sync = runWithMailAccountContext(account, () =>
    syncGmailHistoryOnce(account, trackedDependencies),
  )
    .then(async () => {
      // The durable host may still contain a failure from a prior process, or
      // from an earlier poll in this process. Report the first observed
      // success, then stay quiet on subsequent idle polls.
      if (eventSyncReportedHealth.get(scopeKey) !== 'healthy') {
        await trackedDependencies.reportHealth({
          workspaceId: account.workspaceId,
          accountId: account.accountId,
          displayName: account.emailAddress,
          status: 'healthy',
        })
      }
      eventSyncBackoff.delete(scopeKey)
    })
    .catch((error) => {
      const consecutiveFailures = Math.min(
        20,
        (eventSyncBackoff.get(scopeKey)?.consecutiveFailures ?? 0) + 1,
      )
      const baseDelay = isAuthError(error)
        ? 30 * 60_000
        : Math.min(30 * 60_000, 30_000 * 2 ** (consecutiveFailures - 1))
      const jitter = Math.floor(
        Math.random() * Math.max(1_000, baseDelay * 0.2),
      )
      eventSyncBackoff.set(scopeKey, {
        consecutiveFailures,
        nextAttemptAt: Date.now() + baseDelay + jitter,
      })
      throw error
    })
    .finally(() => {
      if (eventSyncs.get(scopeKey) === sync) eventSyncs.delete(scopeKey)
    })
  eventSyncs.set(scopeKey, sync)
  return sync
}

export async function getGmailEventSyncStatus(account: MailAccount) {
  const state = await runWithMailAccountContext(account, () =>
    readCursorState(account.workspaceId),
  )
  const backoff = eventSyncBackoff.get(eventSyncScopeKey(account))
  return {
    sourceId: `mail:gmail:${account.accountId}`,
    accountId: account.accountId,
    configured: state !== null,
    running: eventSyncs.has(eventSyncScopeKey(account)),
    catchingUp: state?.pending !== undefined || state?.recovery !== undefined,
    recoveryProcessedCount: state?.recovery?.processedCount ?? null,
    consecutiveFailures: backoff?.consecutiveFailures ?? 0,
    nextAttemptAt: backoff
      ? new Date(backoff.nextAttemptAt).toISOString()
      : null,
    establishedAt: state?.establishedAt ?? null,
    lastSuccessfulAt: state?.lastSuccessfulAt ?? null,
  }
}

function eventSyncScopeKey(account: MailAccount) {
  return `${account.workspaceId}:${account.accountId}`
}

export async function syncGmailHistoryOnce(
  account: MailAccount,
  dependencies: GmailEventSyncDependencies = defaultDependencies,
): Promise<void> {
  let state = await dependencies.readState(account.workspaceId)
  try {
    if (!state) {
      const profile = await dependencies.getProfile(account.workspaceId)
      if (!profile.historyId) {
        throw new Error('Gmail profile did not include a history cursor')
      }
      const timestamp = dependencies.now().toISOString()
      state = {
        version: 1,
        historyId: profile.historyId,
        establishedAt: timestamp,
        lastSuccessfulAt: timestamp,
      }
      await dependencies.writeState(account.workspaceId, state)
      await reportHealthy(account, dependencies)
      return
    }

    if (state.recovery) {
      const recovery = await continueExpiredCursorRecovery(
        account,
        state,
        dependencies,
      )
      if (recovery.complete) {
        await reportHealthy(account, dependencies)
      } else {
        await reportRecovering(account, recovery.processedCount, dependencies)
      }
      return
    }

    const wasCatchingUp = state.pending !== undefined
    try {
      const historyProgress = await consumeHistory(account, state, dependencies)
      if (!historyProgress.complete) {
        await reportHistoryCatchUp(account, dependencies)
        return
      }
    } catch (error) {
      if (!(error instanceof GmailHistoryCursorExpiredError)) throw error
      const recovery = await recoverExpiredCursor(account, state, dependencies)
      if (!recovery.complete) {
        await reportRecovering(account, recovery.processedCount, dependencies)
        return
      }
    }
    if (wasCatchingUp) await reportHealthy(account, dependencies)
  } catch (error) {
    const authenticationRequired = isAuthError(error)
    await dependencies
      .reportHealth({
        workspaceId: account.workspaceId,
        accountId: account.accountId,
        displayName: account.emailAddress,
        status: authenticationRequired ? 'blocked' : 'degraded',
        issueCode: authenticationRequired
          ? 'authentication_required'
          : 'source_unavailable',
        error: errorMessage(error),
      })
      .catch(() => undefined)
    throw error
  }
}

async function consumeHistory(
  account: MailAccount,
  initialState: GmailEventCursorState,
  dependencies: GmailEventSyncDependencies,
) {
  let state = initialState
  const startHistoryId = state.pending?.startHistoryId ?? state.historyId
  let pageToken = state.pending?.pageToken
  for (let page = 0; page < HISTORY_PAGES_PER_TICK; page += 1) {
    let response: Awaited<
      ReturnType<GmailEventSyncDependencies['listHistoryPage']>
    >
    try {
      response = await dependencies.listHistoryPage(account.workspaceId, {
        startHistoryId,
        pageToken,
        maxResults: HISTORY_PAGE_LIMIT,
      })
    } catch (error) {
      if (isHistoryCursorExpired(error)) {
        throw new GmailHistoryCursorExpiredError()
      }
      throw error
    }
    const changes = historyPageChanges(response.history ?? [])
    await emitMessageEntries(
      account,
      changes.addedEntries,
      response.historyId,
      dependencies,
    )
    await applyHistoryCacheChanges(account, changes, dependencies)
    const timestamp = dependencies.now().toISOString()
    if (response.nextPageToken) {
      state = {
        ...state,
        // This timestamp is the committed recovery boundary, not a heartbeat.
        // A later page can discover that the original Gmail cursor expired;
        // moving it mid-pagination would make recovery skip the older gap.
        lastSuccessfulAt: state.lastSuccessfulAt,
        pending: {
          startHistoryId,
          pageToken: response.nextPageToken,
        },
      }
      await dependencies.writeState(account.workspaceId, state)
      pageToken = response.nextPageToken
      continue
    }
    const historyId = response.historyId ?? startHistoryId
    const heartbeatDue =
      dependencies.now().getTime() - Date.parse(state.lastSuccessfulAt) >=
      CURSOR_HEARTBEAT_INTERVAL_MS
    if (state.pending || historyId !== state.historyId || heartbeatDue) {
      await dependencies.writeState(account.workspaceId, {
        version: 1,
        historyId,
        establishedAt: state.establishedAt,
        lastSuccessfulAt: timestamp,
      })
    }
    return { complete: true as const }
  }
  // `pending` was durably written after the last acknowledged page. Report
  // catch-up explicitly instead of presenting a large but losslessly queued
  // mailbox as current; the next tick resumes from that exact page token.
  return { complete: false as const }
}

async function recoverExpiredCursor(
  account: MailAccount,
  state: GmailEventCursorState,
  dependencies: GmailEventSyncDependencies,
): Promise<GmailRecoveryProgress> {
  const profile = await dependencies.getProfile(account.workspaceId)
  if (!profile.historyId) {
    throw new Error('Gmail profile did not include a recovery history cursor')
  }
  const recoveryState: GmailEventCursorState = {
    version: 1,
    historyId: state.historyId,
    establishedAt: state.establishedAt,
    lastSuccessfulAt: state.lastSuccessfulAt,
    recovery: {
      targetHistoryId: profile.historyId,
      cutoffInternalDate: Math.max(
        0,
        Date.parse(state.lastSuccessfulAt) - RECOVERY_OVERLAP_MS,
      ),
      startedAt: dependencies.now().toISOString(),
      processedCount: 0,
    },
  }
  // Persist the recovery boundary before listing. A crash can replay a page,
  // which is safe because the host event journal deduplicates it, but it can
  // never make the expired cursor look current before the gap is exhausted.
  await dependencies.writeState(account.workspaceId, recoveryState)
  return continueExpiredCursorRecovery(account, recoveryState, dependencies)
}

async function continueExpiredCursorRecovery(
  account: MailAccount,
  initialState: GmailEventCursorState,
  dependencies: GmailEventSyncDependencies,
): Promise<GmailRecoveryProgress> {
  let state = initialState
  let recovery = state.recovery
  if (!recovery) {
    throw new Error('Gmail cursor recovery state is missing')
  }
  for (let page = 0; page < RECOVERY_PAGES_PER_TICK; page += 1) {
    const response = await dependencies.listRecoveryMessagePage(
      account.workspaceId,
      {
        afterEpochSeconds: Math.floor(recovery.cutoffInternalDate / 1_000),
        maxResults: RECOVERY_PAGE_LIMIT,
        ...(recovery.pageToken ? { pageToken: recovery.pageToken } : {}),
      },
    )
    if (response.messageIds.length > RECOVERY_PAGE_LIMIT) {
      throw new Error('Gmail returned an oversized cursor recovery page')
    }
    await emitMessageEntries(
      account,
      response.messageIds.map((messageId) => ({ messageId })),
      recovery.targetHistoryId,
      dependencies,
      recovery.cutoffInternalDate,
    )
    const processedCount = safeCountIncrement(
      recovery.processedCount,
      response.messageIds.length,
    )
    if (!response.nextPageToken) {
      await dependencies.writeState(account.workspaceId, {
        version: 1,
        historyId: recovery.targetHistoryId,
        establishedAt: state.establishedAt,
        lastSuccessfulAt: dependencies.now().toISOString(),
      })
      return { complete: true, processedCount }
    }
    recovery = {
      ...recovery,
      processedCount,
      pageToken: response.nextPageToken,
    }
    state = {
      version: 1,
      historyId: state.historyId,
      establishedAt: state.establishedAt,
      lastSuccessfulAt: state.lastSuccessfulAt,
      recovery,
    }
    // The page token moves only after every emitted event is acknowledged.
    // A process interruption before this write therefore replays, not skips.
    await dependencies.writeState(account.workspaceId, state)
  }
  return { complete: false, processedCount: recovery.processedCount }
}

type GmailRecoveryProgress = {
  complete: boolean
  processedCount: number
}

type HistoryPageChanges = {
  addedEntries: Array<{ messageId: string; historyId?: string }>
  deletedMessageIds: string[]
  labelChanges: Array<{
    messageId: string
    addLabelIds?: string[]
    removeLabelIds?: string[]
  }>
}

function historyPageChanges(
  history: gmail_v1.Schema$History[],
): HistoryPageChanges {
  const addedMessages = new Map<
    string,
    { messageId: string; historyId?: string }
  >()
  const deleted = new Set<string>()
  const labels = new Map<
    string,
    { addLabelIds: Set<string>; removeLabelIds: Set<string> }
  >()

  const updateLabels = (
    messageId: string | null | undefined,
    addLabelIds: string[],
    removeLabelIds: string[],
  ) => {
    if (!messageId) return
    const change = labels.get(messageId) ?? {
      addLabelIds: new Set<string>(),
      removeLabelIds: new Set<string>(),
    }
    for (const labelId of addLabelIds) {
      change.removeLabelIds.delete(labelId)
      change.addLabelIds.add(labelId)
    }
    for (const labelId of removeLabelIds) {
      change.addLabelIds.delete(labelId)
      change.removeLabelIds.add(labelId)
    }
    labels.set(messageId, change)
  }

  for (const record of history) {
    for (const entry of record.messagesAdded ?? []) {
      const messageId = entry.message?.id
      if (!messageId || deleted.has(messageId)) continue
      addedMessages.set(messageId, {
        messageId,
        ...(record.id ? { historyId: record.id } : {}),
      })
    }
    for (const entry of record.labelsAdded ?? []) {
      if (!entry.message?.id || deleted.has(entry.message.id)) continue
      updateLabels(entry.message.id, entry.labelIds ?? [], [])
    }
    for (const entry of record.labelsRemoved ?? []) {
      if (!entry.message?.id || deleted.has(entry.message.id)) continue
      updateLabels(entry.message.id, [], entry.labelIds ?? [])
    }
    for (const entry of record.messagesDeleted ?? []) {
      const messageId = entry.message?.id
      if (!messageId) continue
      deleted.add(messageId)
      addedMessages.delete(messageId)
      labels.delete(messageId)
    }
  }
  return {
    addedEntries: [...addedMessages.values()],
    deletedMessageIds: [...deleted],
    labelChanges: [...labels.entries()].map(([messageId, change]) => ({
      messageId,
      ...(change.addLabelIds.size > 0
        ? { addLabelIds: [...change.addLabelIds] }
        : {}),
      ...(change.removeLabelIds.size > 0
        ? { removeLabelIds: [...change.removeLabelIds] }
        : {}),
    })),
  }
}

async function applyHistoryCacheChanges(
  account: MailAccount,
  changes: HistoryPageChanges,
  dependencies: GmailEventSyncDependencies,
) {
  await mapWithConcurrency(changes.labelChanges, DETAIL_CONCURRENCY, (change) =>
    dependencies.updateMessageLabels(
      account.workspaceId,
      change.messageId,
      change,
    ),
  )
  await mapWithConcurrency(
    changes.deletedMessageIds,
    DETAIL_CONCURRENCY,
    (messageId) => dependencies.removeMessage(account.workspaceId, messageId),
  )
}

async function emitMessageEntries(
  account: MailAccount,
  entries: Array<{ messageId: string; historyId?: string }>,
  providerCursor: string | null | undefined,
  dependencies: GmailEventSyncDependencies,
  cutoffInternalDate?: number,
) {
  const details = (
    await mapWithConcurrency(entries, DETAIL_CONCURRENCY, async (entry) => {
      try {
        return {
          entry,
          message: await dependencies.getMessage(
            account.workspaceId,
            entry.messageId,
          ),
        }
      } catch (error) {
        // Gmail history may reference a message that was deleted before the
        // detail fetch. It is no longer an actionable received message and
        // must not poison the cursor forever.
        if (isNotFoundError(error)) return null
        throw error
      }
    })
  ).filter((detail): detail is NonNullable<typeof detail> => detail !== null)
  const observedAt = dependencies.now().toISOString()
  const events = (
    await mapWithConcurrency(
      details,
      DETAIL_CONCURRENCY,
      async ({ entry, message }) => {
        if (
          !isInboundMessage(message) ||
          (cutoffInternalDate !== undefined &&
            message.internalDate < cutoffInternalDate)
        ) {
          return null
        }

        // Native filters run before proactive routines so known-noise messages
        // are archived locally and never produce an avoidable triage event.
        const filterResult = await applyInboundMailFilters({
          workspaceId: account.workspaceId,
          accountId: account.accountId,
          message,
          archive: (messageId) =>
            applyMessageAction(account.workspaceId, messageId, 'archive'),
        })
        if (filterResult.archived) return null

        return buildMailReceivedEvent({
          account,
          message,
          observedAt,
          historyId: entry.historyId,
          providerCursor: providerCursor ?? undefined,
        })
      },
    )
  ).filter((event): event is ProactiveEventPayload => event !== null)
  for (let offset = 0; offset < events.length; offset += 50) {
    const batch = events.slice(offset, offset + 50)
    const acknowledgement = await dependencies.emit({
      workspaceId: account.workspaceId,
      events: batch,
    })
    if (
      !Number.isSafeInteger(acknowledgement.accepted) ||
      !Number.isSafeInteger(acknowledgement.deduplicated) ||
      acknowledgement.accepted < 0 ||
      acknowledgement.deduplicated < 0 ||
      acknowledgement.accepted + acknowledgement.deduplicated !== batch.length
    ) {
      throw new Error(
        'Moldable did not acknowledge the complete email event batch',
      )
    }
  }
}

export function isInboundMessage(message: MailMessageDetail) {
  return !message.labelIds.some((label) =>
    ['SENT', 'DRAFT', 'SPAM', 'TRASH'].includes(label),
  )
}

export function buildMailReceivedEvent(input: {
  account: MailAccount
  message: MailMessageDetail
  observedAt: string
  historyId?: string
  providerCursor?: string
}): ProactiveEventPayload {
  const { account, message } = input
  const digest = createHash('sha256')
    .update(`${account.accountId}\0${message.id}\0received`)
    .digest('hex')
    .slice(0, 32)
  const internalDate = new Date(message.internalDate)
  const occurredAt =
    Number.isFinite(message.internalDate) &&
    !Number.isNaN(internalDate.getTime())
      ? internalDate.toISOString()
      : input.observedAt
  const excerpt = (message.bodyText || message.bodyHtmlText || message.snippet)
    .replaceAll(/\s+/g, ' ')
    .trim()
    .slice(0, 12_000)
  const subject = boundedText(message.subject, 512).trim() || '(no subject)'
  const summary =
    `New email from ${message.from || 'an unknown sender'}: ${subject}. ${message.snippet}`
      .trim()
      .slice(0, 4_096)
  const fields = [
    { name: 'accountEmail', value: account.emailAddress },
    { name: 'from', value: message.from },
    { name: 'to', value: message.to },
    { name: 'cc', value: message.cc },
    { name: 'subject', value: subject },
    { name: 'receivedAt', value: occurredAt },
    { name: 'labels', value: message.labelIds.join(', ') },
    {
      name: 'hasAttachments',
      value: String(message.attachments.length > 0),
    },
    { name: 'providerThreadId', value: message.threadId },
    ...(message.attachments.length > 0
      ? [
          {
            name: 'attachments',
            value: message.attachments
              .slice(0, 20)
              .map(
                (attachment) =>
                  `${attachment.filename || '(unnamed)'} (${attachment.mimeType || 'unknown'}, ${Math.max(0, attachment.size)} bytes)`,
              )
              .join('; '),
          },
        ]
      : []),
    ...(message.replyTo ? [{ name: 'replyTo', value: message.replyTo }] : []),
  ]
    .filter((field) => field.value)
    .map((field) => ({ ...field, value: boundedText(field.value, 2_048) }))
  return {
    schemaVersion: 1,
    eventId: `mail-received-${digest}`,
    workspaceId: account.workspaceId,
    source: {
      sourceId: `mail:gmail:${account.accountId}`,
      kind: 'app',
      appId: 'mail',
      accountId: account.accountId,
    },
    eventType: 'mail.message.received',
    resource: {
      resourceType: 'mail.message',
      resourceId: message.id,
      ...(input.historyId
        ? { resourceVersion: `gmail-history-${input.historyId}` }
        : {}),
      dataRef: `moldable://mail/${encodeURIComponent(account.accountId)}/messages/${encodeURIComponent(message.id)}`,
    },
    occurredAt,
    observedAt: input.observedAt,
    ...(input.historyId ? { sequence: input.historyId } : {}),
    ...(input.providerCursor ? { providerCursor: input.providerCursor } : {}),
    deduplicationKey: `received:${account.accountId}:${message.id}`,
    matchDocument: {
      title: subject,
      summary,
      fields,
      ...(excerpt ? { contentExcerpt: excerpt } : {}),
    },
  }
}

async function reportHealthy(
  account: MailAccount,
  dependencies: GmailEventSyncDependencies,
) {
  await dependencies.reportHealth({
    workspaceId: account.workspaceId,
    accountId: account.accountId,
    displayName: account.emailAddress,
    status: 'healthy',
  })
}

async function reportRecovering(
  account: MailAccount,
  processedCount: number,
  dependencies: GmailEventSyncDependencies,
) {
  await dependencies.reportHealth({
    workspaceId: account.workspaceId,
    accountId: account.accountId,
    displayName: account.emailAddress,
    status: 'degraded',
    issueCode: 'catching_up',
    error: `Recovering an expired Gmail history cursor (${processedCount} messages checked so far).`,
  })
}

async function reportHistoryCatchUp(
  account: MailAccount,
  dependencies: GmailEventSyncDependencies,
) {
  await dependencies.reportHealth({
    workspaceId: account.workspaceId,
    accountId: account.accountId,
    displayName: account.emailAddress,
    status: 'degraded',
    issueCode: 'catching_up',
    error: 'Catching up on a paginated Gmail history backlog.',
  })
}

async function readCursorState(workspaceId: string) {
  const value = await readJson<unknown>(cursorPath(workspaceId), null)
  if (value === null) return null
  if (!isCursorState(value)) {
    throw new Error('Stored Gmail proactive cursor is invalid and needs repair')
  }
  return value
}

async function writeCursorState(
  workspaceId: string,
  state: GmailEventCursorState,
) {
  await ensureDir(getMailAccountDataDir(workspaceId))
  await writeJson(cursorPath(workspaceId), state)
}

function cursorPath(workspaceId: string) {
  return safePath(getMailAccountDataDir(workspaceId), CURSOR_FILE)
}

function isHistoryCursorExpired(error: unknown) {
  const candidate = error as {
    code?: number
    status?: number
    response?: { status?: number }
  }
  return (
    candidate.code === 404 ||
    candidate.status === 404 ||
    candidate.response?.status === 404
  )
}

function isNotFoundError(error: unknown) {
  const candidate = error as {
    code?: number
    status?: number
    response?: { status?: number }
  }
  return (
    candidate.code === 404 ||
    candidate.status === 404 ||
    candidate.response?.status === 404
  )
}

function isCursorState(value: unknown): value is GmailEventCursorState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const state = value as Record<string, unknown>
  if (
    state.version !== 1 ||
    !boundedString(state.historyId, 256) ||
    !validTimestamp(state.establishedAt) ||
    !validTimestamp(state.lastSuccessfulAt)
  ) {
    return false
  }
  if (state.pending !== undefined && state.recovery !== undefined) return false
  if (state.pending !== undefined) {
    if (
      !state.pending ||
      typeof state.pending !== 'object' ||
      Array.isArray(state.pending)
    ) {
      return false
    }
    const pending = state.pending as Record<string, unknown>
    return (
      boundedString(pending.startHistoryId, 256) &&
      boundedString(pending.pageToken, 2_048)
    )
  }
  if (state.recovery === undefined) return true
  if (
    !state.recovery ||
    typeof state.recovery !== 'object' ||
    Array.isArray(state.recovery)
  ) {
    return false
  }
  const recovery = state.recovery as Record<string, unknown>
  return (
    boundedString(recovery.targetHistoryId, 256) &&
    typeof recovery.cutoffInternalDate === 'number' &&
    Number.isSafeInteger(recovery.cutoffInternalDate) &&
    recovery.cutoffInternalDate >= 0 &&
    validTimestamp(recovery.startedAt) &&
    typeof recovery.processedCount === 'number' &&
    Number.isSafeInteger(recovery.processedCount) &&
    recovery.processedCount >= 0 &&
    (recovery.pageToken === undefined ||
      boundedString(recovery.pageToken, 2_048))
  )
}

function boundedString(value: unknown, maximum: number): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= maximum
  )
}

function validTimestamp(value: unknown) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function boundedText(value: string, maximum: number) {
  return value.slice(0, maximum)
}

function safeCountIncrement(current: number, increment: number) {
  const result = current + increment
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new Error('Gmail cursor recovery count exceeded its safe bound')
  }
  return result
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = []
  for (let index = 0; index < items.length; index += concurrency) {
    results.push(
      ...(await Promise.all(
        items.slice(index, index + concurrency).map(mapper),
      )),
    )
  }
  return results
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 4_096) : String(error)
}
