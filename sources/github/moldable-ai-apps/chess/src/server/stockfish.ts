import { readJson, safePath, writeJson } from '@moldable-ai/storage'
import type {
  ChessEngine,
  ChessEngineStatus,
  Difficulty,
  EngineOnboardingStatus,
} from '../shared/types'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'

const stockfishVersion = '18-smallnet-0.4.2'
const stockfishDirName = 'stockfish-18-smallnet'
const installManifestName = '.chess-engine-install.json'
const nnueFileName = 'nn-4ca89e4b3abf.nnue'
const expectedDownloadSizeBytes = 15_714_391

const files = [
  {
    name: 'sf_18_smallnet.js',
    url: 'https://unpkg.com/@lichess-org/stockfish-web@0.4.2/sf_18_smallnet.js',
    sha256: '0eebbd7d5108348cbf51b868adf4af0d33a866ef68217b2d6d9259c7573d8287',
  },
  {
    name: 'sf_18_smallnet.wasm',
    url: 'https://unpkg.com/@lichess-org/stockfish-web@0.4.2/sf_18_smallnet.wasm',
    sha256: '7a759da6e6a19b86853e107f3212b070298e9e1515ed6959783a89c65e88a195',
  },
  {
    name: 'LICENSE',
    url: 'https://unpkg.com/@lichess-org/stockfish-web@0.4.2/LICENSE',
    sha256: '3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986',
  },
  {
    name: nnueFileName,
    url: `https://tests.stockfishchess.org/api/nn/${nnueFileName}`,
    sha256Prefix: '4ca89e4b3abf',
  },
] as const

interface StockfishInstallManifest {
  id: 'stockfish'
  version: string
  license: 'AGPL-3.0-or-later'
  sourceUrl: string
  packageUrl: string
  installedAt: string
  bytes: number
  files: Array<{
    name: string
    url: string
    sha256: string
    bytes: number
  }>
}

const installs = new Map<string, Promise<ChessEngineStatus>>()

function onboardingPath(dataDir: string) {
  return safePath(dataDir, 'engine-onboarding.json')
}

export async function getEngineOnboarding(
  dataDir: string,
): Promise<EngineOnboardingStatus> {
  const stored = await readJson<unknown>(onboardingPath(dataDir), null)
  if (
    !stored ||
    typeof stored !== 'object' ||
    !('completed' in stored) ||
    stored.completed !== true
  ) {
    return { completed: false }
  }
  const choice =
    'choice' in stored &&
    (stored.choice === 'stockfish' ||
      stored.choice === 'moldable-ai' ||
      stored.choice === 'dumb')
      ? stored.choice
      : undefined
  const completedAt =
    'completedAt' in stored && typeof stored.completedAt === 'string'
      ? stored.completedAt
      : undefined
  return { completed: true, choice, completedAt }
}

export async function completeEngineOnboarding(
  dataDir: string,
  choice: ChessEngine,
): Promise<EngineOnboardingStatus> {
  const status = {
    completed: true as const,
    choice,
    completedAt: new Date().toISOString(),
  }
  await writeJson(onboardingPath(dataDir), status)
  return status
}

export function stockfishInstallDir(dataDir: string) {
  return path.join(dataDir, 'engines', stockfishDirName)
}

function manifestPath(dataDir: string) {
  return path.join(stockfishInstallDir(dataDir), installManifestName)
}

async function readManifest(
  dataDir: string,
): Promise<StockfishInstallManifest | null> {
  try {
    const manifest = JSON.parse(
      await readFile(manifestPath(dataDir), 'utf8'),
    ) as StockfishInstallManifest
    if (
      manifest.id !== 'stockfish' ||
      manifest.version !== stockfishVersion ||
      !Array.isArray(manifest.files)
    ) {
      return null
    }
    await Promise.all(
      files.map((file) =>
        stat(path.join(stockfishInstallDir(dataDir), file.name)),
      ),
    )
    return manifest
  } catch {
    return null
  }
}

