import type { ChessMoveRecord } from '../shared/types'
import {
  applyUciMove,
  createChess,
  fallbackMove,
  legalUciMoves,
  replayToFen,
  resultFor,
} from './chess-utils'
import { describe, expect, it } from 'vitest'

describe('chess utilities', () => {
  it('always returns a legal fallback move at every level', () => {
    for (const difficulty of ['friendly', 'club', 'master'] as const) {
      const chess = createChess()
      expect(legalUciMoves(chess)).toContain(fallbackMove(chess, difficulty))
    }
  })

  it('rejects malformed and illegal UCI moves', () => {
    const chess = createChess()
    expect(applyUciMove(chess, 'banana')).toBeNull()
    expect(applyUciMove(chess, 'e2e5')).toBeNull()
    expect(applyUciMove(chess, 'e2e4')?.san).toBe('e4')
  })

  it('replays a bounded move list to the requested ply', () => {
    const start = createChess()
    const afterE4 = createChess()
    const e4 = applyUciMove(afterE4, 'e2e4')
    expect(e4).not.toBeNull()
    const afterE5 = createChess(afterE4.fen())
    const e5 = applyUciMove(afterE5, 'e7e5')
    expect(e5).not.toBeNull()

    const moves: ChessMoveRecord[] = [
      {
        from: 'e2',
        to: 'e4',
        san: 'e4',
        uci: 'e2e4',
        fenAfter: afterE4.fen(),
        playedBy: 'player',
      },
      {
        from: 'e7',
        to: 'e5',
        san: 'e5',
        uci: 'e7e5',
        fenAfter: afterE5.fen(),
        playedBy: 'ai',
      },
    ]

    expect(replayToFen(start.fen(), moves, 1)).toBe(afterE4.fen())
    expect(replayToFen(start.fen(), moves, 2)).toBe(afterE5.fen())
  })

  it('recognizes checkmate results', () => {
    const chess = createChess()
    for (const move of ['f2f3', 'e7e5', 'g2g4', 'd8h4']) {
      expect(applyUciMove(chess, move)).not.toBeNull()
    }
    expect(resultFor(chess)).toEqual({
      result: '0-1',
      resultLabel: 'Black won by checkmate',
    })
  })
})
