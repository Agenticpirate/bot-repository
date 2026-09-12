import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { MAX_SEARCH_RESULTS } from '../lib/constants'
import { getImageMimeType, isImageFile } from '../lib/file-utils'
import fg from 'fast-glob'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import ignore, { type Ignore } from 'ignore'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

interface ProjectTabs {
  openFiles: string[]
  activeFile: string | null
}

interface ProjectConfig {
  rootPath: string | null
  recentProjects: Array<{
    path: string
    name: string
    lastOpened: string
  }>
  previewUrl: string
  projectTabs: Record<string, ProjectTabs>
}

interface Preferences {
  panelSizes?: Record<string, number[]>
  [key: string]: unknown
}

type RpcRequest = {
  method?: unknown
  params?: unknown
}

type RpcParams = Record<string, unknown>
type RpcStatus = 400 | 403 | 404 | 500

type ZodParser<T> = {
  strict(): ZodParser<T>
  parse(value: unknown): T
  optional(): ZodParser<T | undefined>
}
type ZodStringParser = ZodParser<string> & {
  trim(): ZodStringParser
  min(value: number): ZodStringParser
  max(value: number): ZodStringParser
}
type ZodShape = Record<string, ZodParser<unknown>>
type ParsedShape<T extends ZodShape> = {
  [K in keyof T]: T[K] extends ZodParser<infer V> ? V : never
}
type ZodApi = {
  string(): ZodStringParser
  unknown(): ZodParser<unknown>
  enum<const T extends readonly [string, ...string[]]>(
    values: T,
  ): ZodParser<T[number]>
  object<T extends ZodShape>(shape: T): ZodParser<ParsedShape<T>>
  record<T>(
    key: ZodParser<string>,
    value: ZodParser<T>,
  ): ZodParser<Record<string, T>>
}

const requireFromMoldableUi = createRequire(
  import.meta.resolve('@moldable-ai/ui'),
)
const { z } = requireFromMoldableUi('zod') as { z: ZodApi }

const DEFAULT_CONFIG: ProjectConfig = {
  rootPath: null,
  recentProjects: [],
  previewUrl: 'http://localhost:3000',
  projectTabs: {},
}

const PREFERENCES_FILE = 'preferences.json'
const gitignoreCache = new Map<string, { ig: Ignore; mtime: number }>()
const WORKSPACE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/
const PUBLIC_API_PATHS = new Set([
  '/api/moldable/health',
  '/api/moldable/today',
])

export const app = new Hono()

app.use('/api/*', cors())

app.use('/api/moldable/today', async (c, next) => {
  if (c.req.method !== 'GET') {
    await next()
    return
  }

  await next()

  const response = c.res
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return

  const data = (await response
    .clone()
    .json()
    .catch(() => null)) as unknown
  if (!isMoldableTodayResponse(data)) return

  const dismissals = await readMoldableTodayDismissals(c.req.raw)
  const items = filterMoldableTodayDismissedItems(data.items, dismissals)
  if (items.length === data.items.length) return

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  c.res = new Response(JSON.stringify({ ...data, items }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})
app.use('/api/*', async (c, next) => {
  if (PUBLIC_API_PATHS.has(new URL(c.req.url).pathname)) {
    await next()
    return
  }

  if (!getTrustedWorkspaceId(c.req.raw)) {
    return c.json({ error: 'Workspace header is required' }, 403)
  }

  await next()
})

function getConfigPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'config.json')
}

function getPreferencesPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), PREFERENCES_FILE)
}

function normalizeWorkspaceId(
  value: string | null | undefined,
): string | undefined {
  if (!value || !WORKSPACE_ID_PATTERN.test(value)) return undefined
  return value
}

function getTrustedWorkspaceId(request: Request): string | undefined {
  return (
    normalizeWorkspaceId(getWorkspaceFromRequest(request)) ??
    normalizeWorkspaceId(request.headers.get('x-moldable-workspace-id'))
  )
}

function getRequestWorkspaceId(request: Request): string | undefined {
  const queryWorkspace = new URL(request.url).searchParams.get('workspace')
  return getTrustedWorkspaceId(request) ?? normalizeWorkspaceId(queryWorkspace)
}

function asParams(value: unknown): RpcParams {
  return value && typeof value === 'object' ? (value as RpcParams) : {}
}

function stringParam(params: RpcParams, key: string): string | undefined {
  const value = params[key]
  return typeof value === 'string' ? value : undefined
}

function numberParam(params: RpcParams, key: string): number | undefined {
  const value = params[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function booleanParam(params: RpcParams, key: string): boolean | undefined {
  const value = params[key]
  return typeof value === 'boolean' ? value : undefined
}

function nativeProjectId(projectPath: string): string {
  return `code-project-${createHash('sha256').update(path.resolve(projectPath)).digest('hex').slice(0, 16)}`
}

function resolveNativeProjectPath(
  config: ProjectConfig,
  projectId: string,
): string | undefined {
  return [
    config.rootPath,
    ...config.recentProjects.map((project) => project.path),
  ]
    .filter((candidate): candidate is string => typeof candidate === 'string')
    .find((candidate) => nativeProjectId(candidate) === projectId)
}

function nativeCodeLanguage(filePath: string): string {
  const extension = path.extname(filePath).slice(1).toLowerCase()
  const aliases: Record<string, string> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    md: 'markdown',
    json: 'json',
    css: 'css',
    html: 'html',
    py: 'python',
    rs: 'rust',
    sh: 'shell',
  }
  return aliases[extension] ?? (extension || 'text')
}

function rpcError(code: string, message: string, status: RpcStatus = 400) {
  return {
    body: {
      ok: false,
      error: { code, message },
    },
    status,
  }
}

function isPathWithinRoot(rootPath: string, targetPath: string): boolean {
  const root = path.resolve(rootPath)
  const target = path.resolve(targetPath)
  const relative = path.relative(root, target)
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  )
}

