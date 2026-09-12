import type { ChessSession } from '../shared/types'
import { colorName, moveToUci, oppositeColor } from './game-utils'
import { Chess } from 'chess.js'

export const CHESS_VOICE_EVENT_MESSAGE_TYPE = 'moldable:voice-event'

export interface ChessVoiceEvent {
  type: typeof CHESS_VOICE_EVENT_MESSAGE_TYPE
  eventId: string
  eventType: 'chess.human-move' | 'chess.turn-ready'
  summary: string
  data: {
    gameId: string
    revision: number
    status: 'active' | 'completed'
    result: string
    resultLabel: string
    humanColor: 'white' | 'black'
    voiceColor: 'white' | 'black'
    sideToMove: 'white' | 'black'
    actorToMove: 'human' | 'voice' | 'none'
    fen: string
    lastMove: {
      san: string
      uci: string
      check: boolean
      checkmate: boolean
    } | null
    legalMoves: string[]
  }
}

function createChessVoiceEvent(
  session: ChessSession,
  source: 'human-move' | 'turn-ready',
): ChessVoiceEvent | null {
  const game = session.game
  if (game.mode !== 'voice') return null

  const chess = new Chess(game.currentFen)
  const sideToMove = colorName(chess.turn())
  const voiceColor = oppositeColor(game.playerColor)
  const actorToMove =
    game.result !== '*'
      ? 'none'
      : sideToMove === game.playerColor
        ? 'human'
        : 'voice'
  const lastMove = game.moves.at(-1) ?? null
  const lastMoveSummary = lastMove
    ? `${lastMove.san} (${lastMove.uci})`
    : 'an unknown move'
  const summary =
    source === 'turn-ready'
      ? actorToMove === 'voice'
        ? `Voice was activated while the persisted Chess game is waiting for Voice to move. Continue this game from the supplied position.`
        : game.result !== '*'
          ? `Voice was activated for a completed Chess game: ${game.resultLabel}.`
          : `Voice was activated for the persisted Chess game. It is currently the human’s turn.`
      : actorToMove === 'voice'
        ? `The human played ${lastMoveSummary}. It is now Voice’s turn in the active Chess game.`
        : game.result !== '*'
          ? `The human played ${lastMoveSummary} and the active Chess game ended: ${game.resultLabel}.`
          : `The human played ${lastMoveSummary}. Chess is waiting for the human again.`

  return {
    type: CHESS_VOICE_EVENT_MESSAGE_TYPE,
    eventId:
      source === 'turn-ready'
        ? `${game.id}:revision:${game.revision}:voice-session-active`
        : `${game.id}:revision:${game.revision}`,
    eventType:
      source === 'turn-ready' ? 'chess.turn-ready' : 'chess.human-move',
    summary,
    data: {
      gameId: game.id,
      revision: game.revision,
      status: game.result === '*' ? 'active' : 'completed',
      result: game.result,
      resultLabel: game.resultLabel,
      humanColor: game.playerColor,
      voiceColor,
      sideToMove,
      actorToMove,
      fen: game.currentFen,
      lastMove: lastMove
        ? {
            san: lastMove.san,
            uci: lastMove.uci,
            check: lastMove.check === true,
            checkmate: lastMove.checkmate === true,
          }
        : null,
      legalMoves:
        game.result === '*'
          ? chess.moves({ verbose: true }).map(moveToUci)
          : [],
    },
  }
}

export function createChessHumanMoveVoiceEvent(
  session: ChessSession,
): ChessVoiceEvent | null {
  return createChessVoiceEvent(session, 'human-move')
}

export function createChessTurnReadyVoiceEvent(
  session: ChessSession,
): ChessVoiceEvent | null {
  return createChessVoiceEvent(session, 'turn-ready')
}
