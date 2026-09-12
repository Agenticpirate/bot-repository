import type { Difficulty, TutorialLesson } from '../shared/types'
import { createChess, fallbackMove, legalUciMoves } from './chess-utils'
import {
  generateJson,
  getDataDir,
  getWorkspaceId,
  installTodayDismissalRoutes,
  jsonError,
} from './moldable'
import {
  completeEngineOnboarding,
  getEngineOnboarding,
  getStockfishMove,
  getStockfishStatus,
  installStockfish,
} from './stockfish'
import {
  createTutorAnalysis,
  createTutorPrompt,
  getTutorSettings,
  setTutorSettings,
} from './tutor'
import {
  ChessStateError,
  ackUiIntent,
  claimUiIntent,
  enqueueUiIntent,
  getGame,
  getGameState,
  getGames,
  getUiSession,
  releaseUiIntent,
  resumeGame,
  runIdempotentRpcOperation,
  setSessionView,
  setViewAndEnqueue,
  startNewGame,
  submitMove,
  toGameState,
  undoMoves,
  waitForGameChange,
} from './workspace-state'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

const gameModeSchema = z.enum(['ai', 'voice', 'local'])
const chessEngineSchema = z.enum(['stockfish', 'moldable-ai', 'dumb'])
const difficultySchema = z.enum(['friendly', 'club', 'master'])
const chessColorSchema = z.enum(['white', 'black'])
const appViewSchema = z.enum(['play', 'learn', 'history'])
const uciSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/)

const aiMoveRequestSchema = z
  .object({
    fen: z.string().min(1).max(120),
    engine: chessEngineSchema.default('moldable-ai'),
    difficulty: difficultySchema.default('club'),
    history: z.array(uciSchema).max(80).default([]),
  })
  .strict()

const tutorialRequestSchema = z
  .object({
    topic: z.string().trim().min(1).max(120).default('tactics'),
    difficulty: difficultySchema.default('club'),
  })
  .strict()

const tutorialScenarios = [
  {
    id: 'opening-principles',
    theme: 'Opening principles',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    bestMove: 'g1f3',
    objective: 'Develop a piece, control the center, and prepare to castle.',
  },
  {
    id: 'scholars-punishment',
    theme: 'Spot a forced mate',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    bestMove: 'h5f7',
    objective: 'Find the immediate checkmate on the weak f7 square.',
  },
  {
    id: 'back-rank-mate',
    theme: 'Back-rank patterns',
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    bestMove: 'd1d8',
    objective: 'Use the boxed-in king to deliver mate with the rook.',
  },
  {
    id: 'promotion-race',
    theme: 'Pawn promotion',
    fen: '8/4k1P1/8/8/8/8/8/6K1 w - - 0 1',
    bestMove: 'g7g8q',
    objective: 'Promote safely and choose the piece that wins most directly.',
  },
  {
    id: 'rook-technique',
    theme: 'Rook endgame technique',
    fen: '8/8/8/3k4/8/4K3/8/6R1 w - - 0 1',
    bestMove: 'g1g5',
    objective: 'Cut the king off before bringing your own king forward.',
  },
] as const

const scenarioIdSchema = z.enum(
  tutorialScenarios.map((scenario) => scenario.id) as [string, ...string[]],
)

const tutorialAiSchema = z
  .object({
    scenarioId: scenarioIdSchema,
    title: z.string().min(1).max(100),
    objective: z.string().min(1).max(280),
    explanation: z.string().min(1).max(800),
    bestMove: uciSchema,
    hints: z.array(z.string().min(1).max(220)).min(2).max(4),
    candidates: z
      .array(
        z
          .object({
            move: uciSchema,
            label: z.string().min(1).max(80),
            idea: z.string().min(1).max(220),
          })
          .strict(),
      )
      .min(1)
      .max(4),
  })
  .strict()

export const app = new Hono()

app.use('/api/*', cors())
// POST /api/moldable/today/dismiss is registered by this shared helper.
installTodayDismissalRoutes(app)

function jsonSchemaForAiMove(legalMoves: string[]) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      move: { type: 'string', enum: legalMoves },
      explanation: { type: 'string' },
      evaluation: { type: 'string' },
      plan: { type: 'string' },
    },
    required: ['move', 'explanation', 'evaluation', 'plan'],
  }
}

const tutorialJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    scenarioId: {
      type: 'string',
      enum: tutorialScenarios.map((scenario) => scenario.id),
    },
    title: { type: 'string' },
    objective: { type: 'string' },
    explanation: { type: 'string' },
    bestMove: { type: 'string' },
    hints: {
      type: 'array',
      items: { type: 'string' },
      minItems: 2,
      maxItems: 4,
    },
    candidates: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          move: { type: 'string' },
          label: { type: 'string' },
          idea: { type: 'string' },
        },
        required: ['move', 'label', 'idea'],
      },
    },
  },
  required: [
    'scenarioId',
    'title',
    'objective',
    'explanation',
    'bestMove',
    'hints',
    'candidates',
  ],
}

app.get('/api/moldable/health', (c) => {
  return c.json({
    appId: process.env.MOLDABLE_APP_ID ?? 'chess',
    status: 'ok',
  })
})

function stateErrorResponse(
  c: Parameters<typeof jsonError>[0],
  error: unknown,
) {
  if (error instanceof ChessStateError) {
    return c.json(
      {
        error: error.message,
        code: error.code,
        ...(error.state ? { state: error.state } : {}),
      },
      error.status,
    )
  }
  return jsonError(
    c,
    error instanceof Error ? error.message : 'Chess state update failed',
  )
}

app.get('/api/moldable/today', async (c) => {
  try {
    const games = await getGames(getDataDir(c))
    const latest = games[0]
    return c.json({
      items: [],
      resume: latest
        ? {
            title:
              latest.result === '*'
                ? 'Continue your chess game'
                : 'Replay your latest game',
            subtitle: `${latest.moves.length} moves · ${latest.resultLabel}`,
            icon: '♟️',
          }
        : null,
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

app.get('/api/games', async (c) => {
  try {
    return c.json(await getGames(getDataDir(c)))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read game history',
    )
  }
})

app.get('/api/games/:id', async (c) => {
  const game = await getGame(getDataDir(c), c.req.param('id'))
  return game ? c.json(game) : jsonError(c, 'Game not found', 404)
})

app.put('/api/games/:id', async (c) => {
  return jsonError(
    c,
    'Whole-game replacement is no longer supported. Use revisioned game transitions.',
    409,
  )
})

app.get('/api/session', async (c) => {
  try {
    return c.json(await getUiSession(getDataDir(c)))
  } catch (error) {
    return stateErrorResponse(c, error)
  }
})

app.put('/api/session', async (c) => {
  return jsonError(
    c,
    'Whole-session replacement is no longer supported. Use revisioned game transitions.',
    409,
  )
})

const newGameRequestSchema = z
  .object({
    mode: gameModeSchema.optional(),
    engine: chessEngineSchema.optional(),
    difficulty: difficultySchema.optional(),
    playerColor: chessColorSchema.optional(),
  })
  .strict()

const moveTransitionSchema = z
  .object({
    gameId: z.string().min(1).max(120),
    expectedRevision: z.number().int().min(1),
    move: uciSchema,
    actor: z.enum(['human', 'ai', 'local']),
  })
  .strict()

const revisionTransitionSchema = z
  .object({
    gameId: z.string().min(1).max(120),
    expectedRevision: z.number().int().min(1),
  })
  .strict()

app.post('/api/game/new', async (c) => {
  try {
    const request = newGameRequestSchema.parse(await c.req.json())
    return c.json(await startNewGame(getDataDir(c), request, false))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(c, error.issues[0]?.message ?? 'Invalid new game', 400)
    }
    return stateErrorResponse(c, error)
  }
})

app.post('/api/game/move', async (c) => {
  try {
    const request = moveTransitionSchema.parse(await c.req.json())
    const state = await submitMove(getDataDir(c), {
      ...request,
      enqueuePresentation: false,
    })
    return c.json({ state, session: await getUiSession(getDataDir(c)) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(c, error.issues[0]?.message ?? 'Invalid move', 400)
    }
    return stateErrorResponse(c, error)
  }
})

app.post('/api/game/undo', async (c) => {
  try {
    const request = revisionTransitionSchema.parse(await c.req.json())
    return c.json(
      await undoMoves(getDataDir(c), {
        ...request,
        enqueuePresentation: false,
      }),
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(c, error.issues[0]?.message ?? 'Invalid undo', 400)
    }
    return stateErrorResponse(c, error)
  }
})

app.put('/api/session/view', async (c) => {
  try {
    const request = z
      .object({ view: appViewSchema })
      .strict()
      .parse(await c.req.json())
    return c.json(await setSessionView(getDataDir(c), request.view))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(c, error.issues[0]?.message ?? 'Invalid view', 400)
    }
    return stateErrorResponse(c, error)
  }
})

app.get('/api/engine/stockfish', async (c) => {
  return c.json(await getStockfishStatus(getDataDir(c)))
})

app.get('/api/engine/onboarding', async (c) => {
  return c.json(await getEngineOnboarding(getDataDir(c)))
})

app.post('/api/engine/onboarding', async (c) => {
  try {
    const { choice } = z
      .object({ choice: chessEngineSchema })
      .strict()
      .parse(await c.req.json())
    return c.json(await completeEngineOnboarding(getDataDir(c), choice))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(
        c,
        error.issues[0]?.message ?? 'Invalid engine choice',
        400,
      )
    }
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to save the engine choice',
    )
  }
})

app.post('/api/engine/stockfish/install', async (c) => {
  try {
    return c.json(await installStockfish(getDataDir(c)))
  } catch (error) {
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to install the Stockfish engine',
      502,
    )
  }
})

