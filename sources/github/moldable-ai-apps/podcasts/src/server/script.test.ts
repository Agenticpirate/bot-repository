import type { ScriptDraft } from '../shared/podcast'
import { writeScript } from './script'
import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
function host() {
  vi.stubEnv('MOLDABLE_AI_SERVER_URL', 'http://localhost:39200')
  vi.stubEnv('MOLDABLE_APP_ID', 'podcasts')
  vi.stubEnv('MOLDABLE_APP_TOKEN', 'test-app-token')
}
const input = () => ({
  topic: 'A story',
  minutes: 20 as const,
  workspaceId: 'work',
  signal: new AbortController().signal,
})
const plan = {
  title: 'A long story',
  description: 'A twenty-minute story.',
  outline: ['Opening', 'Discovery', 'Conflict', 'Resolution'],
}
const paragraphs = () =>
  Array.from({ length: 3 }, () => 'story '.repeat(250).trim())

it("writes 3,000 words in bounded sections through Git Flow's host contract", async () => {
  host()
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async (_url, options) => {
      const request = JSON.parse(String(options?.body))
      return Response.json({
        json:
          request.schemaName === 'podcast_outline'
            ? plan
            : { paragraphs: paragraphs() },
      })
    })
  vi.stubGlobal('fetch', fetcher)
  const checkpoint = vi.fn()
  const result = await writeScript({ ...input(), checkpoint })
  expect(fetcher).toHaveBeenCalledTimes(5)
  expect(checkpoint).toHaveBeenCalledTimes(5)
  expect(checkpoint.mock.calls.map(([draft]) => draft.sections.length)).toEqual(
    [0, 1, 2, 3, 4],
  )
  expect(
    result.script.reduce(
      (count, part) => count + part.text.split(/\s+/).length,
      0,
    ),
  ).toBe(3000)
  expect(result.speakers).toHaveLength(1)
  const request = fetcher.mock.calls[0]?.[1]
  expect(fetcher.mock.calls[0]?.[0]).toBe(
    'http://localhost:39200/api/llm/generate-json',
  )
  expect(request?.headers).toMatchObject({
    'x-moldable-app-id': 'podcasts',
    'x-moldable-app-token': 'test-app-token',
  })
  const body = JSON.parse(String(request?.body))
  expect(body).toMatchObject({
    appId: 'podcasts',
    workspaceId: 'work',
    purpose: 'podcasts.write-episode',
    schemaName: 'podcast_outline',
  })
  expect(body.timeoutMs).toBeGreaterThan(599_000)
  expect(body.timeoutMs).toBeLessThanOrEqual(600_000)
  const secondSection = JSON.parse(String(fetcher.mock.calls[2]?.[1]?.body))
  expect(secondSection.prompt).toContain('Already spoken')
  expect(secondSection.prompt).toContain(paragraphs()[0])
})

it('resumes from saved sections after a provider failure without replanning or rewriting them', async () => {
  host()
  let draft: ScriptDraft | undefined
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ json: plan }))
    .mockResolvedValueOnce(
      Response.json({ json: { paragraphs: paragraphs() } }),
    )
    .mockResolvedValueOnce(
      Response.json({ error: 'private upstream context' }, { status: 500 }),
    )
  vi.stubGlobal('fetch', fetcher)
  await expect(
    writeScript({
      ...input(),
      checkpoint: (saved) => {
        draft = saved
      },
    }),
  ).rejects.toMatchObject({ code: 'script_generation_failed' })
  expect(draft?.sections).toHaveLength(1)
  const saved = structuredClone(draft)
  fetcher.mockImplementation(async () =>
    Response.json({ json: { paragraphs: paragraphs() } }),
  )
  const result = await writeScript({ ...input(), draft })
  expect(fetcher).toHaveBeenCalledTimes(6)
  expect(JSON.parse(String(fetcher.mock.calls[3]?.[1]?.body)).schemaName).toBe(
    'podcast_section',
  )
  expect(result.script.slice(0, 3).map((turn) => turn.text)).toEqual(
    saved?.sections[0],
  )
})

it('rejects invalid model output before it enters the narration queue', async () => {
  host()
  vi.stubGlobal(
    'fetch',
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ json: { title: 'Incomplete' } })),
  )
  await expect(writeScript(input())).rejects.toMatchObject({
    code: 'invalid_script',
  })
})
