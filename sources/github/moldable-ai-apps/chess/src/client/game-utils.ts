import type {
  ChessColor,
  ChessEngine,
  ChessGameRecord,
  ChessMoveRecord,
  Difficulty,
  GameMode,
} from '../shared/types'
import { Chess, type Color, type Move } from 'chess.js'

export const START_FEN = new Chess().fen()

export function colorName(color: Color): ChessColor {
  return color === 'w' ? 'white' : 'black'
}

export function oppositeColor(color: ChessColor): ChessColor {
  return color === 'white' ? 'black' : 'white'
}

export function moveToUci(
  move: Pick<Move, 'from' | 'to' | 'promotion'>,
): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`
}

export function createGameRecord(options?: {
  mode?: GameMode
  engine?: ChessEngine
  difficulty?: Difficulty
  playerColor?: ChessColor
}): ChessGameRecord {
  const now = new Date().toISOString()
  const mode = options?.mode ?? 'ai'
  const engine = options?.engine ?? 'moldable-ai'
  const playerColor = options?.playerColor ?? 'white'
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
    startFen: START_FEN,
    currentFen: START_FEN,
    moves: [],
    result: '*',
    resultLabel: 'In progress',
  }
}

export function applyMoves(
  startFen: string,
  moves: ChessMoveRecord[],
  ply = moves.length,
): Chess {
  const chess = new Chess(startFen)
  for (const move of moves.slice(0, ply)) {
    try {
      chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? 'q',
      })
    } catch {
      break
    }
  }
  return chess
}

export function formatGameDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function movePairs(moves: ChessMoveRecord[]): Array<{
  number: number
  white?: ChessMoveRecord
  black?: ChessMoveRecord
}> {
  const pairs: Array<{
    number: number
    white?: ChessMoveRecord
    black?: ChessMoveRecord
  }> = []
  for (let index = 0; index < moves.length; index += 2) {
    pairs.push({
      number: index / 2 + 1,
      white: moves[index],
      black: moves[index + 1],
    })
  }
  return pairs
}
