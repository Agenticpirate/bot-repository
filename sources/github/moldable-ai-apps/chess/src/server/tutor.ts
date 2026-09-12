import { readJson, safePath, writeJson } from '@moldable-ai/storage'
import type {
  Difficulty,
  TutorAnalysis,
  TutorPrompt,
  TutorSettings,
} from '../shared/types'
import { createChess, legalUciMoves } from './chess-utils'
import { generateJson } from './moldable'
import { getCachedStockfishAnalysis, getStockfishAnalysis } from './stockfish'
import { z } from 'zod'

const tutorOutputSchema = z
  .object({
    focus: z.string().trim().min(1).max(60),
    question: z
      .string()
      .trim()
      .min(1)
      .max(280)
      .refine((question) => question.endsWith('?')),
  })
  .strict()

const tutorJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    focus: { type: 'string' },
    question: { type: 'string' },
  },
  required: ['focus', 'question'],
}

function settingsPath(dataDir: string) {
  return safePath(dataDir, 'tutor-settings.json')
}

export async function getTutorSettings(
  dataDir: string,
): Promise<TutorSettings> {
  const stored = await readJson<unknown>(settingsPath(dataDir), null)
  return {
    enabled: Boolean(
      stored &&
        typeof stored === 'object' &&
        'enabled' in stored &&
        stored.enabled === true,
    ),
  }
}

export async function setTutorSettings(
  dataDir: string,
  enabled: boolean,
): Promise<TutorSettings> {
  const settings = { enabled }
  await writeJson(settingsPath(dataDir), settings)
  return settings
}

function fallbackTutorPrompt(
  fen: string,
  stage: 'question' | 'nudge',
): TutorPrompt {
  const chess = createChess(fen)
  if (chess.inCheck()) {
    return {
      focus: 'Responding to check',
      question:
        stage === 'nudge'
          ? 'Which possible response would leave your king safest on the following turn?'
          : 'What different kinds of response to the check are available in this position?',
      source: 'fallback',
      groundedByStockfish: false,
    }
  }

  return {
    focus: stage === 'nudge' ? 'Opponent’s threats' : 'Position scan',
    question:
      stage === 'nudge'
        ? 'Which of your opponent’s pieces changed its influence most recently, and what is it now threatening?'
        : 'Before choosing a move, what is your opponent’s most immediate threat?',
    source: 'fallback',
    groundedByStockfish: false,
  }
}

function sanForMove(fen: string, uci: string): string | null {
  try {
    const chess = createChess(fen)
    return (
      chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.slice(4) || 'q',
      }).san ?? null
    )
  } catch {
    return null
  }
}

function revealsCandidateMove(
  question: string,
  candidates: Array<{ move: string }>,
  fen: string,
) {
  const normalized = question.toLowerCase()
  return candidates.some(({ move }) => {
    const san = sanForMove(fen, move)?.toLowerCase()
    const uci = move.toLowerCase()
    return (
      normalized.includes(uci) ||
      (san !== undefined &&
        san.length >= 2 &&
        new RegExp(
          `(^|[^a-z0-9])${san.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`,
          'i',
        ).test(normalized))
    )
  })
}

export async function createTutorPrompt(options: {
  dataDir: string
  workspaceId?: string
  fen: string
  difficulty: Difficulty
  stage: 'question' | 'nudge'
  previousQuestion?: string
  lastMove?: string
}): Promise<TutorPrompt> {
  const chess = createChess(options.fen)
  const legalMoves = legalUciMoves(chess)
  const analysis = getCachedStockfishAnalysis(options.dataDir, options.fen)
  const fallback = fallbackTutorPrompt(options.fen, options.stage)

  try {
    const result = await generateJson<unknown>({
      workspaceId: options.workspaceId,
      purpose: 'chess-socratic-tutor',
      system: [
        'You are a Socratic chess tutor.',
        'Ask exactly one short question that helps the student notice an important strategic or tactical feature.',
        'Never give, recommend, name, or encode a move.',
        'Never include SAN, UCI notation, a move sequence, an evaluation number, or phrases such as best move.',
        'Do not answer your own question.',
        'A nudge must narrow the student’s attention without revealing the answer.',
        'Use plain language suitable for the requested student level.',
      ].join(' '),
      prompt: [
        `FEN: ${options.fen}`,
        `Student level: ${options.difficulty}`,
        `Stage: ${options.stage}`,
        `Side to move: ${chess.turn() === 'w' ? 'White' : 'Black'}`,
        `In check: ${chess.inCheck() ? 'yes' : 'no'}`,
        `Last move: ${options.lastMove ?? 'none'}`,
        `Previous tutor question: ${options.previousQuestion ?? 'none'}`,
        `Legal move count: ${legalMoves.length}`,
        analysis
          ? `Private engine grounding (never repeat its notation): ${JSON.stringify(
              analysis.lines.slice(0, 3),
            )}`
          : 'Private engine grounding: unavailable',
      ].join('\n'),
      schema: tutorJsonSchema,
      schemaName: 'socraticChessQuestion',
      schemaDescription:
        'One concept label and one question that does not reveal a chess move.',
      model: 'openai/gpt-5.6-terra',
      reasoningEffort: 'medium',
      timeoutMs: 8_000,
    })
    const parsed = tutorOutputSchema.parse(result.json)
    if (
      analysis &&
      revealsCandidateMove(parsed.question, analysis.lines, options.fen)
    ) {
      return fallback
    }
    return {
      ...parsed,
      source: 'llm',
      groundedByStockfish: Boolean(analysis),
      model: result.model,
    }
  } catch {
    return fallback
  }
}

