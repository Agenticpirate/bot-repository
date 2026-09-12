import type { Speaker } from '../shared/podcast'
import { PodcastError } from './errors'
import { runVault } from './vault'
import { parseBuffer } from 'music-metadata'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { z } from 'zod'

export interface SpeechRequest {
  text: string
  speaker: Speaker
  workspaceId: string
  signal: AbortSignal
}
export interface SpeechAudio {
  bytes: Buffer
  durationSeconds: number
}
export type SynthesizeSpeech = (request: SpeechRequest) => Promise<SpeechAudio>
export const SPEECH_MODEL = 'gpt-4o-mini-tts'
const MAX_AUDIO_BYTES = 8 * 1024 * 1024
const providerError = z.object({
  error: z.object({
    code: z.string().nullable().optional(),
    type: z.string().optional(),
  }),
})

export function speechArgs(bodyPath: string, workspaceId: string): string[] {
  return [
    'invoke',
    'openai/speech',
    '--workspace-id',
    workspaceId,
    '--method',
    'POST',
    '--path',
    '/v1/audio/speech',
    '--header',
    'Content-Type=application/json',
    '--body-file-path',
    bodyPath,
    '--timeout-ms',
    '120000',
  ]
}

export async function inspectSpeechAudio(bytes: Buffer): Promise<SpeechAudio> {
  if (bytes.subarray(0, 1).toString() === '{') {
    const payload = providerError.safeParse(JSON.parse(bytes.toString('utf8')))
    const code = payload.success
      ? (payload.data.error.code ?? payload.data.error.type)
      : null
    if (code === 'missing_scope')
      throw new PodcastError(
        'missing_speech_permission',
        'This OpenAI API key cannot generate speech. Enable Audio/Speech write access (api.model.audio.request) for the key on the OpenAI Platform, or replace OPENAI_API_KEY in Moldable Settings → Vault with a key that has this permission.',
        503,
      )
    if (code === 'invalid_api_key')
      throw new PodcastError(
        'invalid_api_key',
        'OpenAI rejected this API key. Update OPENAI_API_KEY in Moldable Settings → Vault.',
        503,
      )
    if (code === 'insufficient_quota')
      throw new PodcastError(
        'insufficient_quota',
        'Your OpenAI API balance or spending limit has been reached. Check billing on the OpenAI Platform, then retry.',
        503,
      )
    if (code === 'rate_limit_exceeded')
      throw new PodcastError(
        'rate_limit_exceeded',
        'OpenAI is rate limiting speech generation. Wait a moment, then retry the remaining parts.',
        503,
      )
    throw new PodcastError(
      'speech_rejected',
      'OpenAI could not generate this narration. Check your API access and billing, then retry.',
      502,
    )
  }
  const mp3 =
    bytes.subarray(0, 3).toString() === 'ID3' ||
    (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)
  if (!mp3)
    throw new PodcastError(
      'invalid_audio',
      'OpenAI returned an invalid audio file. Finished parts have been kept.',
      502,
    )
  const metadata = await parseBuffer(
    bytes,
    { mimeType: 'audio/mpeg', size: bytes.length },
    { duration: true },
  )
  const durationSeconds = metadata.format.duration
  if (
    !durationSeconds ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds > 600
  )
    throw new PodcastError(
      'invalid_audio_duration',
      'Could not verify the duration of this audio part.',
      502,
    )
  return { bytes, durationSeconds }
}

export const synthesizeSpeech: SynthesizeSpeech = async ({
  text,
  speaker,
  workspaceId,
  signal,
}) => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'podcasts-speech-'))
  try {
    const bodyPath = path.join(temporary, 'request.json')
    await writeFile(
      bodyPath,
      JSON.stringify({
        model: SPEECH_MODEL,
        input: text,
        voice: speaker.voice,
        instructions: speaker.instructions,
        response_format: 'mp3',
      }),
      { mode: 0o600 },
    )
    const bytes = await runVault(speechArgs(bodyPath, workspaceId), signal, {
      maxOutputBytes: MAX_AUDIO_BYTES,
      timeoutMs: 130_000,
      purpose: 'speech',
    })
    return await inspectSpeechAudio(bytes)
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}
