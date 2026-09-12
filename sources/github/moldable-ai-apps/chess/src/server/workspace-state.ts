import { readJson, safePath, writeJson } from '@moldable-ai/storage'
import type {
  AppView,
  ChessColor,
  ChessEngine,
  ChessGameRecord,
  ChessGameState,
  ChessGameStateResult,
  ChessMoveRecord,
  ChessSession,
  ChessUiIntent,
  ChessUiIntentClaim,
  ChessUiIntentQueue,
  Difficulty,
  GameActor,
  GameMode,
} from '../shared/types'
import {
  applyUciMove,
  createChess,
  legalUciMoves,
  resultFor,
} from './chess-utils'
import { z } from 'zod'

const HISTORY_LIMIT = 100
const RECENT_MOVE_LIMIT = 12
const LEGAL_MOVE_LIMIT = 256
const UI_INTENT_LIMIT = 16
const UI_INTENT_TTL_MS = 120_000
const UI_INTENT_LEASE_MS = 90_000
const WAIT_DEFAULT_MS = 12_000
const WAIT_MAX_MS = 15_000
const RPC_RECEIPT_LIMIT = 128
const RPC_RECEIPT_TTL_MS = 24 * 60 * 60 * 1_000
const RPC_RECEIPT_RESULT_LIMIT_BYTES = 64 * 1_024

const gameModeSchema = z.enum(['ai', 'voice', 'local'])
const chessEngineSchema = z.enum(['stockfish', 'moldable-ai', 'dumb'])
const difficultySchema = z.enum(['friendly', 'club', 'master'])
const chessColorSchema = z.enum(['white', 'black'])
const appViewSchema = z.enum(['play', 'learn', 'history'])
const playedBySchema = z.enum(['player', 'ai', 'voice', 'local'])
const uciSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/)

const storedMoveSchema = z
  .object({
    from: z.string().regex(/^[a-h][1-8]$/),
    to: z.string().regex(/^[a-h][1-8]$/),
    promotion: z
      .string()
      .regex(/^[qrbn]$/)
      .optional(),
    san: z.string().min(1).max(32),
    uci: uciSchema,
    fenBefore: z.string().min(1).max(120).optional(),
    fenAfter: z.string().min(1).max(120),
    playedBy: playedBySchema,
    check: z.boolean().optional(),
    checkmate: z.boolean().optional(),
    playedAt: z.string().datetime().optional(),
    revisionAfter: z.number().int().min(1).optional(),
    operationId: z.string().min(1).max(800).optional(),
    operationFingerprint: z.string().min(1).max(2_000).optional(),
  })
  .strict()

const storedGameSchema = z
  .object({
    id: z.string().min(1).max(120),
    revision: z.number().int().min(1).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
    title: z.string().min(1).max(160),
    mode: gameModeSchema,
    engine: chessEngineSchema.optional(),
    difficulty: difficultySchema,
    playerColor: chessColorSchema,
    startFen: z.string().min(1).max(120),
    currentFen: z.string().min(1).max(120),
    moves: z.array(storedMoveSchema).max(600),
    result: z.string().min(1).max(16),
    resultLabel: z.string().min(1).max(120),
    createdByOperationId: z.string().min(1).max(800).optional(),
    createdByOperationFingerprint: z.string().min(1).max(2_000).optional(),
  })
  .strict()

const storedSessionSchema = z
  .object({
    view: appViewSchema,
    game: storedGameSchema,
  })
  .strict()

const syncGameIntentSchema = z
  .object({
    id: z.string().min(1).max(120),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    operationId: z.string().min(1).max(800).optional(),
    action: z.literal('sync-game'),
    payload: z
      .object({
        gameId: z.string().min(1).max(120),
        revision: z.number().int().min(1),
      })
      .strict(),
  })
  .strict()

const newGameIntentSchema = z
  .object({
    id: z.string().min(1).max(120),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    operationId: z.string().min(1).max(800).optional(),
    action: z.literal('new-game'),
    payload: z
      .object({
        mode: gameModeSchema.optional(),
        engine: chessEngineSchema.optional(),
        difficulty: difficultySchema.optional(),
        playerColor: chessColorSchema.optional(),
      })
      .strict(),
  })
  .strict()

const moveIntentSchema = z
  .object({
    id: z.string().min(1).max(120),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    operationId: z.string().min(1).max(800).optional(),
    action: z.literal('move'),
    payload: z.object({ move: uciSchema }).strict(),
  })
  .strict()

const navigateIntentSchema = z
  .object({
    id: z.string().min(1).max(120),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    operationId: z.string().min(1).max(800).optional(),
    action: z.literal('navigate'),
    payload: z.object({ view: appViewSchema }).strict(),
  })
  .strict()

const tutorialIntentSchema = z
  .object({
    id: z.string().min(1).max(120),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    operationId: z.string().min(1).max(800).optional(),
    action: z.literal('tutorial'),
    payload: z
      .object({
        topic: z.string().min(1).max(120).optional(),
        difficulty: difficultySchema.optional(),
      })
      .strict(),
  })
  .strict()

