import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import type { AppStatus } from '../shared/bookmarks'
import { deleteXOAuthCredential, hasXOAuthCredential } from './aivault'
import { ensureDailySyncSchedule } from './background-sync'
import {
  readConnection,
  readFolders,
  readSyncState,
  writeConnection,
} from './bookmark-files'
import {
  BookmarksRpcError,
  bookmarksRpcRequestSchema,
  dispatchBookmarksRpc,
} from './bookmarks-rpc'
import { detectBrowserProfiles } from './browser-session'
import {
  folderStatuses,
  readExcludedFolderIds,
  updateFolderSelection,
} from './folder-selection'
import {
  handleTodayDismissal,
  installTodayDismissalMiddleware,
  jsonError,
} from './moldable'
import { beginXOAuth, finishXOAuth } from './oauth'
import { bookmarkPaths } from './paths'
import {
  applyBookmarksCors,
  authorizeBookmarksApiRequest,
} from './request-security'
import { getBookmark, searchBookmarks } from './search-index'
import { isSyncRunning, startSync, startSyncIfStale } from './sync-service'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

const DEFAULT_WORKSPACE = 'personal'

const connectBrowserSchema = z.object({
  browserId: z.string().trim().min(1),
  profileId: z.string().trim().min(1),
})
const oauthStartSchema = z.object({ clientId: z.string().trim().min(3) })
const searchParamsSchema = z.object({
  query: z.string().trim().max(500).optional(),
  folderId: z.string().trim().max(200).optional(),
  offset: z.coerce.number().int().min(0).max(1_000_000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})
const folderSelectionSchema = z.object({
  selectedFolderIds: z.array(z.string().trim().min(1).max(200)).max(2_000),
})

let profileCache: {
  value: Awaited<ReturnType<typeof detectBrowserProfiles>>
  at: number
} | null = null

export const app = new Hono()

// Moldable's desktop shell performs cross-origin health checks before it keeps
// an app runtime alive. Keep the standard middleware in place, then narrow
// private API access with the authorization middleware below.
app.use('*', cors())

app.use('/api/*', async (c, next) => {
  const authorization = authorizeBookmarksApiRequest(c.req.raw)
  if (!authorization.allowed) {
    return c.json({ error: authorization.message }, authorization.status)
  }
  if (c.req.method === 'OPTIONS') {
    const headers = new Headers()
    applyBookmarksCors(headers, authorization.corsOrigin)
    return new Response(null, { status: 204, headers })
  }
  await next()
  applyBookmarksCors(c.res.headers, authorization.corsOrigin)
})
installTodayDismissalMiddleware(app)
app.post('/api/moldable/today/dismiss', handleTodayDismissal)

app.get('/api/moldable/health', (c) =>
  c.json({ appId: process.env.MOLDABLE_APP_ID ?? 'bookmarks', status: 'ok' }),
)

app.get('/api/status', async (c) => {
  const workspaceId = workspace(c.req.raw)
  ensureDailySyncSchedule(workspaceId)
  await startSyncIfStale(workspaceId)
  return c.json(await buildStatus(workspaceId))
})

app.post('/api/connect/browser', async (c) => {
  try {
    const workspaceId = workspace(c.req.raw)
    const input = connectBrowserSchema.parse(await c.req.json())
    const profile = (await browserProfiles(true)).find(
      (candidate) =>
        candidate.browserId === input.browserId &&
        candidate.profileId === input.profileId,
    )
    if (!profile?.hasXSession) {
      return jsonError(
        c,
        'That profile does not currently have a signed-in X session',
        400,
      )
    }
    await writeConnection(workspaceId, {
      method: 'browser',
      browserId: profile.browserId,
      browserName: profile.browserName,
      profileId: profile.profileId,
      profileName: profile.profileName,
      connectedAt: new Date().toISOString(),
    })
    ensureDailySyncSchedule(workspaceId)
    void startSync(workspaceId).catch(() => undefined)
    return c.json({ ok: true }, 202)
  } catch (error) {
    return routeError(c, error)
  }
})

app.post('/api/auth/x/start', async (c) => {
  try {
    const input = oauthStartSchema.parse(await c.req.json())
    const url = new URL(c.req.url)
    return c.json(
      await beginXOAuth({
        workspaceId: workspace(c.req.raw),
        clientId: input.clientId,
        origin: url.origin,
      }),
    )
  } catch (error) {
    return routeError(c, error)
  }
})

app.get('/api/auth/x/callback', async (c) => {
  const workspaceId = c.req.query('workspace')?.trim() || DEFAULT_WORKSPACE
  const state = c.req.query('state')
  const code = c.req.query('code')
  const oauthError = c.req.query('error')
  if (oauthError) {
    return c.redirect(`/?oauth=error&reason=${encodeURIComponent(oauthError)}`)
  }
  if (!state || !code) return jsonError(c, 'Missing OAuth callback data', 400)
  try {
    await finishXOAuth({ workspaceId, state, code })
    ensureDailySyncSchedule(workspaceId)
    void startSync(workspaceId).catch(() => undefined)
    return c.redirect('/?oauth=connected')
  } catch (callbackError) {
    return c.redirect(
      `/?oauth=error&reason=${encodeURIComponent(errorMessage(callbackError))}`,
    )
  }
})

app.post('/api/sync', async (c) => {
  const workspaceId = workspace(c.req.raw)
  if (!(await readConnection(workspaceId))) {
    return jsonError(c, 'Connect an X account before syncing', 409)
  }
  const alreadyRunning = isSyncRunning(workspaceId)
  void startSync(workspaceId).catch(() => undefined)
  return c.json({ ok: true, alreadyRunning }, 202)
})

app.put('/api/folders/selection', async (c) => {
  try {
    const workspaceId = workspace(c.req.raw)
    const input = folderSelectionSchema.parse(await c.req.json())
    const result = await updateFolderSelection(
      workspaceId,
      input.selectedFolderIds,
    )
    if (result.reenabled) void startSync(workspaceId).catch(() => undefined)
    return c.json({ ok: true, folders: result.folders })
  } catch (error) {
    return routeError(c, error)
  }
})

app.delete('/api/connection', async (c) => {
  try {
    const workspaceId = workspace(c.req.raw)
    const connection = await readConnection(workspaceId)
    if (connection?.method === 'oauth')
      await deleteXOAuthCredential(workspaceId)
    await writeConnection(workspaceId, null)
    return c.json({ ok: true, archivePreserved: true })
  } catch (error) {
    return routeError(c, error)
  }
})

app.get('/api/bookmarks', async (c) => {
  try {
    const workspaceId = workspace(c.req.raw)
    const params = searchParamsSchema.parse({
      query: c.req.query('q'),
      folderId: c.req.query('folder'),
      offset: c.req.query('offset'),
      limit: c.req.query('limit'),
    })
    return c.json(
      await searchBookmarks({
        workspaceId,
        ...params,
        excludedFolderIds: await readExcludedFolderIds(workspaceId),
      }),
    )
  } catch (error) {
    return routeError(c, error)
  }
})

app.get('/api/bookmarks/:id', async (c) => {
  const record = await getBookmark(workspace(c.req.raw), c.req.param('id'))
  return record ? c.json(record) : jsonError(c, 'Bookmark not found', 404)
})

app.get('/api/moldable/today', async (c) => {
  try {
    const workspaceId = workspace(c.req.raw)
    const [state, connection] = await Promise.all([
      readSyncState(workspaceId),
      readConnection(workspaceId),
    ])
    const retryAt = state.retryAt ? Date.parse(state.retryAt) : 0
    const retryScheduled = Number.isFinite(retryAt) && retryAt > Date.now()
    const items =
      connection && state.status === 'error' && !retryScheduled
        ? [
            {
              id: 'bookmarks-sync-error',
              kind: 'blocked',
              title: 'Bookmarks needs attention',
              subtitle: state.lastError ?? 'X bookmark sync failed',
              icon: '🔖',
            },
          ]
        : []
    return c.json({
      items,
      resume: null,
      generatedAt: new Date().toISOString(),
    })
  } catch {
    return c.json({
      items: [],
      resume: null,
      generatedAt: new Date().toISOString(),
    })
  }
})

app.post('/api/moldable/rpc', async (c) => {
  try {
    const workspaceId = workspace(c.req.raw)
    const body = bookmarksRpcRequestSchema.parse(await c.req.json())
    const result = await dispatchBookmarksRpc(
      workspaceId,
      body.method,
      body.params,
    )
    return c.json({ ok: true, result })
  } catch (error) {
    if (error instanceof BookmarksRpcError) {
      return jsonError(c, error.message, error.status)
    }
    return routeError(c, error)
  }
})

async function buildStatus(
  workspaceId: string,
  includeProfiles = true,
): Promise<AppStatus> {
  const [connection, sync, profiles, folders, excludedFolderIds] =
    await Promise.all([
      readConnection(workspaceId),
      readSyncState(workspaceId),
      includeProfiles ? browserProfiles() : Promise.resolve([]),
      readFolders(workspaceId),
      readExcludedFolderIds(workspaceId),
    ])
  const oauthCredential =
    connection?.method === 'oauth'
      ? await hasXOAuthCredential(workspaceId)
      : true
  return {
    connected: Boolean(connection) && oauthCredential,
    connection,
    sync: isSyncRunning(workspaceId) ? { ...sync, status: 'syncing' } : sync,
    profiles,
    folders: folderStatuses(folders, excludedFolderIds),
    storage: {
      format: 'jsonl',
      workspaceScoped: true,
      path: bookmarkPaths(workspaceId).archive,
    },
  }
}

async function browserProfiles(force = false) {
  if (!force && profileCache && Date.now() - profileCache.at < 30_000) {
    return profileCache.value
  }
  const value = await detectBrowserProfiles()
  profileCache = { value, at: Date.now() }
  return value
}

function workspace(request: Request): string {
  return getWorkspaceFromRequest(request)?.trim() || DEFAULT_WORKSPACE
}

function routeError(c: Parameters<typeof jsonError>[0], error: unknown) {
  if (error instanceof z.ZodError) return jsonError(c, 'Invalid request', 400)
  return jsonError(c, errorMessage(error))
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Bookmarks request failed'
}