function validatePathWithinRoot(
  rootPath: string | null,
  targetPath: string,
): { root: string; target: string } | { error: string; status: 400 | 403 } {
  if (!rootPath) {
    return { error: 'Project root is required', status: 400 }
  }

  const root = path.resolve(rootPath)
  const target = path.resolve(targetPath)

  if (!isPathWithinRoot(root, target)) {
    return { error: 'Path is outside the current project', status: 403 }
  }

  return { root, target }
}

async function getProjectRoot(request: Request): Promise<string | null> {
  const workspaceId = getRequestWorkspaceId(request)
  const config = await readJson<ProjectConfig>(
    getConfigPath(workspaceId),
    DEFAULT_CONFIG,
  )
  return config.rootPath
}

async function validateRequestPath(
  request: Request,
  targetPath: string,
): Promise<
  { root: string; target: string } | { error: string; status: 400 | 403 }
> {
  return validatePathWithinRoot(await getProjectRoot(request), targetPath)
}

function isSafeFileName(name: string): boolean {
  return (
    name.length > 0 &&
    name !== '.' &&
    name !== '..' &&
    !name.includes('/') &&
    !name.includes('\\') &&
    !name.includes('\0')
  )
}

// ---------------------------------------------------------------------------
// Drive contract: UI views + a single per-workspace navigation-intent slot
// ---------------------------------------------------------------------------

const UI_VIEW_IDS = ['projects', 'editor', 'file'] as const

type UiViewId = (typeof UI_VIEW_IDS)[number]

type UiIntent = {
  id: string
  view: UiViewId
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}

const uiDescribeParamsSchema = z.object({})
const uiNavigateParamsSchema = z.object({
  view: z.enum(UI_VIEW_IDS),
  entityId: z.string().trim().min(1).max(4096).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
})
const uiOpenFileParamsSchema = z.object({
  path: z.string().trim().min(1).max(4096),
})
const uiReadParamsSchema = z.object({
  view: z.enum(UI_VIEW_IDS).optional(),
  entityId: z.string().trim().min(1).max(4096).optional(),
})

/** Model-readable catalog of every navigable surface in the client UI. */
const UI_VIEWS: {
  id: UiViewId
  name: string
  description: string
  params?: Record<string, string>
}[] = [
  {
    id: 'projects',
    name: 'Project picker',
    description:
      'The screen shown when no project is open: a list of recently opened projects plus an Open Folder action. Navigating here closes the current project view (the project files themselves are untouched). Takes no entityId and no params.',
  },
  {
    id: 'editor',
    name: 'IDE',
    description:
      'The main IDE for one project: file-tree sidebar, tabbed code editor, and browser preview panel. With no params it shows the currently open project. Optional params.projectPath (absolute path of an existing folder) switches the IDE to that project and records it in recent projects. No entityId.',
    params: {
      projectPath:
        'Optional absolute path of the project folder to open. Must exist on disk. Defaults to the currently open project.',
    },
  },
  {
    id: 'file',
    name: 'File tab',
    description:
      'One file opened in an editor tab of the current project. Requires entityId: the absolute path of a file inside the current project root (find paths with code-editor.files.search or code-editor.files.list). The file opens in a tab and becomes the active tab. No params.',
  },
]

function getUiIntentPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'ui-intent.json')
}

async function readUiIntent(workspaceId?: string): Promise<UiIntent | null> {
  return readJson<UiIntent | null>(getUiIntentPath(workspaceId), null)
}

async function writeUiIntent(
  intent: UiIntent | null,
  workspaceId?: string,
): Promise<void> {
  await writeJson(getUiIntentPath(workspaceId), intent)
}

/** Queue a navigation intent. Single slot: the newest intent replaces any unacked one. */
async function setUiIntent(
  input: {
    view: UiViewId
    entityId?: string
    params?: Record<string, unknown>
  },
  workspaceId?: string,
): Promise<UiIntent> {
  const intent: UiIntent = {
    id: crypto.randomUUID(),
    view: input.view,
    ...(input.entityId ? { entityId: input.entityId } : {}),
    ...(input.params && Object.keys(input.params).length > 0
      ? { params: input.params }
      : {}),
    createdAt: new Date().toISOString(),
  }
  await writeUiIntent(intent, workspaceId)
  return intent
}

/**
 * Validate a file path for the drive contract (inside the project root, exists,
 * is a regular file) and queue the intent that opens it in an editor tab.
 */
async function resolveOpenFileIntent(
  filePath: string,
  config: ProjectConfig,
  workspaceId?: string,
): Promise<{ intent: UiIntent } | { error: ReturnType<typeof rpcError> }> {
  const validation = validatePathWithinRoot(config.rootPath, filePath)
  if ('error' in validation) {
    return {
      error: rpcError(
        validation.status === 403 ? 'path_outside_project' : 'root_required',
        validation.error,
        validation.status,
      ),
    }
  }

  const [realRoot, realTarget] = await Promise.all([
    fs.realpath(validation.root).catch(() => null),
    fs.realpath(validation.target).catch(() => null),
  ])
  if (!realRoot || !realTarget) {
    return {
      error: rpcError(
        'file_not_found',
        `${validation.target} does not exist in the current project.`,
        404,
      ),
    }
  }
  if (!isPathWithinRoot(realRoot, realTarget)) {
    return {
      error: rpcError(
        'path_outside_project',
        'Path resolves outside the current project.',
        403,
      ),
    }
  }

  const stats = await fs.stat(realTarget).catch(() => null)
  if (!stats) {
    return {
      error: rpcError(
        'file_not_found',
        `${realTarget} does not exist in the current project.`,
        404,
      ),
    }
  }
  if (!stats.isFile()) {
    return {
      error: rpcError(
        'not_a_file',
        `${realTarget} is a directory, not a file.`,
      ),
    }
  }

  const intent = await setUiIntent(
    {
      view: 'file',
      entityId: realTarget,
      params: { projectPath: realRoot },
    },
    workspaceId,
  )
  return { intent }
}

/** ui.read caps file content at 100KB so responses stay bounded. */
const UI_READ_MAX_BYTES = 100_000

type UiReadFile = {
  path: string
  content: string | null
  truncated: boolean
  size: number
  binary?: boolean
}