const loadGameIntentSchema = z
  .object({
    id: z.string().min(1).max(120),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    operationId: z.string().min(1).max(800).optional(),
    action: z.literal('load-game'),
    payload: z.object({ gameId: z.string().min(1).max(120) }).strict(),
  })
  .strict()

const replayIntentSchema = z
  .object({
    id: z.string().min(1).max(120),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    operationId: z.string().min(1).max(800).optional(),
    action: z.literal('replay'),
    payload: z
      .object({
        command: z.enum(['play', 'pause', 'next', 'previous', 'restart']),
      })
      .strict(),
  })
  .strict()

const intentSchema = z.discriminatedUnion('action', [
  syncGameIntentSchema,
  newGameIntentSchema,
  moveIntentSchema,
  navigateIntentSchema,
  tutorialIntentSchema,
  loadGameIntentSchema,
  replayIntentSchema,
])

const claimSchema = z
  .object({
    claimId: z.string().min(1).max(120),
    consumerId: z.string().min(1).max(120),
    claimedAt: z.string().datetime(),
    leaseExpiresAt: z.string().datetime(),
    intent: intentSchema,
  })
  .strict()

const queueSchema = z
  .object({
    pending: z.array(intentSchema).max(UI_INTENT_LIMIT),
    activeClaim: claimSchema.nullable(),
  })
  .strict()

const rpcReceiptSchema = z
  .object({
    operationId: z.string().min(1).max(800),
    fingerprint: z.string().min(1).max(2_000),
    completedAt: z.string().datetime(),
    result: z.unknown(),
  })
  .strict()

type RpcReceipt = z.infer<typeof rpcReceiptSchema>

type UiIntentInput = (
  | {
      action: 'sync-game'
      payload: { gameId: string; revision: number }
    }
  | {
      action: 'new-game'
      payload: {
        mode?: GameMode
        engine?: ChessEngine
        difficulty?: Difficulty
        playerColor?: ChessColor
      }
    }
  | { action: 'move'; payload: { move: string } }
  | { action: 'navigate'; payload: { view: AppView } }
  | {
      action: 'tutorial'
      payload: { topic?: string; difficulty?: Difficulty }
    }
  | { action: 'load-game'; payload: { gameId: string } }
  | {
      action: 'replay'
      payload: { command: 'play' | 'pause' | 'next' | 'previous' | 'restart' }
    }
) & { operationId?: string }

export class ChessStateError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: 400 | 404 | 409 | 429 = 409,
    public readonly state?: ChessGameState,
  ) {
    super(message)
    this.name = 'ChessStateError'
  }
}

const workspaceTails = new Map<string, Promise<void>>()
const operationTails = new Map<string, Promise<void>>()
const revisionWaiters = new Map<string, Set<(revision: number) => void>>()

function gamesPath(dataDir: string): string {
  return safePath(dataDir, 'games.json')
}

function sessionPath(dataDir: string): string {
  return safePath(dataDir, 'session.json')
}

function uiIntentsPath(dataDir: string): string {
  return safePath(dataDir, 'ui-intents.json')
}

function legacyUiIntentPath(dataDir: string): string {
  return safePath(dataDir, 'ui-intent.json')
}

function rpcReceiptsPath(dataDir: string): string {
  return safePath(dataDir, 'rpc-operation-receipts.json')
}

async function withWorkspaceLock<T>(
  dataDir: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = workspaceTails.get(dataDir) ?? Promise.resolve()
  let release: () => void = () => {}
  const current = new Promise<void>((resolve) => {
    release = resolve
  })
  workspaceTails.set(dataDir, current)
  await previous

  try {
    return await operation()
  } finally {
    release()
    if (workspaceTails.get(dataDir) === current) {
      workspaceTails.delete(dataDir)
    }
  }
}

async function withOperationLock<T>(
  dataDir: string,
  operationId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const key = `${dataDir}\u001f${operationId}`
  const previous = operationTails.get(key) ?? Promise.resolve()
  let release: () => void = () => {}
  const current = new Promise<void>((resolve) => {
    release = resolve
  })
  operationTails.set(key, current)
  await previous

  try {
    return await operation()
  } finally {
    release()
    if (operationTails.get(key) === current) operationTails.delete(key)
  }
}

