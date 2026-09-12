import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cpu,
  Download,
  ExternalLink,
  FlipVertical2,
  GraduationCap,
  History,
  Lightbulb,
  LoaderCircle,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Undo2,
  Volume2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppFrameContent,
  Badge,
  Button,
  Toolbar,
  ToolbarButton,
  cn,
  useWorkspace,
} from '@moldable-ai/ui'
import { ChessBoard } from './components/chess-board'
import type {
  AiMoveResponse,
  AppView,
  ChessColor,
  ChessEngine,
  ChessEngineStatus,
  ChessGameRecord,
  ChessSession,
  ChessUiIntent,
  ChessUiIntentClaim,
  Difficulty,
  EngineOnboardingStatus,
  GameMode,
  TutorAnalysis,
  TutorPrompt,
  TutorSettings,
  TutorialLesson,
} from '../shared/types'
import {
  type DesktopVoiceSessionStatus,
  activateDesktopVoiceSession,
  getDesktopVoiceSessionStatus,
  subscribeDesktopVoiceSessionStatus,
} from './desktop-voice-session'
import {
  ENGINE_LABELS,
  chessChatInstructions,
  opponentName,
  statusForGame,
  voiceOpponentDescription,
} from './game-presentation'
import {
  applyMoves,
  colorName,
  createGameRecord,
  formatGameDate,
  movePairs,
  oppositeColor,
} from './game-utils'
import {
  createChessHumanMoveVoiceEvent,
  createChessTurnReadyVoiceEvent,
} from './voice-events'
import { Chess, type Square } from 'chess.js'

const NAV_ITEMS: Array<{
  id: AppView
  label: string
  icon: typeof Bot
}> = [
  { id: 'play', label: 'Play', icon: Bot },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'history', label: 'History', icon: History },
]

const MODE_LABELS: Record<GameMode, string> = {
  ai: 'AI opponent',
  voice: 'Moldable opponent',
  local: 'Two players',
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  friendly: 'Friendly',
  club: 'Club',
  master: 'Master',
}

