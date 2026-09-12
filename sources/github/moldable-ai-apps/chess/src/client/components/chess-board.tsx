import { cn } from '@moldable-ai/ui'
import type { ChessColor } from '../../shared/types'
import { Chess, type PieceSymbol, type Square } from 'chess.js'

const PIECE_COLUMNS: Record<PieceSymbol, number> = {
  k: 0,
  q: 1,
  b: 2,
  n: 3,
  r: 4,
  p: 5,
}

interface ChessBoardProps {
  fen: string
  orientation?: ChessColor
  selectedSquare?: Square | null
  legalTargets?: Set<string>
  lastMove?: { from: string; to: string } | null
  suggestedMove?: string
  disabled?: boolean
  onSquareClick?: (square: Square) => void
}

export function ChessBoard({
  fen,
  orientation = 'white',
  selectedSquare = null,
  legalTargets = new Set(),
  lastMove = null,
  suggestedMove,
  disabled = false,
  onSquareClick,
}: ChessBoardProps) {
  const chess = new Chess(fen)
  const squares = chess.board().flat()
  if (orientation === 'black') squares.reverse()
  const checkedKing = chess.inCheck()
    ? squares.find(
        (piece) => piece?.type === 'k' && piece.color === chess.turn(),
      )?.square
    : undefined

  return (
    <div
      className="chess-board border-border/50 shadow-foreground/15 relative grid aspect-square w-full grid-cols-8 overflow-hidden rounded-[1.15rem] border shadow-2xl"
      role="grid"
      aria-label={`Chess board, ${orientation} at the bottom`}
    >
      {squares.map((piece, index) => {
        const visualFile = index % 8
        const visualRank = Math.floor(index / 8)
        const file =
          orientation === 'white'
            ? String.fromCharCode(97 + visualFile)
            : String.fromCharCode(104 - visualFile)
        const rank = orientation === 'white' ? 8 - visualRank : visualRank + 1
        const square = `${file}${rank}` as Square
        const isLight = (file.charCodeAt(0) - 97 + rank) % 2 === 1
        const isSelected = selectedSquare === square
        const isLegal = legalTargets.has(square)
        const isLastMove = lastMove?.from === square || lastMove?.to === square
        const isSuggested =
          suggestedMove?.slice(0, 2) === square ||
          suggestedMove?.slice(2, 4) === square

        return (
          <button
            key={square}
            type="button"
            role="gridcell"
            aria-label={`${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`}
            className={cn(
              'chess-square focus-visible:ring-primary relative flex aspect-square cursor-pointer items-center justify-center p-0 transition-[filter] duration-150 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
              isLight ? 'chess-square-light' : 'chess-square-dark',
              disabled && 'cursor-default',
              isLastMove && 'chess-square-last',
              isSuggested && 'chess-square-suggested',
              isSelected && 'chess-square-selected',
              checkedKing === square && 'chess-square-check',
            )}
            onClick={() => onSquareClick?.(square)}
            disabled={disabled && !onSquareClick}
          >
            {piece ? (
              <span
                aria-hidden="true"
                className="chess-piece pointer-events-none block select-none"
                style={{
                  backgroundPosition: `${PIECE_COLUMNS[piece.type] * 20}% ${
                    piece.color === 'w' ? 0 : 100
                  }%`,
                }}
              />
            ) : null}
            {isLegal ? (
              <span
                className={cn(
                  'pointer-events-none absolute rounded-full',
                  piece
                    ? 'border-primary/80 size-[78%] border-[clamp(2px,0.4vw,5px)]'
                    : 'bg-primary/65 size-[22%]',
                )}
              />
            ) : null}
            {visualFile === 0 ? (
              <span className="chess-coordinate absolute left-1 top-0.5 text-[clamp(7px,1.1vw,11px)] font-bold">
                {rank}
              </span>
            ) : null}
            {visualRank === 7 ? (
              <span className="chess-coordinate absolute bottom-0.5 right-1 text-[clamp(7px,1.1vw,11px)] font-bold">
                {file}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
