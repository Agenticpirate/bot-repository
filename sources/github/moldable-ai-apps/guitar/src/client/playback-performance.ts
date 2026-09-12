import type { GuitarNote } from '../shared/song'

export interface PlaybackNoteIndex {
  notes: readonly GuitarNote[]
  maxDuration: number
  midiEventTimes: readonly number[]
}

export interface PlaybackMidiState {
  activeMidi: Set<number>
  activeNoteIds: Set<string>
  upcomingMidi: Set<number>
}

function compareNotes(left: GuitarNote, right: GuitarNote) {
  return left.start - right.start || left.midi - right.midi
}

export function sortNotesForPlayback(
  notes: readonly GuitarNote[],
): GuitarNote[] {
  for (let index = 1; index < notes.length; index += 1) {
    if (compareNotes(notes[index - 1], notes[index]) > 0) {
      return [...notes].sort(compareNotes)
    }
  }
  return notes as GuitarNote[]
}

export function upperBoundNumber(values: readonly number[], target: number) {
  let low = 0
  let high = values.length
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2)
    if (values[middle] <= target) low = middle + 1
    else high = middle
  }
  return low
}

export function findFirstNoteStartingAtOrAfter(
  notes: readonly GuitarNote[],
  target: number,
) {
  let low = 0
  let high = notes.length
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2)
    if (notes[middle].start < target) low = middle + 1
    else high = middle
  }
  return low
}

export function findFirstNoteStartingAfter(
  notes: readonly GuitarNote[],
  target: number,
) {
  let low = 0
  let high = notes.length
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2)
    if (notes[middle].start <= target) low = middle + 1
    else high = middle
  }
  return low
}

export function buildPlaybackNoteIndex(
  sourceNotes: readonly GuitarNote[],
  lookAheadSeconds: number,
): PlaybackNoteIndex {
  const notes = sortNotesForPlayback(sourceNotes)
  let maxDuration = 0
  const eventTimes = new Set<number>()

  for (const note of notes) {
    maxDuration = Math.max(maxDuration, note.duration)
    eventTimes.add(Math.max(0, note.start - lookAheadSeconds))
    eventTimes.add(note.start)
    eventTimes.add(note.start + note.duration)
  }

  return {
    notes,
    maxDuration,
    midiEventTimes: [...eventTimes].sort((left, right) => left - right),
  }
}

export function derivePlaybackMidiState(
  index: PlaybackNoteIndex,
  cursor: number,
  lookAheadSeconds: number,
): PlaybackMidiState {
  const { notes, maxDuration } = index
  const activeMidi = new Set<number>()
  const activeNoteIds = new Set<string>()
  const upcomingMidi = new Set<number>()
  const activeStart = findFirstNoteStartingAtOrAfter(
    notes,
    cursor - maxDuration,
  )
  const activeEnd = findFirstNoteStartingAfter(notes, cursor)

  for (let noteIndex = activeStart; noteIndex < activeEnd; noteIndex += 1) {
    const note = notes[noteIndex]
    if (cursor >= note.start && cursor < note.start + note.duration) {
      activeMidi.add(note.midi)
      activeNoteIds.add(note.id)
    }
  }

  const upcomingStart = findFirstNoteStartingAfter(notes, cursor)
  const upcomingEnd = findFirstNoteStartingAfter(
    notes,
    cursor + lookAheadSeconds,
  )
  for (let noteIndex = upcomingStart; noteIndex < upcomingEnd; noteIndex += 1) {
    upcomingMidi.add(notes[noteIndex].midi)
  }

  return { activeMidi, activeNoteIds, upcomingMidi }
}

export function playbackSetsEqual<T>(left: Set<T>, right: Set<T>) {
  if (left.size !== right.size) return false
  for (const value of left) if (!right.has(value)) return false
  return true
}
