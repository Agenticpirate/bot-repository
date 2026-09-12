import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { PianoNote } from '../../shared/song'
import {
  BLACK_KEY_WIDTH,
  KEYBOARD_WIDTH,
  PIANO_KEYS,
  WHITE_KEY_WIDTH,
  midiToTone,
} from '../piano-utils'
import {
  findFirstNoteStartingAtOrAfter,
  sortNotesForPlayback,
} from '../playback-performance'
import type { PlaybackTimeline } from '../playback-timeline'

interface FallingNotesProps {
  notes: PianoNote[]
  timeline: PlaybackTimeline
  activeNoteIds: Set<string>
  isPlaying: boolean
  playbackSpeed: number
  lookAheadSeconds?: number
  height?: number
  /** Bumps the reveal-animation key — set to song id to retrigger on lesson change. */
  revealKey?: string
}

const KEY_BY_MIDI = new Map(PIANO_KEYS.map((key) => [key.midi, key]))
const TRACK_OVERSCAN_SECONDS = 3
const TRACK_RECENTER_SECONDS = 2
const TRACK_ANIMATION_HORIZON_SECONDS = 120
const TRACK_DRIFT_CHECK_INTERVAL_MS = 500
const TRACK_DRIFT_TOLERANCE_SECONDS = 0.05
const BLACK_KEYS = PIANO_KEYS.filter((key) => key.isBlack)
const OCTAVE_DIVIDER_KEYS = PIANO_KEYS.filter(
  (key) => key.label === 'C' && !key.isBlack,
)

function noteGeometry(midi: number) {
  const key = KEY_BY_MIDI.get(midi)
  if (!key) return { x: 0, width: WHITE_KEY_WIDTH - 4 }
  if (key.isBlack) {
    return { x: key.left + 1, width: BLACK_KEY_WIDTH - 2 }
  }
  return { x: key.left + 1.5, width: WHITE_KEY_WIDTH - 3 }
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
    <g className="piano-active-key-effect" aria-hidden>
      <ellipse
        cx={centerX}
        cy={hitLine - 1}
        rx="9"
        ry="4"
        fill="white"
        opacity="0.65"
        filter="url(#hit-bloom)"
      />
      <ellipse
        cx={centerX}
        cy={hitLine - 10}
        rx="16"
        ry="18"
        fill={tone}
        opacity="0.18"
        filter="url(#hit-bloom)"
      />
      <rect
        x={centerX - 1}
        y={hitLine - 54}
        width="2"
        height="44"
        rx="1"
        fill={tone}
        opacity="0.18"
        filter="url(#hit-bloom)"
      />
    </g>
  )
}

interface VisibleFallingNote {
  note: PianoNote
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
      {/* A wider translucent underlay preserves the glow without an SVG blur
          filter that would force the moving layer to repaint every frame. */}
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

