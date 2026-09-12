import type { AiMoveResponse, TutorialLesson } from '../shared/types'
import { app } from './app'
import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'

function legalMoves(fen: string): string[] {
  return new Chess(fen)
    .moves({ verbose: true })
    .map((move) => `${move.from}${move.to}${move.promotion ?? ''}`)
}

describe('Chess app routes', () => {
  it('returns a legal deterministic move when the LLM is unavailable', async () => {
    const chess = new Chess()
    const response = await app.request('/api/ai/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fen: chess.fen(),
        difficulty: 'club',
        history: [],
      }),
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as AiMoveResponse
    expect(legalMoves(chess.fen())).toContain(body.move)
    expect(body.source).toBe('fallback')
  })

  it('creates a validated tutorial with a legal best move', async () => {
    const response = await app.request('/api/tutorial/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'checkmate',
        difficulty: 'friendly',
      }),
    })

    expect(response.status).toBe(200)
    const lesson = (await response.json()) as TutorialLesson
    expect(() => new Chess(lesson.fen)).not.toThrow()
    expect(legalMoves(lesson.fen)).toContain(lesson.bestMove)
    expect(lesson.hints.length).toBeGreaterThanOrEqual(2)
  })

  it('exposes a voice-drive contract without claiming narration', async () => {
    const response = await app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'chess.ui.describe',
        params: {},
      }),
    })
    const body = (await response.json()) as {
      ok: boolean
      result: {
        moveFormat: string
        methods: string[]
        narrationOwner: string
        note: string
      }
    }

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.moveFormat).toContain('UCI')
    expect(body.result.methods).toContain('chess.game.resume')
    expect(body.result.methods).toContain('chess.game.submitMove')
    expect(body.result.methods).toContain('chess.game.waitForChange')
    expect(body.result.methods).not.toContain('chess.ui.move')
    expect(body.result.narrationOwner).toBe('active-voice-session')
    expect(body.result.note).toContain('Chess owns authoritative state and UI')
  })
})
