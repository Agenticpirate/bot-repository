import type { EpisodeView } from '../../shared/podcast'

export function expectsMoreAudio(episode: EpisodeView): boolean {
  return (
    ['queued', 'generating'].includes(episode.status) &&
    (Boolean(episode.creation && !episode.creation.scriptReady) ||
      episode.parts.some((part) => part.durationSeconds === null))
  )
}

export function playableParts(episode: EpisodeView) {
  let offset = 0
  return episode.parts.flatMap((part) => {
    if (part.durationSeconds === null || !part.audioPath) return []
    const value = {
      ...part,
      durationSeconds: part.durationSeconds,
      audioPath: part.audioPath,
      offset,
    }
    offset += part.durationSeconds
    return [value]
  })
}

export function locatePosition(
  parts: ReturnType<typeof playableParts>,
  seconds: number,
) {
  const duration = parts.reduce((sum, part) => sum + part.durationSeconds, 0)
  const position = Math.max(0, Math.min(seconds, duration))
  const part =
    parts.find((item) => position < item.offset + item.durationSeconds) ??
    parts.at(-1)
  return part
    ? {
        part,
        position,
        localTime: Math.min(
          position - part.offset,
          Math.max(0, part.durationSeconds - 0.01),
        ),
      }
    : null
}
