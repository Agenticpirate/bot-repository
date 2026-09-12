import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  sanitizeId,
  writeJson,
} from '@moldable-ai/storage'
import {
  addFileToGitignore,
  addRepo,
  assignRepoToSection,
  checkoutBranch,
  commitAllFiles,
  commitFiles,
  createBranchFromBaseIfNeeded,
  createPullRequestDraft,
  createRepoSection,
  deleteRepoSection,
  discardChanges,
  getCommitDiff,
  getCommitFiles,
  getDetectedEditors,
  getDiff,
  getDiffForFiles,
  getEditorIconPngPath,
  getHistory,
  getImagePreview,
  getPullRequestContext,
  getRecentRepos,
  getRepoPreferredCommitAction,
  getRepoSections,
  getStatus,
  getUnorganizedRepoSort,
  openFileInEditor,
  pushCommits,
  removeRepo,
  resolveKnownRepoPath,
  sanitizeBranchName,
  setPreferredCommitAction,
  setPreferredEditor,
  undoUnpushedCommit,
  updateRepoSection,
  updateUnorganizedRepoSort,
} from '../lib/git/server'
import { generateAppJson } from '../lib/llm/generate-json.server'
import { readFile, stat } from 'fs/promises'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createHash, randomUUID } from 'node:crypto'
import path from 'path'
import { z } from 'zod'

const MAX_COMMIT_DIFF_CHARS = 60000
const MAX_REVIEW_DIFF_CHARS = 120000
const MAX_PR_DIFF_CHARS = 100000
const MAX_UI_DIFF_CHARS = 350000
const DEFAULT_HISTORY_LIMIT = 50
const MAX_HISTORY_LIMIT = 100

function createUiDiffResponse(diff: string) {
  if (diff.length <= MAX_UI_DIFF_CHARS) {
    return { diff, truncated: false, originalLength: diff.length }
  }

  return {
    diff: `${diff.slice(
      0,
      MAX_UI_DIFF_CHARS,
    )}\n\n[Diff preview truncated by Git Flow after ${MAX_UI_DIFF_CHARS.toLocaleString()} characters.]`,
    truncated: true,
    originalLength: diff.length,
  }
}

function truncateDiff(diff: string, maxChars = MAX_COMMIT_DIFF_CHARS) {
  if (diff.length <= maxChars) return diff

  return `${diff.slice(0, maxChars)}\n\n[Diff truncated by Git Flow after ${maxChars} characters.]`
}

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

type CommitMessageJson = {
  summary?: unknown
  description?: unknown
}

type CodeReviewJson = {
  summary?: unknown
  findings?: unknown
}

type PullRequestJson = {
  title?: unknown
  body?: unknown
}

type BranchNameJson = {
  branchName?: unknown
}

type GitPostBody = {
  action?: string
  branch?: string
  paths?: string[]
  summary?: string
  description?: string
  hash?: string
  path?: string
  editorId?: string
  preferredCommitAction?: 'commit' | 'commit-and-push' | 'commit-and-open-pr'
  repoPath?: string
  sectionId?: string | null
  sectionName?: string
  collapsed?: boolean
  sortMode?: 'name' | 'changes'
}

type GitEditorsResponse = {
  editors: Awaited<ReturnType<typeof getDetectedEditors>>
  preferredEditorId?: string
  preferredCommitAction?: 'commit' | 'commit-and-push' | 'commit-and-open-pr'
}

type RpcRequest = {
  method?: unknown
  params?: unknown
}

type RpcParams = Record<string, unknown>
type RpcStatus = 400 | 404 | 500

const GIT_UI_VIEWS = [
  'repositories',
  'repository',
  'changes',
  'history',
] as const
type GitUiView = (typeof GIT_UI_VIEWS)[number]
type GitUiIntent = {
  id: string
  view: GitUiView
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}

const uiDescribeParamsSchema = z.object({})
const uiNavigateParamsSchema = z.object({
  view: z.enum(GIT_UI_VIEWS),
  entityId: z.string().trim().min(1).max(4096).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
})
const uiShowRepoParamsSchema = z.object({
  repoId: z.string().trim().min(1).max(4096).optional(),
})
const uiReadParamsSchema = z.object({
  view: z.enum(GIT_UI_VIEWS).optional(),
  entityId: z.string().trim().min(1).max(4096).optional(),
  nativeProjection: z.boolean().optional(),
})
const commitParamsSchema = z
  .object({
    repoPath: z.string().trim().min(1).max(4096),
    paths: z.array(z.string().trim().min(1).max(4096)).min(1).optional(),
    summary: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(20_000).optional(),
    message: z.string().trim().min(1).max(20_200).optional(),
  })
  .strict()

const GIT_UI_DESCRIPTIONS = [
  {
    id: 'repositories',
    name: 'Repository list',
    description:
      'The home screen listing repositories already tracked by Git. Takes no entityId.',
  },
  {
    id: 'repository',
    name: 'Repository detail',
    description:
      'Open one tracked repository detail screen. entityId is its repository path from git-flow.repos.list.',
  },
  {
    id: 'changes',
    name: 'Changed files',
    description:
      'Open a tracked repository on its changed-files tab. entityId is its repository path.',
  },
  {
    id: 'history',
    name: 'Commit history',
    description:
      'Open a tracked repository on its commit-history tab. entityId is its repository path.',
  },
] satisfies Array<{ id: GitUiView; name: string; description: string }>

function uiIntentPath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), 'ui-intent.json')
}

async function readUiIntent(workspaceId?: string): Promise<GitUiIntent | null> {
  return readJson<GitUiIntent | null>(uiIntentPath(workspaceId), null)
}

async function setUiIntent(
  workspaceId: string | undefined,
  target: Omit<GitUiIntent, 'id' | 'createdAt'>,
) {
  const intent: GitUiIntent = {
    ...target,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  }
  await writeJson(uiIntentPath(workspaceId), intent)
  return intent
}

const commitMessageSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'description'],
  properties: {
    summary: {
      type: 'string',
      description: 'Conventional Commit summary, <= 72 chars.',
    },
    description: {
      type: 'string',
      description: 'Optional commit body. Use an empty string if not needed.',
    },
  },
}

const codeReviewSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'findings'],
  properties: {
    summary: {
      type: 'string',
      description: 'One sentence overall assessment.',
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'file', 'title', 'details', 'suggestion'],
        properties: {
          severity: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
          },
          file: {
            type: 'string',
            description: 'Path from the reviewed diff.',
          },
          title: {
            type: 'string',
            description: 'Short issue title.',
          },
          details: {
            type: 'string',
            description: 'Why this is a problem and when it happens.',
          },
          suggestion: {
            type: 'string',
            description: 'Specific fix.',
          },
        },
      },
    },
  },
}

const branchNameSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['branchName'],
  properties: {
    branchName: {
      type: 'string',
      description:
        'Short git branch name in kebab-case, optionally with a type prefix like feat/, fix/, chore/.',
    },
  },
}

const pullRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'body'],
  properties: {
    title: {
      type: 'string',
      description: 'Concise GitHub pull request title, <= 80 chars.',
    },
    body: {
      type: 'string',
      description:
        'Markdown pull request body with summary, key changes, and testing notes.',
    },
  },
}

export const app = new Hono()

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
app.use('/api/*', cors())

function normalizeWorkspaceId(
  value: string | null | undefined,
): string | undefined {
  if (!value) return undefined
  try {
    return sanitizeId(value)
  } catch {
    return undefined
  }
}

function getRequestWorkspaceId(request: Request): string | undefined {
  return normalizeWorkspaceId(
    getWorkspaceFromRequest(request) ??
      request.headers.get('x-moldable-workspace-id'),
  )
}

function getRpcWorkspaceId(request: Request): string | undefined {
  return getRequestWorkspaceId(request)
}

function asParams(value: unknown): RpcParams {
  return value && typeof value === 'object' ? (value as RpcParams) : {}
}

function stringParam(params: RpcParams, key: string): string | undefined {
  const value = params[key]
  return typeof value === 'string' ? value : undefined
}

const NATIVE_REPO_ID_PREFIX = 'git-repo-'

function nativeRepoId(repoPath: string): string {
  return `${NATIVE_REPO_ID_PREFIX}${createHash('sha256')
    .update(path.resolve(repoPath))
    .digest('hex')
    .slice(0, 24)}`
}

async function resolveRepoReference(
  reference: string | undefined,
  workspaceId: string | undefined,
): Promise<string | undefined> {
  if (!reference?.startsWith(NATIVE_REPO_ID_PREFIX)) {
    return resolveKnownRepoPath(reference, workspaceId)
  }
  const repository = (await getRecentRepos(workspaceId)).find(
    (candidate) => nativeRepoId(candidate.path) === reference,
  )
  if (!repository) {
    throw new Error('Repository must be opened in Git before using it here.')
  }
  return resolveKnownRepoPath(repository.path, workspaceId)
}

function stringArrayParam(params: RpcParams, key: string): string[] {
  const value = params[key]
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function numberParam(params: RpcParams, key: string): number | undefined {
  const value = params[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
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

app.get('/api/moldable/commands', async (c) => {
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const repos = await getRecentRepos(workspaceId)

  return c.json({
    commands: repos.map((repo) => ({
      id: `switch-repository:${encodeURIComponent(repo.path)}`,
      label: repo.name,
      description: repo.path,
      icon: 'folder',
      indicator: repo.isDirty
        ? {
            type: 'dot',
            label: 'Has uncommitted changes',
            color: 'var(--primary)',
          }
        : undefined,
      group: 'Repositories',
      action: {
        type: 'message',
        command: 'switch-repository',
        payload: { repoPath: repo.path },
      },
    })),
  })
})

async function generateCommitMessage(
  paths: string[],
  workspaceId?: string,
  repoPath?: string,
) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error('At least one selected file is required.')
  }

  const [status, diff] = await Promise.all([
    getStatus(repoPath, workspaceId),
    getDiffForFiles(paths, workspaceId, repoPath),
  ])

  if (!diff.trim()) {
    throw new Error('No selected file diff found to summarize.')
  }

  const prompt = `Repository: ${status.repoName}
Branch: ${status.currentBranch}
Selected files:
${paths.map((filePath) => `- ${filePath}`).join('\n')}

Diff:
${truncateDiff(diff)}`

  const generated = await generateAppJson<CommitMessageJson>({
    workspaceId,
    purpose: 'git-flow.commit-message',
    schema: commitMessageSchema,
    schemaName: 'commit_message',
    schemaDescription: 'A Conventional Commit summary and optional body.',
    maxOutputTokens: 700,
    system: `You write concise Conventional Commit messages.

Summary rules:
- Use exactly one of these types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- Include a short lowercase scope when it is obvious, for example "feat(git): generate commit messages".
- Use "feat" for user-visible features and "fix" for bug fixes.
- Use imperative mood after the colon.
- Do not end the summary with a period.
- Use an empty string for description if a commit body is not needed.

Use only the selected changed files and diff provided by the user.`,
    prompt,
  })
  const summary =
    typeof generated?.summary === 'string' ? generated.summary.trim() : ''
  const description =
    typeof generated?.description === 'string'
      ? generated.description.trim()
      : ''

  if (!summary) {
    throw new Error('AI response did not include a commit summary.')
  }

  return { summary, description }
}

type CommitChangesInput = {
  repoPath?: string
  paths?: string[]
  summary?: string
  description?: string
  message?: string
  mode: 'selected' | 'all'
  push?: boolean
}

// Shared by the UI action route and broker RPC so staging, hooks, commit-message
// generation, push checks, and result reporting cannot drift between callers.
async function commitChanges(input: CommitChangesInput, workspaceId?: string) {
  const requestedRepoPath = await resolveKnownRepoPath(
    input.repoPath,
    workspaceId,
  )
  const status = await getStatus(requestedRepoPath, workspaceId)
  const repoPath = status.repoPath
  if (!repoPath) {
    throw new Error('A tracked repository path is required.')
  }

  const currentPaths = status.files.map((file) => file.path)
  if (currentPaths.length === 0) {
    throw new Error(`${status.repoName} has no uncommitted changes.`)
  }

  const paths =
    input.mode === 'all' ? currentPaths : [...new Set(input.paths ?? [])]
  if (paths.length === 0) {
    throw new Error('At least one selected file is required.')
  }

  const message =
    input.message !== undefined
      ? splitCommitMessage(input.message)
      : input.summary !== undefined
        ? {
            summary: input.summary,
            description: input.description ?? '',
          }
        : await generateCommitMessage(paths, workspaceId, repoPath)

  const commit = await (input.mode === 'all' ? commitAllFiles : commitFiles)(
    paths,
    message.summary,
    message.description,
    workspaceId,
    repoPath,
  )
  const push = input.push ? await pushCommits(workspaceId, repoPath) : undefined
  const finalStatus = await getStatus(repoPath, workspaceId)

  if (input.push && finalStatus.files.length > 0) {
    throw new Error(
      `${status.repoName} pushed, but ${finalStatus.files.length} uncommitted change${
        finalStatus.files.length === 1 ? '' : 's'
      } remain. Review the repo and run Commit & push again.`,
    )
  }

  return {
    success: true,
    commit: commit.commit,
    push,
    repoPath,
    repoName: status.repoName,
    branch: status.currentBranch,
    summary: message.summary,
    description: message.description,
    paths,
    fileCount: paths.length,
    remainingCount: finalStatus.files.length,
    remainingPaths: finalStatus.files.map((file) => file.path),
  }
}

function splitCommitMessage(message: string) {
  const [summaryLine = '', ...bodyLines] = message.trim().split('\n')
  const summary = summaryLine.trim().slice(0, 200)
  if (!summary) throw new Error('Commit message summary is required.')
  return {
    summary,
    description: bodyLines.join('\n').trim().slice(0, 20_000),
  }
}

async function reviewCode(
  paths: string[],
  workspaceId?: string,
  repoPath?: string,
) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error('At least one selected file is required.')
  }

  const [status, diff] = await Promise.all([
    getStatus(repoPath, workspaceId),
    getDiffForFiles(paths, workspaceId, repoPath),
  ])

  if (!diff.trim()) {
    throw new Error('No selected file diff found to review.')
  }

  const prompt = `Repository: ${status.repoName}
Branch: ${status.currentBranch}
Selected files:
${paths.map((filePath) => `- ${filePath}`).join('\n')}

Diff:
${truncateDiff(diff, MAX_REVIEW_DIFF_CHARS)}`

  const review = await generateAppJson<CodeReviewJson>({
    workspaceId,
    purpose: 'git.code-review',
    schema: codeReviewSchema,
    schemaName: 'code_review',
    schemaDescription:
      'An actionable code review of selected changes, with findings.',
    maxOutputTokens: 1800,
    system: `You are a senior code reviewer.

Review only the selected changed files and diff provided by the user. Focus on concrete correctness, security, data loss, race conditions, type safety, regressions, and missing tests. Do not comment on style unless it creates a real maintenance or correctness risk.

If there are no actionable issues, return an empty findings array.`,
    prompt,
  })
  const summary =
    typeof review?.summary === 'string' ? review.summary.trim() : ''
  const findings = Array.isArray(review?.findings) ? review.findings : []

  return {
    summary: summary || 'Review complete.',
    findings,
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)),
        timeoutMs,
      )
    }),
  ])
}

