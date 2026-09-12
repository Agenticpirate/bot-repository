import { app } from './app'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const workspaceId = 'test-workspace'
const workspaceHeader = { 'x-moldable-workspace': workspaceId }

let tempDir: string
let projectRoot: string
let outsideRoot: string

async function json(response: Response) {
  return (await response.json()) as Record<string, unknown>
}

async function configureProject(rootPath: string) {
  return app.request('/api/config', {
    method: 'POST',
    headers: {
      ...workspaceHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rootPath,
      recentProjects: [],
      previewUrl: 'http://localhost:3000',
      projectTabs: {},
    }),
  })
}

async function rpc(method: string, params: Record<string, unknown> = {}) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: {
      ...workspaceHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ method, params }),
  })
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-editor-test-'))
  projectRoot = path.join(tempDir, 'project')
  outsideRoot = path.join(tempDir, 'outside')

  await fs.mkdir(projectRoot, { recursive: true })
  await fs.mkdir(outsideRoot, { recursive: true })
  await fs.writeFile(path.join(projectRoot, 'inside.txt'), 'inside')
  await fs.writeFile(path.join(outsideRoot, 'outside.txt'), 'outside')

  process.env.MOLDABLE_HOME = tempDir
  process.env.MOLDABLE_APP_ID = 'code-editor'
  delete process.env.MOLDABLE_APP_DATA_DIR
  delete process.env.MOLDABLE_WORKSPACE_ID

  await configureProject(projectRoot)
})

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true })
  delete process.env.MOLDABLE_HOME
  delete process.env.MOLDABLE_APP_ID
})

describe('Code app server file safety', () => {
  it('requires a trusted workspace header for protected API routes', async () => {
    const response = await app.request(
      `/api/read?path=${encodeURIComponent(path.join(projectRoot, 'inside.txt'))}`,
    )

    expect(response.status).toBe(403)
    await expect(json(response)).resolves.toMatchObject({
      error: 'Workspace header is required',
    })
  })

  it('reads files inside the configured project root', async () => {
    const response = await app.request(
      `/api/read?path=${encodeURIComponent(path.join(projectRoot, 'inside.txt'))}`,
      { headers: workspaceHeader },
    )

    expect(response.status).toBe(200)
    await expect(json(response)).resolves.toMatchObject({ content: 'inside' })
  })

  it('rejects reads outside the configured project root', async () => {
    const response = await app.request(
      `/api/read?path=${encodeURIComponent(path.join(outsideRoot, 'outside.txt'))}`,
      { headers: workspaceHeader },
    )

    expect(response.status).toBe(403)
    await expect(json(response)).resolves.toMatchObject({
      error: 'Path is outside the current project',
    })
  })

  it('rejects rename names that traverse to a parent directory', async () => {
    const response = await app.request('/api/files/rename', {
      method: 'POST',
      headers: {
        ...workspaceHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        oldPath: path.join(projectRoot, 'inside.txt'),
        newName: '..',
      }),
    })

    expect(response.status).toBe(400)
    await expect(json(response)).resolves.toMatchObject({
      error: 'Invalid new name',
    })
  })

  it('keeps search results relative to the searched root', async () => {
    await fs.mkdir(path.join(projectRoot, 'src'), { recursive: true })
    await fs.writeFile(path.join(projectRoot, 'src', 'index.ts'), 'export {}')

    const response = await app.request(
      `/api/search?root=${encodeURIComponent(projectRoot)}`,
      { headers: workspaceHeader },
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      files: Array<{ relativePath: string }>
    }
    expect(body.files.map((file) => file.relativePath)).toContain(
      'src/index.ts',
    )
  })
})

