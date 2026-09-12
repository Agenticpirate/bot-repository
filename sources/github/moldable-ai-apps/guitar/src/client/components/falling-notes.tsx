import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { GuitarNote } from '../../shared/song'
import {
  FRET_COUNT,
  NECK_WIDTH,
  STRING_COLORS,
  midiToFretPosition,
  positionCenterX,
  wireX,
} from '../guitar-utils'
import type { FretPosition } from '../guitar-utils'
import {
  findFirstNoteStartingAtOrAfter,
  sortNotesForPlayback,
} from '../playback-performance'
import type { PlaybackTimeline } from '../playback-timeline'

interface FallingNotesProps {
  notes: GuitarNote[]
  timeline: PlaybackTimeline
  activeNoteIds: Set<string>
  fingerings: Map<string, FretPosition>
  isPlaying: boolean
  playbackSpeed: number
  lookAheadSeconds?: number
  height?: number
  revealKey?: string
}

const BAR_WIDTH = 16
const TRACK_OVERSCAN_SECONDS = 3
const TRACK_RECENTER_SECONDS = 2
const TRACK_ANIMATION_HORIZON_SECONDS = 120
const TRACK_DRIFT_CHECK_INTERVAL_MS = 500
const TRACK_DRIFT_TOLERANCE_SECONDS = 0.05
const FRET_GUIDES = Array.from({ length: FRET_COUNT }, (_, index) =>
  wireX(index + 1),
)

function noteGeometry(position: FretPosition) {
  return { x: positionCenterX(position) - BAR_WIDTH / 2, width: BAR_WIDTH }
}

function ActiveKeyEffect({
  centerX,
  hitLine,
  tone,
}: {
  centerX: number
  hitLine: number
  tone: string
}) {
  return (
    <g className="guitar-active-key-effect" aria-hidden>
      <ellipse
        cx={centerX}
        cy={hitLine - 1}
        rx="9"
        ry="4"
        fill="white"
        opacity="0.65"
        filter="url(#guitar-hit-bloom)"
      />
      <ellipse
        cx={centerX}
        cy={hitLine - 10}
        rx="16"
        ry="18"
        fill={tone}
        opacity="0.18"
        filter="url(#guitar-hit-bloom)"
      />
    </g>
  )
}

interface VisibleFallingNote {
  note: GuitarNote
  position: FretPosition
  x: number
  width: number
  height: number
  top: number
  tone: string
}