function normalizeGame(value: unknown): ChessGameRecord | null {
  const parsed = storedGameSchema.safeParse(value)
  if (!parsed.success) return null

  let chess
  try {
    chess = createChess(parsed.data.startFen)
  } catch {
    return null
  }

  const moves: ChessMoveRecord[] = []
  for (const storedMove of parsed.data.moves) {
    const fenBefore = chess.fen()
    const move = applyUciMove(chess, storedMove.uci)
    if (!move) return null
    moves.push({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      san: move.san,
      uci: `${move.from}${move.to}${move.promotion ?? ''}`,
      fenBefore,
      fenAfter: chess.fen(),
      playedBy: storedMove.playedBy,
      check: chess.inCheck(),
      checkmate: chess.isCheckmate(),
      playedAt: storedMove.playedAt,
      revisionAfter: storedMove.revisionAfter,
      operationId: storedMove.operationId,
      operationFingerprint: storedMove.operationFingerprint,
    })
  }

  const result = resultFor(chess)
  const updatedAt = parsed.data.updatedAt
  return {
    id: parsed.data.id,
    revision: Math.max(parsed.data.revision ?? 1, moves.length + 1),
    createdAt: parsed.data.createdAt,
    updatedAt,
    completedAt:
      result.result === '*'
        ? undefined
        : (parsed.data.completedAt ?? updatedAt),
    title:
      parsed.data.mode === 'voice' && parsed.data.title === 'You vs Voice'
        ? 'You vs Moldable'
        : parsed.data.title,
    mode: parsed.data.mode,
    engine: parsed.data.engine ?? 'moldable-ai',
    difficulty: parsed.data.difficulty,
    playerColor: parsed.data.playerColor,
    startFen: parsed.data.startFen,
    currentFen: chess.fen(),
    moves,
    ...result,
    createdByOperationId: parsed.data.createdByOperationId,
    createdByOperationFingerprint: parsed.data.createdByOperationFingerprint,
  }
}

function normalizeSession(value: unknown): ChessSession | null {
  const parsed = storedSessionSchema.safeParse(value)
  if (!parsed.success) return null
  const game = normalizeGame(parsed.data.game)
  return game ? { view: parsed.data.view, game } : null
}

async function readGamesUnlocked(dataDir: string): Promise<ChessGameRecord[]> {
  const stored = await readJson<unknown>(gamesPath(dataDir), [])
  if (!Array.isArray(stored)) return []
  return stored
    .map(normalizeGame)
    .filter((game): game is ChessGameRecord => game !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, HISTORY_LIMIT)
}

async function readSessionUnlocked(
  dataDir: string,
): Promise<ChessSession | null> {
  return normalizeSession(await readJson<unknown>(sessionPath(dataDir), null))
}

async function upsertGameUnlocked(
  dataDir: string,
  game: ChessGameRecord,
): Promise<void> {
  const games = await readGamesUnlocked(dataDir)
  const next = [game, ...games.filter((candidate) => candidate.id !== game.id)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, HISTORY_LIMIT)
  await writeJson(gamesPath(dataDir), next)
}

async function persistSessionUnlocked(
  dataDir: string,
  session: ChessSession,
): Promise<void> {
  await writeJson(sessionPath(dataDir), session)
  await upsertGameUnlocked(dataDir, session.game)
}

async function readRpcReceiptsUnlocked(dataDir: string): Promise<RpcReceipt[]> {
  const stored = await readJson<unknown>(rpcReceiptsPath(dataDir), [])
  if (!Array.isArray(stored)) return []
  const cutoff = Date.now() - RPC_RECEIPT_TTL_MS
  return stored
    .map((receipt) => rpcReceiptSchema.safeParse(receipt))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data)
    .filter((receipt) => Date.parse(receipt.completedAt) > cutoff)
    .slice(-RPC_RECEIPT_LIMIT)
}

async function writeRpcReceiptUnlocked(
  dataDir: string,
  receipt: RpcReceipt,
): Promise<void> {
  const serialized = JSON.stringify(receipt.result)
  if (Buffer.byteLength(serialized, 'utf8') > RPC_RECEIPT_RESULT_LIMIT_BYTES) {
    throw new ChessStateError(
      'idempotency_result_too_large',
      'The Chess operation result is too large to replay safely.',
      409,
    )
  }
  const current = await readRpcReceiptsUnlocked(dataDir)
  const next = [
    ...current.filter(
      (candidate) => candidate.operationId !== receipt.operationId,
    ),
    receipt,
  ].slice(-RPC_RECEIPT_LIMIT)
  await writeJson(rpcReceiptsPath(dataDir), next)
}

export async function runIdempotentRpcOperation<T>(
  dataDir: string,
  operationId: string | undefined,
  fingerprint: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (!operationId) return operation()
  if (Buffer.byteLength(operationId, 'utf8') > 800) {
    throw new ChessStateError(
      'invalid_idempotency_key',
      'The scoped Chess idempotency identity is too large.',
      400,
    )
  }
  if (Buffer.byteLength(fingerprint, 'utf8') > 2_000) {
    throw new ChessStateError(
      'invalid_operation_fingerprint',
      'The Chess operation parameters are too large.',
      400,
    )
  }

  return withOperationLock(dataDir, operationId, async () => {
    const existing = await withWorkspaceLock(dataDir, async () =>
      (await readRpcReceiptsUnlocked(dataDir)).find(
        (receipt) => receipt.operationId === operationId,
      ),
    )
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new ChessStateError(
          'idempotency_key_conflict',
          'The idempotency key was already used for a different Chess operation.',
          409,
        )
      }
      return existing.result as T
    }

    const result = await operation()
    await withWorkspaceLock(dataDir, () =>
      writeRpcReceiptUnlocked(dataDir, {
        operationId,
        fingerprint,
        completedAt: new Date().toISOString(),
        result,
      }),
    )
    return result
  })
}

