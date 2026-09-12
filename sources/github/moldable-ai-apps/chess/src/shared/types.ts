export type ChessColor = 'white' | 'black'
export type GameMode = 'ai' | 'voice' | 'local'
export type ChessEngine = 'stockfish' | 'moldable-ai' | 'dumb'
export type Difficulty = 'friendly' | 'club' | 'master'
export type AppView = 'play' | 'learn' | 'history'
export type GameActor = 'human' | 'voice' | 'ai' | 'local' | 'none'

export interface ChessMoveRecord {
  from: string
  to: string
  promotion?: string
  san: string
  uci: string
  fenBefore?: string
  fenAfter: string
  playedBy: 'player' | 'ai' | 'voice' | 'local'
  check?: boolean
  checkmate?: boolean
  playedAt?: string
  revisionAfter?: number
  operationId?: string
  operationFingerprint?: string
}

export interface ChessGameRecord {
  id: string
  revision: number
  createdAt: string
  updatedAt: string
  completedAt?: string
  title: string
  mode: GameMode
  engine: ChessEngine
  difficulty: Difficulty
  playerColor: ChessColor
  startFen: string
  currentFen: string
  moves: ChessMoveRecord[]
  result: string
  resultLabel: string
  createdByOperationId?: string
  createdByOperationFingerprint?: string
}

export interface ChessSession {
  view: AppView
  game: ChessGameRecord
}

export interface ChessStateMove {
  san: string
  uci: string
  playedBy: ChessMoveRecord['playedBy']
  fenBefore: string
  fenAfter: string
  check: boolean
  checkmate: boolean
}

export interface ChessGameState {
  changed: true
  gameId: string
  revision: number
  mode: GameMode
  engine: ChessEngine
  status: 'active' | 'completed'
  result: string
  resultLabel: string
  fen: string
  sideToMove: ChessColor
  actorToMove: GameActor
  humanColor: ChessColor
  voiceColor: ChessColor | null
  roles: {
    player: {
      actor: 'human'
      color: ChessColor
    }
    voice: {
      actor: 'voice'
      color: ChessColor | null
      role: 'opponent' | 'observer'
    }
  }
  inCheck: boolean
  moveNumber: number
  lastMove: ChessStateMove | null
  recentMoves: ChessStateMove[]
  legalMoves: string[]
}

export interface ChessGameUnchanged {
  changed: false
  gameId: string
  revision: number
}

export type ChessGameStateResult = ChessGameState | ChessGameUnchanged

export interface AiMoveResponse {
  move: string
  explanation: string
  evaluation: string
  plan: string
  model?: string
  source: 'llm' | 'stockfish' | 'fallback'
}

export interface ChessEngineStatus {
  id: 'stockfish'
  name: 'Stockfish'
  version: string
  installed: boolean
  installedAt?: string
  sizeBytes?: number
  downloadSizeBytes: number
  license: 'AGPL-3.0-or-later'
  sourceUrl: string
  licenseUrl: string
  note: string
}

export interface EngineOnboardingStatus {
  completed: boolean
  choice?: ChessEngine
  completedAt?: string
}

export interface TutorSettings {
  enabled: boolean
}

export interface TutorPrompt {
  focus: string
  question: string
  source: 'llm' | 'fallback'
  groundedByStockfish: boolean
  model?: string
}

export interface TutorAnalysisCandidate {
  description: string
  assessment: string
}

export interface TutorAnalysis {
  available: boolean
  outlook?: string
  detail?: string
  candidates: TutorAnalysisCandidate[]
  reason?: string
}

export interface TutorialCandidate {
  move: string
  label: string
  idea: string
}

export interface TutorialLesson {
  scenarioId: string
  title: string
  theme: string
  difficulty: Difficulty
  fen: string
  objective: string
  explanation: string
  bestMove: string
  hints: string[]
  candidates: TutorialCandidate[]
  model?: string
  source: 'llm' | 'fallback'
}

export type ChessUiIntent =
  | {
      id: string
      createdAt: string
      expiresAt: string
      operationId?: string
      action: 'sync-game'
      payload: {
        gameId: string
        revision: number
      }
    }
  | {
      id: string
      createdAt: string
      expiresAt: string
      operationId?: string
      action: 'new-game'
      payload: {
        mode?: GameMode
        engine?: ChessEngine
        difficulty?: Difficulty
        playerColor?: ChessColor
      }
    }
  | {
      id: string
      createdAt: string
      expiresAt: string
      operationId?: string
      action: 'move'
      payload: { move: string }
    }
  | {
      id: string
      createdAt: string
      expiresAt: string
      operationId?: string
      action: 'navigate'
      payload: { view: AppView }
    }
  | {
      id: string
      createdAt: string
      expiresAt: string
      operationId?: string
      action: 'tutorial'
      payload: { topic?: string; difficulty?: Difficulty }
    }
  | {
      id: string
      createdAt: string
      expiresAt: string
      operationId?: string
      action: 'load-game'
      payload: { gameId: string }
    }
  | {
      id: string
      createdAt: string
      expiresAt: string
      operationId?: string
      action: 'replay'
      payload: { command: 'play' | 'pause' | 'next' | 'previous' | 'restart' }
    }

export interface ChessUiIntentClaim {
  claimId: string
  consumerId: string
  claimedAt: string
  leaseExpiresAt: string
  intent: ChessUiIntent
}

export interface ChessUiIntentQueue {
  pending: ChessUiIntent[]
  activeClaim: ChessUiIntentClaim | null
}