describe('Code drive contract', () => {
  it('returns a useful NativeUI empty state when no recent project exists', async () => {
    const response = await rpc('code-editor.ui.read', { view: 'projects' })
    await expect(json(response)).resolves.toMatchObject({
      result: {
        recentProjects: [],
        emptyStates: [{ title: 'No recent projects' }],
      },
    })
  })

  it('allows a bounded inventory for an authoritative recent project', async () => {
    const recentRoot = path.join(tempDir, 'recent-project')
    await fs.mkdir(recentRoot, { recursive: true })
    await fs.writeFile(path.join(recentRoot, 'README.md'), '# Recent')
    await fs.mkdir(path.join(recentRoot, 'src'), { recursive: true })
    await fs.writeFile(path.join(recentRoot, 'src', 'index.ts'), 'export {}')
    await app.request('/api/config', {
      method: 'POST',
      headers: {
        ...workspaceHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rootPath: projectRoot,
        recentProjects: [
          {
            path: recentRoot,
            name: 'recent-project',
            lastOpened: '2026-08-02T00:00:00.000Z',
          },
        ],
        previewUrl: 'http://localhost:3000',
        projectTabs: {},
      }),
    })

    const response = await rpc('code-editor.files.search', {
      root: recentRoot,
      pattern: '**/*',
      limit: 80,
    })
    await expect(json(response)).resolves.toMatchObject({
      result: [
        { name: 'README.md', relativePath: 'README.md' },
        { name: 'index.ts', relativePath: 'src/index.ts' },
      ],
    })

    const projects = (await (
      await rpc('code-editor.ui.read', {
        view: 'projects',
        nativeProjection: true,
      })
    ).json()) as {
      result: {
        rootPath?: string
        recentProjects: Array<{ id: string; path?: string }>
      }
    }
    const project = projects.result.recentProjects[0]!
    expect(project.id).toMatch(/^code-project-[a-f0-9]{16}$/)
    expect(project.path).toBeUndefined()
    expect(projects.result.rootPath).toBeUndefined()

    const nativeInventory = await rpc('code-editor.files.search', {
      projectId: project.id,
      pattern: '**/*',
      limit: 40,
      nativeProjection: true,
    })
    const nativeBody = (await nativeInventory.json()) as {
      result: {
        files: Array<{ name: string; path?: string }>
        folders: Array<{
          title: string
          files: Array<{ relativePath: string; projectId: string }>
        }>
      }
    }
    expect(nativeBody.result.files[0]?.name).toBe('README.md')
    expect(nativeBody.result.files[0]?.path).toBeUndefined()
    expect(nativeBody.result.folders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Project Root' }),
        expect.objectContaining({
          title: 'src',
          files: [
            expect.objectContaining({
              relativePath: 'src/index.ts',
              projectId: project.id,
            }),
          ],
        }),
      ]),
    )
    expect(JSON.stringify(nativeBody)).not.toContain(recentRoot)

    const nativeFile = await rpc('code-editor.native.file.read', {
      projectId: project.id,
      relativePath: 'README.md',
    })
    const nativeFileBody = (await nativeFile.json()) as {
      result: { relativePath: string; codeBlocks: Array<{ code: string }> }
    }
    expect(nativeFileBody.result.relativePath).toBe('README.md')
    expect(nativeFileBody.result.codeBlocks[0]?.code).toBe('# Recent')
    expect(JSON.stringify(nativeFileBody)).not.toContain(recentRoot)
  })

  it('describes views and Zod-rejects an unknown view', async () => {
    const described = await rpc('code-editor.ui.describe')
    expect(described.status).toBe(200)
    expect(
      (
        (await described.json()) as {
          result: { views: Array<{ id: string }> }
        }
      ).result.views.map((view) => view.id),
    ).toEqual(['projects', 'editor', 'file'])

    const rejected = await rpc('code-editor.ui.navigate', { view: 'terminal' })
    expect(rejected.status).toBe(400)
    await expect(json(rejected)).resolves.toMatchObject({
      error: { code: 'invalid_params' },
    })
  })

  it('opens a real in-root file through the last-wins intent and acks it', async () => {
    const filePath = path.join(projectRoot, 'inside.txt')
    const realFilePath = await fs.realpath(filePath)
    const opened = await rpc('code-editor.ui.openFile', { path: filePath })
    expect(opened.status).toBe(200)
    const openedBody = (await opened.json()) as {
      result: { intentId: string }
    }

    const pending = await app.request('/api/moldable/ui-intent', {
      headers: workspaceHeader,
    })
    await expect(json(pending)).resolves.toMatchObject({
      id: openedBody.result.intentId,
      view: 'file',
      entityId: realFilePath,
    })

    const ack = await app.request(
      `/api/moldable/ui-intent?id=${openedBody.result.intentId}`,
      { method: 'DELETE', headers: workspaceHeader },
    )
    await expect(json(ack)).resolves.toEqual({ ok: true, cleared: true })
  })

  it('returns bounded file content and open-file state', async () => {
    const filePath = path.join(projectRoot, 'inside.txt')
    const realFilePath = await fs.realpath(filePath)
    const response = await rpc('code-editor.ui.read', {
      view: 'file',
      entityId: filePath,
    })
    expect(response.status).toBe(200)
    await expect(json(response)).resolves.toMatchObject({
      result: {
        openFiles: [],
        activeFile: null,
        file: {
          path: realFilePath,
          content: 'inside',
          truncated: false,
        },
      },
    })
  })

  it('rejects a symlink that resolves outside the configured root', async () => {
    const linkPath = path.join(projectRoot, 'escape.txt')
    await fs.symlink(path.join(outsideRoot, 'outside.txt'), linkPath)
    const response = await rpc('code-editor.ui.openFile', { path: linkPath })
    expect(response.status).toBe(403)
    await expect(json(response)).resolves.toMatchObject({
      error: { code: 'path_outside_project' },
    })
  })
})
