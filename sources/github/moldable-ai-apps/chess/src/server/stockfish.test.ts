import {
  completeEngineOnboarding,
  getEngineOnboarding,
  getStockfishStatus,
  stockfishInstallDir,
} from './stockfish'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe('Stockfish engine pack', () => {
  it('is opt-in and workspace scoped before installation', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'chess-engine-test-'))
    tempDirs.push(dataDir)

    const status = await getStockfishStatus(dataDir)

    expect(status).toMatchObject({
      id: 'stockfish',
      installed: false,
      license: 'AGPL-3.0-or-later',
      sourceUrl:
        'https://github.com/lichess-org/stockfish-web/tree/f09f4e11c44481f9112ee318a2e5e718dee2053e',
      licenseUrl:
        'https://github.com/lichess-org/stockfish-web/blob/f09f4e11c44481f9112ee318a2e5e718dee2053e/LICENSE',
    })
    expect(stockfishInstallDir(dataDir)).toContain(dataDir)
    expect(status.note).toContain('Optional local engine')
  })

  it('remembers a non-Stockfish choice without installing it', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'chess-engine-test-'))
    tempDirs.push(dataDir)

    await completeEngineOnboarding(dataDir, 'moldable-ai')

    await expect(getEngineOnboarding(dataDir)).resolves.toMatchObject({
      completed: true,
      choice: 'moldable-ai',
    })
    await expect(getStockfishStatus(dataDir)).resolves.toMatchObject({
      installed: false,
    })
  })
})
