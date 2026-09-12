import { z } from 'zod'

export const voices = [
  'marin',
  'cedar',
  'coral',
  'ash',
  'sage',
  'verse',
  'alloy',
  'nova',
  'onyx',
] as const
export type PodcastVoice = (typeof voices)[number]
export const episodeMinutesSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(20),
])
export const settingsSchema = z
  .object({ voice: z.enum(voices), minutes: episodeMinutesSchema.default(5) })
  .strict()
export const settingsUpdateSchema = z
  .object({
    voice: z.enum(voices).optional(),
    minutes: episodeMinutesSchema.optional(),
  })
  .strict()
export type PodcastSettings = z.infer<typeof settingsSchema>
export const accents = ['blue', 'amber', 'violet', 'teal', 'rose'] as const
export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/)
export const speakerSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1).max(60),
    voice: z.enum(voices),
    instructions: z
      .string()
      .trim()
      .max(600)
      .default(
        'Speak naturally, like a warm, curious podcast host. Use conversational pacing and clear pronunciation.',
      ),
  })
  .strict()
export const createEpisodeSchema = z
  .object({
    requestId: idSchema,
    title: z.string().trim().min(1).max(180),
    description: z
      .string()
      .trim()
      .max(1600)
      .default('')
      .describe(
        'A podcast blurb for listeners: one or two inviting sentences about the subject or story. Omit word counts, planned duration, narrator setup, AI/provider names and writing-process details.',
      ),
    accent: z.enum(accents).default('blue'),
    speakers: z.array(speakerSchema).length(1, 'Episodes use one narrator.'),
    script: z
      .array(
        z
          .object({
            speakerId: idSchema,
            text: z.string().trim().min(1).max(5000),
          })
          .strict(),
      )
      .min(1)
      .max(120),
    sources: z
      .array(
        z
          .object({
            title: z.string().trim().min(1).max(180),
            url: z
              .url()
              .max(2048)
              .refine((url) =>
                ['https:', 'http:'].includes(new URL(url).protocol),
              ),
          })
          .strict(),
      )
      .max(12)
      .default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = new Set(value.speakers.map((speaker) => speaker.id))
    if (ids.size !== value.speakers.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Speaker IDs must be unique.',
        path: ['speakers'],
      })
    if (value.script.some((turn) => !ids.has(turn.speakerId)))
      ctx.addIssue({
        code: 'custom',
        message: 'Every script turn must reference a declared speaker.',
        path: ['script'],
      })
    if (value.script.reduce((sum, turn) => sum + turn.text.length, 0) > 50_000)
      ctx.addIssue({
        code: 'custom',
        message:
          'An episode may contain at most 50,000 characters of narration.',
        path: ['script'],
      })
  })
export type CreateEpisode = z.infer<typeof createEpisodeSchema>
export const generateEpisodeSchema = z
  .object({
    requestId: idSchema,
    topic: z.string().trim().min(1).max(4000),
    minutes: z.union([z.literal(5), z.literal(10), z.literal(20)]),
    voice: z.enum(voices).optional(),
  })
  .strict()
export type GenerateEpisode = z.infer<typeof generateEpisodeSchema>
export type Speaker = z.infer<typeof speakerSchema>
export type EpisodeStatus =
  | 'queued'
  | 'generating'
  | 'ready'
  | 'failed'
  | 'cancelled'
export interface AudioPart {
  index: number
  speakerId: string
  text: string
  durationSeconds: number | null
  byteLength: number | null
}
export interface EpisodeThumbnail {
  status: 'queued' | 'generating' | 'ready' | 'failed'
  error: { code: string; message: string } | null
}
export interface ScriptDraft {
  title: string
  description: string
  outline: string[]
  sections: string[][]
}
export interface Episode {
  id: string
  title: string
  description: string
  accent: (typeof accents)[number]
  speakers: Speaker[]
  sources: CreateEpisode['sources']
  parts: AudioPart[]
  creation?: {
    topic: string
    minutes: 5 | 10 | 20
    scriptReady: boolean
    draft?: ScriptDraft
  }
  thumbnail?: EpisodeThumbnail
  status: EpisodeStatus
  error: { code: string; message: string } | null
  createdAt: string
  updatedAt: string
  revision: number
  archived: boolean
  playback: {
    positionSeconds: number
    speed: number
    updatedAt: string | null
  }
}
export interface EpisodeSummary
  extends Omit<Episode, 'parts' | 'sources' | 'creation'> {
  creation?: Omit<NonNullable<Episode['creation']>, 'draft'> & {
    completedSections?: number
    totalSections?: number
  }
  thumbnailPath?: string | null
  durationSeconds: number
  completedParts: number
  totalParts: number
}
export interface EpisodeView extends EpisodeSummary {
  sources: Episode['sources']
  parts: Array<AudioPart & { audioPath: string | null }>
}
export const recordSchema = z.object({ id: idSchema }).strict()
export const revisionSchema = z
  .object({ id: idSchema, expectedRevision: z.number().int().nonnegative() })
  .strict()
export const playbackSchema = z
  .object({
    id: idSchema,
    positionSeconds: z.number().finite().min(0).max(14_400),
    speed: z.number().min(0.5).max(2),
    event: z.enum(['play', 'pause', 'seek', 'speed', 'ended']),
  })
  .strict()
export const listSchema = z
  .object({
    query: z.string().max(200).default(''),
    archived: z.boolean().default(false),
    limit: z.number().int().min(1).max(50).default(30),
    offset: z.number().int().nonnegative().max(100_000).default(0),
  })
  .strict()

export function summarizeEpisode(episode: Episode): EpisodeSummary {
  const { parts, sources: _sources, creation, ...summary } = episode
  return {
    ...summary,
    ...(creation
      ? {
          creation: {
            topic: creation.topic,
            minutes: creation.minutes,
            scriptReady: creation.scriptReady,
            completedSections: creation.draft?.sections.length ?? 0,
            totalSections: creation.draft?.outline.length ?? 0,
          },
        }
      : {}),
    durationSeconds: parts.reduce(
      (sum, part) => sum + (part.durationSeconds ?? 0),
      0,
    ),
    completedParts: parts.filter((part) => part.durationSeconds !== null)
      .length,
    totalParts: parts.length,
  }
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

/** Parts bound provider requests and mobile transfers without changing speaker order. */
export function splitScript(
  script: CreateEpisode['script'],
  maxLength = 1800,
): AudioPart[] {
  const result: AudioPart[] = []
  for (const turn of script) {
    let remaining = turn.text.trim()
    while (remaining.length) {
      let end = Math.min(maxLength, remaining.length)
      if (end < remaining.length) {
        const prefix = remaining.slice(0, end)
        const sentences = [...prefix.matchAll(/[.!?。！？][\s\n]+/gu)]
        const sentence = sentences.at(-1)
        const boundary = sentence
          ? sentence.index + sentence[0].length
          : prefix.lastIndexOf(' ')
        if (boundary > maxLength / 3) end = boundary
        // Never split a UTF-16 surrogate pair when a long token has no whitespace.
        if (/[\uD800-\uDBFF]/u.test(remaining[end - 1] ?? '')) end--
      }
      result.push({
        index: result.length,
        speakerId: turn.speakerId,
        text: remaining.slice(0, end).trim(),
        durationSeconds: null,
        byteLength: null,
      })
      remaining = remaining.slice(end).trim()
    }
  }
  return result
}