function createGame(
  options?: {
    mode?: GameMode
    engine?: ChessEngine
    difficulty?: Difficulty
    playerColor?: ChessColor
  },
  operation?: { id: string; fingerprint: string },
): ChessGameRecord {
  const now = new Date().toISOString()
  const mode = options?.mode ?? 'ai'
  const engine = options?.engine ?? 'moldable-ai'
  const playerColor = options?.playerColor ?? 'white'
  const startFen = createChess().fen()
  return {
    id: crypto.randomUUID(),
    revision: 1,
    createdAt: now,
    updatedAt: now,
    title:
      mode === 'ai'
        ? `You vs ${
            engine === 'stockfish'
              ? 'Stockfish'
              : engine === 'dumb'
                ? 'Dumb mode'
                : 'Moldable AI'
          }`
        : mode === 'voice'
          ? 'You vs Moldable'
          : 'Local game',
    mode,
    engine,
    difficulty: options?.difficulty ?? 'club',
    playerColor,
    startFen,
    currentFen: startFen,
    moves: [],
    result: '*',
    resultLabel: 'In progress',
    createdByOperationId: operation?.id,
    createdByOperationFingerprint: operation?.fingerprint,
  }
}

function actorFor(game: ChessGameRecord, sideToMove: ChessColor): GameActor {
  if (game.result !== '*') return 'none'
  if (game.mode === 'local') return 'local'
  if (sideToMove === game.playerColor) return 'human'
  return game.mode === 'voice' ? 'voice' : 'ai'
}

function stateMove(move: ChessMoveRecord) {
  return {
    san: move.san,
    uci: move.uci,
    playedBy: move.playedBy,
    fenBefore: move.fenBefore ?? '',
    fenAfter: move.fenAfter,
    check: move.check ?? false,
    checkmate: move.checkmate ?? false,
  }
}

export function toGameState(game: ChessGameRecord): ChessGameState {
  const chess = createChess(game.currentFen)
  const sideToMove = chess.turn() === 'w' ? 'white' : 'black'
  const recentMoves = game.moves.slice(-RECENT_MOVE_LIMIT).map(stateMove)
  const voiceColor =
    game.mode === 'voice'
      ? game.playerColor === 'white'
        ? 'black'
        : 'white'
      : null
  const moveNumber = Math.max(
    1,
    Number.parseInt(game.currentFen.split(' ')[5] ?? '1', 10) || 1,
  )

  return {
    changed: true,
    gameId: game.id,
    revision: game.revision,
    mode: game.mode,
    engine: game.engine,
    status: game.result === '*' ? 'active' : 'completed',
    result: game.result,
    resultLabel: game.resultLabel,
    fen: game.currentFen,
    sideToMove,
    actorToMove: actorFor(game, sideToMove),
    humanColor: game.playerColor,
    voiceColor,
    roles: {
      player: {
        actor: 'human',
        color: game.playerColor,
      },
      voice: {
        actor: 'voice',
        color: voiceColor,
        role: game.mode === 'voice' ? 'opponent' : 'observer',
      },
    },
    inCheck: chess.inCheck(),
    moveNumber,
    lastMove:
      game.moves.length > 0
        ? stateMove(game.moves[game.moves.length - 1])
        : null,
    recentMoves,
    legalMoves:
      game.result === '*'
        ? legalUciMoves(chess).slice(0, LEGAL_MOVE_LIMIT)
        : [],
  }
}

function signalKey(dataDir: string, gameId: string): string {
  return `${dataDir}\u001f${gameId}`
}

function notifyRevision(
  dataDir: string,
  gameId: string,
  revision: number,
): void {
  const listeners = revisionWaiters.get(signalKey(dataDir, gameId))
  if (!listeners) return
  for (const listener of [...listeners]) listener(revision)
}

function normalizeQueue(
  queue: ChessUiIntentQueue,
  now = Date.now(),
): ChessUiIntentQueue {
  let activeClaim = queue.activeClaim
  const pending = queue.pending.filter(
    (intent) => Date.parse(intent.expiresAt) > now,
  )

  if (
    activeClaim &&
    (Date.parse(activeClaim.leaseExpiresAt) <= now ||
      Date.parse(activeClaim.intent.expiresAt) <= now)
  ) {
    if (Date.parse(activeClaim.intent.expiresAt) > now) {
      pending.unshift(activeClaim.intent)
    }
    activeClaim = null
  }

  return {
    pending: pending.slice(0, UI_INTENT_LIMIT - (activeClaim === null ? 0 : 1)),
    activeClaim,
  }
}

function migrateLegacyIntent(value: unknown): ChessUiIntent | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.createdAt !== 'string'
  ) {
    return null
  }
  const createdAtMs = Date.parse(candidate.createdAt)
  if (!Number.isFinite(createdAtMs)) return null
  const parsed = intentSchema.safeParse({
    ...candidate,
    expiresAt: new Date(createdAtMs + UI_INTENT_TTL_MS).toISOString(),
  })
  return parsed.success ? parsed.data : null
}

