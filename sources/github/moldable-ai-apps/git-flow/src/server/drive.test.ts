import {
  commitAllFiles,
  commitFiles,
  getStatus,
  pushCommits,
} from '../lib/git/server'
import { generateAppJson } from '../lib/llm/generate-json.server'
import { app } from './app'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const repoPath = '/Users/rob/projects/example'

vi.mock('../lib/git/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/git/server')>()
  return {
    ...actual,
    resolveKnownRepoPath: vi.fn(async (requested?: string) =>
      requested ? repoPath : undefined,
    ),
    getRecentRepos: vi.fn(async () => [
      {
        name: 'example',
        path: repoPath,
        isDirty: true,
        changedCount: 1,
        branch: 'main',
        ahead: 0,
      },
    ]),
    getStatus: vi.fn(async () => ({
      currentBranch: 'main',
      repoName: 'example',
      repoPath,
      files: [{ path: 'README.md', index: ' ', working_dir: 'M' }],
      branches: ['main', 'feature/demo'],
      isClean: false,
      ahead: 0,
      behind: 0,
    })),
    getHistory: vi.fn(async () => [
      {
        message: 'Keep native payloads path-safe',
        author_name: 'Rob',
        date: '2026-08-02T12:00:00.000Z',
        avatarUrl: 'file:///Users/rob/avatar.png',
      },
    ]),
    getDiff: vi.fn(async () => 'diff --git a/README.md b/README.md'),
    getDiffForFiles: vi.fn(async () => 'diff --git a/README.md b/README.md'),
    commitAllFiles: vi.fn(async () => ({
      success: true,
      commit: 'abc123',
    })),
    commitFiles: vi.fn(async () => ({
      success: true,
      commit: 'def456',
    })),
    pushCommits: vi.fn(async () => ({
      success: true,
      upstreamSet: false,
    })),
  }
})

vi.mock('../lib/llm/generate-json.server', () => ({
  generateAppJson: vi.fn(async () => ({
    summary: 'docs: update readme',
    description: 'Document the new workflow.',
  })),
}))

const originalEnv = { ...process.env }
const workspaceId = 'drive-test'
let tempHome = ''

beforeEach(async () => {
  vi.clearAllMocks()
  tempHome = await mkdtemp(join(tmpdir(), 'git-flow-drive-'))
  process.env = {
    ...originalEnv,
    MOLDABLE_HOME: tempHome,
    MOLDABLE_APP_ID: 'git-flow',
  }
})

afterEach(async () => {
  process.env = originalEnv
  await rm(tempHome, { recursive: true, force: true })
})

function rpc(method: string, params: Record<string, unknown> = {}) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-moldable-workspace': workspaceId,
    },
    body: JSON.stringify({ method, params }),
  })
}

