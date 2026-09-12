import { artworkBody, requestArtwork, thumbnailFromResponse } from './artwork'
import { runVault } from './vault'
import sharp from 'sharp'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./vault', () => ({ runVault: vi.fn() }))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('turns a generated image into a bounded square JPEG thumbnail', async () => {
  const image = await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: '#285abb' },
  })
    .png()
    .toBuffer()
  const thumbnail = await thumbnailFromResponse({
    data: [{ b64_json: image.toString('base64') }],
  })
  expect(await sharp(thumbnail).metadata()).toMatchObject({
    width: 512,
    height: 512,
    format: 'jpeg',
  })
  expect(thumbnail.length).toBeLessThan(300_000)
  await expect(
    thumbnailFromResponse({ error: { code: 'missing_scope' } }),
  ).rejects.toMatchObject({ code: 'artwork_permission' })
  await expect(
    thumbnailFromResponse({
      error: {
        code: null,
        type: 'invalid_request_error',
        message: 'Missing scopes: api.model.images.request',
      },
    }),
  ).rejects.toMatchObject({ code: 'artwork_permission' })
  await expect(
    thumbnailFromResponse({ data: [{ b64_json: 'not binary!' }] }),
  ).rejects.toMatchObject({ code: 'invalid_artwork' })
})

describe('Images-compatible generation routing', () => {
  function host() {
    vi.stubEnv('MOLDABLE_AI_SERVER_URL', 'http://localhost:9999')
    vi.stubEnv('MOLDABLE_APP_ID', 'podcasts')
    vi.stubEnv('MOLDABLE_APP_TOKEN', 'test-token')
  }
  it('uses the host image service with exact workspace scope and reuses its result', async () => {
    host()
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        response: {
          status: 200,
          json: { data: [{ b64_json: 'generated' }] },
        },
      }),
    )
    vi.stubGlobal('fetch', fetcher)
    const body = artworkBody('Time', 'Perception of time')
    await expect(
      requestArtwork(body, 'work', new AbortController().signal),
    ).resolves.toEqual({ data: [{ b64_json: 'generated' }] })
    const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))
    expect(request).toMatchObject({
      appId: 'podcasts',
      workspaceId: 'work',
      path: '/v1/images/generations',
      body: { model: 'gpt-image-2', n: 1, size: '1024x1024' },
    })
    expect(runVault).not.toHaveBeenCalled()
  })
  it('falls back to the workspace vault only when the host definitively refuses access', async () => {
    host()
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ code: 'codex_unavailable' }, { status: 403 }),
        ),
    )
    vi.mocked(runVault).mockResolvedValue(
      Buffer.from(
        JSON.stringify({
          response: {
            status: 200,
            json: { data: [{ b64_json: 'generated' }] },
          },
        }),
      ),
    )
    await requestArtwork(
      artworkBody('Time', ''),
      'personal',
      new AbortController().signal,
    )
    expect(runVault).toHaveBeenCalledOnce()
    const args = vi.mocked(runVault).mock.calls[0]?.[0]
    expect(args).toContain('openai/image-generation')
    expect(args).toContain('--body-file-path')
    expect(
      args?.slice(
        args.indexOf('--workspace-id'),
        args.indexOf('--workspace-id') + 2,
      ),
    ).toEqual(['--workspace-id', 'personal'])
  })
  it('does not buy another image after a timeout or provider failure', async () => {
    host()
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException('Timeout', 'TimeoutError'))
    vi.stubGlobal('fetch', fetcher)
    await expect(
      requestArtwork(
        artworkBody('Time', ''),
        'personal',
        new AbortController().signal,
      ),
    ).rejects.toThrow('Timeout')
    expect(runVault).not.toHaveBeenCalled()
    fetcher.mockResolvedValue(
      Response.json({
        response: { status: 500, json: { error: { code: 'server_error' } } },
      }),
    )
    await expect(
      requestArtwork(
        artworkBody('Time', ''),
        'personal',
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'artwork_rejected' })
    expect(runVault).not.toHaveBeenCalled()
  })
})
