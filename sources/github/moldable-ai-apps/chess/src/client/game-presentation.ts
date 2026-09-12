import type { AppView, ChessEngine, ChessGameRecord } from '../shared/types'
import type { DesktopVoiceSessionStatus } from './desktop-voice-session'
import { colorName, moveToUci } from './game-utils'
import type { Chess } from 'chess.js'

export const ENGINE_LABELS: Record<ChessEngine, string> = {
  stockfish: 'Stockfish',
  'moldable-ai': 'Moldable AI',
  dumb: 'Dumb mode',
}

// The persisted `voice` mode assigns the opponent to the conversational agent.
// Voice is an interaction mode, not the opponent's identity. Desktop and mobile
// both present the conversational opponent as Moldable.
export function opponentName(game: ChessGameRecord): string {
  if (game.mode === 'ai') return ENGINE_LABELS[game.engine]
  if (game.mode === 'voice') return 'Moldable'
  return 'Player two'
}

export function statusForGame(
  chess: Chess,
  game: ChessGameRecord,
  aiThinking: boolean,
): string {
  if (game.result !== '*') return game.resultLabel
  if (aiThinking) return `${opponentName(game)} is considering the position…`
  if (chess.inCheck())
    return `${chess.turn() === 'w' ? 'White' : 'Black'} is in check`
  if (game.mode === 'voice' && colorName(chess.turn()) !== game.playerColor) {
    return `Waiting for ${opponentName(game)} to move`
  }
  return `${chess.turn() === 'w' ? 'White' : 'Black'} to move`
}

export function voiceOpponentDescription(
  status: DesktopVoiceSessionStatus,
): string {
  switch (status) {
    case 'active':
      return 'Voice is connected and can read the position or make a legal move.'
    case 'starting':
      return 'Voice is connecting. You can continue in chat while it starts.'
    case 'unknown':
      return 'Checking the Voice connection. You can continue in chat.'
    case 'error':
      return 'Voice is not connected. Continue in chat or try Voice again.'
    case 'off':
      return 'Play with Moldable in chat, or turn on Voice to play hands-free.'
  }
}

export function chessChatInstructions(
  chess: Chess,
  game: ChessGameRecord,
  view: AppView,
  voiceStatus: DesktopVoiceSessionStatus,
): string {
  const actorToMove =
    game.result !== '*'
      ? 'none'
      : game.mode === 'local'
        ? 'local player'
        : colorName(chess.turn()) === game.playerColor
          ? 'human'
          : opponentName(game)
  const legalMoves = chess
    .moves({ verbose: true })
    .map(moveToUci)
    .slice(0, 64)
    .join(', ')
  return [
    'The user is in the Chess app.',
    `View ${view}; game ${game.id}; revision ${game.revision}.`,
    `Mode ${game.mode}; engine ${game.engine}; human ${game.playerColor}; ${actorToMove} to move.`,
    `Voice connection: ${voiceStatus}.`,
    `FEN ${game.currentFen}.`,
    `Recent SAN: ${
      game.moves
        .slice(-8)
        .map((move) => move.san)
        .join(' ') || 'none'
    }.`,
    `Legal UCI moves: ${legalMoves || 'none'}.`,
    'Use chess.game.resume, submitMove with this exact revision, and waitForChange. Never invent a move outside the legal list.',
    'Chess owns authoritative state and board UI. The saved voice mode supports the conversational opponent in chat as well as Voice.',
    voiceStatus === 'active'
      ? 'Voice is connected. Explain moves in the current interaction; Chess does not narrate. Context updates alone must not trigger speech.'
      : 'No active Voice connection is confirmed. Continue in chat; do not ask the user to wait for Voice.',
  ].join('\n')
}