describe('Git drive contract', () => {
  it('persists repository sections through the Git API', async () => {
    const createdResponse = await app.request('/api/git', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-moldable-workspace': workspaceId,
      },
      body: JSON.stringify({
        action: 'createRepoSection',
        sectionName: 'Consulting',
      }),
    })
    const created = (await createdResponse.json()) as { id: string }
    expect(createdResponse.status).toBe(200)

    const collapsedResponse = await app.request('/api/git', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-moldable-workspace': workspaceId,
      },
      body: JSON.stringify({
        action: 'updateRepoSection',
        sectionId: created.id,
        collapsed: true,
        sortMode: 'changes',
      }),
    })
    expect(collapsedResponse.status).toBe(200)

    const listed = await app.request('/api/git', {
      headers: { 'x-moldable-workspace': workspaceId },
    })
    expect(await listed.json()).toMatchObject({
      repoSections: [
        {
          id: created.id,
          name: 'Consulting',
          collapsed: true,
          position: 0,
          sortMode: 'changes',
        },
      ],
      unorganizedRepoSort: 'name',
    })

    const deleted = await app.request('/api/git', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-moldable-workspace': workspaceId,
      },
      body: JSON.stringify({
        action: 'deleteRepoSection',
        sectionId: created.id,
      }),
    })
    expect(deleted.status).toBe(200)
  })

  it('describes views and Zod-rejects an unknown view', async () => {
    const described = await rpc('git-flow.ui.describe')
    expect(described.status).toBe(200)
    expect(
      (
        (await described.json()) as {
          result: { views: Array<{ id: string }> }
        }
      ).result.views.map((view) => view.id),
    ).toEqual(['repositories', 'repository', 'changes', 'history'])

    const rejected = await rpc('git-flow.ui.navigate', { view: 'commit' })
    expect(rejected.status).toBe(400)
    expect(await rejected.json()).toMatchObject({
      error: { code: 'invalid_params' },
    })
  })

  it('shows a tracked repo through the last-wins intent and acks it', async () => {
    const shown = await rpc('git-flow.ui.showRepo', { repoId: repoPath })
    const shownBody = (await shown.json()) as {
      result: { intentId: string }
    }
    expect(shown.status).toBe(200)

    const pending = await app.request('/api/moldable/ui-intent', {
      headers: { 'x-moldable-workspace': workspaceId },
    })
    expect(await pending.json()).toMatchObject({
      id: shownBody.result.intentId,
      view: 'repository',
      entityId: repoPath,
    })

    const ack = await app.request(
      `/api/moldable/ui-intent?id=${shownBody.result.intentId}`,
      {
        method: 'DELETE',
        headers: { 'x-moldable-workspace': workspaceId },
      },
    )
    expect(await ack.json()).toEqual({ ok: true, deleted: true })
  })

  it('uses opaque repository ids for NativeUI without leaking local paths', async () => {
    const listed = await rpc('git-flow.ui.read', {
      view: 'repositories',
      nativeProjection: true,
    })
    const listedBody = (await listed.json()) as {
      result: { repositories: Array<{ id: string; name: string }> }
    }
    expect(listed.status).toBe(200)
    expect(listedBody.result.repositories[0]).toMatchObject({
      name: 'example',
    })
    const nativeRepoId = listedBody.result.repositories[0]!.id
    expect(nativeRepoId).toMatch(/^git-repo-[0-9a-f]{24}$/)
    expect(JSON.stringify(listedBody)).not.toContain(repoPath)

    const read = await rpc('git-flow.ui.read', {
      view: 'repository',
      entityId: nativeRepoId,
      nativeProjection: true,
    })
    const readBody = await read.json()
    expect(readBody).toMatchObject({
      result: {
        repoId: nativeRepoId,
        currentBranch: 'main',
        branches: ['main', 'feature/demo'],
        isClean: false,
        files: [{ path: 'README.md' }],
      },
    })
    expect(JSON.stringify(readBody)).not.toContain(repoPath)

    const history = await rpc('git-flow.history', {
      repoPath: nativeRepoId,
      limit: 25,
      offset: 0,
      nativeProjection: true,
    })
    const historyBody = await history.json()
    expect(historyBody).toMatchObject({
      result: {
        commits: [
          {
            message: 'Keep native payloads path-safe',
            author_name: 'Rob',
          },
        ],
      },
    })
    expect(JSON.stringify(historyBody)).not.toContain('/Users/')
    expect(JSON.stringify(historyBody)).not.toContain('avatarUrl')

    const review = await rpc('git-flow.native.commitReview', {
      repoPath: nativeRepoId,
    })
    const reviewBody = await review.json()
    expect(reviewBody).toMatchObject({
      result: {
        repoId: nativeRepoId,
        paths: ['README.md'],
        draft: {
          message: 'docs: update readme\n\nDocument the new workflow.',
        },
        commitLabel: 'Commit 1 change',
        truncationNotices: [],
      },
    })
    expect(JSON.stringify(reviewBody)).not.toContain(repoPath)

    const diff = await rpc('git-flow.diff', {
      repoPath: nativeRepoId,
      filePath: 'README.md',
      maxChars: 32000,
    })
    expect(await diff.json()).toMatchObject({
      result: { truncationNotices: [] },
    })

    const committed = await rpc('git-flow.commit', {
      repoPath: nativeRepoId,
      paths: ['README.md'],
      message: 'docs: update readme\n\nDocument the new workflow.',
    })
    expect(committed.status).toBe(200)
    expect(commitFiles).toHaveBeenCalledWith(
      ['README.md'],
      'docs: update readme',
      'Document the new workflow.',
      workspaceId,
      repoPath,
    )
  })

  it('uses the shared commit pipeline for the UI commit-and-push action', async () => {
    vi.mocked(getStatus)
      .mockResolvedValueOnce({
        currentBranch: 'main',
        repoName: 'example',
        repoPath,
        files: [{ path: 'README.md', index: ' ', working_dir: 'M' }],
        branches: ['main'],
        isClean: false,
        ahead: 0,
        tracking: 'origin/main',
        pullRequest: { canOpen: false },
      })
      .mockResolvedValueOnce({
        currentBranch: 'main',
        repoName: 'example',
        repoPath,
        files: [],
        branches: ['main'],
        isClean: true,
        ahead: 1,
        tracking: 'origin/main',
        pullRequest: { canOpen: false },
      })

    const response = await app.request('/api/git', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-moldable-workspace': workspaceId,
      },
      body: JSON.stringify({
        action: 'commitAndPush',
        repoPath,
        paths: ['README.md'],
        summary: 'docs: update readme',
        description: '',
      }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      success: true,
      commit: 'def456',
      repoPath,
      remainingCount: 0,
    })
    expect(commitFiles).toHaveBeenCalledOnce()
    expect(pushCommits).toHaveBeenCalledWith(workspaceId, repoPath)
  })

  it('generates a message and commits all dirty files through git-flow.commit', async () => {
    const response = await rpc('git-flow.commit', { repoPath })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      ok: true,
      result: {
        success: true,
        commit: 'abc123',
        repoPath,
        summary: 'docs: update readme',
        description: 'Document the new workflow.',
        paths: ['README.md'],
        fileCount: 1,
      },
    })
    expect(generateAppJson).toHaveBeenCalledOnce()
    expect(commitAllFiles).toHaveBeenCalledWith(
      ['README.md'],
      'docs: update readme',
      'Document the new workflow.',
      workspaceId,
      repoPath,
    )
    expect(commitFiles).not.toHaveBeenCalled()
  })

  it('commits selected paths with a supplied message without invoking AI', async () => {
    const response = await rpc('git-flow.commit', {
      repoPath,
      paths: ['README.md'],
      summary: 'docs: clarify setup',
      description: 'Explain the local setup steps.',
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      ok: true,
      result: {
        commit: 'def456',
        summary: 'docs: clarify setup',
        paths: ['README.md'],
      },
    })
    expect(generateAppJson).not.toHaveBeenCalled()
    expect(commitFiles).toHaveBeenCalledWith(
      ['README.md'],
      'docs: clarify setup',
      'Explain the local setup steps.',
      workspaceId,
      repoPath,
    )
    expect(commitAllFiles).not.toHaveBeenCalled()
  })
})