app.get('/api/tutor/settings', async (c) => {
  return c.json(await getTutorSettings(getDataDir(c)))
})

app.put('/api/tutor/settings', async (c) => {
  try {
    const { enabled } = z
      .object({ enabled: z.boolean() })
      .strict()
      .parse(await c.req.json())
    return c.json(await setTutorSettings(getDataDir(c), enabled))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(
        c,
        error.issues[0]?.message ?? 'Invalid tutor setting',
        400,
      )
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to save tutor setting',
    )
  }
})

app.post('/api/tutor/question', async (c) => {
  try {
    const request = z
      .object({
        fen: z.string().min(1).max(120),
        difficulty: difficultySchema.default('club'),
        stage: z.enum(['question', 'nudge']).default('question'),
        previousQuestion: z.string().trim().min(1).max(280).optional(),
        lastMove: z.string().trim().min(1).max(32).optional(),
      })
      .strict()
      .parse(await c.req.json())
    return c.json(
      await createTutorPrompt({
        dataDir: getDataDir(c),
        workspaceId: getWorkspaceId(c),
        ...request,
      }),
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(c, error.issues[0]?.message ?? 'Invalid position', 400)
    }
    return jsonError(
      c,
      error instanceof Error
        ? error.message
        : 'Failed to create a tutor question',
    )
  }
})

app.post('/api/tutor/analysis', async (c) => {
  try {
    const { fen } = z
      .object({ fen: z.string().min(1).max(120) })
      .strict()
      .parse(await c.req.json())
    return c.json(await createTutorAnalysis(getDataDir(c), fen))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(c, error.issues[0]?.message ?? 'Invalid position', 400)
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to analyze the position',
    )
  }
})

