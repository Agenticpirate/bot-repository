import type { PianoNote } from '../shared/song'
import {
  buildPlaybackNoteIndex,
  derivePlaybackMidiState,
  findFirstNoteStartingAtOrAfter,
  sortNotesForPlayback,
} from './playback-performance'
import { describe, expect, it } from 'vitest'

const notes: PianoNote[] = [
  { id: 'c', pitch: 'C4', midi: 60, start: 1, duration: 1 },
  { id: 'e', pitch: 'E4', midi: 64, start: 2, duration: 0.5 },
  { id: 'g', pitch: 'G4', midi: 67, start: 4, duration: 1 },
]

describe('playback note indexing', () => {
  it('finds only notes at or after the scheduling cursor', () => {
    expect(findFirstNoteStartingAtOrAfter(notes, 1)).toBe(0)
    expect(findFirstNoteStartingAtOrAfter(notes, 1.01)).toBe(1)
    expect(findFirstNoteStartingAtOrAfter(notes, 5)).toBe(notes.length)
  })

  it('sorts imported notes only when needed', () => {
    expect(sortNotesForPlayback(notes)).toBe(notes)
    expect(sortNotesForPlayback([notes[2], notes[0], notes[1]])).toEqual(notes)
  })

  it('derives active and upcoming notes from the indexed window', () => {
    const index = buildPlaybackNoteIndex(notes, 1.6)
    const state = derivePlaybackMidiState(index, 1.25, 1.6)

    expect([...state.activeNoteIds]).toEqual(['c'])
    expect([...state.activeMidi]).toEqual([60])
    expect([...state.upcomingMidi]).toEqual([64])
  })
})
