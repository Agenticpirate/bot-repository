import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'
import type { ChessGameState } from '../../shared/types'
import { ChessBoard } from './chess-board'
import type { Square } from 'chess.js'

export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface(304)
  const [error, setError] = useState<string>()
  const [selected, setSelected] = useState<{
    square: Square
    revision: number
  } | null>(null)
  const [promotion, setPromotion] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const query = useQuery({
    queryKey: [
      'chat-chess',
      new URLSearchParams(location.search).get('cardInput'),
    ],
    queryFn: () =>
      callCardApp<ChessGameState & { title: string }>(
        'chess',
        'chess.cards.read',
      ),
    refetchInterval: 5000,
  })
  const game = query.data
  const selectedSquare =
    selected?.revision === game?.revision ? selected?.square : null
  const canMove =
    !pending &&
    game?.status === 'active' &&
    (game.actorToMove === 'human' || game.actorToMove === 'local')
  const move = async (uci: string) => {
    if (!game || !canMove) return
    setPending(true)
    setError(undefined)
    setPromotion([])
    try {
      await callCardApp('chess', 'chess.cards.move', {
        expectedRevision: game.revision,
        move: uci,
      })
      setSelected(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      await query.refetch()
      setPending(false)
    }
  }
  const selectSquare = (square: Square) => {
    if (!game || !canMove) return
    const candidates = selectedSquare
      ? game.legalMoves.filter((move) =>
          move.startsWith(selectedSquare + square),
        )
      : []
    if (candidates.length > 1) {
      setPromotion(candidates)
      return
    }
    if (candidates[0]) {
      void move(candidates[0])
      return
    }
    setPromotion([])
    setSelected(
      game.legalMoves.some((move) => move.startsWith(square))
        ? { square, revision: game.revision }
        : null,
    )
  }
  return (
    <div ref={contentRef} className="bg-background">
      {query.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading board…
        </p>
      )}
      {(error || query.error) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || query.error?.message}
        </p>
      )}
      {game && (
        <>
          <div hidden={expanded}>
            <div className="relative mx-auto max-w-72 p-2">
              <div inert>
                <ChessBoard
                  fen={game.fen}
                  orientation={game.humanColor}
                  disabled
                />
              </div>
              <button
                type="button"
                aria-label={`Open ${game.title}`}
                className="focus-visible:outline-ring absolute inset-0 cursor-pointer rounded-xl focus-visible:outline-2"
                onClick={() => {
                  setError(undefined)
                  void openQuickLook(game.gameId).catch((error) =>
                    setError(String(error)),
                  )
                }}
              />
            </div>
            <p className="text-muted-foreground px-3 pb-3 text-center text-xs">
              {game.status === 'completed'
                ? game.resultLabel
                : `${game.sideToMove === 'white' ? 'White' : 'Black'} to move`}
            </p>
          </div>
          {expanded && (
            <article className="mx-auto max-w-xl space-y-4 p-4">
              <h1 className="text-lg font-semibold">{game.title}</h1>
              <ChessBoard
                fen={game.fen}
                orientation={game.humanColor}
                selectedSquare={selectedSquare}
                legalTargets={
                  new Set(
                    selectedSquare
                      ? game.legalMoves
                          .filter((move) => move.startsWith(selectedSquare))
                          .map((move) => move.slice(2, 4))
                      : [],
                  )
                }
                disabled={!canMove}
                onSquareClick={canMove ? selectSquare : undefined}
              />
              <p role="status" className="text-muted-foreground text-sm">
                {pending
                  ? 'Playing move…'
                  : game.status === 'completed'
                    ? game.resultLabel
                    : `${game.sideToMove === 'white' ? 'White' : 'Black'} to move${game.inCheck ? ' · Check' : ''}${canMove ? ' · Select a piece and destination.' : ' · Waiting for opponent.'}`}
              </p>
              {promotion.length > 0 && (
                <fieldset className="flex gap-2">
                  <legend className="mb-2 text-sm">Promote to</legend>
                  {promotion.map((uci) => (
                    <button
                      key={uci}
                      type="button"
                      className="border-border cursor-pointer rounded-md border px-3 py-2 text-sm"
                      onClick={() => void move(uci)}
                    >
                      {
                        (
                          {
                            q: 'Queen',
                            r: 'Rook',
                            b: 'Bishop',
                            n: 'Knight',
                          } as Record<string, string>
                        )[uci[4]]
                      }
                    </button>
                  ))}
                </fieldset>
              )}
              {game.recentMoves.length > 0 && (
                <p className="text-sm">
                  {game.recentMoves.map((move) => move.san).join(' · ')}
                </p>
              )}
            </article>
          )}
        </>
      )}
    </div>
  )
}