function createFallbackPullRequestBody(
  context: Awaited<ReturnType<typeof getPullRequestContext>>,
) {
  const commitList = context.commits
    .map((commit) => `- ${commit.message} (${commit.hash.slice(0, 7)})`)
    .join('\n')

  return [
    '## Summary',
    commitList || '- Updates this branch.',
    '',
    '## Changes',
    context.diffStat
      ? `\`\`\`text\n${context.diffStat}\n\`\`\``
      : '- See diff.',
    '',
    '## Testing',
    '- Commit hooks run automatically before commits.',
    '- CI will run automatically when the pull request is opened.',
  ].join('\n')
}

async function generateBranchName(input: {
  summary: string
  description?: string
  workspaceId?: string
}) {
  const fallback = sanitizeBranchName(input.summary || 'changes')
  const prefixedFallback = fallback.includes('/')
    ? fallback
    : `changes/${fallback}`
  const prompt = `Commit summary: ${input.summary}

Commit description:
${input.description || '(none)'}`

  try {
    const generated = await withTimeout(
      generateAppJson<BranchNameJson>({
        workspaceId: input.workspaceId,
        purpose: 'git.branch-name',
        schema: branchNameSchema,
        schemaName: 'branch_name',
        schemaDescription: 'A concise git branch name for a pull request.',
        maxOutputTokens: 100,
        timeoutMs: 4_000,
        system: `Generate a concise git branch name.

Rules:
- Use lowercase kebab-case.
- Prefer a prefix such as feat/, fix/, chore/, refactor/, docs/, test/, build/, or ci/.
- No spaces, punctuation other than / and -.
- Maximum 50 characters.
- Do not include ticket numbers unless present in the input.`,
        prompt,
      }),
      4_500,
      'Branch name generation',
    )
    const branchName =
      typeof generated?.branchName === 'string'
        ? sanitizeBranchName(generated.branchName)
        : prefixedFallback

    return branchName || prefixedFallback
  } catch (error) {
    console.warn('Falling back to deterministic branch name:', error)
    return prefixedFallback
  }
}

async function commitAndOpenPullRequest(input: {
  paths: string[]
  summary: string
  description: string
  workspaceId?: string
  repoPath?: string
  commitMode?: 'selected' | 'all'
}) {
  console.info('[git-flow] Commit & open PR: starting')
  const branchName = await generateBranchName({
    summary: input.summary,
    description: input.description,
    workspaceId: input.workspaceId,
  })
  console.info(`[git-flow] Commit & open PR: branch candidate ${branchName}`)
  const branch = await createBranchFromBaseIfNeeded(
    branchName,
    input.workspaceId,
    input.repoPath,
  )
  console.info(
    `[git-flow] Commit & open PR: branch ready ${branch.branchName}${
      branch.created ? ' (created)' : ''
    }`,
  )

  const commit = await (
    input.commitMode === 'all' ? commitAllFiles : commitFiles
  )(
    input.paths,
    input.summary,
    input.description,
    input.workspaceId,
    input.repoPath,
  )
  console.info(`[git-flow] Commit & open PR: committed ${commit.commit}`)
  await pushCommits(input.workspaceId, input.repoPath)
  console.info('[git-flow] Commit & open PR: pushed')

  if (branch.existingPullRequest?.url) {
    return {
      commit,
      draft: {
        title: branch.existingPullRequest.title ?? 'Pull request',
        body: '',
        url: branch.existingPullRequest.url,
        baseBranch:
          branch.existingPullRequest.baseBranch ?? branch.baseBranch ?? '',
        headBranch: branch.existingPullRequest.headBranch ?? branch.branchName,
      },
      branch,
      existing: true,
    }
  }

  const draft = await generatePullRequestDraft(
    input.workspaceId,
    input.repoPath,
  )
  console.info('[git-flow] Commit & open PR: draft ready')

  return {
    commit,
    draft,
    branch,
    existing: false,
  }
}

type QuickShipResult = {
  ok: true
  repoPath: string
  repoName: string
  action: 'commit' | 'commit-and-push' | 'commit-and-open-pr'
  summary: string
  fileCount: number
  pushed?: boolean
  pullRequestUrl?: string
}