const FallingNoteBars = memo(function FallingNoteBars({
  notes,
}: {
  notes: VisibleFallingNote[]
}) {
  return (
    <>
      {/* A translucent underlay gives the note depth without a moving SVG blur. */}
      {notes.map(({ note, x, width, height, top, tone }) => (
        <rect
          key={`glow-${note.id}`}
          x={x - 3}
          y={top - 1}
          width={width + 6}
          height={height + 2}
          rx="9"
          fill={tone}
          opacity="0.22"
        />
      ))}
      {notes.map(({ note, position, x, width, height, top, tone }) => {
        const gradientId = `guitar-note-grad-${note.id}`
        return (
          <g key={note.id}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={tone} stopOpacity="0.98" />
                <stop offset="100%" stopColor={tone} stopOpacity="0.78" />
              </linearGradient>
            </defs>
            <rect
              x={x}
              y={top}
              width={width}
              height={height}
              rx="5"
              fill={`url(#${gradientId})`}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="0.6"
            />
            <rect
              x={x + 1}
              y={top + 1}
              width={width - 2}
              height={Math.min(6, height - 2)}
              rx="3"
              fill="rgba(255,255,255,0.28)"
            />
            {height >= 14 ? (
              <text
                x={x + width / 2}
                y={top + height / 2 + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="white"
                style={{ letterSpacing: 0.2 }}
              >
                {position.fret}
              </text>
            ) : null}
          </g>
        )
      })}
    </>
  )
})

export const FallingNotes = memo(function FallingNotes({
  notes,
  timeline,
  activeNoteIds,
  fingerings,
  isPlaying,
  playbackSpeed,
  lookAheadSeconds = 5.5,
  height = 380,
  revealKey,
}: FallingNotesProps) {
  const hitLine = height - 1
  const pixelsPerSecond = (hitLine - 8) / lookAheadSeconds
  const trackRef = useRef<SVGGElement | null>(null)
  const trackAnimationRef = useRef<Animation | null>(null)
  const animationStartCursorRef = useRef(0)
  const lastTimelineCursorRef = useRef(0)
  const lastTimelineUpdateRef = useRef(0)
  const lastDriftCheckRef = useRef(0)
  const recenterPendingRef = useRef(false)
  const [renderCursor, setRenderCursor] = useState(() => timeline.getCursor())
  const renderCursorRef = useRef(renderCursor)
  const sortedNotes = useMemo(() => sortNotesForPlayback(notes), [notes])
  const maxDuration = useMemo(
    () => Math.max(0, ...sortedNotes.map((note) => note.duration)),
    [sortedNotes],
  )

  const visibleNotes = useMemo(() => {
    const windowStart = renderCursor - TRACK_OVERSCAN_SECONDS
    const windowEnd = renderCursor + lookAheadSeconds + TRACK_OVERSCAN_SECONDS
    const firstNoteIndex = findFirstNoteStartingAtOrAfter(
      sortedNotes,
      windowStart - maxDuration,
    )
    const visible: VisibleFallingNote[] = []

    for (let index = firstNoteIndex; index < sortedNotes.length; index += 1) {
      const note = sortedNotes[index]
      if (note.start > windowEnd) break
      if (note.start + note.duration < windowStart) continue
      const position = fingerings.get(note.id) ?? midiToFretPosition(note.midi)
      const { x, width } = noteGeometry(position)
      const noteHeight = Math.max(10, note.duration * pixelsPerSecond)
      visible.push({
        note,
        position,
        x,
        width,
        height: noteHeight,
        top:
          hitLine -
          (note.start - renderCursor + note.duration) * pixelsPerSecond,
        tone: STRING_COLORS[position.stringIndex] ?? '#9ca3af',
      })
    }
    return visible
  }, [
    fingerings,
    hitLine,
    lookAheadSeconds,
    maxDuration,
    pixelsPerSecond,
    renderCursor,
    sortedNotes,
  ])
  const activeVisibleNotes = useMemo(
    () => visibleNotes.filter(({ note }) => activeNoteIds.has(note.id)),
    [activeNoteIds, visibleNotes],
  )

  const applyTrackMotion = useCallback(
    (cursor: number) => {
      const track = trackRef.current
      if (!track) return
      trackAnimationRef.current?.cancel()
      trackAnimationRef.current = null
      const startOffset = (cursor - renderCursorRef.current) * pixelsPerSecond
      const startTransform = `translate3d(0, ${startOffset}px, 0)`
      track.style.transform = startTransform
      animationStartCursorRef.current = cursor
      if (!isPlaying || typeof track.animate !== 'function') return
      const endOffset =
        startOffset +
        pixelsPerSecond * playbackSpeed * TRACK_ANIMATION_HORIZON_SECONDS
      trackAnimationRef.current = track.animate(
        [
          { transform: startTransform },
          { transform: `translate3d(0, ${endOffset}px, 0)` },
        ],
        {
          duration: TRACK_ANIMATION_HORIZON_SECONDS * 1000,
          easing: 'linear',
          fill: 'forwards',
        },
      )
    },
    [isPlaying, pixelsPerSecond, playbackSpeed],
  )

  useLayoutEffect(() => {
    renderCursorRef.current = renderCursor
    recenterPendingRef.current = false
    applyTrackMotion(timeline.getCursor())
  }, [applyTrackMotion, renderCursor, revealKey, timeline])

  useEffect(() => {
    lastTimelineCursorRef.current = timeline.getCursor()
    lastTimelineUpdateRef.current = performance.now()
    lastDriftCheckRef.current = lastTimelineUpdateRef.current
    return timeline.subscribe((cursor) => {
      const now = performance.now()
      const elapsedSeconds =
        Math.max(0, now - lastTimelineUpdateRef.current) / 1000
      const expectedDelta = elapsedSeconds * playbackSpeed
      const actualDelta = cursor - lastTimelineCursorRef.current
      const clockJumped =
        Math.abs(actualDelta - expectedDelta) > TRACK_DRIFT_TOLERANCE_SECONDS
      if (!isPlaying || clockJumped || !trackAnimationRef.current) {
        applyTrackMotion(cursor)
      } else if (
        now - lastDriftCheckRef.current >=
        TRACK_DRIFT_CHECK_INTERVAL_MS
      ) {
        lastDriftCheckRef.current = now
        const animationTime = trackAnimationRef.current.currentTime
        if (typeof animationTime === 'number') {
          const animatedCursor =
            animationStartCursorRef.current +
            (animationTime / 1000) * playbackSpeed
          if (Math.abs(animatedCursor - cursor) > TRACK_DRIFT_TOLERANCE_SECONDS)
            applyTrackMotion(cursor)
        }
      }
      lastTimelineCursorRef.current = cursor
      lastTimelineUpdateRef.current = now
      if (
        !recenterPendingRef.current &&
        Math.abs(cursor - renderCursorRef.current) >= TRACK_RECENTER_SECONDS
      ) {
        recenterPendingRef.current = true
        setRenderCursor(cursor)
      }
    })
  }, [applyTrackMotion, isPlaying, playbackSpeed, timeline])

  useEffect(() => () => trackAnimationRef.current?.cancel(), [])

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{ width: NECK_WIDTH, height, contain: 'layout paint style' }}
      aria-label="falling note practice roll"
    >
      <svg
        width={NECK_WIDTH}
        height={height}
        role="img"
        className="block"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <linearGradient id="guitar-stage-bg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--card)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--card)" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="guitar-top-fade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--background)" stopOpacity="1" />
            <stop offset="35%" stopColor="var(--background)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="guitar-hit-glow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0" />
            <stop
              offset="100%"
              stopColor="var(--foreground)"
              stopOpacity="0.18"
            />
          </linearGradient>
          <filter
            id="guitar-hit-bloom"
            x="-160%"
            y="-160%"
            width="420%"
            height="420%"
          >
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.65 0"
              result="bright"
            />
            <feMerge>
              <feMergeNode in="bright" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width={NECK_WIDTH} height={height} fill="var(--card)" />
        <rect
          width={NECK_WIDTH}
          height={height}
          fill="url(#guitar-stage-bg)"
          opacity="0.6"
        />
        {FRET_GUIDES.map((x, index) => (
          <line
            key={`guide-${index}`}
            x1={x}
            x2={x}
            y1={0}
            y2={hitLine}
            stroke="var(--border)"
            strokeOpacity="0.25"
            strokeWidth="1"
          />
        ))}
        <g key={revealKey} className="animate-guitar-notes-reveal">
          <g ref={trackRef} className="guitar-falling-note-track">
            <FallingNoteBars notes={visibleNotes} />
          </g>
        </g>
        <rect
          x="0"
          y={hitLine}
          width={NECK_WIDTH}
          height="1"
          fill="rgba(255,255,255,0.92)"
        />
        <rect
          x="0"
          y={hitLine - 12}
          width={NECK_WIDTH}
          height="12"
          fill="url(#guitar-hit-glow)"
        />
        {activeVisibleNotes.map(({ note, x, width, tone }) => (
          <ActiveKeyEffect
            key={`active-effect-${note.id}`}
            centerX={x + width / 2}
            hitLine={hitLine}
            tone={tone}
          />
        ))}
        <rect
          width={NECK_WIDTH}
          height={height * 0.35}
          fill="url(#guitar-top-fade)"
        />
      </svg>
    </div>
  )
})
