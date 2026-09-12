import {
  addRepo,
  assignRepoToSection,
  commitAllFiles,
  createRepoSection,
  deleteRepoSection,
  getRecentRepos,
  getRepoSections,
  getUnorganizedRepoSort,
  updateRepoSection,
  updateUnorganizedRepoSort,
} from './server'
import { execFile, spawn } from 'child_process'
import { once } from 'events'
import { lstat, mkdtemp, open, rm, writeFile } from 'fs/promises'
import os from 'os'
import path from 'path'
import { promisify } from 'util'
import { afterEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const tempDirs: string[] = []

async function git(cwd: string, args: string[]) {
  return execFileAsync('git', args, { cwd })
}

async function createRepo() {
  const repoPath = await mkdtemp(path.join(os.tmpdir(), 'git-flow-'))
  tempDirs.push(repoPath)

  await git(repoPath, ['init', '--template='])
  await git(repoPath, ['config', 'user.email', 'git-flow-test@example.com'])
  await git(repoPath, ['config', 'user.name', 'Git Flow Test'])
  await git(repoPath, ['config', 'commit.gpgsign', 'false'])

  await writeFile(path.join(repoPath, 'tracked.txt'), 'initial\n')
  await git(repoPath, ['add', 'tracked.txt'])
  await git(repoPath, ['commit', '-m', 'initial'])

  return repoPath
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true })),
  )
})

describe('commitAllFiles', () => {
  it('stages current changes without using stale generated pathspecs', async () => {
    const repoPath = await createRepo()

    await writeFile(path.join(repoPath, 'current.txt'), 'current\n')

    await commitAllFiles(
      ['src/components/ui/card.tsx'],
      'test: commit current changes',
      '',
      undefined,
      repoPath,
    )

    const { stdout } = await git(repoPath, [
      'show',
      '--name-only',
      '--format=',
      'HEAD',
    ])

    expect(stdout.trim().split(/\r?\n/)).toEqual(['current.txt'])
  })

  it('removes a stale index lock and retries the commit once', async () => {
    const repoPath = await createRepo()
    const lockPath = path.join(repoPath, '.git', 'index.lock')

    await writeFile(path.join(repoPath, 'current.txt'), 'current\n')
    await writeFile(lockPath, '')

    await commitAllFiles(
      ['current.txt'],
      'test: recover stale index lock',
      '',
      undefined,
      repoPath,
    )

    const { stdout } = await git(repoPath, [
      'show',
      '--name-only',
      '--format=',
      'HEAD',
    ])
    expect(stdout.trim()).toBe('current.txt')
    await expect(lstat(lockPath)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('preserves an index lock that is held open by a live process', async () => {
    const repoPath = await createRepo()
    const lockPath = path.join(repoPath, '.git', 'index.lock')

    await writeFile(path.join(repoPath, 'current.txt'), 'current\n')
    const lockHandle = await open(lockPath, 'wx')

    try {
      await expect(
        commitAllFiles(
          ['current.txt'],
          'test: preserve active index lock',
          '',
          undefined,
          repoPath,
        ),
      ).rejects.toThrow('index.lock')
      await expect(lstat(lockPath)).resolves.toMatchObject({ size: 0 })
    } finally {
      await lockHandle.close()
      await rm(lockPath)
    }
  })

  it('preserves an index lock while a Git process is still running', async () => {
    const repoPath = await createRepo()
    const lockPath = path.join(repoPath, '.git', 'index.lock')
    const gitProcess = spawn('git', ['hash-object', '--stdin'], {
      cwd: repoPath,
      stdio: ['pipe', 'ignore', 'ignore'],
    })

    await once(gitProcess, 'spawn')
    await writeFile(path.join(repoPath, 'current.txt'), 'current\n')
    await writeFile(lockPath, '')

    try {
      await expect(
        commitAllFiles(
          ['current.txt'],
          'test: preserve lock during Git process',
          '',
          undefined,
          repoPath,
        ),
      ).rejects.toThrow('index.lock')
      await expect(lstat(lockPath)).resolves.toMatchObject({ size: 0 })
    } finally {
      gitProcess.stdin?.end()
      await once(gitProcess, 'close')
      await rm(lockPath)
    }
  })
})

describe('repository sections', () => {
  it('persists assignment, collapse state, rename, and safe deletion', async () => {
    const previousHome = process.env.MOLDABLE_HOME
    const previousAppId = process.env.MOLDABLE_APP_ID
    const home = await mkdtemp(path.join(os.tmpdir(), 'git-flow-home-'))
    tempDirs.push(home)
    process.env.MOLDABLE_HOME = home
    process.env.MOLDABLE_APP_ID = 'git-flow'

    try {
      const repoPath = await createRepo()
      const workspaceId = 'sections-test'
      await addRepo(repoPath, workspaceId)

      const section = await createRepoSection('Consulting', workspaceId)
      await assignRepoToSection(repoPath, section.id, workspaceId)
      expect(await getRecentRepos(workspaceId)).toMatchObject([
        { path: repoPath, sectionId: section.id },
      ])

      await updateRepoSection(
        section.id,
        { name: 'Client work', collapsed: true, sortMode: 'changes' },
        workspaceId,
      )
      await updateUnorganizedRepoSort('changes', workspaceId)
      expect(await getRepoSections(workspaceId)).toEqual([
        {
          id: section.id,
          name: 'Client work',
          collapsed: true,
          position: 0,
          sortMode: 'changes',
        },
      ])
      expect(await getUnorganizedRepoSort(workspaceId)).toBe('changes')

      await deleteRepoSection(section.id, workspaceId)
      expect(await getRepoSections(workspaceId)).toEqual([])
      expect(await getRecentRepos(workspaceId)).toMatchObject([
        { path: repoPath, sectionId: undefined },
      ])
    } finally {
      if (previousHome === undefined) delete process.env.MOLDABLE_HOME
      else process.env.MOLDABLE_HOME = previousHome
      if (previousAppId === undefined) delete process.env.MOLDABLE_APP_ID
      else process.env.MOLDABLE_APP_ID = previousAppId
    }
  })
})
