import { useEffect, useMemo, useState } from 'react'
import type { GuitarNote } from '../shared/song'
import {
  buildPlaybackNoteIndex,
  derivePlaybackMidiState,
  playbackSetsEqual,
  upperBoundNumber,
} from './playback-performance'
import type { PlaybackTimeline } from './playback-timeline'

const EVENT_EPSILON_SECONDS = 0.000_001

/** Only changes React state when a note state or look-ahead boundary changes. */
export function usePlaybackMidiState(
  notes: readonly GuitarNote[],
  timeline: PlaybackTimeline,
  lookAheadSeconds: number,
) {
  const index = useMemo(
    () => buildPlaybackNoteIndex(notes, lookAheadSeconds),
    [lookAheadSeconds, notes],
  )
  const [state, setState] = useState(() =>
    derivePlaybackMidiState(index, timeline.getCursor(), lookAheadSeconds),
  )

  useEffect(() => {
    let previousCursor = timeline.getCursor()
    let nextEventIndex = upperBoundNumber(
      index.midiEventTimes,
      previousCursor + EVENT_EPSILON_SECONDS,
    )

    return timeline.subscribe((cursor) => {
      const nextEvent = index.midiEventTimes[nextEventIndex]
      const movedBackward = cursor + EVENT_EPSILON_SECONDS < previousCursor
      const crossedEvent =
        nextEvent !== undefined && cursor + EVENT_EPSILON_SECONDS >= nextEvent

      if (movedBackward || crossedEvent || cursor === previousCursor) {
        const nextState = derivePlaybackMidiState(
          index,
          cursor,
          lookAheadSeconds,
        )
        setState((current) => {
          const activeMidi = playbackSetsEqual(
            current.activeMidi,
            nextState.activeMidi,
          )
            ? current.activeMidi
            : nextState.activeMidi
          const activeNoteIds = playbackSetsEqual(
            current.activeNoteIds,
            nextState.activeNoteIds,
          )
            ? current.activeNoteIds
            : nextState.activeNoteIds
          const upcomingMidi = playbackSetsEqual(
            current.upcomingMidi,
            nextState.upcomingMidi,
          )
            ? current.upcomingMidi
            : nextState.upcomingMidi
          return activeMidi === current.activeMidi &&
            activeNoteIds === current.activeNoteIds &&
            upcomingMidi === current.upcomingMidi
            ? current
            : { activeMidi, activeNoteIds, upcomingMidi }
        })
        nextEventIndex = upperBoundNumber(
          index.midiEventTimes,
          cursor + EVENT_EPSILON_SECONDS,
        )
      }
      previousCursor = cursor
    })
  }, [index, lookAheadSeconds, timeline])

  return state
}