app.post('/api/ai/move', async (c) => {
  try {
    const request = aiMoveRequestSchema.parse(await c.req.json())
    const chess = createChess(request.fen)
    const legalMoves = legalUciMoves(chess)
    if (legalMoves.length === 0) return jsonError(c, 'Game is over', 409)

    const dataDir = getDataDir(c)
    const fallback = fallbackMove(chess, request.difficulty)

    if (request.engine === 'dumb') {
      return c.json({
        move: fallback,
        explanation: 'Dumb mode picked a legal move without using an AI model.',
        evaluation: 'Unrated',
        plan: 'Make a legal move and keep the game flowing.',
        source: 'fallback' as const,
      })
    }

    if (request.engine === 'stockfish') {
      const stockfishInstalled = (await getStockfishStatus(dataDir)).installed
      if (!stockfishInstalled) {
        return jsonError(c, 'Install Stockfish before using this engine', 409)
      }
      const stockfishMove = await getStockfishMove(
        dataDir,
        request.fen,
        request.difficulty,
      )
      if (stockfishMove && legalMoves.includes(stockfishMove)) {
        return c.json({
          move: stockfishMove,
          explanation: 'The local Stockfish engine chose this move.',
          evaluation: 'Stockfish',
          plan: 'Play the strongest practical continuation at this level.',
          model: 'Stockfish 18 smallnet',
          source: 'stockfish' as const,
        })
      }
      return c.json({
        move: fallback,
        explanation:
          'Stockfish could not start, so Dumb mode supplied a legal move.',
        evaluation: 'Unrated',
        plan: 'Keep the game flowing with a safe local fallback.',
        source: 'fallback' as const,
      })
    }

    try {
      const result = await generateJson<unknown>({
        workspaceId: getWorkspaceId(c),
        purpose: 'chess-opponent-move',
        system: [
          'You are a thoughtful chess opponent.',
          'Choose exactly one move from the legal UCI move enum in the schema.',
          'Play at the requested level: friendly makes natural imperfect choices, club is principled and tactical, master is demanding.',
          'Keep the explanation concise and never claim a line you have not checked.',
        ].join(' '),
        prompt: [
          `FEN: ${request.fen}`,
          `Side to move: ${chess.turn() === 'w' ? 'White' : 'Black'}`,
          `Difficulty: ${request.difficulty}`,
          `Recent moves (UCI): ${request.history.slice(-24).join(' ') || 'none'}`,
          `Legal moves: ${legalMoves.join(', ')}`,
        ].join('\n'),
        schema: jsonSchemaForAiMove(legalMoves),
        schemaName: 'chessMove',
        schemaDescription: 'A legal chess move with short opponent commentary.',
        reasoningEffort:
          request.difficulty === 'master'
            ? 'high'
            : request.difficulty === 'club'
              ? 'medium'
              : 'low',
        timeoutMs: 12_000,
      })
      const parsed = z
        .object({
          move: z.string().refine((move) => legalMoves.includes(move)),
          explanation: z.string().min(1).max(600),
          evaluation: z.string().min(1).max(160),
          plan: z.string().min(1).max(300),
        })
        .strict()
        .parse(result.json)
      return c.json({
        ...parsed,
        model: result.model,
        source: 'llm' as const,
      })
    } catch {
      return c.json({
        move: fallback,
        explanation:
          'I chose a sound legal move while the chess coach was unavailable.',
        evaluation: 'Playable',
        plan: 'Improve the position and keep the king safe.',
        source: 'fallback' as const,
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(c, error.issues[0]?.message ?? 'Invalid position', 400)
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to choose a move',
    )
  }
})

app.post('/api/tutorial/generate', async (c) => {
  try {
    const request = tutorialRequestSchema.parse(await c.req.json())
    const scenarioSummary = tutorialScenarios
      .map((scenario) => {
        const legalMoves = legalUciMoves(createChess(scenario.fen))
        return [
          `${scenario.id}: ${scenario.theme}`,
          `FEN ${scenario.fen}`,
          `Objective ${scenario.objective}`,
          `Legal moves ${legalMoves.join(', ')}`,
        ].join(' | ')
      })
      .join('\n')

    let aiLesson: z.infer<typeof tutorialAiSchema> | null = null
    let model: string | undefined
    try {
      const result = await generateJson<unknown>({
        workspaceId: getWorkspaceId(c),
        purpose: 'chess-guided-lesson',
        system: [
          'You are an encouraging chess coach.',
          'Select one provided scenario that fits the requested topic and level.',
          'The bestMove and every candidate move must be legal UCI moves for the selected scenario.',
          'Teach the idea progressively without giving away the answer in the first hint.',
        ].join(' '),
        prompt: [
          `Requested topic: ${request.topic}`,
          `Student level: ${request.difficulty}`,
          'Available validated scenarios:',
          scenarioSummary,
        ].join('\n'),
        schema: tutorialJsonSchema,
        schemaName: 'chessTutorial',
        schemaDescription:
          'A guided chess scenario selected from validated positions.',
        reasoningEffort: 'medium',
        timeoutMs: 45_000,
      })
      aiLesson = tutorialAiSchema.parse(result.json)
      model = result.model
    } catch {
      aiLesson = null
    }

    const scenario =
      tutorialScenarios.find(
        (candidate) => candidate.id === aiLesson?.scenarioId,
      ) ??
      tutorialScenarios[
        Math.abs(
          [...request.topic].reduce(
            (total, character) => total + character.charCodeAt(0),
            0,
          ),
        ) % tutorialScenarios.length
      ]
    const chess = createChess(scenario.fen)
    const legalMoves = legalUciMoves(chess)
    const bestMove =
      aiLesson && legalMoves.includes(aiLesson.bestMove)
        ? aiLesson.bestMove
        : legalMoves.includes(scenario.bestMove)
          ? scenario.bestMove
          : fallbackMove(chess, request.difficulty)
    const candidates =
      aiLesson?.candidates.filter((candidate) =>
        legalMoves.includes(candidate.move),
      ) ?? []

    const lesson: TutorialLesson = {
      scenarioId: scenario.id,
      title: aiLesson?.title ?? scenario.theme,
      theme: scenario.theme,
      difficulty: request.difficulty,
      fen: scenario.fen,
      objective: aiLesson?.objective ?? scenario.objective,
      explanation:
        aiLesson?.explanation ??
        'Look at forcing moves first: checks, captures, and threats. Then compare how each move changes king safety and piece activity.',
      bestMove,
      hints: aiLesson?.hints ?? [
        'Start with checks, captures, and immediate threats.',
        'Notice which squares the opposing king cannot use.',
        `The move begins on ${bestMove.slice(0, 2)}.`,
      ],
      candidates:
        candidates.length > 0
          ? candidates
          : [
              {
                move: bestMove,
                label: 'Best practical move',
                idea: scenario.objective,
              },
            ],
      model,
      source: aiLesson ? 'llm' : 'fallback',
    }
    return c.json(lesson)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(
        c,
        error.issues[0]?.message ?? 'Invalid lesson request',
        400,
      )
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to create lesson',
    )
  }
})

const intentClaimSchema = z
  .object({ consumerId: z.string().min(1).max(120) })
  .strict()

const intentReceiptSchema = z
  .object({
    claimId: z.string().min(1).max(120),
    consumerId: z.string().min(1).max(120),
  })
  .strict()

app.post('/api/moldable/ui-intent/claim', async (c) => {
  try {
    const { consumerId } = intentClaimSchema.parse(await c.req.json())
    return c.json(await claimUiIntent(getDataDir(c), consumerId))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(c, error.issues[0]?.message ?? 'Invalid claim', 400)
    }
    return stateErrorResponse(c, error)
  }
})