export async function getStockfishStatus(
  dataDir: string,
): Promise<ChessEngineStatus> {
  const manifest = await readManifest(dataDir)
  return {
    id: 'stockfish',
    name: 'Stockfish',
    version: stockfishVersion,
    installed: Boolean(manifest),
    installedAt: manifest?.installedAt,
    sizeBytes: manifest?.bytes,
    downloadSizeBytes: expectedDownloadSizeBytes,
    license: 'AGPL-3.0-or-later',
    sourceUrl:
      'https://github.com/lichess-org/stockfish-web/tree/f09f4e11c44481f9112ee318a2e5e718dee2053e',
    licenseUrl:
      'https://github.com/lichess-org/stockfish-web/blob/f09f4e11c44481f9112ee318a2e5e718dee2053e/LICENSE',
    note: manifest
      ? 'Installed locally for this workspace and available in the opponent selector.'
      : 'Optional local engine. Installing downloads the Lichess WebAssembly build and its Stockfish neural network.',
  }
}

async function sha256(filePath: string) {
  const content = await readFile(filePath)
  return createHash('sha256').update(content).digest('hex')
}

async function downloadFile(file: (typeof files)[number], destination: string) {
  const response = await fetch(file.url, {
    headers: { 'user-agent': 'Moldable Chess/0.1 Stockfish installer' },
    redirect: 'follow',
  })
  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download ${file.name}: ${response.status} ${response.statusText}`,
    )
  }

  const bodyStream = Readable.fromWeb(
    response.body as unknown as NodeReadableStream<Uint8Array>,
  )
  await pipeline(bodyStream, createWriteStream(destination, { flags: 'wx' }))
  const digest = await sha256(destination)
  if ('sha256' in file && digest !== file.sha256) {
    throw new Error(`${file.name} failed checksum validation`)
  }
  if ('sha256Prefix' in file && !digest.startsWith(file.sha256Prefix)) {
    throw new Error(`${file.name} failed checksum validation`)
  }
  return {
    name: file.name,
    url: file.url,
    sha256: digest,
    bytes: (await stat(destination)).size,
  }
}

async function performInstall(dataDir: string): Promise<ChessEngineStatus> {
  const existing = await readManifest(dataDir)
  if (existing) return getStockfishStatus(dataDir)

  const installDir = stockfishInstallDir(dataDir)
  const tempDir = `${installDir}.tmp`
  await rm(tempDir, { recursive: true, force: true })
  await mkdir(tempDir, { recursive: true })

  try {
    const installedFiles = []
    for (const file of files) {
      installedFiles.push(
        await downloadFile(file, path.join(tempDir, file.name)),
      )
    }
    const bytes = installedFiles.reduce((total, file) => total + file.bytes, 0)
    const manifest: StockfishInstallManifest = {
      id: 'stockfish',
      version: stockfishVersion,
      license: 'AGPL-3.0-or-later',
      sourceUrl:
        'https://github.com/lichess-org/stockfish-web/tree/f09f4e11c44481f9112ee318a2e5e718dee2053e',
      packageUrl:
        'https://www.npmjs.com/package/@lichess-org/stockfish-web/v/0.4.2',
      installedAt: new Date().toISOString(),
      bytes,
      files: installedFiles,
    }
    await writeFile(
      path.join(tempDir, installManifestName),
      `${JSON.stringify(manifest, null, 2)}\n`,
    )
    await writeFile(
      path.join(tempDir, 'SOURCE.md'),
      [
        '# Stockfish engine source',
        '',
        'This optional engine pack is separate from Moldable Chess.',
        '',
        '- Engine: Stockfish 18 smallnet WebAssembly build',
        '- Package: @lichess-org/stockfish-web 0.4.2',
        '- Source: https://github.com/lichess-org/stockfish-web/tree/f09f4e11c44481f9112ee318a2e5e718dee2053e',
        '- Upstream Stockfish: https://github.com/official-stockfish/Stockfish',
        '- Package metadata declares: AGPL-3.0-or-later.',
        '- The upstream LICENSE file contains GPL version 3 and is retained unchanged.',
        '- Source revision: f09f4e11c44481f9112ee318a2e5e718dee2053e',
        '- The pinned source includes build scripts, Stockfish base revisions, and patches.',
        `- Neural network: ${nnueFileName}`,
        '',
      ].join('\n'),
    )
    await rm(installDir, { recursive: true, force: true })
    await rename(tempDir, installDir)
    return getStockfishStatus(dataDir)
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true })
    throw error
  }
}

export async function installStockfish(
  dataDir: string,
): Promise<ChessEngineStatus> {
  const existing = installs.get(dataDir)
  if (existing) return existing
  const install = performInstall(dataDir).finally(() =>
    installs.delete(dataDir),
  )
  installs.set(dataDir, install)
  return install
}

export async function getStockfishMove(
  dataDir: string,
  fen: string,
  difficulty: Difficulty,
): Promise<string | null> {
  if (!(await readManifest(dataDir))) return null

  const runnerPath = path.join(process.cwd(), 'scripts', 'stockfish-engine.mjs')
  const installDir = stockfishInstallDir(dataDir)
  const timeoutMs = difficulty === 'master' ? 4_000 : 3_000

  return new Promise<string | null>((resolve) => {
    const child = spawn(
      process.execPath,
      [runnerPath, installDir, fen, difficulty],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    const stdout: Buffer[] = []
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.on('error', () => {
      clearTimeout(timer)
      resolve(null)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        resolve(null)
        return
      }
      const move = Buffer.concat(stdout).toString('utf8').trim().toLowerCase()
      resolve(/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move) ? move : null)
    })
  })
}

export interface StockfishAnalysisLine {
  move: string
  depth: number
  centipawns?: number
  mateIn?: number
  wdl?: {
    win: number
    draw: number
    loss: number
  }
  pv: string[]
}

export interface StockfishAnalysis {
  lines: StockfishAnalysisLine[]
}

const analysisCache = new Map<
  string,
  { expiresAt: number; value: StockfishAnalysis }
>()
const analysisRequests = new Map<string, Promise<StockfishAnalysis | null>>()

export function getCachedStockfishAnalysis(
  dataDir: string,
  fen: string,
): StockfishAnalysis | null {
  const cached = analysisCache.get(`${dataDir}\u0000${fen}`)
  if (!cached || cached.expiresAt <= Date.now()) return null
  return cached.value
}

export async function getStockfishAnalysis(
  dataDir: string,
  fen: string,
): Promise<StockfishAnalysis | null> {
  const cacheKey = `${dataDir}\u0000${fen}`
  const cached = getCachedStockfishAnalysis(dataDir, fen)
  if (cached) return cached
  const pending = analysisRequests.get(cacheKey)
  if (pending) return pending
  if (!(await readManifest(dataDir))) return null

  const runnerPath = path.join(
    process.cwd(),
    'scripts',
    'stockfish-analysis.mjs',
  )
  const installDir = stockfishInstallDir(dataDir)

  const request = new Promise<StockfishAnalysis | null>((resolve) => {
    const child = spawn(process.execPath, [runnerPath, installDir, fen], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout: Buffer[] = []
    let outputBytes = 0
    const timer = setTimeout(() => child.kill('SIGKILL'), 8_000)
    child.stdout.on('data', (chunk: Buffer) => {
      outputBytes += chunk.byteLength
      if (outputBytes <= 64 * 1_024) stdout.push(chunk)
    })
    child.on('error', () => {
      clearTimeout(timer)
      resolve(null)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0 || outputBytes > 64 * 1_024) {
        resolve(null)
        return
      }
      try {
        const parsed = JSON.parse(
          Buffer.concat(stdout).toString('utf8'),
        ) as StockfishAnalysis
        if (
          !parsed ||
          !Array.isArray(parsed.lines) ||
          parsed.lines.length === 0
        ) {
          resolve(null)
          return
        }
        const value = {
          lines: parsed.lines
            .filter(
              (line) =>
                line &&
                typeof line.move === 'string' &&
                /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(line.move) &&
                Number.isInteger(line.depth),
            )
            .slice(0, 3),
        }
        if (value.lines.length === 0) {
          resolve(null)
          return
        }
        analysisCache.set(cacheKey, {
          expiresAt: Date.now() + 5 * 60_000,
          value,
        })
        resolve(value)
      } catch {
        resolve(null)
      }
    })
  })
  analysisRequests.set(cacheKey, request)
  return request.finally(() => analysisRequests.delete(cacheKey))
}