      {notes.map(({ note, x, width, height, top, tone }) => {
        const gradientId = `note-grad-${note.id}`
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
            {height > 22 && width > 14 ? (
              <text
                x={x + width / 2}
                y={top + height - 6}
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="600"
                fill="white"
                opacity="0.78"
                style={{ letterSpacing: 0.2 }}
              >
                {note.pitch.replace(/\d/, '')}
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
  const maxDuration = useMemo(() => {
    let maximum = 0
    for (const note of sortedNotes) {
      maximum = Math.max(maximum, note.duration)
    }
    return maximum
  }, [sortedNotes])

  const visibleNotes = useMemo(() => {
    const windowStart = renderCursor - TRACK_OVERSCAN_SECONDS
    const windowEnd = renderCursor + lookAheadSeconds + TRACK_OVERSCAN_SECONDS
    const firstNoteIndex = findFirstNoteStartingAtOrAfter(
      sortedNotes,
      windowStart - maxDuration,
    )
    const visible: VisibleFallingNote[] = []

    for (
      let noteIndex = firstNoteIndex;
      noteIndex < sortedNotes.length;
      noteIndex += 1
    ) {
      const note = sortedNotes[noteIndex]
      if (note.start > windowEnd) break
      if (note.start + note.duration < windowStart) continue

      const { x, width } = noteGeometry(note.midi)
      const noteHeight = Math.max(10, note.duration * pixelsPerSecond)
      const timeUntilStart = note.start - renderCursor
      visible.push({
        note,
        x,
        width,
        height: noteHeight,
        top: hitLine - (timeUntilStart + note.duration) * pixelsPerSecond,
        tone: note.color ?? midiToTone(note.midi),
      })
    }

    return visible
  }, [
    hitLine,
    lookAheadSeconds,
    maxDuration,
    pixelsPerSecond,
    renderCursor,
    sortedNotes,
  ])
  const activeVisibleNotes = useMemo(() => {
    const active = []
    for (const visibleNote of visibleNotes) {
      if (activeNoteIds.has(visibleNote.note.id)) active.push(visibleNote)
    }
    return active
  }, [activeNoteIds, visibleNotes])

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

  // The browser compositor owns continuous velocity between clock syncs, so a
  // busy React/main-thread frame cannot become a visible position step.
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
        const animationTime = trackAnimationRef.current?.currentTime
        if (typeof animationTime === 'number') {
          const animatedCursor =
            animationStartCursorRef.current +
            (animationTime / 1000) * playbackSpeed
          if (
            Math.abs(animatedCursor - cursor) > TRACK_DRIFT_TOLERANCE_SECONDS
          ) {
            applyTrackMotion(cursor)
          }
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

  useEffect(
    () => () => {
      trackAnimationRef.current?.cancel()
    },
    [],
  )

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{
        width: KEYBOARD_WIDTH,
        height,
        contain: 'layout paint style',
      }}
      aria-label="falling note practice roll"
    >
      <svg
        width={KEYBOARD_WIDTH}
        height={height}
        role="img"
        className="block"
        shapeRendering="geometricPrecision"
      >
        <defs>
          {/* deep stage background */}
          <linearGradient id="stage-bg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--card)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--card)" stopOpacity="1" />
          </linearGradient>

          {/* fade at top so notes appear out of darkness */}
          <linearGradient id="top-fade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--background)" stopOpacity="1" />
            <stop offset="35%" stopColor="var(--background)" stopOpacity="0" />
          </linearGradient>

          {/* hit line glow */}
          <linearGradient id="hit-glow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0" />
            <stop
              offset="100%"
              stopColor="var(--foreground)"
              stopOpacity="0.18"
            />
          </linearGradient>

          <filter id="hit-bloom" x="-160%" y="-160%" width="420%" height="420%">
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

        {/* stage backdrop */}
        <rect width={KEYBOARD_WIDTH} height={height} fill="var(--card)" />
        <rect
          width={KEYBOARD_WIDTH}
          height={height}
          fill="url(#stage-bg)"
          opacity="0.6"
        />

        {/* black key lanes — subtle vertical bands */}
        {BLACK_KEYS.map((key) => (
          <rect
            key={`lane-${key.midi}`}
            x={key.left}
            y={0}
            width={BLACK_KEY_WIDTH}
            height={hitLine}
            fill="var(--foreground)"
            opacity="0.035"
          />
        ))}

        {/* octave dividers at every C */}
        {OCTAVE_DIVIDER_KEYS.map((key) => (
          <line
            key={`div-${key.midi}`}
            x1={key.left}
            x2={key.left}
            y1={0}
            y2={hitLine}
            stroke="var(--border)"
            strokeOpacity="0.4"
            strokeWidth="1"
          />
        ))}

        {/* The note bars + their glows are wrapped in a group keyed by
            revealKey so they re-fire the reveal animation on lesson change.
            The grid, hit-line, dividers, and lanes stay still. */}
        <g key={revealKey} className="animate-piano-notes-reveal">
          <g ref={trackRef} className="piano-falling-note-track">
            <FallingNoteBars notes={visibleNotes} />
          </g>
        </g>

        {/* hit line — luminous bar */}
        <rect
          x="0"
          y={hitLine}
          width={KEYBOARD_WIDTH}
          height="1"
          fill="rgba(255,255,255,0.92)"
        />
        <rect
          x="0"
          y={hitLine - 12}
          width={KEYBOARD_WIDTH}
          height="12"
          fill="url(#hit-glow)"
        />

        {activeVisibleNotes.map(({ note, x, width, tone }) => (
          <ActiveKeyEffect
            key={`active-effect-${note.id}`}
            centerX={x + width / 2}
            hitLine={hitLine}
            tone={tone}
          />
        ))}

        {/* top fade so notes appear out of nothing */}
        <rect
          width={KEYBOARD_WIDTH}
          height={height * 0.35}
          fill="url(#top-fade)"
        />
      </svg>
    </div>
  )
})
