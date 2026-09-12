import {
  createTutorAnalysis,
  createTutorPrompt,
  getTutorSettings,
  setTutorSettings,
} from './tutor'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const tempDirs: string[] = []
const originalEnvironment = {
  aiServerUrl: process.env.MOLDABLE_AI_SERVER_URL,
  appId: process.env.MOLDABLE_APP_ID,
  appToken: process.env.MOLDABLE_APP_TOKEN,
}

afterEach(async () => {
  vi.unstubAllGlobals()
  process.env.MOLDABLE_AI_SERVER_URL = originalEnvironment.aiServerUrl
  process.env.MOLDABLE_APP_ID = originalEnvironment.appId
  process.env.MOLDABLE_APP_TOKEN = originalEnvironment.appToken
  await Promise.all(
    tempDirs
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

async function dataDir() {
  const directory = await mkdtemp(path.join(tmpdir(), 'chess-tutor-test-'))
  tempDirs.push(directory)
  return directory
}

describe('Socratic chess tutor', () => {
  it('persists its workspace-scoped enabled state', async () => {
    const directory = await dataDir()

    await expect(getTutorSettings(directory)).resolves.toEqual({
      enabled: false,
    })
    await setTutorSettings(directory, true)
    await expect(getTutorSettings(directory)).resolves.toEqual({
      enabled: true,
    })
  })

  it('falls back to a question without revealing a move', async () => {
    const directory = await dataDir()
    const originalUrl = process.env.MOLDABLE_AI_SERVER_URL
    delete process.env.MOLDABLE_AI_SERVER_URL
    try {
      const prompt = await createTutorPrompt({
        dataDir: directory,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        difficulty: 'friendly',
        stage: 'question',
      })

      expect(prompt.source).toBe('fallback')
      expect(prompt.question).toMatch(/\?$/)
      expect(prompt.question).not.toMatch(/[a-h][1-8][a-h][1-8]/)
    } finally {
      if (originalUrl === undefined) {
        delete process.env.MOLDABLE_AI_SERVER_URL
      } else {
        process.env.MOLDABLE_AI_SERVER_URL = originalUrl
      }
    }
  })

  it('uses Terra with medium reasoning for Socratic questions', async () => {
    process.env.MOLDABLE_AI_SERVER_URL = 'http://moldable-ai.test'
    process.env.MOLDABLE_APP_ID = 'chess'
    process.env.MOLDABLE_APP_TOKEN = 'test-token'
    let requestBody: Record<string, unknown> | undefined

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
        return Response.json({
          json: {
            focus: 'King safety',
            question: 'Which pieces currently help protect your king?',
          },
          model: 'openai/gpt-5.6-terra',
        })
      }),
    )

    const prompt = await createTutorPrompt({
      dataDir: await dataDir(),
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      difficulty: 'friendly',
      stage: 'question',
    })

    expect(requestBody).toMatchObject({
      appId: 'chess',
      purpose: 'chess-socratic-tutor',
      model: 'openai/gpt-5.6-terra',
      reasoningEffort: 'medium',
    })
    expect(prompt).toMatchObject({
      source: 'llm',
      model: 'openai/gpt-5.6-terra',
    })
  })

  it('keeps hints friendly when Stockfish is not installed', async () => {
    const analysis = await createTutorAnalysis(
      await dataDir(),
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    )

    expect(analysis.available).toBe(false)
    expect(analysis.candidates).toEqual([])
    expect(analysis.reason).toContain('Install Stockfish')
  })
})