async function readQueueUnlocked(dataDir: string): Promise<ChessUiIntentQueue> {
  const stored = await readJson<unknown>(uiIntentsPath(dataDir), null)
  const parsed = queueSchema.safeParse(stored)
  if (parsed.success) return normalizeQueue(parsed.data)

  const legacy = migrateLegacyIntent(
    await readJson<unknown>(legacyUiIntentPath(dataDir), null),
  )
  const queue = normalizeQueue({
    pending: legacy ? [legacy] : [],
    activeClaim: null,
  })
  if (legacy) {
    await writeJson(legacyUiIntentPath(dataDir), null)
  }
  return queue
}

async function writeQueueUnlocked(
  dataDir: string,
  queue: ChessUiIntentQueue,
): Promise<void> {
  await writeJson(uiIntentsPath(dataDir), normalizeQueue(queue))
}

async function enqueueIntentUnlocked(
  dataDir: string,
  input: UiIntentInput,
): Promise<ChessUiIntent> {
  const queue = await readQueueUnlocked(dataDir)
  if (input.operationId) {
    const existing =
      queue.activeClaim?.intent.operationId === input.operationId
        ? queue.activeClaim.intent
        : queue.pending.find(
            (intent) => intent.operationId === input.operationId,
          )
    if (existing) return existing
  }
  if (input.action === 'sync-game') {
    queue.pending = queue.pending.filter(
      (intent) => intent.action !== 'sync-game',
    )
    const activeSync =
      queue.activeClaim?.intent.action === 'sync-game'
        ? queue.activeClaim.intent
        : null
    if (
      activeSync?.payload.gameId === input.payload.gameId &&
      activeSync.payload.revision >= input.payload.revision
    ) {
      await writeQueueUnlocked(dataDir, queue)
      return activeSync
    }
  }
  const occupied = queue.pending.length + (queue.activeClaim === null ? 0 : 1)
  const capacity =
    input.action === 'sync-game' ? UI_INTENT_LIMIT : UI_INTENT_LIMIT - 1
  if (occupied >= capacity) {
    if (input.action === 'sync-game') {
      const now = Date.now()
      return intentSchema.parse({
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + UI_INTENT_TTL_MS).toISOString(),
      })
    }
    throw new ChessStateError(
      'intent_queue_full',
      'Chess is still applying earlier controls. Try again shortly.',
      429,
    )
  }

  const now = Date.now()
  const intent = intentSchema.parse({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + UI_INTENT_TTL_MS).toISOString(),
  })
  queue.pending.push(intent)
  await writeQueueUnlocked(dataDir, queue)
  return intent
}

async function ensureSessionUnlocked(dataDir: string): Promise<ChessSession> {
  const session = await readSessionUnlocked(dataDir)
  if (session) return session

  const latest = (await readGamesUnlocked(dataDir)).find(
    (game) => game.result === '*',
  )
  const next: ChessSession = {
    view: 'play',
    game: latest ?? createGame(),
  }
  await persistSessionUnlocked(dataDir, next)
  return next
}

export async function getUiSession(dataDir: string): Promise<ChessSession> {
  return withWorkspaceLock(dataDir, () => ensureSessionUnlocked(dataDir))
}

export async function getSession(
  dataDir: string,
): Promise<ChessSession | null> {
  return withWorkspaceLock(dataDir, () => readSessionUnlocked(dataDir))
}

export async function getGames(dataDir: string): Promise<ChessGameRecord[]> {
  return withWorkspaceLock(dataDir, () => readGamesUnlocked(dataDir))
}

export async function getGame(
  dataDir: string,
  gameId: string,
): Promise<ChessGameRecord | null> {
  return withWorkspaceLock(dataDir, async () => {
    const session = await readSessionUnlocked(dataDir)
    if (session?.game.id === gameId) return session.game
    return (
      (await readGamesUnlocked(dataDir)).find((game) => game.id === gameId) ??
      null
    )
  })
}

export async function startNewGame(
  dataDir: string,
  options?: {
    mode?: GameMode
    engine?: ChessEngine
    difficulty?: Difficulty
    playerColor?: ChessColor
  },
  enqueuePresentation = true,
  operation?: { id: string; fingerprint: string },
): Promise<ChessSession> {
  return withWorkspaceLock(dataDir, async () => {
    if (operation) {
      const current = await readSessionUnlocked(dataDir)
      const games = await readGamesUnlocked(dataDir)
      const replay =
        current?.game.createdByOperationId === operation.id
          ? current.game
          : games.find((game) => game.createdByOperationId === operation.id)
      if (replay) {
        if (replay.createdByOperationFingerprint !== operation.fingerprint) {
          throw new ChessStateError(
            'idempotency_key_conflict',
            'The idempotency key was already used for different new-game parameters.',
            409,
          )
        }
        return { view: 'play', game: replay }
      }
    }

    const session = {
      view: 'play' as const,
      game: createGame(options, operation),
    }
    await persistSessionUnlocked(dataDir, session)
    if (enqueuePresentation) {
      await enqueueIntentUnlocked(dataDir, {
        action: 'sync-game',
        payload: {
          gameId: session.game.id,
          revision: session.game.revision,
        },
        operationId: operation?.id,
      })
    }
    notifyRevision(dataDir, session.game.id, session.game.revision)
    return session
  })
}

