import { writeJson } from '@moldable-ai/storage'
import type {
  ChessGameRecord,
  ChessGameState,
  ChessGameStateResult,
  ChessSession,
  ChessUiIntentClaim,
} from '../shared/types'
import { app } from './app'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

type RpcSuccess<T> = { ok: true; result: T }
type RpcFailure = {
  ok: false
  error: { code: string; message: string; state?: ChessGameState }
}

async function requestJson<T>(
  pathname: string,
  init?: RequestInit,
): Promise<{ response: Response; body: T }> {
  const response = await app.request(pathname, init)
  return {
    response,
    body: (await response.json()) as T,
  }
}

async function rpc<T>(
  method: string,
  params: Record<string, unknown> = {},
  operationId?: string,
): Promise<{ response: Response; body: RpcSuccess<T> | RpcFailure }> {
  return requestJson<RpcSuccess<T> | RpcFailure>('/api/moldable/rpc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(operationId ? { 'x-moldable-idempotency-key': operationId } : {}),
    },
    body: JSON.stringify({ method, params }),
  })
}

async function newGame(
  mode: 'ai' | 'voice' | 'local',
  playerColor: 'white' | 'black' = 'white',
): Promise<ChessSession> {
  const { response, body } = await requestJson<ChessSession>('/api/game/new', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, playerColor, difficulty: 'club' }),
  })
  expect(response.status).toBe(200)
  return body
}

async function uiMove(
  session: ChessSession,
  move: string,
  actor: 'human' | 'ai' | 'local',
): Promise<{ response: Response; session?: ChessSession }> {
  const { response, body } = await requestJson<
    { session: ChessSession } | { error: string }
  >('/api/game/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameId: session.game.id,
      expectedRevision: session.game.revision,
      move,
      actor,
    }),
  })
  return {
    response,
    session: 'session' in body ? body.session : undefined,
  }
}