// One-click "ship": stage every change in a repo, write the commit message with
// AI, then run the repo's own default action (commit / push / open PR). Used by
// the home dashboard's per-row quick action and the "ship all" batch.
async function quickShipRepo(
  repoPath: string,
  workspaceId?: string,
): Promise<QuickShipResult> {
  if (!repoPath) {
    throw new Error('A repository path is required.')
  }

  const knownRepoPath = await resolveKnownRepoPath(repoPath, workspaceId)
  if (!knownRepoPath) {
    throw new Error('A repository path is required.')
  }

  const status = await getStatus(knownRepoPath, workspaceId)
  const repoName =
    status.repoName || knownRepoPath.split('/').pop() || knownRepoPath
  const startingAhead = status.ahead ?? 0

  if (status.files.length === 0) {
    throw new Error(`${repoName} has no uncommitted changes.`)
  }

  const paths = status.files.map((file) => file.path)
  const action = await getRepoPreferredCommitAction(knownRepoPath, workspaceId)
  console.info(
    `[git-flow] Quick ship: ${repoName} starting with ${paths.length} dirty file${
      paths.length === 1 ? '' : 's'
    }, ${startingAhead} unpushed commit${startingAhead === 1 ? '' : 's'}, action=${action}`,
  )
  const { summary, description } = await generateCommitMessage(
    paths,
    workspaceId,
    knownRepoPath,
  )

  if (action === 'commit-and-open-pr') {
    const result = await commitAndOpenPullRequest({
      paths,
      summary,
      description,
      workspaceId,
      repoPath: knownRepoPath,
      commitMode: 'all',
    })
    return {
      ok: true,
      repoPath: knownRepoPath,
      repoName,
      action,
      summary,
      fileCount: paths.length,
      pushed: true,
      pullRequestUrl: result.draft.url,
    }
  }

  const commit = await commitAllFiles(
    paths,
    summary,
    description,
    workspaceId,
    knownRepoPath,
  )
  console.info(`[git-flow] Quick ship: ${repoName} committed ${commit.commit}`)

  if (action === 'commit-and-push') {
    await pushCommits(workspaceId, knownRepoPath)
    console.info(`[git-flow] Quick ship: ${repoName} pushed`)
    const finalStatus = await getStatus(knownRepoPath, workspaceId)
    const remainingCount = finalStatus.files.length
    if (remainingCount > 0) {
      const message = `${repoName} pushed, but ${remainingCount} uncommitted change${
        remainingCount === 1 ? '' : 's'
      } remain. Review the repo and run Commit & push again.`
      console.warn(`[git-flow] Quick ship: ${message}`)
      throw new Error(message)
    }
    return {
      ok: true,
      repoPath: knownRepoPath,
      repoName,
      action,
      summary,
      fileCount: paths.length,
      pushed: true,
    }
  }

  return {
    ok: true,
    repoPath: knownRepoPath,
    repoName,
    action,
    summary,
    fileCount: paths.length,
    pushed: false,
  }
}

async function generatePullRequestDraft(
  workspaceId?: string,
  repoPath?: string,
) {
  const context = await getPullRequestContext(workspaceId, repoPath)
  const prompt = `Repository: ${context.owner}/${context.repo}
Base branch: ${context.baseBranch}
Head branch: ${context.headBranch}

Commits:
${context.commits
  .map((commit) => {
    const body = commit.body ? `\n${commit.body}` : ''
    return `- ${commit.hash.slice(0, 12)} ${commit.message}${body}`
  })
  .join('\n')}

Diff stat:
${context.diffStat || '(none)'}

Diff:
${truncateDiff(context.diff, MAX_PR_DIFF_CHARS)}`

  try {
    const generated = await withTimeout(
      generateAppJson<PullRequestJson>({
        workspaceId,
        purpose: 'git.pull-request',
        schema: pullRequestSchema,
        schemaName: 'pull_request',
        schemaDescription: 'A GitHub pull request title and markdown body.',
        maxOutputTokens: 1800,
        timeoutMs: 18_000,
        system: `You write clear, review-ready GitHub pull request descriptions.

Rules:
- Title: concise, imperative or noun phrase, <= 80 chars.
- Body: Markdown with these headings exactly: ## Summary, ## Changes, ## Testing.
- Summary should explain user-visible intent in 1-3 bullets.
- Changes should group the most important implementation changes.
- Testing should not say "Not run" or "Not run (not requested)".
- Testing should mention that commit hooks run automatically before commits and CI runs automatically on pull requests.
- If specific test files, commands, or CI config are evident in the diff, mention them as additional context without inventing results.
- Do not invent issue numbers, reviewers, deployment notes, screenshots, or manual test results that are not present.`,
        prompt,
      }),
      20_000,
      'Pull request generation',
    )
    const title =
      typeof generated?.title === 'string' ? generated.title.trim() : ''
    const body =
      typeof generated?.body === 'string' ? generated.body.trim() : ''

    return createPullRequestDraft({
      context,
      title,
      body: body || createFallbackPullRequestBody(context),
    })
  } catch (error) {
    console.warn('Falling back to deterministic PR details:', error)
    return createPullRequestDraft({
      context,
      title: context.commits[0]?.message ?? `Merge ${context.headBranch}`,
      body: createFallbackPullRequestBody(context),
    })
  }
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null
  const url = process.env.MOLDABLE_APP_URL ?? process.env.PORTLESS_URL ?? null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'git-flow',
      port,
      url,
      ts: Date.now(),
    },
    200,
    {
      'Cache-Control': 'no-store',
    },
  )
})

// Most-recent edit time across a repo's changed files. Lets the resume rail
// sort by genuine recency. Bounded to one repo and best-effort.
async function getLastTouchedAt(
  repoPath: string,
  workspaceId?: string,
): Promise<string | undefined> {
  try {
    const status = await getStatus(repoPath, workspaceId)
    const mtimes = await Promise.all(
      status.files.slice(0, 50).map(async (file) => {
        try {
          const abs = path.join(repoPath, file.path)
          return (await stat(abs)).mtimeMs
        } catch {
          return 0
        }
      }),
    )
    const latest = Math.max(0, ...mtimes)
    return latest > 0 ? new Date(latest).toISOString() : undefined
  } catch {
    return undefined
  }
}