export async function setViewAndEnqueue(
  dataDir: string,
  view: AppView,
  intent?: UiIntentInput,
  operationId?: string,
): Promise<ChessSession> {
  return withWorkspaceLock(dataDir, async () => {
    const current = await ensureSessionUnlocked(dataDir)
    const session = { ...current, view }
    await writeJson(sessionPath(dataDir), session)
    await enqueueIntentUnlocked(
      dataDir,
      intent ?? {
        action: 'sync-game',
        payload: {
          gameId: session.game.id,
          revision: session.game.revision,
        },
        operationId,
      },
    )
    return session
  })
}

export async function setSessionView(
  dataDir: string,
  view: AppView,
): Promise<ChessSession> {
  return withWorkspaceLock(dataDir, async () => {
    const current = await ensureSessionUnlocked(dataDir)
    const session = { ...current, view }
    await writeJson(sessionPath(dataDir), session)
    return session
  })
}

function modeMatches(
  game: ChessGameRecord,
  opponent: 'voice' | 'ai' | 'any',
): boolean {
  return opponent === 'any' || game.mode === opponent
}

export async function resumeGame(
  dataDir: string,
  opponent: 'voice' | 'ai' | 'any' = 'any',
): Promise<ChessGameState> {
  return withWorkspaceLock(dataDir, async () => {
    const session = await readSessionUnlocked(dataDir)
    const games = await readGamesUnlocked(dataDir)
    const candidate =
      session?.game.result === '*' && modeMatches(session.game, opponent)
        ? session.game
        : games.find(
            (game) => game.result === '*' && modeMatches(game, opponent),
          )
    if (!candidate) {
      throw new ChessStateError(
        'no_unfinished_game',
        `No unfinished ${opponent === 'any' ? '' : `${opponent} `}chess game was found.`.replace(
          '  ',
          ' ',
        ),
        404,
      )
    }

    const resumed = { view: 'play' as const, game: candidate }
    await persistSessionUnlocked(dataDir, resumed)
    await enqueueIntentUnlocked(dataDir, {
      action: 'sync-game',
      payload: {
        gameId: candidate.id,
        revision: candidate.revision,
      },
    })
    return toGameState(candidate)
  })
}

function expectedActorColor(
  game: ChessGameRecord,
  actor: Exclude<GameActor, 'none'>,
): ChessColor | null {
  if (actor === 'human') return game.playerColor
  if (actor === 'voice') {
    if (game.mode !== 'voice') return null
    return game.playerColor === 'white' ? 'black' : 'white'
  }
  if (actor === 'ai') {
    if (game.mode !== 'ai') return null
    return game.playerColor === 'white' ? 'black' : 'white'
  }
  return game.mode === 'local'
    ? createChess(game.currentFen).turn() === 'w'
      ? 'white'
      : 'black'
    : null
}

function playedByForActor(
  actor: Exclude<GameActor, 'none'>,
): ChessMoveRecord['playedBy'] {
  if (actor === 'human') return 'player'
  return actor
}

function replayMoveOperation(
  game: ChessGameRecord,
  operation: { id: string; fingerprint: string },
): ChessGameState | null {
  const moveIndex = game.moves.findIndex(
    (move) => move.operationId === operation.id,
  )
  if (moveIndex < 0) return null
  const move = game.moves[moveIndex]
  if (move.operationFingerprint !== operation.fingerprint) {
    throw new ChessStateError(
      'idempotency_key_conflict',
      'The idempotency key was already used for a different Chess move.',
      409,
    )
  }
  const chess = createChess(move.fenAfter)
  const result = resultFor(chess)
  const replayed: ChessGameRecord = {
    ...game,
    revision: move.revisionAfter ?? game.revision,
    updatedAt: move.playedAt ?? game.updatedAt,
    completedAt:
      result.result === '*' ? undefined : (move.playedAt ?? game.updatedAt),
    currentFen: move.fenAfter,
    moves: game.moves.slice(0, moveIndex + 1),
    ...result,
  }
  return toGameState(replayed)
}