describe.sequential('revisioned Chess game RPC', () => {
  const originalDataDir = process.env.MOLDABLE_APP_DATA_DIR
  let dataDir = ''

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), 'moldable-chess-rpc-'))
    process.env.MOLDABLE_APP_DATA_DIR = dataDir
  })

  afterEach(async () => {
    if (originalDataDir === undefined) {
      delete process.env.MOLDABLE_APP_DATA_DIR
    } else {
      process.env.MOLDABLE_APP_DATA_DIR = originalDataDir
    }
    await rm(dataDir, { recursive: true, force: true })
  })

  it('resumes the latest unfinished matching game and persists play before presentation', async () => {
    const voice = await newGame('voice')
    const humanMove = await uiMove(voice, 'e2e4', 'human')
    expect(humanMove.response.status).toBe(200)
    expect(humanMove.session?.game.revision).toBe(2)

    await newGame('ai')
    await requestJson('/api/session/view', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ view: 'learn' }),
    })

    const resumed = await rpc<ChessGameState>('chess.game.resume', {
      opponent: 'voice',
    })
    expect(resumed.response.status).toBe(200)
    expect(resumed.body.ok).toBe(true)
    if (!resumed.body.ok) return
    expect(resumed.body.result).toMatchObject({
      gameId: voice.game.id,
      revision: 2,
      mode: 'voice',
      sideToMove: 'black',
      actorToMove: 'voice',
      humanColor: 'white',
      voiceColor: 'black',
    })
    expect(resumed.body.result.legalMoves).toContain('e7e5')

    const persisted = await requestJson<ChessSession>('/api/session')
    expect(persisted.body.view).toBe('play')
    expect(persisted.body.game.id).toBe(voice.game.id)
    expect(persisted.body.game.revision).toBe(2)

    const claim = await requestJson<ChessUiIntentClaim | null>(
      '/api/moldable/ui-intent/claim',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumerId: 'cold-window' }),
      },
    )
    expect(claim.body?.intent).toMatchObject({
      action: 'sync-game',
      payload: { gameId: voice.game.id, revision: 2 },
    })
  })

  it('presents Moldable for new and saved conversational games across app and chat clients', async () => {
    const session = await newGame('voice')
    expect(session.game.title).toBe('You vs Moldable')
    const moved = await uiMove(session, 'e2e4', 'human')
    expect(moved.session).toBeDefined()
    if (!moved.session) return
    const legacyGame = { ...moved.session.game, title: 'You vs Voice' }
    await writeJson(path.join(dataDir, 'session.json'), {
      view: 'play',
      game: legacyGame,
    })
    await writeJson(path.join(dataDir, 'games.json'), [legacyGame])

    const restored = await requestJson<ChessSession>('/api/session')
    const history = await requestJson<ChessGameRecord[]>('/api/games')
    const card = await rpc<ChessGameState & { title: string }>(
      'chess.cards.read',
      { gameId: legacyGame.id },
    )
    expect(restored.body.game).toMatchObject({
      ...legacyGame,
      title: 'You vs Moldable',
    })
    expect(history.body[0]?.title).toBe('You vs Moldable')
    expect(card.body.ok).toBe(true)
    if (card.body.ok) {
      expect(card.body.result).toMatchObject({
        title: 'You vs Moldable',
        gameId: legacyGame.id,
        revision: legacyGame.revision,
        fen: legacyGame.currentFen,
        actorToMove: 'voice',
      })
    }
  })

  it('persists the selected AI engine across session reloads', async () => {
    const created = await requestJson<ChessSession>('/api/game/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'ai',
        engine: 'stockfish',
        playerColor: 'white',
        difficulty: 'club',
      }),
    })
    const restored = await requestJson<ChessSession>('/api/session')

    expect(created.response.status).toBe(200)
    expect(created.body.game.engine).toBe('stockfish')
    expect(restored.body.game.engine).toBe('stockfish')
  })

  it('does not silently create a game when resume has no match', async () => {
    const resumed = await rpc<ChessGameState>('chess.game.resume', {
      opponent: 'voice',
    })
    expect(resumed.response.status).toBe(404)
    expect(resumed.body.ok).toBe(false)
    if (!resumed.body.ok) {
      expect(resumed.body.error.code).toBe('no_unfinished_game')
    }
  })

  it('commits Voice moves before success and enforces revision, mode, and turn ownership', async () => {
    const voice = await newGame('voice')

    const wrongTurn = await rpc<ChessGameState>('chess.game.submitMove', {
      gameId: voice.game.id,
      expectedRevision: voice.game.revision,
      move: 'e2e4',
    })
    expect(wrongTurn.response.status).toBe(409)
    expect(wrongTurn.body.ok).toBe(false)
    if (!wrongTurn.body.ok) {
      expect(wrongTurn.body.error.code).toBe('not_actor_turn')
    }

    const humanMove = await uiMove(voice, 'e2e4', 'human')
    expect(humanMove.response.status).toBe(200)
    const afterHuman = humanMove.session
    expect(afterHuman?.game.revision).toBe(2)
    if (!afterHuman) return

    const voiceMoveParams = {
      gameId: afterHuman.game.id,
      expectedRevision: afterHuman.game.revision,
      move: 'e7e5',
    }
    const voiceMove = await rpc<ChessGameState>(
      'chess.game.submitMove',
      voiceMoveParams,
      'voice-turn-1',
    )
    expect(voiceMove.response.status).toBe(200)
    expect(voiceMove.body.ok).toBe(true)
    if (!voiceMove.body.ok) return
    expect(voiceMove.body.result).toMatchObject({
      revision: 3,
      sideToMove: 'white',
      actorToMove: 'human',
      lastMove: {
        uci: 'e7e5',
        san: 'e5',
        playedBy: 'voice',
        check: false,
        checkmate: false,
      },
    })
    expect(voiceMove.body.result.lastMove?.fenBefore).not.toBe('')
    expect(voiceMove.body.result.lastMove?.fenAfter).toBe(
      voiceMove.body.result.fen,
    )

    // Simulate a process loss after the game commit but before its generic
    // response receipt was durably available.
    await writeJson(path.join(dataDir, 'rpc-operation-receipts.json'), [])
    const replayed = await rpc<ChessGameState>(
      'chess.game.submitMove',
      voiceMoveParams,
      'voice-turn-1',
    )
    expect(replayed.response.status).toBe(200)
    expect(replayed.body).toEqual(voiceMove.body)

    const keyConflict = await rpc<ChessGameState>(
      'chess.game.submitMove',
      { ...voiceMoveParams, move: 'b8c6' },
      'voice-turn-1',
    )
    expect(keyConflict.response.status).toBe(409)
    expect(keyConflict.body.ok).toBe(false)
    if (!keyConflict.body.ok) {
      expect(keyConflict.body.error.code).toBe('idempotency_key_conflict')
    }

    const immediate = await rpc<ChessGameStateResult>('chess.game.state', {
      gameId: voice.game.id,
      afterRevision: 2,
    })
    expect(immediate.body.ok).toBe(true)
    if (immediate.body.ok) {
      expect(immediate.body.result).toEqual(voiceMove.body.result)
    }

    const stale = await rpc<ChessGameState>('chess.game.submitMove', {
      gameId: afterHuman.game.id,
      expectedRevision: afterHuman.game.revision,
      move: 'b8c6',
    })
    expect(stale.response.status).toBe(409)
    expect(stale.body.ok).toBe(false)
    if (!stale.body.ok) {
      expect(stale.body.error.code).toBe('revision_conflict')
      expect(stale.body.error.state?.revision).toBe(3)
    }

    const ai = await newGame('ai', 'black')
    const wrongMode = await rpc<ChessGameState>('chess.game.submitMove', {
      gameId: ai.game.id,
      expectedRevision: ai.game.revision,
      move: 'e2e4',
    })
    expect(wrongMode.response.status).toBe(409)
    expect(wrongMode.body.ok).toBe(false)
    if (!wrongMode.body.ok) {
      expect(wrongMode.body.error.code).toBe('not_actor_turn')
    }
  })

  it('replays a retried new-game operation instead of creating a duplicate', async () => {
    const params = {
      mode: 'voice',
      playerColor: 'white',
      difficulty: 'club',
    }
    const first = await rpc<ChessGameState>(
      'chess.ui.newGame',
      params,
      'new-voice-game',
    )
    await writeJson(path.join(dataDir, 'rpc-operation-receipts.json'), [])
    const retry = await rpc<ChessGameState>(
      'chess.ui.newGame',
      params,
      'new-voice-game',
    )

    expect(first.response.status).toBe(200)
    expect(retry.body).toEqual(first.body)
    const games = await requestJson<ChessGameRecord[]>('/api/games')
    expect(games.body).toHaveLength(1)
  })

  it('accepts only the canonical bounded idempotency header', async () => {
    const params = {
      mode: 'voice',
      playerColor: 'white',
      difficulty: 'club',
    }
    const legacyRequest = () =>
      requestJson<RpcSuccess<ChessGameState> | RpcFailure>(
        '/api/moldable/rpc',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-moldable-operation-id': 'legacy-operation-key',
          },
          body: JSON.stringify({ method: 'chess.ui.newGame', params }),
        },
      )
    const firstLegacy = await legacyRequest()
    const secondLegacy = await legacyRequest()
    expect(firstLegacy.response.status).toBe(200)
    expect(secondLegacy.response.status).toBe(200)
    expect(firstLegacy.body.ok).toBe(true)
    expect(secondLegacy.body.ok).toBe(true)
    if (!firstLegacy.body.ok || !secondLegacy.body.ok) return
    expect(secondLegacy.body.result.gameId).not.toBe(
      firstLegacy.body.result.gameId,
    )

    const tooLong = await rpc<ChessGameState>(
      'chess.ui.newGame',
      params,
      'é'.repeat(257),
    )
    expect(tooLong.response.status).toBe(400)
    expect(tooLong.body.ok).toBe(false)
    if (!tooLong.body.ok) {
      expect(tooLong.body.error.code).toBe('invalid_idempotency_key')
    }
  })

  it('serializes simultaneous UI transitions with compare-and-set', async () => {
    const local = await newGame('local')
    const [first, second] = await Promise.all([
      uiMove(local, 'e2e4', 'local'),
      uiMove(local, 'd2d4', 'local'),
    ])
    expect([first.response.status, second.response.status].sort()).toEqual([
      200, 409,
    ])

    const state = await rpc<ChessGameState>('chess.game.state', {
      gameId: local.game.id,
    })
    expect(state.body.ok).toBe(true)
    if (!state.body.ok) return
    expect(state.body.result.revision).toBe(2)
    expect(state.body.result.recentMoves).toHaveLength(1)
  })

  it('bounds structured move history while preserving the current position', async () => {
    let session = await newGame('local')
    const line = [
      'e2e4',
      'e7e5',
      'g1f3',
      'b8c6',
      'f1b5',
      'a7a6',
      'b5a4',
      'g8f6',
      'e1g1',
      'f8e7',
      'f1e1',
      'b7b5',
      'a4b3',
      'd7d6',
    ]
    for (const move of line) {
      const committed = await uiMove(session, move, 'local')
      expect(committed.response.status).toBe(200)
      expect(committed.session).toBeDefined()
      if (committed.session) session = committed.session
    }

    const state = await rpc<ChessGameState>('chess.game.state', {
      gameId: session.game.id,
    })
    expect(state.body.ok).toBe(true)
    if (!state.body.ok) return
    expect(state.body.result.revision).toBe(15)
    expect(state.body.result.recentMoves).toHaveLength(12)
    expect(state.body.result.lastMove?.uci).toBe('d7d6')
    expect(state.body.result.legalMoves.length).toBeLessThanOrEqual(256)
  })

  it('returns tiny unchanged deltas and wakes a long poll on a human move', async () => {
    const voice = await newGame('voice')
    const wait = rpc<ChessGameStateResult>('chess.game.waitForChange', {
      gameId: voice.game.id,
      afterRevision: voice.game.revision,
      timeoutMs: 2_000,
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    const humanMove = await uiMove(voice, 'e2e4', 'human')
    expect(humanMove.response.status).toBe(200)

    const changed = await wait
    expect(changed.response.status).toBe(200)
    expect(changed.body.ok).toBe(true)
    if (!changed.body.ok) return
    expect(changed.body.result).toMatchObject({
      changed: true,
      gameId: voice.game.id,
      revision: 2,
      actorToMove: 'voice',
    })

    const unchanged = await rpc<ChessGameStateResult>('chess.game.state', {
      gameId: voice.game.id,
      afterRevision: 2,
    })
    expect(unchanged.body).toEqual({
      ok: true,
      result: {
        changed: false,
        gameId: voice.game.id,
        revision: 2,
      },
    })

    const timedOut = await rpc<ChessGameStateResult>(
      'chess.game.waitForChange',
      {
        gameId: voice.game.id,
        afterRevision: 2,
        timeoutMs: 5,
      },
    )
    expect(timedOut.body).toEqual(unchanged.body)
  })

  it('rejects waits longer than the advertised 15-second maximum', async () => {
    const voice = await newGame('voice')
    const tooLong = await rpc<ChessGameStateResult>(
      'chess.game.waitForChange',
      {
        gameId: voice.game.id,
        afterRevision: voice.game.revision,
        timeoutMs: 15_001,
      },
    )

    expect(tooLong.response.status).toBe(400)
    expect(tooLong.body.ok).toBe(false)
    if (!tooLong.body.ok) {
      expect(tooLong.body.error.code).toBe('invalid_params')
    }
  })

  it('claims queued presentation commands in FIFO order without double delivery', async () => {
    const game = await newGame('voice')
    await rpc('chess.ui.showTutorial', {
      topic: 'forks',
      difficulty: 'friendly',
    })
    await rpc('chess.ui.replay', { command: 'restart' })
    await rpc('chess.ui.replay', { command: 'next' })

    const claimRequest = (consumerId: string) =>
      requestJson<ChessUiIntentClaim | null>('/api/moldable/ui-intent/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumerId }),
      })
    const [firstFrame, secondFrame] = await Promise.all([
      claimRequest('frame-a'),
      claimRequest('frame-b'),
    ])
    const firstClaim = firstFrame.body ?? secondFrame.body
    expect([firstFrame.body, secondFrame.body].filter(Boolean)).toHaveLength(1)
    expect(firstClaim?.intent.action).toBe('tutorial')

    const wrongAck = await requestJson<{ ok: boolean }>(
      '/api/moldable/ui-intent/ack',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: firstClaim?.claimId,
          consumerId: 'wrong-frame',
        }),
      },
    )
    expect(wrongAck.body.ok).toBe(false)

    const owner = firstClaim?.consumerId
    const rightAck = await requestJson<{ ok: boolean }>(
      '/api/moldable/ui-intent/ack',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: firstClaim?.claimId,
          consumerId: owner,
        }),
      },
    )
    expect(rightAck.body.ok).toBe(true)

    const second = await claimRequest('frame-b')
    expect(second.body?.intent).toMatchObject({
      action: 'replay',
      payload: { command: 'restart' },
    })

    const restored = await requestJson<ChessSession>('/api/session')
    expect(restored.body.game.id).toBe(game.game.id)
    expect(restored.body.view).toBe('learn')
  })

  it('keeps a newer board sync queued while an older sync is leased', async () => {
    const voice = await newGame('voice')
    const resumed = await rpc<ChessGameState>('chess.game.resume', {
      opponent: 'voice',
    })
    expect(resumed.body.ok).toBe(true)

    const firstClaim = await requestJson<ChessUiIntentClaim | null>(
      '/api/moldable/ui-intent/claim',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumerId: 'warm-window' }),
      },
    )
    expect(firstClaim.body?.intent).toMatchObject({
      action: 'sync-game',
      payload: { gameId: voice.game.id, revision: 1 },
    })

    const humanMove = await uiMove(voice, 'e2e4', 'human')
    expect(humanMove.response.status).toBe(200)
    const afterHuman = humanMove.session
    if (!afterHuman) return

    const voiceMove = await rpc<ChessGameState>(
      'chess.game.submitMove',
      {
        gameId: afterHuman.game.id,
        expectedRevision: afterHuman.game.revision,
        move: 'e7e5',
      },
      'leased-sync-voice-move',
    )
    expect(voiceMove.body.ok).toBe(true)

    const ack = await requestJson<{ ok: boolean }>(
      '/api/moldable/ui-intent/ack',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: firstClaim.body?.claimId,
          consumerId: 'warm-window',
        }),
      },
    )
    expect(ack.body.ok).toBe(true)

    const nextClaim = await requestJson<ChessUiIntentClaim | null>(
      '/api/moldable/ui-intent/claim',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumerId: 'warm-window' }),
      },
    )
    expect(nextClaim.body?.intent).toMatchObject({
      action: 'sync-game',
      payload: { gameId: voice.game.id, revision: 3 },
    })
  })

  it('expires stale presentation commands before they can be claimed', async () => {
    const now = Date.now()
    await writeJson(path.join(dataDir, 'ui-intents.json'), {
      pending: [
        {
          id: 'expired-command',
          createdAt: new Date(now - 180_000).toISOString(),
          expiresAt: new Date(now - 60_000).toISOString(),
          action: 'replay',
          payload: { command: 'next' },
        },
      ],
      activeClaim: null,
    })

    const claim = await requestJson<ChessUiIntentClaim | null>(
      '/api/moldable/ui-intent/claim',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumerId: 'late-window' }),
      },
    )
    expect(claim.body).toBeNull()
  })
})