app.get('/api/moldable/today', async (c) => {
  let resume: unknown = null

  try {
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const repos = await getRecentRepos(workspaceId)

    const label = (name: string, branch: string) =>
      branch ? `${name} · ${branch}` : name
    const changes = (n: number) =>
      `${n} uncommitted change${n === 1 ? '' : 's'}`

    // Git Flow only contributes to "Pick up where you left off". Dirty and
    // unpushed repo nudges should not appear in Today's "Worth a look" list.
    const dirty = repos.filter((r) => r.isDirty && r.changedCount > 0)

    if (dirty.length > 0) {
      const [top] = dirty
      resume = {
        title: label(top.name, top.branch),
        subtitle: changes(top.changedCount),
        icon: '🌳',
        deepLink: top.path,
        lastTouchedAt: await getLastTouchedAt(top.path, workspaceId),
      }
    }
  } catch (error) {
    console.error('Git today endpoint failed:', error)
    return c.json({
      items: [],
      resume: null,
      generatedAt: new Date().toISOString(),
    })
  }

  return c.json({ items: [], resume, generatedAt: new Date().toISOString() })
})

app.get('/api/git', async (c) => {
  try {
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const filePath = c.req.query('file')
    const hash = c.req.query('hash')
    const files = c.req.query('files')
    const history = c.req.query('history')
    const image = c.req.query('image')
    const editors = c.req.query('editors')
    const editorIcon = c.req.query('editorIcon')
    const fileStatus = c.req.query('status')
    const repoPath = await resolveKnownRepoPath(
      c.req.query('repoPath'),
      workspaceId,
    )
    const offset = parseBoundedInteger(
      c.req.query('offset'),
      0,
      0,
      Number.MAX_SAFE_INTEGER,
    )
    const limit = parseBoundedInteger(
      c.req.query('limit'),
      DEFAULT_HISTORY_LIMIT,
      1,
      MAX_HISTORY_LIMIT,
    )

    if (editorIcon) {
      const pngPath = await getEditorIconPngPath(editorIcon, workspaceId)

      if (!pngPath) {
        return c.json({ error: 'Editor icon not found' }, 404)
      }

      const iconBuffer = await readFile(pngPath)
      return new Response(iconBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    if (editors !== undefined) {
      const detectedEditors = await getDetectedEditors(workspaceId)
      const settings = (await readJson<{
        preferredEditorId?: string
        preferredCommitAction?:
          | 'commit'
          | 'commit-and-push'
          | 'commit-and-open-pr'
      }>(safePath(getAppDataDir(workspaceId), 'settings.json'), {}).catch(
        () => ({}),
      )) as {
        preferredEditorId?: string
        preferredCommitAction?:
          | 'commit'
          | 'commit-and-push'
          | 'commit-and-open-pr'
      }

      return c.json({
        editors: detectedEditors,
        preferredEditorId:
          typeof settings?.preferredEditorId === 'string'
            ? settings.preferredEditorId
            : undefined,
        preferredCommitAction:
          settings?.preferredCommitAction === 'commit-and-open-pr'
            ? 'commit-and-open-pr'
            : settings?.preferredCommitAction === 'commit-and-push'
              ? 'commit-and-push'
              : 'commit',
      } satisfies GitEditorsResponse)
    }

    if (image !== undefined && filePath) {
      const preview = await getImagePreview(filePath, workspaceId, {
        hash,
        status: fileStatus,
        repoPath,
      })
      const body = preview.buffer.buffer.slice(
        preview.buffer.byteOffset,
        preview.buffer.byteOffset + preview.buffer.byteLength,
      ) as ArrayBuffer

      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': preview.mimeType,
          'Cache-Control': hash
            ? 'public, max-age=31536000, immutable'
            : 'no-store',
        },
      })
    }

    if (hash) {
      if (files !== undefined) {
        const commitFiles = await getCommitFiles(hash, repoPath, workspaceId)
        return c.json({ files: commitFiles })
      }

      const diff = await getCommitDiff(hash, repoPath, workspaceId, filePath)
      return c.json(createUiDiffResponse(diff))
    }

    if (filePath) {
      const diff = await getDiff(repoPath, filePath, workspaceId)
      return c.json(createUiDiffResponse(diff))
    }

    if (history !== undefined) {
      const log = await getHistory(repoPath, workspaceId, {
        offset,
        limit: limit + 1,
      })
      const hasMore = log.length > limit
      return c.json({
        history: log.slice(0, limit),
        hasMore,
        nextOffset: hasMore ? offset + limit : undefined,
      })
    }

    const [status, repos, repoSections, unorganizedRepoSort] =
      await Promise.all([
        getStatus(undefined, workspaceId),
        getRecentRepos(workspaceId),
        getRepoSections(workspaceId),
        getUnorganizedRepoSort(workspaceId),
      ])

    return c.json({
      ...status,
      recentRepos: repos,
      repoSections,
      unorganizedRepoSort,
    })
  } catch (error) {
    console.error('Git API error:', error)
    return c.json({ error: 'Failed to fetch git status' }, 500)
  }
})