export async function submitMove(
  dataDir: string,
  input: {
    gameId: string
    expectedRevision: number
    move: string
    actor: Exclude<GameActor, 'none'>
    enqueuePresentation?: boolean
    operation?: { id: string; fingerprint: string }
  },
): Promise<ChessGameState> {
  return withWorkspaceLock(dataDir, async () => {
    const session = await readSessionUnlocked(dataDir)
    if (input.operation) {
      const game =
        session?.game.id === input.gameId
          ? session.game
          : (await readGamesUnlocked(dataDir)).find(
              (candidate) => candidate.id === input.gameId,
            )
      if (game) {
        const replay = replayMoveOperation(game, input.operation)
        if (replay) return replay
      }
    }
    if (!session || session.game.id !== input.gameId) {
      throw new ChessStateError(
        'game_not_active',
        'That game is not active.',
        409,
      )
    }
    const game = session.game
    const currentState = toGameState(game)
    if (game.revision !== input.expectedRevision) {
      throw new ChessStateError(
        'revision_conflict',
        `Expected revision ${input.expectedRevision}, but the game is at revision ${game.revision}.`,
        409,
        currentState,
      )
    }
    if (game.result !== '*') {
      throw new ChessStateError(
        'game_over',
        `The game is over: ${game.resultLabel}.`,
        409,
        currentState,
      )
    }

    const chess = createChess(game.currentFen)
    const sideToMove = chess.turn() === 'w' ? 'white' : 'black'
    const actorColor = expectedActorColor(game, input.actor)
    if (!actorColor || actorColor !== sideToMove) {
      throw new ChessStateError(
        'not_actor_turn',
        `${currentState.actorToMove} must move at revision ${game.revision}.`,
        409,
        currentState,
      )
    }

    const fenBefore = chess.fen()
    const move = applyUciMove(chess, input.move)
    if (!move) {
      throw new ChessStateError(
        'illegal_move',
        `Move ${input.move} is illegal at revision ${game.revision}.`,
        400,
        currentState,
      )
    }

    const now = new Date().toISOString()
    const result = resultFor(chess)
    const nextGame: ChessGameRecord = {
      ...game,
      revision: game.revision + 1,
      updatedAt: now,
      completedAt: result.result === '*' ? undefined : now,
      currentFen: chess.fen(),
      moves: [
        ...game.moves,
        {
          from: move.from,
          to: move.to,
          promotion: move.promotion,
          san: move.san,
          uci: `${move.from}${move.to}${move.promotion ?? ''}`,
          fenBefore,
          fenAfter: chess.fen(),
          playedBy: playedByForActor(input.actor),
          check: chess.inCheck(),
          checkmate: chess.isCheckmate(),
          playedAt: now,
          revisionAfter: game.revision + 1,
          operationId: input.operation?.id,
          operationFingerprint: input.operation?.fingerprint,
        },
      ],
      ...result,
    }
    const nextSession = { view: 'play' as const, game: nextGame }
    await persistSessionUnlocked(dataDir, nextSession)
    if (input.enqueuePresentation !== false) {
      await enqueueIntentUnlocked(dataDir, {
        action: 'sync-game',
        payload: { gameId: nextGame.id, revision: nextGame.revision },
        operationId: input.operation?.id,
      })
    }
    notifyRevision(dataDir, nextGame.id, nextGame.revision)
    return toGameState(nextGame)
  })
}

export async function undoMoves(
  dataDir: string,
  input: {
    gameId: string
    expectedRevision: number
    enqueuePresentation?: boolean
  },
): Promise<ChessSession> {
  return withWorkspaceLock(dataDir, async () => {
    const session = await readSessionUnlocked(dataDir)
    if (!session || session.game.id !== input.gameId) {
      throw new ChessStateError(
        'game_not_active',
        'That game is not active.',
        409,
      )
    }
    const game = session.game
    if (game.revision !== input.expectedRevision) {
      throw new ChessStateError(
        'revision_conflict',
        `Expected revision ${input.expectedRevision}, but the game is at revision ${game.revision}.`,
        409,
        toGameState(game),
      )
    }
    if (game.moves.length === 0) {
      throw new ChessStateError(
        'nothing_to_undo',
        'There are no moves to undo.',
      )
    }

    const removeCount = game.mode === 'ai' && game.moves.length > 1 ? 2 : 1
    const remaining = game.moves.slice(
      0,
      Math.max(0, game.moves.length - removeCount),
    )
    const chess = createChess(game.startFen)
    for (const move of remaining) {
      if (!applyUciMove(chess, move.uci)) {
        throw new ChessStateError(
          'corrupt_history',
          'The saved move history could not be replayed.',
        )
      }
    }
    const now = new Date().toISOString()
    const result = resultFor(chess)
    const nextGame: ChessGameRecord = {
      ...game,
      revision: game.revision + 1,
      updatedAt: now,
      completedAt: result.result === '*' ? undefined : now,
      currentFen: chess.fen(),
      moves: remaining,
      ...result,
    }
    const nextSession = { view: 'play' as const, game: nextGame }
    await persistSessionUnlocked(dataDir, nextSession)
    if (input.enqueuePresentation) {
      await enqueueIntentUnlocked(dataDir, {
        action: 'sync-game',
        payload: { gameId: nextGame.id, revision: nextGame.revision },
      })
    }
    notifyRevision(dataDir, nextGame.id, nextGame.revision)
    return nextSession
  })
}