function variationToSan(fen: string, variation: string[]): string[] {
  const chess = createChess(fen)
  const san: string[] = []
  for (const uci of variation.slice(0, 6)) {
    try {
      san.push(
        chess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.slice(4) || 'q',
        }).san,
      )
    } catch {
      break
    }
  }
  return san
}

function describeSan(san: string): string {
  if (san.startsWith('O-O-O')) return 'Castle queenside'
  if (san.startsWith('O-O')) return 'Castle kingside'

  const checkmate = san.includes('#')
  const check = !checkmate && san.includes('+')
  const normalized = san.replace(/[+#?!]/g, '')
  const match = normalized.match(
    /^([KQRBN])?([a-h1-8]{0,2})(x)?([a-h][1-8])(?:=([QRBN]))?$/,
  )
  if (!match) return san
  const pieces: Record<string, string> = {
    K: 'King',
    Q: 'Queen',
    R: 'Rook',
    B: 'Bishop',
    N: 'Knight',
  }
  const piece = match[1] ? pieces[match[1]] : 'Pawn'
  const capture = Boolean(match[3])
  const destination = match[4]
  const promotion = match[5] ? pieces[match[5]] : null
  return [
    `${piece} ${capture ? 'captures on' : 'to'} ${destination}`,
    promotion ? `and promotes to ${promotion.toLowerCase()}` : '',
    checkmate ? 'with checkmate' : check ? 'with check' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function outlookForScore(line: { centipawns?: number; mateIn?: number }) {
  if (line.mateIn !== undefined) {
    return line.mateIn > 0
      ? {
          outlook: 'A forced checkmate may be available',
          detail:
            'The side to move can force the game if the line is accurate.',
        }
      : {
          outlook: 'The position is critically dangerous',
          detail: 'The opponent appears able to force checkmate.',
        }
  }

  const score = line.centipawns ?? 0
  const absolute = Math.abs(score)
  if (absolute < 25) {
    return {
      outlook: 'The position is balanced',
      detail: 'Neither side has a meaningful advantage right now.',
    }
  }
  const side = score > 0 ? 'You have' : 'Your opponent has'
  if (absolute < 80) {
    return {
      outlook: `${side} a small edge`,
      detail: 'The position is still competitive and precise choices matter.',
    }
  }
  if (absolute < 180) {
    return {
      outlook: `${side} a clear advantage`,
      detail: 'There is a meaningful positional or tactical difference.',
    }
  }
  return {
    outlook: `${side} strong winning chances`,
    detail: 'A major tactical or positional advantage is present.',
  }
}

export async function createTutorAnalysis(
  dataDir: string,
  fen: string,
): Promise<TutorAnalysis> {
  const analysis = await getStockfishAnalysis(dataDir, fen)
  if (!analysis) {
    return {
      available: false,
      candidates: [],
      reason: 'Install Stockfish to see position analysis and candidate moves.',
    }
  }

  const best = analysis.lines[0]
  if (!best) {
    return {
      available: false,
      candidates: [],
      reason: 'Stockfish could not analyze this position.',
    }
  }
  const outlook = outlookForScore(best)
  return {
    available: true,
    ...outlook,
    candidates: analysis.lines.map((line, index) => {
      const variation = variationToSan(fen, line.pv)
      return {
        description: describeSan(variation[0] ?? line.move),
        assessment:
          index === 0
            ? 'Stockfish’s first choice'
            : index === 1
              ? 'Strong alternative'
              : 'Another candidate',
      }
    }),
  }
}