app.post('/api/git', async (c) => {
  try {
    const workspaceId = getRequestWorkspaceId(c.req.raw)
    const body = await c.req.json<GitPostBody>()

    if (body.action === 'createRepoSection') {
      return c.json(
        await createRepoSection(body.sectionName ?? '', workspaceId),
      )
    }

    if (body.action === 'updateRepoSection') {
      if (!body.sectionId) {
        return c.json({ error: 'Repository section is required.' }, 400)
      }
      if (
        body.sectionName === undefined &&
        body.collapsed === undefined &&
        body.sortMode === undefined
      ) {
        return c.json({ error: 'A section update is required.' }, 400)
      }
      return c.json(
        await updateRepoSection(
          body.sectionId,
          {
            name: body.sectionName,
            collapsed: body.collapsed,
            sortMode: body.sortMode,
          },
          workspaceId,
        ),
      )
    }

    if (body.action === 'updateUnorganizedRepoSort') {
      if (body.sortMode === undefined) {
        return c.json({ error: 'A repository sort is required.' }, 400)
      }
      return c.json(await updateUnorganizedRepoSort(body.sortMode, workspaceId))
    }

    if (body.action === 'deleteRepoSection') {
      if (!body.sectionId) {
        return c.json({ error: 'Repository section is required.' }, 400)
      }
      return c.json(await deleteRepoSection(body.sectionId, workspaceId))
    }

    if (body.action === 'assignRepoSection') {
      if (!body.path) {
        return c.json({ error: 'Repository path is required.' }, 400)
      }
      if (body.sectionId === undefined) {
        return c.json(
          { error: 'Repository section assignment is required.' },
          400,
        )
      }
      return c.json(
        await assignRepoToSection(body.path, body.sectionId, workspaceId),
      )
    }

    if (body.action === 'commit') {
      const result = await commitChanges(
        {
          repoPath: body.repoPath,
          paths: body.paths,
          summary: body.summary ?? '',
          description: body.description ?? '',
          mode: 'selected',
        },
        workspaceId,
      )
      return c.json(result)
    }

    if (body.action === 'commitAndPush') {
      const result = await commitChanges(
        {
          repoPath: body.repoPath,
          paths: body.paths,
          summary: body.summary ?? '',
          description: body.description ?? '',
          mode: 'selected',
          push: true,
        },
        workspaceId,
      )
      return c.json(result)
    }

    if (body.action === 'generateCommitMessage') {
      const repoPath = await resolveKnownRepoPath(body.repoPath, workspaceId)
      const result = await generateCommitMessage(
        body.paths ?? [],
        workspaceId,
        repoPath,
      )
      return c.json(result)
    }

    if (body.action === 'reviewCode') {
      const repoPath = await resolveKnownRepoPath(body.repoPath, workspaceId)
      const result = await reviewCode(body.paths ?? [], workspaceId, repoPath)
      return c.json(result)
    }

    if (body.action === 'push') {
      const repoPath = await resolveKnownRepoPath(body.repoPath, workspaceId)
      const result = await pushCommits(workspaceId, repoPath)
      return c.json(result)
    }

    if (body.action === 'checkoutBranch') {
      const repoPath = await resolveKnownRepoPath(body.repoPath, workspaceId)
      const result = await checkoutBranch(
        body.branch ?? '',
        workspaceId,
        repoPath,
      )
      return c.json(result)
    }

    if (body.action === 'openPullRequest') {
      const repoPath = await resolveKnownRepoPath(body.repoPath, workspaceId)
      const result = await generatePullRequestDraft(workspaceId, repoPath)
      return c.json(result)
    }

    if (body.action === 'commitAndOpenPullRequest') {
      const repoPath = await resolveKnownRepoPath(body.repoPath, workspaceId)
      const result = await commitAndOpenPullRequest({
        paths: body.paths ?? [],
        summary: body.summary ?? '',
        description: body.description ?? '',
        workspaceId,
        repoPath,
      })
      return c.json(result)
    }

    if (body.action === 'undo') {
      const result = await undoUnpushedCommit(body.hash ?? '', workspaceId)
      return c.json(result)
    }

    if (body.action === 'openInEditor') {
      const result = await openFileInEditor(
        body.path ?? '',
        body.editorId,
        workspaceId,
      )
      return c.json(result)
    }

    if (body.action === 'discardChanges') {
      const result = await discardChanges(body.paths ?? [], workspaceId)
      return c.json(result)
    }

    if (body.action === 'addToGitignore') {
      const result = await addFileToGitignore(body.path ?? '', workspaceId)
      return c.json(result)
    }

    if (body.action === 'setPreferredEditor') {
      const result = await setPreferredEditor(body.editorId ?? '', workspaceId)
      return c.json(result)
    }

    if (body.action === 'setPreferredCommitAction') {
      const repoPath = await resolveKnownRepoPath(body.repoPath, workspaceId)
      const result = await setPreferredCommitAction(
        body.preferredCommitAction === 'commit-and-open-pr'
          ? 'commit-and-open-pr'
          : body.preferredCommitAction === 'commit-and-push'
            ? 'commit-and-push'
            : 'commit',
        workspaceId,
        repoPath,
      )
      return c.json(result)
    }

    if (body.action === 'quickShip') {
      const result = await quickShipRepo(body.repoPath ?? '', workspaceId)
      return c.json(result)
    }

    if (body.action === 'removeRepo') {
      if (!body.path) {
        return c.json({ error: 'Repository path is required.' }, 400)
      }
      return c.json(await removeRepo(body.path, workspaceId))
    }

    const status = await addRepo(body.path ?? '', workspaceId)
    const [diff, repos, repoSections] = await Promise.all([
      getDiff(body.path, undefined, workspaceId),
      getRecentRepos(workspaceId),
      getRepoSections(workspaceId),
    ])
    return c.json({ ...status, diff, recentRepos: repos, repoSections })
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Action failed',
      },
      400,
    )
  }
})

app.get('/api/moldable/ui-intent', async (c) => {
  return c.json(await readUiIntent(getRequestWorkspaceId(c.req.raw)), 200, {
    'Cache-Control': 'no-store',
  })
})