function isChessSession(value: unknown): value is ChessSession {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ChessSession>
  return Boolean(
    candidate.game &&
      typeof candidate.game.currentFen === 'string' &&
      typeof candidate.game.revision === 'number' &&
      Array.isArray(candidate.game.moves),
  )
}

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const restoredGameIdRef = useRef<string | null>(null)
  const aiRequestRef = useRef<{ fen: string; id: string } | null>(null)
  const tutorRequestRef = useRef<string | null>(null)
  const intentDrainInFlightRef = useRef(false)
  const intentDrainRequestedRef = useRef(false)
  const intentConsumerIdRef = useRef(crypto.randomUUID())
  const previousVoiceSessionStatusRef =
    useRef<DesktopVoiceSessionStatus>('unknown')
  const voiceReadyEventGenerationRef = useRef(0)
  const sentVoiceReadyEventGenerationRef = useRef(0)
  const [view, setView] = useState<AppView>('play')
  const [sidePanelOpen, setSidePanelOpen] = useState(true)
  const [game, setGame] = useState<ChessGameRecord>(() => createGameRecord())
  const [orientation, setOrientation] = useState<ChessColor>('white')
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [aiThinking, setAiThinking] = useState(false)
  const [aiRetryNonce, setAiRetryNonce] = useState(0)
  const [engineInstalling, setEngineInstalling] = useState(false)
  const [onboardingChoicePending, setOnboardingChoicePending] =
    useState<ChessEngine | null>(null)
  const [movePending, setMovePending] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [opponentNote, setOpponentNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tutorialTopic, setTutorialTopic] = useState('tactics')
  const [tutorial, setTutorial] = useState<TutorialLesson | null>(null)
  const [tutorialFen, setTutorialFen] = useState<string | null>(null)
  const [tutorialSelected, setTutorialSelected] = useState<Square | null>(null)
  const [tutorialFeedback, setTutorialFeedback] = useState<string | null>(null)
  const [tutorialLoading, setTutorialLoading] = useState(false)
  const [visibleHintCount, setVisibleHintCount] = useState(0)
  const [tutorPrompt, setTutorPrompt] = useState<{
    fen: string
    value: TutorPrompt
  } | null>(null)
  const [tutorLoading, setTutorLoading] = useState(false)
  const [tutorNudging, setTutorNudging] = useState(false)
  const [tutorHintsOpen, setTutorHintsOpen] = useState(false)
  const [tutorAnalysis, setTutorAnalysis] = useState<{
    fen: string
    value: TutorAnalysis
  } | null>(null)
  const [tutorAnalysisLoading, setTutorAnalysisLoading] = useState(false)
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null,
  )
  const [replayPly, setReplayPly] = useState(0)
  const [replayPlaying, setReplayPlaying] = useState(false)
  const [voiceSessionStatus, setVoiceSessionStatus] =
    useState<DesktopVoiceSessionStatus>('unknown')
  const [voiceActivationPending, setVoiceActivationPending] = useState(false)
  const [voiceActivationError, setVoiceActivationError] = useState<
    string | null
  >(null)

  useEffect(() => {
    const unsubscribe = subscribeDesktopVoiceSessionStatus(
      setVoiceSessionStatus,
    )
    void getDesktopVoiceSessionStatus()
      .then(setVoiceSessionStatus)
      .catch(() => setVoiceSessionStatus('off'))
    return unsubscribe
  }, [])

  useEffect(() => {
    const previous = previousVoiceSessionStatusRef.current
    previousVoiceSessionStatusRef.current = voiceSessionStatus
    if (voiceSessionStatus === 'active' && previous !== 'active') {
      voiceReadyEventGenerationRef.current += 1
    }
  }, [voiceSessionStatus])

  useEffect(() => {
    const generation = voiceReadyEventGenerationRef.current
    if (
      voiceSessionStatus !== 'active' ||
      !sessionReady ||
      game.mode !== 'voice' ||
      generation === 0 ||
      sentVoiceReadyEventGenerationRef.current === generation
    ) {
      return
    }
    const voiceEvent = createChessTurnReadyVoiceEvent({ view, game })
    if (!voiceEvent) return
    sentVoiceReadyEventGenerationRef.current = generation
    window.parent.postMessage(voiceEvent, '*')
  }, [game, sessionReady, view, voiceSessionStatus])

  const continueWithVoice = useCallback(async () => {
    setVoiceActivationPending(true)
    setVoiceActivationError(null)
    try {
      const status = await activateDesktopVoiceSession()
      setVoiceSessionStatus(status)
    } catch (reason) {
      setVoiceActivationError(
        reason instanceof Error
          ? reason.message
          : 'Voice could not be started.',
      )
      setVoiceSessionStatus('error')
    } finally {
      setVoiceActivationPending(false)
    }
  }, [])

  const sessionQuery = useQuery({
    queryKey: ['chess-session', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/session')
      if (!response.ok) throw new Error('Failed to restore the chess session')
      return (await response.json()) as unknown
    },
  })

  const historyQuery = useQuery({
    queryKey: ['chess-games', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/games')
      if (!response.ok) throw new Error('Failed to load game history')
      return (await response.json()) as ChessGameRecord[]
    },
  })

  const engineQuery = useQuery({
    queryKey: ['chess-engine', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/engine/stockfish')
      if (!response.ok) throw new Error('Failed to read local engine status')
      return (await response.json()) as ChessEngineStatus
    },
  })

  const engineOnboardingQuery = useQuery({
    queryKey: ['chess-engine-onboarding', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/engine/onboarding')
      if (!response.ok) throw new Error('Failed to read engine setup status')
      return (await response.json()) as EngineOnboardingStatus
    },
  })

  const tutorSettingsQuery = useQuery({
    queryKey: ['chess-tutor-settings', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/tutor/settings')
      if (!response.ok) throw new Error('Failed to read tutor settings')
      return (await response.json()) as TutorSettings
    },
  })

  const applyAuthoritativeSession = useCallback((session: ChessSession) => {
    setView(session.view)
    setGame(session.game)
    if (restoredGameIdRef.current !== session.game.id) {
      restoredGameIdRef.current = session.game.id
      setOrientation(session.game.playerColor)
    }
    setSelectedSquare(null)
  }, [])

  useEffect(() => {
    setSessionReady(false)
    restoredGameIdRef.current = null
    intentConsumerIdRef.current = crypto.randomUUID()
  }, [workspaceId])

  useEffect(() => {
    if (sessionQuery.isPending) return
    if (!isChessSession(sessionQuery.data)) return
    applyAuthoritativeSession(sessionQuery.data)
    setSessionReady(true)
  }, [applyAuthoritativeSession, sessionQuery.data, sessionQuery.isPending])

  const chess = useMemo(() => new Chess(game.currentFen), [game.currentFen])
  const moveRows = useMemo(() => movePairs(game.moves), [game.moves])
  const currentColor = colorName(chess.turn())
  const tutorEnabled = tutorSettingsQuery.data?.enabled === true
  const tutorTurn =
    game.result === '*' &&
    (game.mode === 'local' || currentColor === game.playerColor)
  const canPlayerMove =
    game.result === '*' &&
    !aiThinking &&
    !movePending &&
    (game.mode === 'local' || currentColor === game.playerColor)
  const legalTargets = useMemo(() => {
    if (!selectedSquare) return new Set<string>()
    return new Set(
      chess
        .moves({ square: selectedSquare, verbose: true })
        .map((move) => move.to),
    )
  }, [chess, selectedSquare])
  const lastMove = game.moves.at(-1) ?? null

  const refreshSession = useCallback(async (): Promise<ChessSession> => {
    const response = await fetchWithWorkspace('/api/session')
    const body = (await response.json()) as unknown
    if (!response.ok || !isChessSession(body)) {
      throw new Error('Failed to refresh the authoritative chess session')
    }
    applyAuthoritativeSession(body)
    return body
  }, [applyAuthoritativeSession, fetchWithWorkspace])

  const refreshHistory = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ['chess-games', workspaceId],
    })
  }, [queryClient, workspaceId])

  const installEngine = useCallback(async () => {
    setEngineInstalling(true)
    setError(null)
    try {
      const response = await fetchWithWorkspace(
        '/api/engine/stockfish/install',
        { method: 'POST' },
      )
      const body = (await response.json()) as
        | ChessEngineStatus
        | { error?: string }
      if (!response.ok || !('installed' in body)) {
        throw new Error(
          'error' in body
            ? (body.error ?? 'Failed to install Stockfish')
            : 'Failed to install Stockfish',
        )
      }
      queryClient.setQueryData(['chess-engine', workspaceId], body)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Failed to install Stockfish',
      )
    } finally {
      setEngineInstalling(false)
    }
  }, [fetchWithWorkspace, queryClient, workspaceId])

  const newGame = useCallback(
    async (options?: {
      mode?: GameMode
      engine?: ChessEngine
      difficulty?: Difficulty
      playerColor?: ChessColor
    }) => {
      setMovePending(true)
      setOpponentNote(null)
      setError(null)
      const request = {
        mode: options?.mode ?? game.mode,
        engine: options?.engine ?? game.engine,
        difficulty: options?.difficulty ?? game.difficulty,
        playerColor: options?.playerColor ?? game.playerColor,
      }
      try {
        const response = await fetchWithWorkspace('/api/game/new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        })
        const body = (await response.json()) as unknown
        if (!response.ok || !isChessSession(body)) {
          const failure = body as { error?: string }
          throw new Error(failure.error ?? 'Failed to start a new game')
        }
        applyAuthoritativeSession(body)
        refreshHistory()
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Failed to start a new game',
        )
      } finally {
        setMovePending(false)
      }
    },
    [
      applyAuthoritativeSession,
      fetchWithWorkspace,
      game.difficulty,
      game.engine,
      game.mode,
      game.playerColor,
      refreshHistory,
    ],
  )

  const chooseInitialEngine = useCallback(
    async (choice: ChessEngine) => {
      setOnboardingChoicePending(choice)
      setError(null)
      try {
        if (choice === 'stockfish') {
          const installResponse = await fetchWithWorkspace(
            '/api/engine/stockfish/install',
            { method: 'POST' },
          )
          const installBody = (await installResponse.json()) as
            | ChessEngineStatus
            | { error?: string }
          if (!installResponse.ok || !('installed' in installBody)) {
            throw new Error(
              'error' in installBody
                ? (installBody.error ?? 'Failed to install Stockfish')
                : 'Failed to install Stockfish',
            )
          }
          queryClient.setQueryData(['chess-engine', workspaceId], installBody)
        }

        const response = await fetchWithWorkspace('/api/engine/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ choice }),
        })
        const body = (await response.json()) as
          | EngineOnboardingStatus
          | { error?: string }
        if (!response.ok || !('completed' in body)) {
          throw new Error(
            'error' in body
              ? (body.error ?? 'Failed to save the engine choice')
              : 'Failed to save the engine choice',
          )
        }
        queryClient.setQueryData(['chess-engine-onboarding', workspaceId], body)
        await newGame({ mode: 'ai', engine: choice })
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Failed to finish engine setup',
        )
      } finally {
        setOnboardingChoicePending(null)
      }
    },
    [fetchWithWorkspace, newGame, queryClient, workspaceId],
  )

  const toggleTutor = useCallback(async () => {
    const enabled = !tutorEnabled
    try {
      const response = await fetchWithWorkspace('/api/tutor/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      const body = (await response.json()) as TutorSettings | { error?: string }
      if (!response.ok || !('enabled' in body)) {
        throw new Error(
          'error' in body
            ? (body.error ?? 'Failed to update tutor')
            : 'Failed to update tutor',
        )
      }
      queryClient.setQueryData(['chess-tutor-settings', workspaceId], body)
      if (!body.enabled) {
        tutorRequestRef.current = null
        setTutorPrompt(null)
        setTutorHintsOpen(false)
        setTutorAnalysis(null)
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Failed to update tutor',
      )
    }
  }, [fetchWithWorkspace, queryClient, tutorEnabled, workspaceId])

  const requestTutorPrompt = useCallback(
    async (stage: 'question' | 'nudge') => {
      const requestId = crypto.randomUUID()
      tutorRequestRef.current = requestId
      if (stage === 'nudge') {
        setTutorNudging(true)
      } else {
        setTutorLoading(true)
        setTutorHintsOpen(false)
        setTutorAnalysis(null)
      }
      try {
        const response = await fetchWithWorkspace('/api/tutor/question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fen: game.currentFen,
            difficulty: game.difficulty,
            stage,
            previousQuestion:
              stage === 'nudge' ? tutorPrompt?.value.question : undefined,
            lastMove: game.moves.at(-1)?.san,
          }),
        })
        const body = (await response.json()) as TutorPrompt | { error?: string }
        if (!response.ok || !('question' in body)) {
          throw new Error(
            'error' in body
              ? (body.error ?? 'The tutor could not form a question')
              : 'The tutor could not form a question',
          )
        }
        if (tutorRequestRef.current !== requestId) return
        setTutorPrompt({ fen: game.currentFen, value: body })
      } catch (reason) {
        if (tutorRequestRef.current !== requestId) return
        setError(
          reason instanceof Error
            ? reason.message
            : 'The tutor could not form a question',
        )
      } finally {
        if (tutorRequestRef.current === requestId) {
          setTutorLoading(false)
          setTutorNudging(false)
        }
      }
    },
    [
      fetchWithWorkspace,
      game.currentFen,
      game.difficulty,
      game.moves,
      tutorPrompt?.value.question,
    ],
  )

  const toggleTutorHints = useCallback(async () => {
    if (tutorHintsOpen) {
      setTutorHintsOpen(false)
      return
    }
    setTutorHintsOpen(true)
    if (tutorAnalysis?.fen === game.currentFen) return

    setTutorAnalysisLoading(true)
    try {
      const response = await fetchWithWorkspace('/api/tutor/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: game.currentFen }),
      })
      const body = (await response.json()) as TutorAnalysis | { error?: string }
      if (!response.ok || !('available' in body)) {
        throw new Error(
          'error' in body
            ? (body.error ?? 'Position hints are unavailable')
            : 'Position hints are unavailable',
        )
      }
      setTutorAnalysis({ fen: game.currentFen, value: body })
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Position hints are unavailable',
      )
      setTutorHintsOpen(false)
    } finally {
      setTutorAnalysisLoading(false)
    }
  }, [fetchWithWorkspace, game.currentFen, tutorAnalysis?.fen, tutorHintsOpen])

  const commitMove = useCallback(
    async (uci: string, actor: 'human' | 'ai' | 'local'): Promise<boolean> => {
      setMovePending(true)
      try {
        const response = await fetchWithWorkspace('/api/game/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: game.id,
            expectedRevision: game.revision,
            move: uci,
            actor,
          }),
        })
        const body = (await response.json()) as
          | { session: ChessSession }
          | { error?: string; code?: string }
        if (
          !response.ok ||
          !('session' in body) ||
          !isChessSession(body.session)
        ) {
          await refreshSession().catch(() => undefined)
          throw new Error(
            'error' in body
              ? (body.error ?? 'The position changed before that move')
              : 'The position changed before that move',
          )
        }
        applyAuthoritativeSession(body.session)
        refreshHistory()
        if (actor === 'human') {
          const voiceEvent = createChessHumanMoveVoiceEvent(body.session)
          if (voiceEvent) window.parent.postMessage(voiceEvent, '*')
        }
        setError(null)
        return true
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : `That move (${uci}) could not be committed.`,
        )
        return false
      } finally {
        setMovePending(false)
      }
    },
    [
      applyAuthoritativeSession,
      fetchWithWorkspace,
      game.id,
      game.revision,
      refreshHistory,
      refreshSession,
    ],
  )

  const handleBoardSquare = useCallback(
    (square: Square) => {
      if (!canPlayerMove) return
      const piece = chess.get(square)
      if (selectedSquare && legalTargets.has(square)) {
        const uci = `${selectedSquare}${square}${
          chess.get(selectedSquare)?.type === 'p' &&
          (square.endsWith('1') || square.endsWith('8'))
            ? 'q'
            : ''
        }`
        void commitMove(uci, game.mode === 'local' ? 'local' : 'human')
        return
      }
      if (piece?.color === chess.turn()) {
        setSelectedSquare(square)
        setError(null)
      } else {
        setSelectedSquare(null)
      }
    },
    [canPlayerMove, chess, game.mode, legalTargets, commitMove, selectedSquare],
  )

  useEffect(() => {
    const aiTurn =
      sessionReady &&
      view === 'play' &&
      game.mode === 'ai' &&
      game.result === '*' &&
      currentColor === oppositeColor(game.playerColor) &&
      (game.engine !== 'stockfish' || engineQuery.data?.installed === true)
    if (!aiTurn || aiRequestRef.current?.fen === game.currentFen) return

    const controller = new AbortController()
    const request = { fen: game.currentFen, id: crypto.randomUUID() }
    aiRequestRef.current = request
    setAiThinking(true)
    setOpponentNote(null)
    setError(null)
    const watchdog = window.setTimeout(() => {
      if (aiRequestRef.current?.id !== request.id) return
      controller.abort()
      aiRequestRef.current = null
      setAiThinking(false)
      setError('The AI took too long. Retrying…')
      setAiRetryNonce((nonce) => nonce + 1)
    }, 15_000)
    void fetchWithWorkspace('/api/ai/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fen: game.currentFen,
        engine: game.engine,
        difficulty: game.difficulty,
        history: game.moves.slice(-24).map((move) => move.uci),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as
          | AiMoveResponse
          | { error: string }
        if (!response.ok || !('move' in body)) {
          throw new Error('error' in body ? body.error : 'AI move failed')
        }
        if (await commitMove(body.move, 'ai')) {
          setOpponentNote(`${body.explanation} ${body.plan}`)
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setError(
          reason instanceof Error
            ? reason.message
            : 'The AI could not move. Try again.',
        )
      })
      .finally(() => {
        window.clearTimeout(watchdog)
        if (aiRequestRef.current?.id === request.id) {
          aiRequestRef.current = null
          setAiThinking(false)
        }
      })

    return () => {
      window.clearTimeout(watchdog)
      controller.abort()
      if (aiRequestRef.current?.id === request.id) {
        aiRequestRef.current = null
        setAiThinking(false)
      }
    }
  }, [
    aiRetryNonce,
    currentColor,
    fetchWithWorkspace,
    game.currentFen,
    game.difficulty,
    game.engine,
    game.mode,
    game.moves,
    game.playerColor,
    game.result,
    engineQuery.data?.installed,
    commitMove,
    sessionReady,
    view,
  ])

  useEffect(() => {
    if (
      !sessionReady ||
      view !== 'play' ||
      !tutorEnabled ||
      !tutorTurn ||
      engineOnboardingQuery.data?.completed === false ||
      tutorPrompt?.fen === game.currentFen
    ) {
      return
    }
    void requestTutorPrompt('question')
  }, [
    engineOnboardingQuery.data?.completed,
    game.currentFen,
    requestTutorPrompt,
    sessionReady,
    tutorEnabled,
    tutorPrompt?.fen,
    tutorTurn,
    view,
  ])

  const undoMove = useCallback(async () => {
    setMovePending(true)
    try {
      const response = await fetchWithWorkspace('/api/game/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          expectedRevision: game.revision,
        }),
      })
      const body = (await response.json()) as unknown
      if (!response.ok || !isChessSession(body)) {
        const failure = body as { error?: string }
        await refreshSession().catch(() => undefined)
        throw new Error(failure.error ?? 'Failed to undo the move')
      }
      applyAuthoritativeSession(body)
      refreshHistory()
      setOpponentNote(null)
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to undo')
    } finally {
      setMovePending(false)
    }
  }, [
    applyAuthoritativeSession,
    fetchWithWorkspace,
    game.id,
    game.revision,
    refreshHistory,
    refreshSession,
  ])

  const changeView = useCallback(
    async (nextView: AppView) => {
      setView(nextView)
      try {
        const response = await fetchWithWorkspace('/api/session/view', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ view: nextView }),
        })
        const body = (await response.json()) as unknown
        if (!response.ok || !isChessSession(body)) {
          throw new Error('Failed to save the Chess view')
        }
        applyAuthoritativeSession(body)
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : 'Failed to change view',
        )
        await refreshSession().catch(() => undefined)
      }
    },
    [applyAuthoritativeSession, fetchWithWorkspace, refreshSession],
  )

  const generateLesson = useCallback(
    async (topic = tutorialTopic, difficulty = game.difficulty) => {
      await changeView('learn')
      setTutorialLoading(true)
      setTutorialFeedback(null)
      setVisibleHintCount(0)
      try {
        const response = await fetchWithWorkspace('/api/tutorial/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, difficulty }),
        })
        const body = (await response.json()) as
          | TutorialLesson
          | { error: string }
        if (!response.ok || !('fen' in body)) {
          throw new Error('error' in body ? body.error : 'Lesson failed')
        }
        setTutorial(body)
        setTutorialFen(body.fen)
        setTutorialSelected(null)
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'The coach could not create a lesson.',
        )
      } finally {
        setTutorialLoading(false)
      }
    },
    [changeView, fetchWithWorkspace, game.difficulty, tutorialTopic],
  )

  const tutorialChess = useMemo(
    () => new Chess(tutorialFen ?? tutorial?.fen ?? new Chess().fen()),
    [tutorial?.fen, tutorialFen],
  )
  const tutorialTargets = useMemo(() => {
    if (!tutorialSelected) return new Set<string>()
    return new Set(
      tutorialChess
        .moves({ square: tutorialSelected, verbose: true })
        .map((move) => move.to),
    )
  }, [tutorialChess, tutorialSelected])

  const handleTutorialSquare = useCallback(
    (square: Square) => {
      if (!tutorial || tutorialFeedback) return
      if (tutorialSelected && tutorialTargets.has(square)) {
        const promotion =
          tutorialChess.get(tutorialSelected)?.type === 'p' &&
          (square.endsWith('1') || square.endsWith('8'))
            ? 'q'
            : ''
        const uci = `${tutorialSelected}${square}${promotion}`
        const next = new Chess(tutorial.fen)
        try {
          next.move({
            from: tutorialSelected,
            to: square,
            promotion: promotion || 'q',
          })
          setTutorialFen(next.fen())
          setTutorialFeedback(
            uci === tutorial.bestMove
              ? `Exactly. ${tutorial.explanation}`
              : `That move is legal, but ${tutorial.bestMove} is stronger. ${tutorial.explanation}`,
          )
        } catch {
          setTutorialFeedback('That move is not legal in this position.')
        }
        setTutorialSelected(null)
        return
      }
      if (tutorialChess.get(square)?.color === tutorialChess.turn()) {
        setTutorialSelected(square)
      } else {
        setTutorialSelected(null)
      }
    },
    [
      tutorial,
      tutorialChess,
      tutorialFeedback,
      tutorialSelected,
      tutorialTargets,
    ],
  )

  const games = historyQuery.data ?? []
  const selectedHistory =
    games.find((candidate) => candidate.id === selectedHistoryId) ?? games[0]
  const replayChess = useMemo(
    () =>
      selectedHistory
        ? applyMoves(selectedHistory.startFen, selectedHistory.moves, replayPly)
        : new Chess(),
    [replayPly, selectedHistory],
  )

  useEffect(() => {
    if (!selectedHistory) return
    if (!selectedHistoryId) setSelectedHistoryId(selectedHistory.id)
    setReplayPly((current) => Math.min(current, selectedHistory.moves.length))
  }, [selectedHistory, selectedHistoryId])

  useEffect(() => {
    if (!replayPlaying || !selectedHistory) return
    if (replayPly >= selectedHistory.moves.length) {
      setReplayPlaying(false)
      return
    }
    const timeout = window.setTimeout(
      () => setReplayPly((current) => current + 1),
      760,
    )
    return () => window.clearTimeout(timeout)
  }, [replayPlaying, replayPly, selectedHistory])

  const applyIntent = useCallback(
    async (intent: ChessUiIntent) => {
      if (intent.action === 'sync-game') {
        await refreshSession()
        refreshHistory()
      } else if (intent.action === 'new-game') {
        await newGame(intent.payload)
      } else if (intent.action === 'move') {
        await refreshSession()
        setError(
          `A legacy queued move (${intent.payload.move}) was not applied without a revision. Ask Moldable to retry it.`,
        )
      } else if (intent.action === 'navigate') {
        await changeView(intent.payload.view)
      } else if (intent.action === 'tutorial') {
        setTutorialTopic(intent.payload.topic ?? 'tactics')
        await generateLesson(
          intent.payload.topic ?? 'tactics',
          intent.payload.difficulty ?? game.difficulty,
        )
      } else if (intent.action === 'load-game') {
        setSelectedHistoryId(intent.payload.gameId)
        setReplayPly(0)
        setReplayPlaying(false)
        await changeView('history')
      } else if (intent.action === 'replay') {
        if (intent.payload.command === 'play') setReplayPlaying(true)
        if (intent.payload.command === 'pause') setReplayPlaying(false)
        if (intent.payload.command === 'restart') setReplayPly(0)
        if (intent.payload.command === 'next') {
          setReplayPly((current) =>
            Math.min(current + 1, selectedHistory?.moves.length ?? current + 1),
          )
        }
        if (intent.payload.command === 'previous') {
          setReplayPly((current) => Math.max(0, current - 1))
        }
      }
    },
    [
      changeView,
      game.difficulty,
      generateLesson,
      newGame,
      refreshHistory,
      refreshSession,
      selectedHistory?.moves.length,
    ],
  )

  const drainUiIntents = useCallback(async () => {
    if (!sessionReady) return
    if (intentDrainInFlightRef.current) {
      intentDrainRequestedRef.current = true
      return
    }
    intentDrainInFlightRef.current = true
    try {
      await refreshSession()
      refreshHistory()
      for (let index = 0; index < 16; index += 1) {
        const response = await fetchWithWorkspace(
          '/api/moldable/ui-intent/claim',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              consumerId: intentConsumerIdRef.current,
            }),
          },
        )
        if (!response.ok) return
        const claim = (await response.json()) as ChessUiIntentClaim | null
        if (!claim?.claimId) return

        try {
          await applyIntent(claim.intent)
          const ack = await fetchWithWorkspace('/api/moldable/ui-intent/ack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              claimId: claim.claimId,
              consumerId: intentConsumerIdRef.current,
            }),
          })
          if (!ack.ok) return
        } catch {
          await fetchWithWorkspace('/api/moldable/ui-intent/release', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              claimId: claim.claimId,
              consumerId: intentConsumerIdRef.current,
            }),
          }).catch(() => undefined)
          return
        }
      }
    } catch {
      // Voice driving is best-effort while the app service reloads.
    } finally {
      intentDrainInFlightRef.current = false
      if (intentDrainRequestedRef.current) {
        intentDrainRequestedRef.current = false
        window.postMessage({ type: 'chess:drain-ui-intents' }, '*')
      }
    }
  }, [
    applyIntent,
    fetchWithWorkspace,
    refreshHistory,
    refreshSession,
    sessionReady,
  ])

  useEffect(() => {
    if (!sessionReady) return
    void drainUiIntents()
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: unknown
        targetAppId?: unknown
        command?: unknown
      } | null
      if (data?.command === 'chess.new-game') void newGame()
      if (data?.command === 'chess.learn') {
        void generateLesson()
      }
      if (
        data?.type === 'moldable:app-api-changed' &&
        data.targetAppId === 'chess'
      ) {
        void drainUiIntents()
      }
      if (data?.type === 'chess:drain-ui-intents') {
        void drainUiIntents()
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [drainUiIntents, generateLesson, newGame, sessionReady])

  useEffect(() => {
    window.parent.postMessage(
      {
        type: 'moldable:set-chat-instructions',
        text: chessChatInstructions(chess, game, view, voiceSessionStatus),
      },
      '*',
    )
  }, [chess, game, view, voiceSessionStatus])

  return (
    <>
      <Toolbar position="top" variant="plain" material="none" className="gap-2">
        <nav
          className="bg-muted/35 mx-auto flex items-center rounded-full p-1"
          aria-label="Chess views"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  view === item.id &&
                    'bg-background/80 text-foreground shadow-sm',
                )}
                onClick={() => void changeView(item.id)}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            )
          })}
        </nav>
        <ToolbarButton
          material="ultra-thin"
          type="button"
          size="icon-xl"
          className="cursor-pointer"
          onClick={() => setSidePanelOpen((open) => !open)}
          aria-label={
            sidePanelOpen ? 'Hide details panel' : 'Show details panel'
          }
          title={sidePanelOpen ? 'Hide details panel' : 'Show details panel'}
        >
          {sidePanelOpen ? (
            <PanelRightClose className="size-4" />
          ) : (
            <PanelRightOpen className="size-4" />
          )}
        </ToolbarButton>
        <ToolbarButton
          material="ultra-thin"
          type="button"
          className="cursor-pointer"
          onClick={() => void newGame()}
        >
          New game
        </ToolbarButton>
      </Toolbar>

      <AppFrameContent
        scrollable={false}
        chatSafe={false}
        className="bg-transparent"
      >
        {view === 'play' ? (
          <PlayView
            game={game}
            chess={chess}
            orientation={orientation}
            selectedSquare={selectedSquare}
            legalTargets={legalTargets}
            lastMove={lastMove}
            aiThinking={aiThinking}
            canPlayerMove={canPlayerMove}
            opponentNote={opponentNote}
            error={error}
            engineStatus={engineQuery.data ?? null}
            engineInstalling={engineInstalling}
            tutorEnabled={tutorEnabled}
            tutorTurn={tutorTurn}
            tutorPrompt={
              tutorPrompt?.fen === game.currentFen ? tutorPrompt.value : null
            }
            tutorLoading={tutorLoading}
            tutorNudging={tutorNudging}
            tutorHintsOpen={tutorHintsOpen}
            tutorAnalysis={
              tutorAnalysis?.fen === game.currentFen
                ? tutorAnalysis.value
                : null
            }
            tutorAnalysisLoading={tutorAnalysisLoading}
            moveRows={moveRows}
            showSidePanel={sidePanelOpen}
            voiceSessionStatus={voiceSessionStatus}
            voiceActivationPending={voiceActivationPending}
            voiceActivationError={voiceActivationError}
            onSquareClick={handleBoardSquare}
            onFlip={() => setOrientation((current) => oppositeColor(current))}
            onUndo={() => void undoMove()}
            onInstallEngine={() => void installEngine()}
            onToggleTutor={() => void toggleTutor()}
            onTutorNudge={() => void requestTutorPrompt('nudge')}
            onToggleTutorHints={() => void toggleTutorHints()}
            onWatchGame={() => {
              queryClient.setQueryData<ChessGameRecord[]>(
                ['chess-games', workspaceId],
                (current = []) => [
                  game,
                  ...current.filter((candidate) => candidate.id !== game.id),
                ],
              )
              setSelectedHistoryId(game.id)
              setReplayPly(0)
              setReplayPlaying(true)
              void changeView('history')
            }}
            onContinueWithVoice={() => void continueWithVoice()}
            onNewGame={(options) => void newGame(options)}
          />
        ) : view === 'learn' ? (
          <LearnView
            gameDifficulty={game.difficulty}
            topic={tutorialTopic}
            lesson={tutorial}
            fen={tutorialFen}
            selectedSquare={tutorialSelected}
            targets={tutorialTargets}
            feedback={tutorialFeedback}
            loading={tutorialLoading}
            visibleHintCount={visibleHintCount}
            showSidePanel={sidePanelOpen}
            onTopicChange={setTutorialTopic}
            onGenerate={() => void generateLesson()}
            onSquareClick={handleTutorialSquare}
            onReset={() => {
              if (!tutorial) return
              setTutorialFen(tutorial.fen)
              setTutorialFeedback(null)
              setTutorialSelected(null)
              setVisibleHintCount(0)
            }}
            onShowHint={() =>
              setVisibleHintCount((count) =>
                Math.min(count + 1, tutorial?.hints.length ?? count),
              )
            }
          />
        ) : (
          <HistoryView
            games={games}
            loading={historyQuery.isPending}
            selected={selectedHistory}
            replayFen={replayChess.fen()}
            replayPly={replayPly}
            playing={replayPlaying}
            showSidePanel={sidePanelOpen}
            onSelect={(id) => {
              setSelectedHistoryId(id)
              setReplayPly(0)
              setReplayPlaying(false)
            }}
            onPlyChange={setReplayPly}
            onPlayingChange={setReplayPlaying}
          />
        )}
      </AppFrameContent>
      {sessionReady && engineOnboardingQuery.data?.completed === false ? (
        <EngineOnboarding
          pendingChoice={onboardingChoicePending}
          error={error}
          sourceUrl={
            engineQuery.data?.sourceUrl ??
            'https://github.com/lichess-org/stockfish-web/tree/f09f4e11c44481f9112ee318a2e5e718dee2053e'
          }
          onChoose={(choice) => void chooseInitialEngine(choice)}
        />
      ) : null}
    </>
  )
}

