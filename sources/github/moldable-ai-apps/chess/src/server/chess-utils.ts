import type { ChessMoveRecord } from '../shared/types'
import { Chess, type Move } from 'chess.js'

const PIECE_VALUE = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20_000,
} as const

export function createChess(fen?: string): Chess {
  return fen ? new Chess(fen) : new Chess()
}

export function moveToUci(
  move: Pick<Move, 'from' | 'to' | 'promotion'>,
): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`
}

export function legalUciMoves(chess: Chess): string[] {
  return chess.moves({ verbose: true }).map(moveToUci)
}

export function applyUciMove(chess: Chess, uci: string): Move | null {
  const normalized = uci.trim().toLowerCase()
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(normalized)) return null

  try {
    return chess.move({
      from: normalized.slice(0, 2),
      to: normalized.slice(2, 4),
      promotion: normalized.slice(4, 5) || 'q',
    })
  } catch {
    return null
  }
}

function scoreMove(fen: string, move: Move): number {
  const next = createChess(fen)
  const applied = next.move({
    from: move.from,
    to: move.to,
    promotion: move.promotion ?? 'q',
  })
  if (!applied) return Number.NEGATIVE_INFINITY

  let score = 0
  if (move.captured) score += PIECE_VALUE[move.captured] * 1.2
  if (move.promotion) score += PIECE_VALUE[move.promotion] - PIECE_VALUE.p
  if (next.isCheckmate()) score += 100_000
  else if (next.inCheck()) score += 90

  const file = move.to.charCodeAt(0) - 97
  const rank = Number(move.to[1]) - 1
  const centerDistance = Math.abs(file - 3.5) + Math.abs(rank - 3.5)
  score += Math.max(0, 6 - centerDistance) * 4

  const replies = next.moves({ verbose: true })
  const mostValuableReply = replies.reduce((highest, reply) => {
    if (!reply.captured) return highest
    return Math.max(highest, PIECE_VALUE[reply.captured])
  }, 0)
  score -= mostValuableReply * 0.16

  return score
}

function stableIndex(input: string, size: number): number {
  let hash = 2166136261
  for (const character of input) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash) % size
}

export function fallbackMove(
  chess: Chess,
  difficulty: 'friendly' | 'club' | 'master',
): string {
  const moves = chess.moves({ verbose: true })
  if (moves.length === 0) throw new Error('No legal moves are available')

  const ranked = moves
    .map((move) => ({ move, score: scoreMove(chess.fen(), move) }))
    .sort((a, b) => b.score - a.score)

  const poolSize =
    difficulty === 'friendly'
      ? Math.min(8, ranked.length)
      : difficulty === 'club'
        ? Math.min(3, ranked.length)
        : 1
  const choice = ranked[stableIndex(chess.fen(), poolSize)] ?? ranked[0]
  return moveToUci(choice.move)
}

export function resultFor(chess: Chess): {
  result: string
  resultLabel: string
} {
  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'Black' : 'White'
    return {
      result: winner === 'White' ? '1-0' : '0-1',
      resultLabel: `${winner} won by checkmate`,
    }
  }
  if (chess.isStalemate()) return { result: '½-½', resultLabel: 'Stalemate' }
  if (chess.isThreefoldRepetition())
    return { result: '½-½', resultLabel: 'Draw by repetition' }
  if (chess.isInsufficientMaterial())
    return { result: '½-½', resultLabel: 'Draw by insufficient material' }
  if (chess.isDraw()) return { result: '½-½', resultLabel: 'Draw' }
  return { result: '*', resultLabel: 'In progress' }
}

export function replayToFen(
  startFen: string,
  moves: ChessMoveRecord[],
  ply = moves.length,
): string {
  const chess = createChess(startFen)
  for (const move of moves.slice(0, ply)) {
    if (!applyUciMove(chess, move.uci)) break
  }
  return chess.fen()
}