app.delete('/api/moldable/ui-intent', async (c) => {
  const id = c.req.query('id')
  if (!id) return c.json({ error: 'An intent id is required' }, 400)
  const workspaceId = getRequestWorkspaceId(c.req.raw)
  const current = await readUiIntent(workspaceId)
  const deleted = current?.id === id
  if (deleted) await writeJson(uiIntentPath(workspaceId), null)
  return c.json({ ok: true, deleted })
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = (await c.req.json()) as RpcRequest
    const method = typeof body.method === 'string' ? body.method : ''
    const params = asParams(body.params)
    const repoPath = await resolveRepoReference(
      stringParam(params, 'repoPath'),
      workspaceId,
    )

    if (!method) {
      const error = rpcError('invalid_request', 'method is required')
      return c.json(error.body, error.status)
    }

    if (
      method === 'git-flow.cards.present' ||
      method === 'git-flow.cards.read'
    ) {
      const input = z
        .object({
          repoPath: z.string().min(1).max(1024),
          filePath: z.string().min(1).max(1024).optional(),
          detail: z.boolean().optional(),
        })
        .strict()
        .parse(params)
      const status = await getStatus(repoPath, workspaceId)
      if (
        input.filePath &&
        (path.isAbsolute(input.filePath) ||
          input.filePath.split(/[\\/]/).includes('..'))
      )
        throw new Error('Choose a file inside this repository.')
      if (method === 'git-flow.cards.present')
        return c.json({
          ok: true,
          result: {
            appCard: {
              version: 1,
              title: (input.filePath ?? status.repoName).slice(0, 240),
              resourcePath: '/index.html?card=preview',
              input: {
                repoPath: nativeRepoId(status.repoPath),
                ...(input.filePath ? { filePath: input.filePath } : {}),
              },
              readMethod: 'git-flow.cards.read',
              actions: [],
              height: 360,
            },
          },
        })
      const diff = input.detail
        ? await getDiff(repoPath, input.filePath, workspaceId)
        : ''
      return c.json({
        ok: true,
        result: {
          title: (input.filePath ?? status.repoName).slice(0, 240),
          branch: status.currentBranch,
          changedFiles: status.files.length,
          files: status.files.slice(0, input.detail ? 30 : 3).map((file) => ({
            path: file.path.slice(0, 500),
            status: `${file.index}${file.working_dir}`.trim(),
          })),
          diff: input.detail ? diff.slice(0, 40_000) : undefined,
          truncated: diff.length > 40_000,
        },
      })
    }

    if (method === 'git-flow.ui.describe') {
      uiDescribeParamsSchema.parse(params)
      return c.json({
        ok: true,
        result: {
          views: GIT_UI_DESCRIPTIONS,
          entities:
            'Repository entity ids are tracked repository paths returned by git-flow.repos.list.',
        },
      })
    }

    if (method === 'git-flow.ui.navigate') {
      const navigation = uiNavigateParamsSchema.parse(params)
      if (navigation.view === 'repositories') {
        const intent = await setUiIntent(workspaceId, { view: 'repositories' })
        return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
      }
      if (!navigation.entityId) {
        const error = rpcError(
          'entity_id_required',
          `The ${navigation.view} view requires a tracked repository entityId.`,
        )
        return c.json(error.body, error.status)
      }
      const resolvedRepo = await resolveRepoReference(
        navigation.entityId,
        workspaceId,
      )
      const intent = await setUiIntent(workspaceId, {
        view: navigation.view,
        entityId: resolvedRepo,
        params: navigation.params,
      })
      return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
    }

    if (method === 'git-flow.ui.showRepo') {
      const request = uiShowRepoParamsSchema.parse(params)
      const requestedRepo = await resolveRepoReference(
        request.repoId,
        workspaceId,
      )
      const status = await getStatus(requestedRepo, workspaceId)
      const intent = await setUiIntent(workspaceId, {
        view: 'repository',
        entityId: status.repoPath,
      })
      return c.json({
        ok: true,
        result: {
          ok: true,
          intentId: intent.id,
          repoId: status.repoPath,
        },
      })
    }

    if (method === 'git-flow.ui.read') {
      const request = uiReadParamsSchema.parse(params)
      if (request.view === 'repositories') {
        const allRepositories = await getRecentRepos(workspaceId)
        const visibleRepositories = allRepositories.slice(0, 24)
        const repositories = visibleRepositories.map((repository) =>
          request.nativeProjection
            ? {
                id: nativeRepoId(repository.path),
                name: repository.name,
                branch: repository.branch || 'Detached HEAD',
                statusLabel: repository.isDirty
                  ? `${repository.changedCount} changed`
                  : 'Clean',
              }
            : {
                ...repository,
                branch: repository.branch || 'Detached HEAD',
                statusLabel: repository.isDirty
                  ? `${repository.changedCount} changed`
                  : 'Clean',
              },
        )
        return c.json({
          ok: true,
          result: {
            view: 'repositories',
            repositories,
            truncationNote:
              allRepositories.length > repositories.length
                ? `Showing the first ${repositories.length} tracked repositories.`
                : '',
            emptyStates:
              repositories.length === 0
                ? [
                    {
                      title: 'No tracked repositories',
                      description:
                        'Open a repository in Git on Mac and it will appear here.',
                    },
                  ]
                : [],
          },
        })
      }
      const requestedRepo = await resolveRepoReference(
        request.entityId,
        workspaceId,
      )
      const status = await getStatus(requestedRepo, workspaceId)
      const projectedRepoId = request.nativeProjection
        ? nativeRepoId(status.repoPath)
        : status.repoPath
      const files = status.files.slice(0, 40).map((file) => ({
        ...file,
        repoId: projectedRepoId,
      }))
      const branches = status.branches.slice(0, 30)
      return c.json({
        ok: true,
        result: {
          view: request.view ?? 'repository',
          repoId: projectedRepoId,
          repoName: status.repoName,
          currentBranch: status.currentBranch,
          branches,
          branchRows: branches.map((branch) => ({
            name: branch,
            currentLabel: branch === status.currentBranch ? 'Current' : '',
          })),
          branchSummary: `${status.branches.length.toLocaleString()} ${status.branches.length === 1 ? 'branch' : 'branches'}`,
          branchEmptyStates:
            status.branches.length === 0
              ? [
                  {
                    title: 'No local branches found',
                    description:
                      'The repository may be newly initialized or currently detached.',
                  },
                ]
              : [],
          branchTruncation:
            status.branches.length > branches.length
              ? `Showing ${branches.length} of ${status.branches.length.toLocaleString()} branches.`
              : '',
          isClean: status.isClean,
          statusLabel: status.isClean
            ? 'Working tree clean'
            : `${status.files.length.toLocaleString()} ${status.files.length === 1 ? 'change' : 'changes'}`,
          statusBadges: [
            {
              text: status.isClean
                ? 'Working tree clean'
                : `${status.files.length.toLocaleString()} ${status.files.length === 1 ? 'change' : 'changes'}`,
              tone: status.isClean ? 'success' : 'warning',
              icon: status.isClean
                ? 'checkmark.circle'
                : 'exclamationmark.triangle',
            },
          ],
          files,
          changeSummary: status.isClean
            ? 'No changed or untracked files'
            : `${status.files.length.toLocaleString()} changed or untracked ${status.files.length === 1 ? 'file' : 'files'}`,
          changeEmptyStates: status.isClean
            ? [
                {
                  title: 'Working tree clean',
                  description: 'There are no changed or untracked files.',
                },
              ]
            : [],
          changeTruncation:
            status.files.length > files.length
              ? `Showing ${files.length} of ${status.files.length.toLocaleString()} changed files.`
              : '',
          commitActions: status.isClean
            ? []
            : [
                {
                  repoId: request.nativeProjection
                    ? nativeRepoId(status.repoPath)
                    : status.repoPath,
                  label: `Commit all ${status.files.length.toLocaleString()} ${status.files.length === 1 ? 'change' : 'changes'}`,
                },
              ],
          canReview: !status.isClean,
          reviewLabel: `Review ${status.files.length.toLocaleString()} ${status.files.length === 1 ? 'change' : 'changes'}`,
          reviewDisplayLabel: `Review ${status.files.length.toLocaleString()} ${status.files.length === 1 ? 'change' : 'changes'} before committing`,
          ahead: status.ahead,
          tracking: status.tracking,
        },
      })
    }

    if (method === 'git-flow.native.commitReview') {
      const status = await getStatus(repoPath, workspaceId)
      const files = status.files.slice(0, 40).map((file) => ({
        ...file,
        repoId: nativeRepoId(status.repoPath),
        statusLabel:
          [file.index, file.working_dir]
            .filter((value) => value && value.trim())
            .join(' · ') || 'Changed',
        displayLabel: `Review ${file.path}`,
      }))
      if (files.length === 0) {
        return c.json({
          ok: true,
          result: {
            repoId: nativeRepoId(status.repoPath),
            repoName: status.repoName,
            files: [],
            paths: [],
            draft: { message: '' },
            commitLabel: 'Commit changes',
            displayLabel: 'Commit changes',
            emptyStates: [
              {
                title: 'Working tree clean',
                description: 'There are no changes to review or commit.',
              },
            ],
            truncationNotices: [],
          },
        })
      }
      const generated = await generateCommitMessage(
        files.map((file) => file.path),
        workspaceId,
        status.repoPath,
      )
      const countLabel = `${files.length.toLocaleString()} ${files.length === 1 ? 'change' : 'changes'}`
      return c.json({
        ok: true,
        result: {
          repoId: nativeRepoId(status.repoPath),
          repoName: status.repoName,
          files,
          paths: files.map((file) => file.path),
          draft: {
            message: [generated.summary, generated.description]
              .filter(Boolean)
              .join('\n\n'),
          },
          commitLabel: `Commit ${countLabel}`,
          displayLabel: `Commit ${countLabel}`,
          emptyStates: [],
          truncationNotices:
            status.files.length > files.length
              ? [
                  {
                    title: 'Review is bounded',
                    message: `Showing 40 of ${status.files.length.toLocaleString()} changed files. Commit from Mac to review the complete scope.`,
                    tone: 'warning',
                  },
                ]
              : [],
        },
      })
    }

    if (method === 'git-flow.status') {
      const [status, repos] = await Promise.all([
        getStatus(repoPath, workspaceId),
        getRecentRepos(workspaceId),
      ])
      return c.json({ ok: true, result: { ...status, recentRepos: repos } })
    }

    if (method === 'git-flow.repos.list') {
      return c.json({ ok: true, result: await getRecentRepos(workspaceId) })
    }

    if (method === 'git-flow.repo.set') {
      const path = stringParam(params, 'path')
      if (!path) {
        const error = rpcError('invalid_params', 'path is required')
        return c.json(error.body, error.status)
      }
      const status = await addRepo(path, workspaceId)
      return c.json({ ok: true, result: status })
    }

    if (method === 'git-flow.repo.remove') {
      const path = stringParam(params, 'path')
      if (!path) {
        const error = rpcError('invalid_params', 'path is required')
        return c.json(error.body, error.status)
      }
      return c.json({ ok: true, result: await removeRepo(path, workspaceId) })
    }

    if (method === 'git-flow.diff') {
      const filePath = stringParam(params, 'filePath')
      const maxChars = numberParam(params, 'maxChars') ?? MAX_REVIEW_DIFF_CHARS
      const diff = await getDiff(repoPath, filePath, workspaceId)
      return c.json({
        ok: true,
        result: {
          title: filePath ?? 'Working tree diff',
          diff: truncateDiff(diff, maxChars),
          truncated: diff.length > maxChars,
          truncationNotices:
            diff.length > maxChars
              ? [
                  {
                    title: 'Bounded diff',
                    message: `Showing the first ${maxChars.toLocaleString()} characters. Review the complete patch on Mac before committing.`,
                    tone: 'warning',
                  },
                ]
              : [],
        },
      })
    }

    if (method === 'git-flow.commitDiff') {
      const hash = stringParam(params, 'hash')
      if (!hash) {
        const error = rpcError('invalid_params', 'hash is required')
        return c.json(error.body, error.status)
      }
      const maxChars = numberParam(params, 'maxChars') ?? MAX_REVIEW_DIFF_CHARS
      const diff = await getCommitDiff(hash, repoPath, workspaceId)
      return c.json({
        ok: true,
        result: {
          title: hash,
          diff: truncateDiff(diff, maxChars),
          truncated: diff.length > maxChars,
          truncationNotices:
            diff.length > maxChars
              ? [
                  {
                    title: 'Bounded diff',
                    message: `Showing the first ${maxChars.toLocaleString()} characters of this commit.`,
                    tone: 'warning',
                  },
                ]
              : [],
        },
      })
    }

    if (method === 'git-flow.history') {
      const limit = Math.min(
        Math.max(numberParam(params, 'limit') ?? DEFAULT_HISTORY_LIMIT, 1),
        MAX_HISTORY_LIMIT,
      )
      const offset = Math.max(numberParam(params, 'offset') ?? 0, 0)
      const history = await getHistory(repoPath, workspaceId, {
        offset,
        limit,
      })
      if (params.nativeProjection === true) {
        return c.json({
          ok: true,
          result: {
            summary:
              history.length === 0
                ? 'No commits yet'
                : `${history.length} most recent ${history.length === 1 ? 'commit' : 'commits'}`,
            commits: history.map((commit) => {
              const date = new Date(commit.date)
              return {
                hash: commit.hash,
                ...(repoPath ? { repoId: nativeRepoId(repoPath) } : {}),
                message: commit.message,
                author_name: commit.author_name,
                dateLabel: Number.isNaN(date.getTime())
                  ? commit.date
                  : date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year:
                        date.getFullYear() === new Date().getFullYear()
                          ? undefined
                          : 'numeric',
                    }),
              }
            }),
            emptyStates:
              history.length === 0
                ? [
                    {
                      title: 'No commits yet',
                      description:
                        'This repository does not have any commit history.',
                    },
                  ]
                : [],
          },
        })
      }
      return c.json({ ok: true, result: history })
    }

    if (method === 'git-flow.commit') {
      const request = commitParamsSchema.parse(params)
      const result = await commitChanges(
        {
          ...request,
          repoPath,
          mode: request.paths ? 'selected' : 'all',
        },
        workspaceId,
      )
      return c.json({ ok: true, result })
    }

    if (method === 'git-flow.generateCommitMessage') {
      const result = await generateCommitMessage(
        stringArrayParam(params, 'paths'),
        workspaceId,
        repoPath,
      )
      return c.json({ ok: true, result })
    }

    if (method === 'git-flow.reviewCode') {
      const result = await reviewCode(
        stringArrayParam(params, 'paths'),
        workspaceId,
        repoPath,
      )
      return c.json({ ok: true, result })
    }

    if (method === 'git-flow.editors.list') {
      const editors = await getDetectedEditors(workspaceId)
      return c.json({ ok: true, result: editors })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Git does not expose ${method}.`,
        },
      },
      404,
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Git received invalid drive parameters.',
            issues: error.issues,
          },
        },
        400,
      )
    }
    console.error('Git RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'git_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Git could not complete the request.',
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