app.post('/api/moldable/ui-intent/ack', async (c) => {
  try {
    const receipt = intentReceiptSchema.parse(await c.req.json())
    return c.json({ ok: await ackUiIntent(getDataDir(c), receipt) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(c, error.issues[0]?.message ?? 'Invalid receipt', 400)
    }
    return stateErrorResponse(c, error)
  }
})

app.post('/api/moldable/ui-intent/release', async (c) => {
  try {
    const receipt = intentReceiptSchema.parse(await c.req.json())
    return c.json({ ok: await releaseUiIntent(getDataDir(c), receipt) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(c, error.issues[0]?.message ?? 'Invalid receipt', 400)
    }
    return stateErrorResponse(c, error)
  }
})

app.get('/api/moldable/ui-intent', (c) =>
  jsonError(c, 'Use atomic POST /api/moldable/ui-intent/claim.', 409),
)

app.get('/api/moldable/commands', (c) => {
  return c.json({
    commands: [
      {
        id: 'chess.new-game',
        label: 'New chess game',
        description: 'Start a fresh game against the AI.',
        icon: '♟️',
        action: {
          type: 'message',
          command: 'chess.new-game',
          payload: {},
        },
      },
      {
        id: 'chess.learn',
        label: 'Open chess coach',
        description: 'Practice a guided chess position.',
        icon: '🎓',
        action: {
          type: 'message',
          command: 'chess.learn',
          payload: {},
        },
      },
    ],
  })
})

const rpcRequestSchema = z
  .object({
    method: z.string().min(1),
    params: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

function rpcOperationId(
  c: Parameters<typeof getDataDir>[0],
): string | undefined {
  const value = c.req.header('x-moldable-idempotency-key')?.trim()
  if (!value) return undefined
  if (Buffer.byteLength(value, 'utf8') > 512) {
    throw new ChessStateError(
      'invalid_idempotency_key',
      'x-moldable-idempotency-key must not exceed 512 bytes.',
      400,
    )
  }
  const callerId = c.req.header('x-moldable-caller-app-id')?.trim() || 'host'
  if (Buffer.byteLength(callerId, 'utf8') > 256) {
    throw new ChessStateError(
      'invalid_caller_id',
      'x-moldable-caller-app-id must not exceed 256 bytes.',
      400,
    )
  }
  return `${callerId}\u001f${value}`
}

function rpcFingerprint(
  method: string,
  params: Record<string, unknown>,
): string {
  return JSON.stringify({ method, params })
}

app.post('/api/moldable/rpc', async (c) => {
  try {
    const { method, params = {} } = rpcRequestSchema.parse(await c.req.json())
    const dataDir = getDataDir(c)
    const operationId = rpcOperationId(c)

    if (
      method === 'chess.cards.present' ||
      method === 'chess.cards.read' ||
      method === 'chess.cards.move'
    ) {
      const selector = z.object({ gameId: z.string().min(1).max(120) }).strict()
      if (method === 'chess.cards.move') {
        const parsed = selector
          .extend({
            expectedRevision: z.number().int().min(1),
            move: uciSchema,
          })
          .strict()
          .parse(params)
        const game = await getGame(dataDir, parsed.gameId)
        if (!game)
          throw new ChessStateError(
            'game_not_found',
            'This game is no longer available.',
            404,
          )
        const fingerprint = rpcFingerprint(method, parsed)
        return c.json({
          ok: true,
          result: await runIdempotentRpcOperation(
            dataDir,
            operationId,
            fingerprint,
            () =>
              submitMove(dataDir, {
                ...parsed,
                actor: game.mode === 'local' ? 'local' : 'human',
                operation: operationId
                  ? { id: operationId, fingerprint }
                  : undefined,
              }),
          ),
        })
      }
      const { gameId } = selector.parse(params)
      const game = await getGame(dataDir, gameId)
      if (!game)
        throw new ChessStateError(
          'game_not_found',
          'This game is no longer available.',
          404,
        )
      if (method === 'chess.cards.read')
        return c.json({
          ok: true,
          result: { title: game.title.slice(0, 240), ...toGameState(game) },
        })
      return c.json({
        ok: true,
        result: {
          appCard: {
            version: 1,
            title: game.title.slice(0, 240) || 'Chess',
            resourcePath: '/index.html?card=game',
            input: { gameId },
            readMethod: 'chess.cards.read',
            actions: [
              {
                id: 'move',
                label: 'Play chess move',
                method: 'chess.cards.move',
              },
            ],
            height: 400,
          },
        },
      })
    }

    if (method === 'chess.ui.describe') {
      return c.json({
        ok: true,
        result: {
          views: ['play', 'learn', 'history'],
          methods: [
            'chess.game.resume',
            'chess.game.submitMove',
            'chess.game.state',
            'chess.game.waitForChange',
            'chess.ui.newGame',
            'chess.ui.navigate',
            'chess.ui.showTutorial',
            'chess.ui.loadGame',
            'chess.ui.replay',
          ],
          moveFormat: 'UCI, for example e2e4 or e7e8q',
          narrationOwner: 'active-voice-session',
          note: 'Resume first, submit moves with the returned gameId and revision, then wait for the next revision. Chess owns authoritative state and UI; the active Voice session explains moves aloud.',
        },
      })
    }

    if (method === 'chess.game.resume') {
      const parsed = z
        .object({
          opponent: z.enum(['voice', 'ai', 'any']).default('any'),
        })
        .strict()
        .parse(params)
      return c.json({
        ok: true,
        result: await runIdempotentRpcOperation(
          dataDir,
          operationId,
          rpcFingerprint('chess.game.resume', parsed),
          () => resumeGame(dataDir, parsed.opponent),
        ),
      })
    }

    if (method === 'chess.game.submitMove' || method === 'chess.ui.move') {
      const parsed = z
        .object({
          gameId: z.string().min(1).max(120),
          expectedRevision: z.number().int().min(1),
          move: uciSchema,
        })
        .strict()
        .parse(params)
      const fingerprint = rpcFingerprint('chess.game.submitMove', parsed)
      return c.json({
        ok: true,
        result: await runIdempotentRpcOperation(
          dataDir,
          operationId,
          fingerprint,
          () =>
            submitMove(dataDir, {
              ...parsed,
              actor: 'voice',
              operation: operationId
                ? { id: operationId, fingerprint }
                : undefined,
            }),
        ),
      })
    }

    if (method === 'chess.game.state' || method === 'chess.ui.read') {
      const parsed = z
        .object({
          gameId: z.string().min(1).max(120).optional(),
          afterRevision: z.number().int().min(0).optional(),
        })
        .strict()
        .parse(params)
      return c.json({
        ok: true,
        result: await getGameState(dataDir, parsed),
      })
    }

    if (
      method === 'chess.game.waitForChange' ||
      method === 'chess.game.awaitChange'
    ) {
      const parsed = z
        .object({
          gameId: z.string().min(1).max(120),
          afterRevision: z.number().int().min(0),
          timeoutMs: z.number().int().min(0).max(15_000).optional(),
        })
        .strict()
        .parse(params)
      return c.json({
        ok: true,
        result: await waitForGameChange(dataDir, parsed),
      })
    }

    if (method === 'chess.ui.newGame') {
      const parsed = newGameRequestSchema.parse(params)
      const fingerprint = rpcFingerprint('chess.ui.newGame', parsed)
      const session = await runIdempotentRpcOperation(
        dataDir,
        operationId,
        fingerprint,
        () =>
          startNewGame(
            dataDir,
            parsed,
            true,
            operationId ? { id: operationId, fingerprint } : undefined,
          ),
      )
      return c.json({
        ok: true,
        result: toGameState(session.game),
      })
    }

    if (method === 'chess.ui.navigate') {
      const parsed = z.object({ view: appViewSchema }).strict().parse(params)
      await runIdempotentRpcOperation(
        dataDir,
        operationId,
        rpcFingerprint('chess.ui.navigate', parsed),
        () => setViewAndEnqueue(dataDir, parsed.view, undefined, operationId),
      )
      return c.json({ ok: true, result: `Opening ${parsed.view}.` })
    }

    if (method === 'chess.ui.showTutorial') {
      const parsed = z
        .object({
          topic: z.string().min(1).max(120).optional(),
          difficulty: difficultySchema.optional(),
        })
        .strict()
        .parse(params)
      await runIdempotentRpcOperation(
        dataDir,
        operationId,
        rpcFingerprint('chess.ui.showTutorial', parsed),
        () =>
          setViewAndEnqueue(dataDir, 'learn', {
            action: 'tutorial',
            payload: parsed,
            operationId,
          }),
      )
      return c.json({ ok: true, result: 'Chess coach queued.' })
    }

    if (method === 'chess.ui.loadGame') {
      const parsed = z
        .object({ gameId: z.string().min(1).max(120) })
        .strict()
        .parse(params)
      if (!(await getGame(dataDir, parsed.gameId))) {
        return c.json(
          {
            ok: false,
            error: { code: 'not_found', message: 'Game not found.' },
          },
          404,
        )
      }
      await runIdempotentRpcOperation(
        dataDir,
        operationId,
        rpcFingerprint('chess.ui.loadGame', parsed),
        () =>
          setViewAndEnqueue(dataDir, 'history', {
            action: 'load-game',
            payload: parsed,
            operationId,
          }),
      )
      return c.json({ ok: true, result: 'Game replay queued.' })
    }

    if (method === 'chess.ui.replay') {
      const parsed = z
        .object({
          command: z.enum(['play', 'pause', 'next', 'previous', 'restart']),
        })
        .strict()
        .parse(params)
      await runIdempotentRpcOperation(
        dataDir,
        operationId,
        rpcFingerprint('chess.ui.replay', parsed),
        () =>
          enqueueUiIntent(dataDir, {
            action: 'replay',
            payload: parsed,
            operationId,
          }),
      )
      return c.json({ ok: true, result: `Replay ${parsed.command} queued.` })
    }

    return c.json(
      {
        ok: false,
        error: { code: 'unknown_method', message: `Unknown method: ${method}` },
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
            message: error.issues[0]?.message ?? 'Invalid parameters.',
          },
        },
        400,
      )
    }
    if (error instanceof ChessStateError) {
      return c.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
            ...(error.state ? { state: error.state } : {}),
          },
        },
        error.status,
      )
    }
    return c.json(
      {
        ok: false,
        error: {
          code: 'internal_error',
          message: error instanceof Error ? error.message : 'Chess RPC failed.',
        },
      },
      500,
    )
  }
})