async function readFileForUiRead(target: string): Promise<UiReadFile | null> {
  const stats = await fs.stat(target).catch(() => null)
  if (!stats?.isFile()) return null

  if (isImageFile(target)) {
    // Faithful but text-free: flag binary content instead of dumping bytes.
    return {
      path: target,
      content: null,
      truncated: false,
      size: stats.size,
      binary: true,
    }
  }

  const handle = await fs.open(target, 'r')
  const buffer = Buffer.alloc(UI_READ_MAX_BYTES)
  const { bytesRead } = await handle.read(buffer, 0, UI_READ_MAX_BYTES, 0)
  await handle.close()
  return {
    path: target,
    content: buffer.subarray(0, bytesRead).toString('utf-8'),
    truncated: stats.size > UI_READ_MAX_BYTES,
    size: stats.size,
  }
}

function isZodError(error: unknown): error is { issues: unknown[] } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'issues' in error &&
    Array.isArray(error.issues)
  )
}

async function getGitignore(projectRoot: string): Promise<Ignore | null> {
  const gitignorePath = path.join(projectRoot, '.gitignore')

  try {
    const stat = await fs.stat(gitignorePath)
    const mtime = stat.mtimeMs
    const cached = gitignoreCache.get(projectRoot)

    if (cached && cached.mtime === mtime) {
      return cached.ig
    }

    const content = await fs.readFile(gitignorePath, 'utf-8')
    const ig = ignore().add(content)
    gitignoreCache.set(projectRoot, { ig, mtime })
    return ig
  } catch {
    return null
  }
}

function findProjectRoot(dirPath: string): string {
  const normalized = path.resolve(dirPath)
  const parts = normalized.split(path.sep)
  const nodeModulesIndex = parts.lastIndexOf('node_modules')

  if (nodeModulesIndex > 0) {
    return (
      parts.slice(0, nodeModulesIndex).join(path.sep) ||
      path.parse(normalized).root
    )
  }

  return normalized
}

async function getGitignorePatterns(root: string): Promise<string[]> {
  const gitignorePath = path.join(root, '.gitignore')

  try {
    const content = await fs.readFile(gitignorePath, 'utf-8')
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((pattern) => {
        if (pattern.startsWith('!')) return null
        if (pattern.endsWith('/')) return `**/${pattern}**`
        if (!pattern.startsWith('/') && !pattern.includes('/')) {
          return `**/${pattern}`
        }
        if (pattern.startsWith('/')) return pattern.slice(1)
        return `**/${pattern}`
      })
      .filter((pattern): pattern is string => pattern !== null)
  } catch {
    return ['**/node_modules/**', '**/.git/**']
  }
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'code-editor',
      port,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    {
      'Cache-Control': 'no-store',
    },
  )
})

app.get('/api/moldable/today', async (c) => {
  const items: unknown[] = []
  let resume: unknown = null

  try {
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const config = await readJson<ProjectConfig>(
      getConfigPath(workspaceId),
      DEFAULT_CONFIG,
    )

    const currentPath = config.rootPath
    const recent = Array.isArray(config.recentProjects)
      ? config.recentProjects
      : []

    // RESUME only: the project you were actually editing. Code-editor has no
    // failures/builds/imminent events to surface, and a list of recent projects
    // would just be a recent-item dump — so we stay silent unless there is a
    // real in-progress project to return to.
    if (currentPath) {
      const current = recent.find((p) => p.path === currentPath)
      const name = current?.name ?? path.basename(currentPath)
      const tabs = config.projectTabs?.[currentPath]
      const openCount = Array.isArray(tabs?.openFiles)
        ? tabs.openFiles.length
        : 0

      resume = {
        title: name,
        // Open files are the genuine WIP signal. With nothing open, skip the
        // subtitle rather than echo the action.
        ...(openCount > 0
          ? {
              subtitle: `${openCount} file${openCount === 1 ? '' : 's'} open`,
            }
          : {}),
        icon: '📝',
        deepLink: currentPath,
        lastTouchedAt: current?.lastOpened,
      }
    }
  } catch {
    // No project state / unreadable config: stay quiet.
    return c.json({
      items: [],
      resume: null,
      generatedAt: new Date().toISOString(),
    })
  }

  return c.json({ items, resume, generatedAt: new Date().toISOString() })
})

// Drive contract: the client polls the single intent slot and acks it.
app.get('/api/moldable/ui-intent', async (c) => {
  try {
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const intent = await readUiIntent(workspaceId)
    return c.json(intent, 200, { 'Cache-Control': 'no-store' })
  } catch (error) {
    console.error('Failed to read UI intent:', error)
    return c.json({ error: 'Failed to read UI intent' }, 500)
  }
})

app.delete('/api/moldable/ui-intent', async (c) => {
  try {
    const id = c.req.query('id')
    if (!id?.trim()) {
      return c.json({ error: 'Missing id query parameter' }, 400)
    }
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const intent = await readUiIntent(workspaceId)
    const cleared = intent?.id === id
    if (cleared) await writeUiIntent(null, workspaceId)
    return c.json({ ok: true, cleared })
  } catch (error) {
    console.error('Failed to ack UI intent:', error)
    return c.json({ error: 'Failed to ack UI intent' }, 500)
  }
})

app.get('/api/config', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const config = await readJson<ProjectConfig>(
    getConfigPath(workspaceId),
    DEFAULT_CONFIG,
  )
  return c.json(config)
})

app.post('/api/config', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const configPath = getConfigPath(workspaceId)
  const existingConfig = await readJson<ProjectConfig>(
    configPath,
    DEFAULT_CONFIG,
  )
  const updates = await c.req.json<Partial<ProjectConfig>>()
  const newConfig: ProjectConfig = {
    ...existingConfig,
    ...updates,
  }

  await writeJson(configPath, newConfig)
  return c.json(newConfig)
})

app.get('/api/preferences', async (c) => {
  try {
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const prefs = await readJson<Preferences>(
      getPreferencesPath(workspaceId),
      {},
    )
    return c.json(prefs)
  } catch (error) {
    console.error('Failed to read preferences:', error)
    return c.json({})
  }
})