async function findGameUnlocked(
  dataDir: string,
  gameId?: string,
): Promise<ChessGameRecord | null> {
  const session = await readSessionUnlocked(dataDir)
  if (!gameId) return session?.game ?? null
  if (session?.game.id === gameId) return session.game
  return (
    (await readGamesUnlocked(dataDir)).find((game) => game.id === gameId) ??
    null
  )
}

export async function getGameState(
  dataDir: string,
  input: { gameId?: string; afterRevision?: number } = {},
): Promise<ChessGameStateResult> {
  return withWorkspaceLock(dataDir, async () => {
    const game = await findGameUnlocked(dataDir, input.gameId)
    if (!game) {
      throw new ChessStateError('no_game', 'No chess game was found.', 404)
    }
    if (
      input.afterRevision !== undefined &&
      game.revision <= input.afterRevision
    ) {
      return {
        changed: false,
        gameId: game.id,
        revision: game.revision,
      }
    }
    return toGameState(game)
  })
}

function waitForRevisionSignal(
  dataDir: string,
  gameId: string,
  afterRevision: number,
  timeoutMs: number,
): { promise: Promise<void>; cancel: () => void } {
  const key = signalKey(dataDir, gameId)
  let cancel = () => {}
  const promise = new Promise<void>((resolve) => {
    let listeners = revisionWaiters.get(key)
    if (!listeners) {
      listeners = new Set()
      revisionWaiters.set(key, listeners)
    }

    const cleanup = () => {
      clearTimeout(timeout)
      listeners?.delete(onRevision)
      if (listeners?.size === 0) revisionWaiters.delete(key)
    }
    cancel = cleanup
    const onRevision = (revision: number) => {
      if (revision <= afterRevision) return
      cleanup()
      resolve()
    }
    listeners.add(onRevision)
    const timeout = setTimeout(() => {
      cleanup()
      resolve()
    }, timeoutMs)
  })
  return { promise, cancel }
}

export async function waitForGameChange(
  dataDir: string,
  input: {
    gameId: string
    afterRevision: number
    timeoutMs?: number
  },
): Promise<ChessGameStateResult> {
  const immediate = await getGameState(dataDir, input)
  if (immediate.changed) return immediate

  const timeoutMs = Math.max(
    0,
    Math.min(input.timeoutMs ?? WAIT_DEFAULT_MS, WAIT_MAX_MS),
  )
  const signal = waitForRevisionSignal(
    dataDir,
    input.gameId,
    input.afterRevision,
    timeoutMs,
  )

  const afterRegistration = await getGameState(dataDir, input)
  if (afterRegistration.changed) {
    signal.cancel()
    return afterRegistration
  }

  await signal.promise
  return getGameState(dataDir, input)
}

export async function enqueueUiIntent(
  dataDir: string,
  input: UiIntentInput,
): Promise<ChessUiIntent> {
  return withWorkspaceLock(dataDir, () => enqueueIntentUnlocked(dataDir, input))
}

export async function claimUiIntent(
  dataDir: string,
  consumerId: string,
): Promise<ChessUiIntentClaim | null> {
  return withWorkspaceLock(dataDir, async () => {
    const queue = await readQueueUnlocked(dataDir)
    if (queue.activeClaim || queue.pending.length === 0) {
      await writeQueueUnlocked(dataDir, queue)
      return null
    }

    const intent = queue.pending.shift()
    if (!intent) return null
    const now = Date.now()
    const claim: ChessUiIntentClaim = {
      claimId: crypto.randomUUID(),
      consumerId,
      claimedAt: new Date(now).toISOString(),
      leaseExpiresAt: new Date(now + UI_INTENT_LEASE_MS).toISOString(),
      intent,
    }
    queue.activeClaim = claim
    await writeQueueUnlocked(dataDir, queue)
    return claim
  })
}

export async function ackUiIntent(
  dataDir: string,
  input: { claimId: string; consumerId: string },
): Promise<boolean> {
  return withWorkspaceLock(dataDir, async () => {
    const queue = await readQueueUnlocked(dataDir)
    if (
      queue.activeClaim?.claimId !== input.claimId ||
      queue.activeClaim.consumerId !== input.consumerId
    ) {
      await writeQueueUnlocked(dataDir, queue)
      return false
    }
    queue.activeClaim = null
    await writeQueueUnlocked(dataDir, queue)
    return true
  })
}

export async function releaseUiIntent(
  dataDir: string,
  input: { claimId: string; consumerId: string },
): Promise<boolean> {
  return withWorkspaceLock(dataDir, async () => {
    const queue = await readQueueUnlocked(dataDir)
    if (
      queue.activeClaim?.claimId !== input.claimId ||
      queue.activeClaim.consumerId !== input.consumerId
    ) {
      await writeQueueUnlocked(dataDir, queue)
      return false
    }
    const intent = queue.activeClaim.intent
    queue.activeClaim = null
    if (Date.parse(intent.expiresAt) > Date.now()) {
      queue.pending.unshift(intent)
    }
    await writeQueueUnlocked(dataDir, queue)
    return true
  })
}
