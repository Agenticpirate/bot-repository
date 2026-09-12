import type { DesktopVoiceSessionStatus } from './desktop-voice-session'
import {
  chessChatInstructions,
  opponentName,
  statusForGame,
  voiceOpponentDescription,
} from './game-presentation'
import { createGameRecord } from './game-utils'
import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'

const voiceStatuses: DesktopVoiceSessionStatus[] = [
  'unknown',
  'off',
  'starting',
  'active',
  'error',
]

describe('Chess presentation shared by desktop and mobile', () => {
  it.each(voiceStatuses)(
    'keeps Moldable as the opponent when Voice is %s',
    (voiceStatus) => {
      const chess = new Chess()
      chess.move('e4')
      const game = {
        ...createGameRecord({ mode: 'voice' }),
        currentFen: chess.fen(),
      }
      const before = structuredClone(game)
      expect(game.title).toBe('You vs Moldable')
      expect(opponentName(game)).toBe('Moldable')
      expect(statusForGame(chess, game, false)).toBe(
        'Waiting for Moldable to move',
      )
      const instructions = chessChatInstructions(
        chess,
        game,
        'play',
        voiceStatus,
      )
      expect(instructions).toContain('Moldable to move')
      expect(instructions).toContain(`Voice connection: ${voiceStatus}`)
      expect(instructions).toContain(chess.fen())
      expect(instructions).toContain('e7e5')
      expect(instructions).not.toContain('Voice to move')
      if (voiceStatus === 'active') {
        expect(instructions).toContain(
          'Context updates alone must not trigger speech',
        )
        expect(voiceOpponentDescription(voiceStatus)).toContain(
          'Voice is connected',
        )
      } else {
        expect(instructions).toContain('Continue in chat')
        expect(instructions).not.toContain('Voice is connected')
        expect(voiceOpponentDescription(voiceStatus)).not.toContain(
          'Voice is connected',
        )
      }
      expect(game).toEqual(before)
    },
  )

  it('preserves human turns, check, completion, and engine names', () => {
    const chess = new Chess()
    const game = createGameRecord({ mode: 'voice' })
    expect(statusForGame(chess, game, false)).toBe('White to move')
    const stockfish = createGameRecord({ mode: 'ai', engine: 'stockfish' })
    expect(statusForGame(chess, stockfish, true)).toBe(
      'Stockfish is considering the position…',
    )
    expect(opponentName(createGameRecord({ mode: 'local' }))).toBe('Player two')
    expect(
      statusForGame(
        chess,
        { ...game, result: '1/2-1/2', resultLabel: 'Draw' },
        false,
      ),
    ).toBe('Draw')
    chess.move('f3')
    chess.move('e5')
    chess.move('g4')
    chess.move('Qh4#')
    expect(statusForGame(chess, game, false)).toBe('White is in check')
  })
})
