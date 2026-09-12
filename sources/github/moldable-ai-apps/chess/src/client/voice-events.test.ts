import type { ChessSession } from '../shared/types'
import { createGameRecord } from './game-utils'
import {
  createChessHumanMoveVoiceEvent,
  createChessTurnReadyVoiceEvent,
} from './voice-events'
import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'

function voiceSessionAfterE4(): ChessSession {
  const chess = new Chess()
  const move = chess.move('e4')
  return {
    view: 'play',
    game: {
      ...createGameRecord({ mode: 'voice', playerColor: 'white' }),
      id: 'voice-game',
      revision: 2,
      currentFen: chess.fen(),
      moves: [
        {
          from: move.from,
          to: move.to,
          san: move.san,
          uci: 'e2e4',
          fenAfter: chess.fen(),
          playedBy: 'player',
        },
      ],
    },
  }
}

describe('Chess Voice events', () => {
  it('reports a human move with exact revision and legal Voice replies', () => {
    expect(createChessHumanMoveVoiceEvent(voiceSessionAfterE4())).toMatchObject(
      {
        type: 'moldable:voice-event',
        eventId: 'voice-game:revision:2',
        eventType: 'chess.human-move',
        summary: expect.stringContaining('It is now Voice’s turn'),
        data: {
          gameId: 'voice-game',
          revision: 2,
          status: 'active',
          humanColor: 'white',
          voiceColor: 'black',
          sideToMove: 'black',
          actorToMove: 'voice',
          lastMove: {
            san: 'e4',
            uci: 'e2e4',
            check: false,
            checkmate: false,
          },
          legalMoves: expect.arrayContaining(['e7e5']),
        },
      },
    )
  })

  it('does not nudge Voice for a Stockfish game', () => {
    const session = voiceSessionAfterE4()
    session.game.mode = 'ai'
    expect(createChessHumanMoveVoiceEvent(session)).toBeNull()
  })

  it('publishes the persisted turn when a Voice session becomes active', () => {
    expect(createChessTurnReadyVoiceEvent(voiceSessionAfterE4())).toMatchObject(
      {
        eventId: 'voice-game:revision:2:voice-session-active',
        eventType: 'chess.turn-ready',
        summary: expect.stringContaining('waiting for Voice to move'),
        data: {
          gameId: 'voice-game',
          revision: 2,
          actorToMove: 'voice',
          legalMoves: expect.arrayContaining(['e7e5']),
        },
      },
    )
  })
})
