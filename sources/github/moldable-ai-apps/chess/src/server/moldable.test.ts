import { generateJson } from './moldable'
import { afterEach, describe, expect, it, vi } from 'vitest'

const originalEnvironment = {
  aiServerUrl: process.env.MOLDABLE_AI_SERVER_URL,
  appId: process.env.MOLDABLE_APP_ID,
  appToken: process.env.MOLDABLE_APP_TOKEN,
}

afterEach(() => {
  vi.unstubAllGlobals()
  process.env.MOLDABLE_AI_SERVER_URL = originalEnvironment.aiServerUrl
  process.env.MOLDABLE_APP_ID = originalEnvironment.appId
  process.env.MOLDABLE_APP_TOKEN = originalEnvironment.appToken
})

describe('Moldable structured generation', () => {
  it('aborts an unresponsive upstream request at the requested deadline', async () => {
    process.env.MOLDABLE_AI_SERVER_URL = 'http://moldable-ai.test'
    process.env.MOLDABLE_APP_ID = 'chess'
    process.env.MOLDABLE_APP_TOKEN = 'test-token'

    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'))
          })
        })
      }),
    )

    await expect(generateJson({ timeoutMs: 5 })).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
})