function EngineOnboarding({
  pendingChoice,
  error,
  sourceUrl,
  onChoose,
}: {
  pendingChoice: ChessEngine | null
  error: string | null
  sourceUrl: string
  onChoose: (choice: ChessEngine) => void
}) {
  const options: Array<{
    id: ChessEngine
    title: string
    description: string
    detail: string
  }> = [
    {
      id: 'stockfish',
      title: 'Stockfish',
      description: 'Strong, fast, and completely local.',
      detail: 'Installs about 16 MB · Open source',
    },
    {
      id: 'moldable-ai',
      title: 'Moldable AI',
      description: 'A conversational opponent powered by your AI model.',
      detail: 'Requires Moldable AI to be available',
    },
    {
      id: 'dumb',
      title: 'Dumb mode',
      description: 'Instant legal moves with no model or download.',
      detail: 'Offline · intentionally easy',
    },
  ]

  return (
    <div className="bg-background/45 fixed inset-0 z-50 flex items-center justify-center p-5 backdrop-blur-2xl">
      <div className="border-border/50 bg-background/85 w-full max-w-2xl rounded-3xl border p-6 shadow-2xl">
        <div className="mx-auto max-w-lg text-center">
          <div className="bg-primary/10 text-primary mx-auto flex size-11 items-center justify-center rounded-2xl">
            <Cpu className="size-5" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Choose your opponent</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            You can change this later from the game panel.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {options.map((option) => {
            const pending = pendingChoice === option.id
            return (
              <button
                key={option.id}
                type="button"
                className="border-border/55 bg-muted/20 hover:border-primary/50 hover:bg-primary/5 flex min-h-40 cursor-pointer flex-col rounded-2xl border p-4 text-left transition-colors disabled:cursor-wait disabled:opacity-60"
                onClick={() => onChoose(option.id)}
                disabled={pendingChoice !== null}
              >
                <span className="text-sm font-semibold">{option.title}</span>
                <span className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  {option.description}
                </span>
                <span className="text-muted-foreground mt-auto pt-4 text-[10px] leading-relaxed">
                  {option.detail}
                </span>
                {pending ? (
                  <LoaderCircle className="text-primary mt-3 size-4 animate-spin" />
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex min-h-5 items-center justify-between gap-4">
          {error ? (
            <p className="text-destructive text-xs">{error}</p>
          ) : (
            <span />
          )}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground flex shrink-0 cursor-pointer items-center gap-1 text-[10px]"
          >
            Stockfish source &amp; license
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </div>
  )
}

interface PlayViewProps {
  game: ChessGameRecord
  chess: Chess
  orientation: ChessColor
  selectedSquare: Square | null
  legalTargets: Set<string>
  lastMove: { from: string; to: string } | null
  aiThinking: boolean
  canPlayerMove: boolean
  opponentNote: string | null
  error: string | null
  engineStatus: ChessEngineStatus | null
  engineInstalling: boolean
  tutorEnabled: boolean
  tutorTurn: boolean
  tutorPrompt: TutorPrompt | null
  tutorLoading: boolean
  tutorNudging: boolean
  tutorHintsOpen: boolean
  tutorAnalysis: TutorAnalysis | null
  tutorAnalysisLoading: boolean
  moveRows: ReturnType<typeof movePairs>
  showSidePanel: boolean
  voiceSessionStatus: DesktopVoiceSessionStatus
  voiceActivationPending: boolean
  voiceActivationError: string | null
  onSquareClick: (square: Square) => void
  onFlip: () => void
  onUndo: () => void
  onInstallEngine: () => void
  onToggleTutor: () => void
  onTutorNudge: () => void
  onToggleTutorHints: () => void
  onWatchGame: () => void
  onContinueWithVoice: () => void
  onNewGame: (options?: {
    mode?: GameMode
    engine?: ChessEngine
    difficulty?: Difficulty
    playerColor?: ChessColor
  }) => void
}

function PlayView({
  game,
  chess,
  orientation,
  selectedSquare,
  legalTargets,
  lastMove,
  aiThinking,
  canPlayerMove,
  opponentNote,
  error,
  engineStatus,
  engineInstalling,
  tutorEnabled,
  tutorTurn,
  tutorPrompt,
  tutorLoading,
  tutorNudging,
  tutorHintsOpen,
  tutorAnalysis,
  tutorAnalysisLoading,
  moveRows,
  showSidePanel,
  voiceSessionStatus,
  voiceActivationPending,
  voiceActivationError,
  onSquareClick,
  onFlip,
  onUndo,
  onInstallEngine,
  onToggleTutor,
  onTutorNudge,
  onToggleTutorHints,
  onWatchGame,
  onContinueWithVoice,
  onNewGame,
}: PlayViewProps) {
  const topColor = oppositeColor(orientation)
  const waitingForVoice =
    game.mode === 'voice' &&
    game.result === '*' &&
    colorName(chess.turn()) !== game.playerColor
  const voiceNeedsActivation =
    waitingForVoice &&
    voiceSessionStatus !== 'unknown' &&
    voiceSessionStatus !== 'active'
  return (
    <main className="h-full min-h-0 overflow-hidden p-3 sm:p-4">
      <div className="flex h-full min-h-0 w-full gap-4">
        <section
          className={cn(
            'flex min-h-0 min-w-0 flex-1 items-start overflow-hidden',
            showSidePanel ? 'justify-start' : 'justify-center',
          )}
        >
          <div className="flex w-[min(100%,calc(100dvh-10rem))] max-w-[48rem] flex-col gap-2">
            <PlayerStrip
              color={topColor}
              label={topColor === game.playerColor ? 'You' : opponentName(game)}
              active={colorName(chess.turn()) === topColor}
              thinking={
                aiThinking &&
                game.mode === 'ai' &&
                topColor !== game.playerColor
              }
            />
            <ChessBoard
              fen={game.currentFen}
              orientation={orientation}
              selectedSquare={selectedSquare}
              legalTargets={legalTargets}
              lastMove={lastMove}
              onSquareClick={onSquareClick}
              disabled={!canPlayerMove}
            />
            <PlayerStrip
              color={orientation}
              label={
                orientation === game.playerColor ? 'You' : opponentName(game)
              }
              active={colorName(chess.turn()) === orientation}
              thinking={
                aiThinking &&
                game.mode === 'ai' &&
                orientation !== game.playerColor
              }
            />
          </div>
        </section>

        {showSidePanel ? (
          <aside className="border-border/45 bg-background/55 flex h-full w-[clamp(17rem,27vw,21rem)] shrink-0 flex-col overflow-hidden rounded-2xl border shadow-lg backdrop-blur-2xl">
            <div className="border-border/40 border-b p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.14em]">
                    {game.mode === 'ai'
                      ? `${ENGINE_LABELS[game.engine]} opponent`
                      : game.mode === 'voice'
                        ? `${opponentName(game)} opponent`
                        : MODE_LABELS[game.mode]}
                  </p>
                  <h2 className="mt-1 text-base font-semibold">
                    {statusForGame(chess, game, aiThinking)}
                  </h2>
                </div>
                <Badge variant="secondary">{game.result}</Badge>
              </div>
              {game.mode === 'voice' ? (
                <div className="bg-primary/8 mt-3 rounded-xl p-2.5">
                  <div className="text-muted-foreground flex gap-2 text-xs leading-relaxed">
                    <Volume2 className="text-primary mt-0.5 size-3.5 shrink-0" />
                    <span>{voiceOpponentDescription(voiceSessionStatus)}</span>
                  </div>
                  {voiceNeedsActivation ? (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2.5 w-full cursor-pointer"
                      onClick={onContinueWithVoice}
                      disabled={
                        voiceActivationPending ||
                        voiceSessionStatus === 'starting'
                      }
                    >
                      {voiceActivationPending ||
                      voiceSessionStatus === 'starting' ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Volume2 className="size-3.5" />
                      )}
                      {voiceActivationPending ||
                      voiceSessionStatus === 'starting'
                        ? 'Starting Voice…'
                        : voiceSessionStatus === 'error'
                          ? 'Retry with Voice'
                          : 'Continue with Voice'}
                    </Button>
                  ) : null}
                  {voiceActivationError ? (
                    <p className="text-destructive mt-2 text-[11px] leading-relaxed">
                      {voiceActivationError}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {game.result !== '*' ? (
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-full cursor-pointer"
                  onClick={onWatchGame}
                >
                  <Play className="size-3.5" />
                  Watch game
                </Button>
              ) : opponentNote && !tutorEnabled ? (
                <div className="bg-muted/40 mt-3 rounded-xl p-3 text-xs leading-relaxed">
                  <span className="text-primary mr-1 font-semibold">
                    Opponent:
                  </span>
                  {opponentNote}
                </div>
              ) : null}
              {game.result === '*' && tutorEnabled && tutorTurn ? (
                <div className="border-primary/25 bg-primary/8 mt-3 rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="text-primary size-4" />
                    <p className="text-primary text-[10px] font-semibold uppercase tracking-[0.12em]">
                      {tutorPrompt?.focus ?? 'Tutor'}
                    </p>
                  </div>
                  {tutorLoading && !tutorPrompt ? (
                    <div className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
                      <LoaderCircle className="size-3.5 animate-spin" />
                      Looking at the position…
                    </div>
                  ) : tutorPrompt ? (
                    <>
                      <p className="mt-2 text-sm leading-relaxed">
                        {tutorPrompt.question}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 cursor-pointer"
                          onClick={onTutorNudge}
                          disabled={tutorNudging}
                        >
                          {tutorNudging ? (
                            <LoaderCircle className="size-3.5 animate-spin" />
                          ) : (
                            <Lightbulb className="size-3.5" />
                          )}
                          Nudge
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 cursor-pointer"
                          onClick={onToggleTutorHints}
                          disabled={tutorAnalysisLoading}
                        >
                          {tutorAnalysisLoading ? (
                            <LoaderCircle className="size-3.5 animate-spin" />
                          ) : tutorHintsOpen ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                          Hints
                        </Button>
                      </div>
                      {tutorHintsOpen && tutorAnalysis ? (
                        <div className="border-border/45 mt-3 space-y-3 border-t pt-3">
                          {tutorAnalysis.available ? (
                            <>
                              <div>
                                <p className="text-xs font-semibold">
                                  {tutorAnalysis.outlook}
                                </p>
                                <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                                  {tutorAnalysis.detail}
                                </p>
                              </div>
                              <div className="space-y-2">
                                {tutorAnalysis.candidates.map((candidate) => (
                                  <div
                                    key={`${candidate.description}-${candidate.assessment}`}
                                    className="bg-background/45 rounded-lg px-2.5 py-2"
                                  >
                                    <p className="text-[11px] font-medium">
                                      {candidate.description}
                                    </p>
                                    <p className="text-muted-foreground mt-0.5 text-[10px]">
                                      {candidate.assessment}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                              {tutorAnalysis.reason}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
              {error ? (
                <p className="text-destructive mt-2 text-xs">{error}</p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              {moveRows.length === 0 ? (
                <div className="text-muted-foreground flex h-full min-h-28 items-center justify-center text-center text-xs">
                  Select a piece to see its legal moves.
                </div>
              ) : (
                <div className="space-y-0.5 font-mono text-xs">
                  {moveRows.map((row) => (
                    <div
                      key={row.number}
                      className="odd:bg-muted/20 grid grid-cols-[2.1rem_1fr_1fr] items-center rounded-lg px-2 py-1.5"
                    >
                      <span className="text-muted-foreground">
                        {row.number}.
                      </span>
                      <span>{row.white?.san}</span>
                      <span>{row.black?.san}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-border/40 space-y-3 border-t p-3">
              <Button
                type="button"
                variant={tutorEnabled ? 'secondary' : 'outline'}
                size="sm"
                className="w-full cursor-pointer"
                onClick={onToggleTutor}
              >
                <GraduationCap className="size-3.5" />
                {tutorEnabled ? 'Turn tutor off' : 'Turn tutor on'}
              </Button>
              {game.mode === 'ai' &&
              game.engine === 'stockfish' &&
              engineStatus &&
              !engineStatus.installed ? (
                <div className="border-border/45 bg-muted/25 rounded-xl border p-2.5">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Cpu className="text-primary mt-0.5 size-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">
                          Add a local chess engine
                        </p>
                        <p className="text-muted-foreground text-[10px] leading-relaxed">
                          Optional · about 16 MB · Open source
                        </p>
                      </div>
                      <a
                        href={engineStatus.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="View Stockfish Web source"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full cursor-pointer"
                      onClick={onInstallEngine}
                      disabled={engineInstalling}
                    >
                      {engineInstalling ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5" />
                      )}
                      {engineInstalling ? 'Installing…' : 'Install Stockfish'}
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="grid grid-cols-3 gap-2">
                <LabeledSelect
                  label="Opponent"
                  value={game.mode === 'ai' ? game.engine : game.mode}
                  onChange={(value) => {
                    if (
                      value === 'stockfish' ||
                      value === 'moldable-ai' ||
                      value === 'dumb'
                    ) {
                      onNewGame({
                        mode: 'ai',
                        engine: value as ChessEngine,
                      })
                      return
                    }
                    onNewGame({ mode: value as GameMode })
                  }}
                  options={[
                    ['stockfish', 'Stockfish'],
                    ['moldable-ai', 'Moldable AI'],
                    ['dumb', 'Dumb mode'],
                    ['voice', 'Moldable (chat or Voice)'],
                    ['local', 'Two players'],
                  ]}
                />
                <LabeledSelect
                  label="Level"
                  value={game.difficulty}
                  onChange={(value) =>
                    onNewGame({ difficulty: value as Difficulty })
                  }
                  options={[
                    ['friendly', 'Friendly'],
                    ['club', 'Club'],
                    ['master', 'Master'],
                  ]}
                />
                <LabeledSelect
                  label="Play as"
                  value={game.playerColor}
                  onChange={(value) =>
                    onNewGame({ playerColor: value as ChessColor })
                  }
                  options={[
                    ['white', 'White'],
                    ['black', 'Black'],
                  ]}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 cursor-pointer"
                  onClick={onUndo}
                  disabled={game.moves.length === 0 || aiThinking}
                >
                  <Undo2 className="size-3.5" />
                  Undo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 cursor-pointer"
                  onClick={onFlip}
                >
                  <FlipVertical2 className="size-3.5" />
                  Flip
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 cursor-pointer"
                  onClick={() => onNewGame()}
                >
                  <RefreshCw className="size-3.5" />
                  New
                </Button>
              </div>
              <a
                href="https://github.com/moldable-ai/apps/tree/main/chess#license"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground mt-3 block cursor-pointer text-center text-[10px]"
              >
                Chess source &amp; licenses
              </a>
            </div>
          </aside>
        ) : null}
      </div>
    </main>
  )
}

function PlayerStrip({
  color,
  label,
  active,
  thinking,
}: {
  color: ChessColor
  label: string
  active: boolean
  thinking: boolean
}) {
  return (
    <div className="flex h-8 items-center gap-2 px-1">
      <span
        className={cn(
          'border-border flex size-6 shrink-0 items-center justify-center rounded-full border text-[15px] leading-none',
          color === 'white' ? 'bg-background' : 'bg-foreground text-background',
        )}
        aria-hidden="true"
      >
        {color === 'white' ? '♙' : '♟'}
      </span>
      <span className="text-sm font-medium">{label}</span>
      {thinking ? (
        <LoaderCircle className="text-primary size-3.5 animate-spin" />
      ) : active ? (
        <span className="bg-primary ml-auto size-2 rounded-full" />
      ) : null}
    </div>
  )
}

function LabeledSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<[string, string]>
  onChange: (value: string) => void
}) {
  return (
    <label className="min-w-0">
      <span className="text-muted-foreground mb-1 block text-[10px] font-medium uppercase tracking-wide">
        {label}
      </span>
      <select
        className="border-border bg-background/70 focus:ring-primary h-8 w-full cursor-pointer rounded-lg border px-2 text-xs outline-none focus:ring-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

interface LearnViewProps {
  gameDifficulty: Difficulty
  topic: string
  lesson: TutorialLesson | null
  fen: string | null
  selectedSquare: Square | null
  targets: Set<string>
  feedback: string | null
  loading: boolean
  visibleHintCount: number
  showSidePanel: boolean
  onTopicChange: (topic: string) => void
  onGenerate: () => void
  onSquareClick: (square: Square) => void
  onReset: () => void
  onShowHint: () => void
}

function LearnView({
  gameDifficulty,
  topic,
  lesson,
  fen,
  selectedSquare,
  targets,
  feedback,
  loading,
  visibleHintCount,
  showSidePanel,
  onTopicChange,
  onGenerate,
  onSquareClick,
  onReset,
  onShowHint,
}: LearnViewProps) {
  return (
    <main className="h-full min-h-0 overflow-hidden p-3 sm:p-4">
      <div className="flex h-full min-h-0 w-full gap-4">
        <section
          className={cn(
            'flex min-h-0 min-w-0 flex-1 items-start overflow-hidden',
            showSidePanel ? 'justify-start' : 'justify-center',
          )}
        >
          <div className="w-[min(100%,calc(100dvh-7rem))] max-w-[48rem]">
            {lesson && fen ? (
              <ChessBoard
                fen={fen}
                selectedSquare={selectedSquare}
                legalTargets={targets}
                suggestedMove={feedback ? lesson.bestMove : undefined}
                onSquareClick={onSquareClick}
                disabled={Boolean(feedback)}
              />
            ) : (
              <div className="border-border/50 bg-background/35 flex aspect-square items-center justify-center rounded-[1.15rem] border backdrop-blur-xl">
                <div className="max-w-xs text-center">
                  <Sparkles className="text-primary mx-auto size-8" />
                  <h2 className="mt-3 text-lg font-semibold">
                    Ask the chess coach
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Pick a theme and the AI will set a validated position,
                    hints, and candidate moves.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {showSidePanel ? (
          <aside className="border-border/45 bg-background/55 flex h-full w-[clamp(18rem,28vw,22rem)] shrink-0 flex-col overflow-auto rounded-2xl border p-4 shadow-lg backdrop-blur-2xl">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <Lightbulb className="size-4" />
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-[0.14em]">
                  AI coach · {DIFFICULTY_LABELS[gameDifficulty]}
                </p>
                <h2 className="text-sm font-semibold">Guided position</h2>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={topic}
                onChange={(event) => onTopicChange(event.target.value)}
                placeholder="Tactics, openings, endgames…"
                className="border-border bg-background/65 focus:ring-primary min-w-0 flex-1 rounded-lg border px-3 text-sm outline-none focus:ring-2"
              />
              <Button
                type="button"
                className="cursor-pointer"
                onClick={onGenerate}
                disabled={loading || !topic.trim()}
              >
                {loading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Create
              </Button>
            </div>

            {lesson ? (
              <div className="mt-5 flex min-h-0 flex-1 flex-col">
                <Badge className="w-fit" variant="secondary">
                  {lesson.theme}
                </Badge>
                <h3 className="mt-3 text-lg font-semibold">{lesson.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {lesson.objective}
                </p>

                <div className="mt-4 space-y-2">
                  {lesson.hints
                    .slice(0, visibleHintCount)
                    .map((hint, index) => (
                      <div
                        key={hint}
                        className="bg-muted/35 rounded-xl p-3 text-xs leading-relaxed"
                      >
                        <span className="text-primary mr-1 font-semibold">
                          Hint {index + 1}.
                        </span>
                        {hint}
                      </div>
                    ))}
                </div>

                {feedback ? (
                  <div className="border-primary/30 bg-primary/8 mt-4 rounded-xl border p-3 text-sm leading-relaxed">
                    {feedback}
                  </div>
                ) : null}

                <div className="mt-auto flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 cursor-pointer"
                    onClick={onShowHint}
                    disabled={visibleHintCount >= lesson.hints.length}
                  >
                    <Lightbulb className="size-3.5" />
                    Hint
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 cursor-pointer"
                    onClick={onReset}
                  >
                    <RotateCcw className="size-3.5" />
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground flex flex-1 items-center justify-center text-center text-xs">
                Suggested themes: forks, pins, mating patterns, opening
                principles, rook endings, or pawn promotion.
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </main>
  )
}

interface HistoryViewProps {
  games: ChessGameRecord[]
  loading: boolean
  selected?: ChessGameRecord
  replayFen: string
  replayPly: number
  playing: boolean
  showSidePanel: boolean
  onSelect: (id: string) => void
  onPlyChange: (ply: number) => void
  onPlayingChange: (playing: boolean) => void
}

function HistoryView({
  games,
  loading,
  selected,
  replayFen,
  replayPly,
  playing,
  showSidePanel,
  onSelect,
  onPlyChange,
  onPlayingChange,
}: HistoryViewProps) {
  return (
    <main className="h-full min-h-0 overflow-hidden p-3 sm:p-4">
      <div className="flex h-full min-h-0 w-full gap-4">
        <section
          className={cn(
            'flex min-h-0 min-w-0 flex-1 items-start overflow-hidden',
            showSidePanel ? 'justify-start' : 'justify-center',
          )}
        >
          <div className="flex w-[min(100%,calc(100dvh-10.5rem))] max-w-[44rem] flex-col gap-3">
            <ChessBoard
              fen={replayFen}
              orientation={selected?.playerColor ?? 'white'}
              lastMove={
                replayPly > 0 && selected ? selected.moves[replayPly - 1] : null
              }
              disabled
            />
            <div className="border-border/45 bg-background/60 flex items-center gap-2 rounded-full border p-2 shadow-lg backdrop-blur-xl">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="cursor-pointer rounded-full"
                onClick={() => {
                  onPlayingChange(false)
                  onPlyChange(0)
                }}
                disabled={!selected || replayPly === 0}
                aria-label="Restart replay"
              >
                <RotateCcw className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="cursor-pointer rounded-full"
                onClick={() => onPlyChange(Math.max(0, replayPly - 1))}
                disabled={!selected || replayPly === 0}
                aria-label="Previous move"
              >
                <ChevronLeft className="size-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                className="cursor-pointer rounded-full"
                onClick={() => onPlayingChange(!playing)}
                disabled={!selected || selected.moves.length === 0}
                aria-label={playing ? 'Pause replay' : 'Play replay'}
              >
                {playing ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="cursor-pointer rounded-full"
                onClick={() =>
                  onPlyChange(
                    Math.min(selected?.moves.length ?? 0, replayPly + 1),
                  )
                }
                disabled={!selected || replayPly >= selected.moves.length}
                aria-label="Next move"
              >
                <ChevronRight className="size-5" />
              </Button>
              <input
                type="range"
                min={0}
                max={selected?.moves.length ?? 0}
                value={replayPly}
                onChange={(event) => {
                  onPlayingChange(false)
                  onPlyChange(Number(event.target.value))
                }}
                className="accent-primary min-w-0 flex-1 cursor-pointer"
                aria-label="Replay position"
              />
              <span className="text-muted-foreground min-w-14 text-right font-mono text-xs">
                {replayPly}/{selected?.moves.length ?? 0}
              </span>
            </div>
          </div>
        </section>

        {showSidePanel ? (
          <aside className="border-border/45 bg-background/50 flex h-full w-[clamp(18rem,29vw,23rem)] shrink-0 flex-col overflow-hidden rounded-2xl border backdrop-blur-2xl">
            <div className="border-border/40 border-b p-4">
              <h2 className="font-semibold">Past games</h2>
              <p className="text-muted-foreground text-xs">
                {games.length} saved locally
              </p>
            </div>
            <div className="max-h-[42%] shrink-0 space-y-1 overflow-auto p-2">
              {loading ? (
                <p className="text-muted-foreground p-3 text-xs">Loading…</p>
              ) : games.length === 0 ? (
                <p className="text-muted-foreground p-3 text-xs">
                  Finish or start a game and its moves will appear here.
                </p>
              ) : (
                games.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    className={cn(
                      'hover:bg-muted/45 w-full cursor-pointer rounded-xl p-3 text-left transition-colors',
                      selected?.id === candidate.id && 'bg-muted/55',
                    )}
                    onClick={() => onSelect(candidate.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {candidate.title}
                      </span>
                      <span className="font-mono text-xs">
                        {candidate.result}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      {formatGameDate(candidate.updatedAt)} ·{' '}
                      {candidate.moves.length} ply
                    </p>
                  </button>
                ))
              )}
            </div>

            <div className="border-border/40 border-y p-4">
              <p className="text-muted-foreground text-[10px] uppercase tracking-[0.14em]">
                Replay
              </p>
              <h2 className="mt-1 font-semibold">
                {selected?.resultLabel ?? 'No game selected'}
              </h2>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {selected ? (
                <div className="space-y-0.5 font-mono text-xs">
                  {movePairs(selected.moves).map((row) => {
                    const whitePly = (row.number - 1) * 2 + 1
                    const blackPly = whitePly + 1
                    return (
                      <div
                        key={row.number}
                        className="odd:bg-muted/20 grid grid-cols-[2rem_1fr_1fr] rounded-lg"
                      >
                        <span className="text-muted-foreground px-2 py-1.5">
                          {row.number}.
                        </span>
                        <button
                          type="button"
                          className={cn(
                            'hover:bg-muted/50 cursor-pointer rounded-md px-2 py-1.5 text-left',
                            replayPly === whitePly &&
                              'bg-primary/12 text-primary',
                          )}
                          onClick={() => onPlyChange(whitePly)}
                        >
                          {row.white?.san}
                        </button>
                        <button
                          type="button"
                          className={cn(
                            'hover:bg-muted/50 cursor-pointer rounded-md px-2 py-1.5 text-left',
                            replayPly === blackPly &&
                              'bg-primary/12 text-primary',
                          )}
                          onClick={() => onPlyChange(blackPly)}
                          disabled={!row.black}
                        >
                          {row.black?.san}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </main>
  )
}
