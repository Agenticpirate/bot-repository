import { materializeMessageAttachment } from './attachment-materializer'
import type { MailMessageDetail } from './gmail-service'
import { runWithMailAccountContext } from './mail-account-context'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  home: '',
  bytes: Buffer.from('hello'),
  downloads: vi.fn(),
}))
vi.mock('@moldable-ai/storage', async (original) => ({
  ...(await original<typeof import('@moldable-ai/storage')>()),
  getMoldableHome: () => state.home,
}))
vi.mock('./gmail-service', () => ({
  getAttachment: async (...args: unknown[]) => {
    state.downloads(...args)
    return { data: state.bytes }
  },
}))
afterEach(async () => {
  if (state.home) await rm(state.home, { recursive: true, force: true })
  state.downloads.mockClear()
})

const message = {
  id: 'message-1',
  attachments: [
    {
      id: 'part-1',
      attachmentId: 'provider-part',
      filename: 'notes.txt',
      mimeType: 'text/plain',
      size: 5,
    },
  ],
} as MailMessageDetail
async function home() {
  state.home = await realpath(
    await mkdtemp(join(tmpdir(), 'mail-materialize-')),
  )
  return state.home
}

describe('Mail generic attachment materialization', () => {
  it('pins the shared asset contract and isolates colliding IDs across accounts/workspaces', async () => {
    await home()
    const results = []
    for (const workspaceId of ['personal', 'work'])
      for (const accountId of ['account-a', 'account-b']) {
        const result = await runWithMailAccountContext(
          { workspaceId, accountId },
          () =>
            materializeMessageAttachment(workspaceId, message, {
              id: 'part-1',
              mode: 'materialize',
            }),
        )
        expect(result.reference).toEqual({
          workspaceId,
          source: {
            kind: 'app',
            appId: 'mail',
            accountId,
            resourceType: 'mail.message',
            resourceId: 'message-1',
            attachmentId: 'part-1',
          },
          asset: {
            address:
              'asset:sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
            filename: 'notes.txt',
            mimeType: 'text/plain',
            byteLength: 5,
            sha256:
              '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
          },
        })
        const identity = createHash('sha256')
          .update(
            JSON.stringify([
              workspaceId,
              'app',
              'mail',
              accountId,
              'mail.message',
              'message-1',
              'part-1',
            ]),
          )
          .digest('hex')
        const path = join(
          state.home,
          'workspaces',
          workspaceId,
          'attachment-assets',
          'mail',
          identity,
          result.reference.asset.sha256,
          'notes.txt',
        )
        expect(await readFile(path, 'utf8')).toBe('hello')
        results.push(path)
        expect(JSON.stringify(result)).not.toContain(state.home)
        expect(JSON.stringify(result)).not.toContain('aGVsbG8=')
      }
    expect(new Set(results).size).toBe(4)
  })
  it('rejects unowned message parts, missing account authority and oversized downloads', async () => {
    await home()
    await expect(
      materializeMessageAttachment('personal', message, {
        id: 'part-1',
        mode: 'materialize',
      }),
    ).rejects.toThrow('account')
    await runWithMailAccountContext(
      { workspaceId: 'personal', accountId: 'account-a' },
      async () => {
        await expect(
          materializeMessageAttachment('personal', message, {
            id: 'other-part',
            mode: 'materialize',
          }),
        ).rejects.toThrow('belong')
        expect(state.downloads).not.toHaveBeenCalled()
        state.bytes = Buffer.alloc(20 * 1024 * 1024 + 1)
        try {
          await expect(
            materializeMessageAttachment('personal', message, {
              id: 'part-1',
              mode: 'materialize',
            }),
          ).rejects.toThrow('20 MiB')
        } finally {
          state.bytes = Buffer.from('hello')
        }
      },
    )
  })
})