app.post('/api/preferences', async (c) => {
  try {
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const prefsPath = getPreferencesPath(workspaceId)
    const body = await c.req.json<Preferences>()
    const existing = await readJson<Preferences>(prefsPath, {})
    const updated = { ...existing, ...body }

    await writeJson(prefsPath, updated)
    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to write preferences:', error)
    return c.json({ error: 'Failed to save preferences' }, 500)
  }
})

app.get('/api/files', async (c) => {
  const dirPath = c.req.query('path')
  const requestedRoot = c.req.query('root') || dirPath

  if (!dirPath) {
    return c.json({ error: 'Path is required' }, 400)
  }

  try {
    const configuredRoot = await getProjectRoot(c.req.raw)
    const root = configuredRoot ?? requestedRoot ?? findProjectRoot(dirPath)
    const validation = validatePathWithinRoot(root, dirPath)

    if ('error' in validation) {
      return c.json({ error: validation.error }, validation.status)
    }

    if (
      configuredRoot &&
      requestedRoot &&
      !isPathWithinRoot(configuredRoot, requestedRoot)
    ) {
      return c.json({ error: 'Root is outside the current project' }, 403)
    }

    const gitignore = await getGitignore(root)
    const entries = await fs.readdir(validation.target, { withFileTypes: true })
    const files = entries
      .filter((entry) => entry.name !== '.DS_Store')
      .map((entry) => {
        const fullPath = path.join(validation.target, entry.name)
        const relativePath = path.relative(root, fullPath)
        const matchPath = entry.isDirectory()
          ? `${relativePath}/`
          : relativePath
        const isIgnored = gitignore?.ignores(matchPath) ?? false

        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          isDimmed: isIgnored,
        }
      })
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        const aDot = a.name.startsWith('.')
        const bDot = b.name.startsWith('.')
        if (aDot !== bDot) return aDot ? -1 : 1
        return a.name.localeCompare(b.name)
      })

    return c.json({ files })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/files/delete', async (c) => {
  try {
    const { path: filePath } = await c.req.json<{ path?: string }>()

    if (!filePath) {
      return c.json({ error: 'path is required' }, 400)
    }

    const validation = await validateRequestPath(c.req.raw, filePath)
    if ('error' in validation) {
      return c.json({ error: validation.error }, validation.status)
    }
    if (validation.target === validation.root) {
      return c.json({ error: 'Cannot delete the project root' }, 400)
    }

    try {
      await fs.access(validation.target)
    } catch {
      return c.json({ error: 'File not found' }, 404)
    }

    const stats = await fs.stat(validation.target)
    if (stats.isDirectory()) {
      await fs.rm(validation.target, { recursive: true })
    } else {
      await fs.unlink(validation.target)
    }

    return c.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/files/rename', async (c) => {
  try {
    const { oldPath, newName } = await c.req.json<{
      oldPath?: string
      newName?: string
    }>()

    const trimmedNewName = newName?.trim()

    if (!oldPath || !trimmedNewName) {
      return c.json({ error: 'oldPath and newName are required' }, 400)
    }

    if (!isSafeFileName(trimmedNewName)) {
      return c.json({ error: 'Invalid new name' }, 400)
    }

    const validation = await validateRequestPath(c.req.raw, oldPath)
    if ('error' in validation) {
      return c.json({ error: validation.error }, validation.status)
    }
    if (validation.target === validation.root) {
      return c.json({ error: 'Cannot rename the project root' }, 400)
    }

    const dir = path.dirname(validation.target)
    const newPath = path.join(dir, trimmedNewName)
    const newPathValidation = validatePathWithinRoot(validation.root, newPath)
    if ('error' in newPathValidation) {
      return c.json(
        { error: newPathValidation.error },
        newPathValidation.status,
      )
    }

    try {
      await fs.access(validation.target)
    } catch {
      return c.json({ error: 'File not found' }, 404)
    }

    try {
      await fs.access(newPath)
      return c.json({ error: 'A file with that name already exists' }, 409)
    } catch {
      // New path does not exist.
    }

    await fs.rename(validation.target, newPathValidation.target)
    return c.json({ success: true, newPath })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.get('/api/image', async (c) => {
  const filePath = c.req.query('path')

  if (!filePath) {
    return c.json({ error: 'Path is required' }, 400)
  }

  if (!isImageFile(filePath)) {
    return c.json({ error: 'Not an image file' }, 400)
  }

  const validation = await validateRequestPath(c.req.raw, filePath)
  if ('error' in validation) {
    return c.json({ error: validation.error }, validation.status)
  }

  try {
    const buffer = await fs.readFile(validation.target)
    const mimeType = getImageMimeType(validation.target)

    return new Response(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.get('/api/read', async (c) => {
  const filePath = c.req.query('path')

  if (!filePath) {
    return c.json({ error: 'Path is required' }, 400)
  }

  try {
    const validation = await validateRequestPath(c.req.raw, filePath)
    if ('error' in validation) {
      return c.json({ error: validation.error }, validation.status)
    }

    const content = await fs.readFile(validation.target, 'utf-8')
    return c.json({ content })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.get('/api/search', async (c) => {
  const root = c.req.query('root')

  if (!root) {
    return c.json({ error: 'Root path is required' }, 400)
  }

  try {
    const configuredRoot = await getProjectRoot(c.req.raw)
    const validation = validatePathWithinRoot(configuredRoot ?? root, root)
    if ('error' in validation) {
      return c.json({ error: validation.error }, validation.status)
    }
    const searchRoot = validation.target
    const ignorePatterns = new Set(await getGitignorePatterns(searchRoot))
    ignorePatterns.add('**/node_modules/**')
    ignorePatterns.add('**/.git/**')
    ignorePatterns.add('**/.DS_Store')

    const files = await fg('**/*', {
      cwd: searchRoot,
      ignore: Array.from(ignorePatterns),
      onlyFiles: true,
      absolute: true,
      followSymbolicLinks: false,
    })

    const results = files.slice(0, MAX_SEARCH_RESULTS).map((filePath) => ({
      path: filePath,
      name: filePath.split('/').pop() ?? '',
      relativePath: path.relative(searchRoot, filePath),
    }))

    return c.json({ files: results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/write', async (c) => {
  try {
    const { path: filePath, content } = await c.req.json<{
      path?: string
      content?: string
    }>()

    if (!filePath) {
      return c.json({ error: 'Path is required' }, 400)
    }

    const validation = await validateRequestPath(c.req.raw, filePath)
    if ('error' in validation) {
      return c.json({ error: validation.error }, validation.status)
    }

    await fs.writeFile(validation.target, content ?? '', 'utf-8')
    return c.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message }, 500)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)

  try {
    const body = (await c.req.json()) as RpcRequest
    const method = typeof body.method === 'string' ? body.method : ''
    const params = asParams(body.params)

    if (!method) {
      const error = rpcError('invalid_request', 'method is required')
      return c.json(error.body, error.status)
    }

    if (method === 'code-editor.project.get') {
      const config = await readJson<ProjectConfig>(
        getConfigPath(workspaceId),
        DEFAULT_CONFIG,
      )
      return c.json({ ok: true, result: config })
    }

    if (method === 'code-editor.project.recent') {
      const config = await readJson<ProjectConfig>(
        getConfigPath(workspaceId),
        DEFAULT_CONFIG,
      )
      return c.json({ ok: true, result: config.recentProjects })
    }

    if (method === 'code-editor.project.set') {
      const rootPath = stringParam(params, 'rootPath') ?? null
      const previewUrl = stringParam(params, 'previewUrl')
      const configPath = getConfigPath(workspaceId)
      const existingConfig = await readJson<ProjectConfig>(
        configPath,
        DEFAULT_CONFIG,
      )
      const updated: ProjectConfig = {
        ...existingConfig,
        rootPath,
        ...(previewUrl ? { previewUrl } : {}),
      }
      await writeJson(configPath, updated)
      return c.json({ ok: true, result: updated })
    }

    if (method === 'code-editor.preferences.get') {
      const prefs = await readJson<Preferences>(
        getPreferencesPath(workspaceId),
        {},
      )
      return c.json({ ok: true, result: prefs })
    }

    if (method === 'code-editor.files.search') {
      const config = await readJson<ProjectConfig>(
        getConfigPath(workspaceId),
        DEFAULT_CONFIG,
      )
      const requestedProjectId = stringParam(params, 'projectId')
      const projectedRoot = requestedProjectId
        ? resolveNativeProjectPath(config, requestedProjectId)
        : undefined
      if (requestedProjectId && !projectedRoot) {
        const error = rpcError(
          'project_not_known',
          'The selected project is no longer available.',
          403,
        )
        return c.json(error.body, error.status)
      }
      const root =
        projectedRoot ?? stringParam(params, 'root') ?? config.rootPath
      if (!root) {
        const error = rpcError(
          'root_required',
          'root or current project is required',
        )
        return c.json(error.body, error.status)
      }

      const normalizedRoot = path.resolve(root)
      const allowedRoot = [
        config.rootPath,
        ...config.recentProjects.map((project) => project.path),
      ].find(
        (candidate): candidate is string =>
          typeof candidate === 'string' &&
          path.resolve(candidate) === normalizedRoot,
      )
      if (!allowedRoot) {
        const error = rpcError(
          'project_not_known',
          'The project must be current or present in recent projects.',
          403,
        )
        return c.json(error.body, error.status)
      }
      const validation = validatePathWithinRoot(allowedRoot, root)
      if ('error' in validation) {
        const error = rpcError(
          validation.status === 403 ? 'path_outside_project' : 'root_required',
          validation.error,
          validation.status,
        )
        return c.json(error.body, error.status)
      }

      const searchRoot = validation.target
      const ignorePatterns = new Set(await getGitignorePatterns(searchRoot))
      ignorePatterns.add('**/node_modules/**')
      ignorePatterns.add('**/.git/**')
      ignorePatterns.add('**/.DS_Store')
      const files = await fg(stringParam(params, 'pattern') ?? '**/*', {
        cwd: searchRoot,
        ignore: Array.from(ignorePatterns),
        onlyFiles: true,
        absolute: true,
        followSymbolicLinks: false,
      })
      const query = stringParam(params, 'query')?.toLowerCase()
      const limit = Math.max(
        1,
        Math.min(numberParam(params, 'limit') ?? 100, 500),
      )
      const matches = files
        .map((filePath) => ({
          path: filePath,
          name: path.basename(filePath),
          relativePath: path.relative(searchRoot, filePath),
        }))
        .filter((item) =>
          query
            ? `${item.name}\n${item.relativePath}`.toLowerCase().includes(query)
            : true,
        )
      const results = matches.slice(0, limit)

      if (params.nativeProjection === true) {
        const projectId = nativeProjectId(searchRoot)
        const projectedFiles = results.map(({ name, relativePath }) => ({
          name,
          relativePath,
          projectId,
          directoryLabel:
            path.dirname(relativePath) === '.'
              ? 'Project root'
              : path.dirname(relativePath),
        }))
        const grouped = new Map<
          string,
          { title: string; files: typeof projectedFiles }
        >()
        for (const file of projectedFiles) {
          const topLevel =
            file.relativePath.split(path.sep)[0] || 'Project Root'
          const isRootFile = !file.relativePath.includes(path.sep)
          const key = isRootFile ? '__root__' : topLevel
          const current = grouped.get(key) ?? {
            title: isRootFile ? 'Project Root' : topLevel,
            files: [],
          }
          current.files.push(file)
          grouped.set(key, current)
        }
        const folders = [...grouped.entries()]
          .sort(([left], [right]) => {
            if (left === '__root__') return -1
            if (right === '__root__') return 1
            return left.localeCompare(right)
          })
          .slice(0, 16)
          .map(([, folder]) => ({
            ...folder,
            fileCountLabel: `${folder.files.length} ${folder.files.length === 1 ? 'file' : 'files'}`,
          }))
        return c.json({
          ok: true,
          result: {
            summary: `${matches.length.toLocaleString()} ${matches.length === 1 ? 'file' : 'files'} in this project`,
            projectId,
            files: projectedFiles,
            folders,
            emptyStates:
              matches.length === 0
                ? [
                    {
                      title: 'No project files found',
                      description:
                        'This project is empty or all files are excluded by its ignore rules.',
                    },
                  ]
                : [],
            truncationNotice:
              matches.length > results.length
                ? `Showing the first ${results.length} files. Ask Moldable to find a specific file.`
                : '',
          },
        })
      }

      return c.json({ ok: true, result: results })
    }

    if (
      method === 'code-editor.native.file.read' ||
      method === 'code-editor.cards.present'
    ) {
      if (method === 'code-editor.cards.present')
        z.object({
          projectId: z.string().min(1).max(256),
          relativePath: z.string().min(1).max(1024),
        })
          .strict()
          .parse(params)
      const config = await readJson<ProjectConfig>(
        getConfigPath(workspaceId),
        DEFAULT_CONFIG,
      )
      const projectId = stringParam(params, 'projectId')
      const relativePath = stringParam(params, 'relativePath')
      if (!projectId || !relativePath || path.isAbsolute(relativePath)) {
        const error = rpcError(
          'invalid_params',
          'A project id and relative file path are required.',
        )
        return c.json(error.body, error.status)
      }
      const projectRoot = resolveNativeProjectPath(config, projectId)
      if (!projectRoot) {
        const error = rpcError(
          'project_not_known',
          'The selected project is no longer available.',
          403,
        )
        return c.json(error.body, error.status)
      }
      const validation = validatePathWithinRoot(
        projectRoot,
        path.resolve(projectRoot, relativePath),
      )
      if ('error' in validation) {
        const error = rpcError(
          'path_outside_project',
          'The requested file is outside this project.',
          403,
        )
        return c.json(error.body, error.status)
      }
      const [realRoot, realTarget] = await Promise.all([
        fs.realpath(validation.root).catch(() => null),
        fs.realpath(validation.target).catch(() => null),
      ])
      if (!realRoot || !realTarget || !isPathWithinRoot(realRoot, realTarget)) {
        const error = rpcError(
          'path_outside_project',
          'The requested file is unavailable or resolves outside this project.',
          403,
        )
        return c.json(error.body, error.status)
      }
      const file = await readFileForUiRead(realTarget)
      if (!file) {
        const error = rpcError(
          'file_not_found',
          'The requested file was not found.',
          404,
        )
        return c.json(error.body, error.status)
      }
      if (method === 'code-editor.cards.present')
        return c.json({
          ok: true,
          result: {
            appCard: {
              version: 1,
              title: path.basename(realTarget).slice(0, 240),
              resourcePath: '/index.html?card=preview',
              input: {
                projectId,
                relativePath: path.relative(realRoot, realTarget),
              },
              readMethod: 'code-editor.native.file.read',
              actions: [],
              height: 360,
            },
          },
        })
      const maxChars = 20_000
      const content = file.content?.slice(0, maxChars) ?? ''
      return c.json({
        ok: true,
        result: {
          title: path.basename(realTarget),
          relativePath: path.relative(realRoot, realTarget),
          detail: `${file.size.toLocaleString()} bytes`,
          codeBlocks: file.binary
            ? []
            : [{ code: content, language: nativeCodeLanguage(realTarget) }],
          binaryEmptyStates: file.binary
            ? [
                {
                  title: 'Binary file',
                  description:
                    'This file cannot be represented safely as source text on iPhone.',
                },
              ]
            : [],
          truncationNotice:
            file.truncated || (file.content?.length ?? 0) > maxChars
              ? 'Showing the first 20,000 characters. Open Code on Mac for the complete file.'
              : '',
        },
      })
    }

    if (method === 'code-editor.files.read') {
      const filePath = stringParam(params, 'path')
      if (!filePath) {
        const error = rpcError('path_required', 'path is required')
        return c.json(error.body, error.status)
      }

      const validation = await validateRequestPath(c.req.raw, filePath)
      if ('error' in validation) {
        const error = rpcError(
          validation.status === 403 ? 'path_outside_project' : 'root_required',
          validation.error,
          validation.status,
        )
        return c.json(error.body, error.status)
      }

      const content = await fs.readFile(validation.target, 'utf-8')
      const maxChars = Math.max(
        1,
        Math.min(numberParam(params, 'maxChars') ?? 20000, 100000),
      )
      return c.json({
        ok: true,
        result: {
          path: validation.target,
          content: content.slice(0, maxChars),
          truncated: content.length > maxChars,
        },
      })
    }

    if (method === 'code-editor.files.list') {
      const dirPath = stringParam(params, 'path')
      if (!dirPath) {
        const error = rpcError('path_required', 'path is required')
        return c.json(error.body, error.status)
      }

      const config = await readJson<ProjectConfig>(
        getConfigPath(workspaceId),
        DEFAULT_CONFIG,
      )
      const root = stringParam(params, 'root') ?? config.rootPath ?? dirPath
      const rootValidation = validatePathWithinRoot(
        config.rootPath ?? root,
        root,
      )
      if ('error' in rootValidation) {
        const error = rpcError(
          rootValidation.status === 403
            ? 'path_outside_project'
            : 'root_required',
          rootValidation.error,
          rootValidation.status,
        )
        return c.json(error.body, error.status)
      }
      const pathValidation = validatePathWithinRoot(
        rootValidation.target,
        dirPath,
      )
      if ('error' in pathValidation) {
        const error = rpcError(
          pathValidation.status === 403
            ? 'path_outside_project'
            : 'root_required',
          pathValidation.error,
          pathValidation.status,
        )
        return c.json(error.body, error.status)
      }

      const gitignore = await getGitignore(rootValidation.target)
      const entries = await fs.readdir(pathValidation.target, {
        withFileTypes: true,
      })
      const includeHidden = booleanParam(params, 'includeHidden') ?? true
      const files = entries
        .filter((entry) => includeHidden || !entry.name.startsWith('.'))
        .filter((entry) => entry.name !== '.DS_Store')
        .map((entry) => {
          const fullPath = path.join(pathValidation.target, entry.name)
          const relativePath = path.relative(rootValidation.target, fullPath)
          const matchPath = entry.isDirectory()
            ? `${relativePath}/`
            : relativePath
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            isDimmed: gitignore?.ignores(matchPath) ?? false,
          }
        })
      return c.json({ ok: true, result: files })
    }

    if (method === 'code-editor.ui.describe') {
      uiDescribeParamsSchema.parse(params)
      return c.json({ ok: true, result: { views: UI_VIEWS } })
    }

    if (method === 'code-editor.ui.navigate') {
      const navigation = uiNavigateParamsSchema.parse(params)
      const { view } = navigation

      if (view === 'projects') {
        const intent = await setUiIntent({ view }, workspaceId)
        return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
      }

      const config = await readJson<ProjectConfig>(
        getConfigPath(workspaceId),
        DEFAULT_CONFIG,
      )

      if (view === 'editor') {
        const viewParams = navigation.params ?? {}
        const projectPathRaw = viewParams.projectPath
        if (
          projectPathRaw !== undefined &&
          typeof projectPathRaw !== 'string'
        ) {
          const error = rpcError(
            'invalid_params',
            'params.projectPath must be a string when provided.',
          )
          return c.json(error.body, error.status)
        }
        const projectPath = projectPathRaw ?? config.rootPath
        if (!projectPath) {
          const error = rpcError(
            'no_project_open',
            'No project is open. Pass params.projectPath or open a project first.',
            404,
          )
          return c.json(error.body, error.status)
        }
        const stats = await fs.stat(projectPath).catch(() => null)
        if (!stats?.isDirectory()) {
          const error = rpcError(
            'project_not_found',
            `${projectPath} is not an existing folder.`,
            404,
          )
          return c.json(error.body, error.status)
        }
        const intent = await setUiIntent(
          { view, params: { projectPath } },
          workspaceId,
        )
        return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
      }

      // view === 'file'
      const entityId = navigation.entityId
      if (!entityId) {
        const error = rpcError(
          'entity_id_required',
          'entityId (the absolute file path inside the project root) is required for the file view.',
        )
        return c.json(error.body, error.status)
      }
      const resolved = await resolveOpenFileIntent(
        entityId,
        config,
        workspaceId,
      )
      if ('error' in resolved) {
        return c.json(resolved.error.body, resolved.error.status)
      }
      return c.json({
        ok: true,
        result: { ok: true, intentId: resolved.intent.id },
      })
    }

    if (method === 'code-editor.ui.openFile') {
      const { path: filePath } = uiOpenFileParamsSchema.parse(params)
      const config = await readJson<ProjectConfig>(
        getConfigPath(workspaceId),
        DEFAULT_CONFIG,
      )
      const resolved = await resolveOpenFileIntent(
        filePath,
        config,
        workspaceId,
      )
      if ('error' in resolved) {
        return c.json(resolved.error.body, resolved.error.status)
      }
      return c.json({
        ok: true,
        result: {
          ok: true,
          intentId: resolved.intent.id,
          path: resolved.intent.entityId,
        },
      })
    }

    if (method === 'code-editor.ui.read') {
      const { view, entityId } = uiReadParamsSchema.parse(params)
      const nativeProjection = booleanParam(params, 'nativeProjection') === true
      const config = await readJson<ProjectConfig>(
        getConfigPath(workspaceId),
        DEFAULT_CONFIG,
      )

      if (view === 'projects' || (!view && !entityId && !config.rootPath)) {
        const recentProjects = config.recentProjects
          .slice(0, 24)
          .map((project) => {
            const opened = new Date(project.lastOpened)
            const lastOpened = Number.isNaN(opened.getTime())
              ? ''
              : opened.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
            return nativeProjection
              ? {
                  id: nativeProjectId(project.path),
                  name: project.name,
                  lastOpened,
                }
              : {
                  ...project,
                  lastOpened,
                }
          })
        return c.json({
          ok: true,
          result: {
            view: 'projects',
            ...(nativeProjection ? {} : { rootPath: null }),
            recentProjects,
            emptyStates:
              recentProjects.length === 0
                ? [
                    {
                      title: 'No recent projects',
                      description:
                        'Open a project in Code on Mac and it will appear here.',
                    },
                  ]
                : [],
          },
        })
      }

      if (!config.rootPath) {
        const error = rpcError(
          'no_project_open',
          'No project is open, so there is no editor content to read.',
          404,
        )
        return c.json(error.body, error.status)
      }

      const tabs = config.projectTabs[config.rootPath] ?? {
        openFiles: [],
        activeFile: null,
      }
      const targetPath = entityId ?? tabs.activeFile

      let file: UiReadFile | null = null
      if (targetPath) {
        const validation = validatePathWithinRoot(config.rootPath, targetPath)
        if ('error' in validation) {
          const error = rpcError(
            validation.status === 403
              ? 'path_outside_project'
              : 'root_required',
            validation.error,
            validation.status,
          )
          return c.json(error.body, error.status)
        }
        const [realRoot, realTarget] = await Promise.all([
          fs.realpath(validation.root).catch(() => null),
          fs.realpath(validation.target).catch(() => null),
        ])
        if (
          !realRoot ||
          !realTarget ||
          !isPathWithinRoot(realRoot, realTarget)
        ) {
          const error = rpcError(
            'path_outside_project',
            'Path does not exist or resolves outside the current project.',
            403,
          )
          return c.json(error.body, error.status)
        }
        file = await readFileForUiRead(realTarget)
        if (!file && entityId) {
          const error = rpcError(
            'file_not_found',
            `${realTarget} does not exist in the current project.`,
            404,
          )
          return c.json(error.body, error.status)
        }
      }

      return c.json({
        ok: true,
        result: {
          view: file ? 'file' : 'editor',
          project: {
            rootPath: config.rootPath,
            name: path.basename(config.rootPath),
            previewUrl: config.previewUrl,
          },
          openFiles: tabs.openFiles,
          activeFile: tabs.activeFile,
          file,
        },
      })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Code does not expose ${method}.`,
        },
      },
      404,
    )
  } catch (error) {
    if (isZodError(error)) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Code received invalid drive method parameters.',
            issues: error.issues,
          },
        },
        400,
      )
    }
    console.error('Code RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'code_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Code could not complete the request.',
        },
      },
      500,
    )
  }
})

app.post('/api/moldable/today/dismiss', async (c) => {
  const body = (await c.req.json().catch(() => null)) as unknown
  if (!isMoldableTodayDismissalRequest(body)) {
    return c.json({ error: 'Invalid Today dismissal payload.' }, 400)
  }

  const dismissals = await recordMoldableTodayDismissal(c.req.raw, {
    id: body.id,
    dismissalKey: body.dismissalKey,
    materialDismissalKey: body.materialDismissalKey,
    dismissedAt: body.dismissedAt ?? new Date().toISOString(),
    item: body.item,
  })

  return c.json({ ok: true, dismissals: dismissals.length })
})

type MoldableTodayItem = {
  id?: unknown
  kind?: unknown
  title?: unknown
  subtitle?: unknown
  groupHint?: unknown
}

type MoldableTodayDismissal = {
  id: string
  dismissalKey?: string
  materialDismissalKey?: string
  dismissedAt: string
  item?: {
    kind?: string
    title?: string
    subtitle?: string
    groupHint?: string
  }
}

function isMoldableTodayResponse(value: unknown): value is {
  items: MoldableTodayItem[]
  [key: string]: unknown
} {
  return isMoldableTodayRecord(value) && Array.isArray(value.items)
}

function isMoldableTodayDismissalRequest(
  value: unknown,
): value is MoldableTodayDismissal {
  if (!isMoldableTodayRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    optionalMoldableTodayString(value.dismissalKey) &&
    optionalMoldableTodayString(value.materialDismissalKey) &&
    optionalMoldableTodayString(value.dismissedAt) &&
    (value.item === undefined || isMoldableTodayDismissalItem(value.item))
  )
}

function isMoldableTodayDismissalItem(value: unknown): value is {
  kind?: string
  title?: string
  subtitle?: string
  groupHint?: string
} {
  if (!isMoldableTodayRecord(value)) return false
  return (
    optionalMoldableTodayString(value.kind) &&
    optionalMoldableTodayString(value.title) &&
    optionalMoldableTodayString(value.subtitle) &&
    optionalMoldableTodayString(value.groupHint)
  )
}

function optionalMoldableTodayString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isMoldableTodayRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function recordMoldableTodayDismissal(
  request: Request,
  dismissal: MoldableTodayDismissal,
): Promise<MoldableTodayDismissal[]> {
  const current = await readMoldableTodayDismissals(request)
  const key = dismissal.dismissalKey ?? dismissal.id
  const next = [
    ...current.filter((entry) => (entry.dismissalKey ?? entry.id) !== key),
    dismissal,
  ].sort((a, b) => a.id.localeCompare(b.id))
  await writeMoldableTodayDismissals(request, next)
  return next
}

async function readMoldableTodayDismissals(
  request: Request,
): Promise<MoldableTodayDismissal[]> {
  const filePath = await moldableTodayDismissalsPath(request)
  const { readFile } = await import('node:fs/promises')
  try {
    const data = JSON.parse(await readFile(filePath, 'utf8')) as unknown
    return Array.isArray(data)
      ? data.filter(isMoldableTodayDismissalRequest)
      : []
  } catch (error) {
    if (isNodeFileNotFound(error)) return []
    throw error
  }
}

async function writeMoldableTodayDismissals(
  request: Request,
  dismissals: MoldableTodayDismissal[],
): Promise<void> {
  const filePath = await moldableTodayDismissalsPath(request)
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = path.join(
    path.dirname(filePath),
    '.' +
      path.basename(filePath) +
      '.' +
      process.pid +
      '.' +
      Date.now() +
      '.tmp',
  )
  await fs.writeFile(tempPath, JSON.stringify(dismissals, null, 2), 'utf8')
  await fs.rename(tempPath, filePath)
}

async function moldableTodayDismissalsPath(request: Request): Promise<string> {
  const path = await import('node:path')
  return path.join(moldableTodayDataDir(request), 'today-dismissals.json')
}

function moldableTodayDataDir(request: Request): string {
  const workspaceId =
    request.headers.get('x-moldable-workspace') ??
    request.headers.get('x-moldable-workspace-id') ??
    process.env.MOLDABLE_WORKSPACE_ID ??
    'personal'
  const appId = process.env.MOLDABLE_APP_ID

  if (appId) {
    const home =
      process.env.MOLDABLE_HOME ??
      (process.env.HOME ?? process.cwd()) + '/.moldable'
    return home + '/workspaces/' + workspaceId + '/apps/' + appId + '/data'
  }

  return process.env.MOLDABLE_APP_DATA_DIR ?? process.cwd() + '/data'
}

function filterMoldableTodayDismissedItems<T extends MoldableTodayItem>(
  items: T[],
  dismissals: MoldableTodayDismissal[],
): T[] {
  if (dismissals.length === 0) return items
  const dismissedIds = new Set(dismissals.map((entry) => entry.id))
  const dismissedMaterialKeys = new Set(
    dismissals
      .map((entry) => entry.materialDismissalKey)
      .filter((key): key is string => Boolean(key)),
  )

  return items.filter((item) => {
    if (typeof item.id === 'string' && dismissedIds.has(item.id)) return false
    return !dismissedMaterialKeys.has(moldableTodayMaterialKey(item))
  })
}

function moldableTodayMaterialKey(item: MoldableTodayItem): string {
  return [
    'material',
    process.env.MOLDABLE_APP_ID ?? '',
    typeof item.kind === 'string' ? item.kind : '',
    'text',
    normalizeMoldableTodayText(item.title),
    normalizeMoldableTodayText(item.subtitle),
    typeof item.groupHint === 'string' ? item.groupHint : '',
    '',
  ].join('\u001e')
}

function normalizeMoldableTodayText(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLowerCase()
    : ''
}

function isNodeFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}
