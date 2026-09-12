import type { MailMessageDetail } from './gmail-service'
import { runWithMailAccountContext } from './mail-account-context'
import { type CachedMailMessage, readCachedMessage } from './message-cache'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let moldableHome = ''

beforeEach(async () => {
  moldableHome = await mkdtemp(path.join(tmpdir(), 'mail-cache-migration-'))
  vi.stubEnv('MOLDABLE_HOME', moldableHome)
  vi.stubEnv('MOLDABLE_APP_ID', 'mail')
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await rm(moldableHome, { recursive: true, force: true })
})

describe('Mail local cache migration', () => {
  it('copies the former synced cache once without deleting its source', async () => {
    const dataDir = path.join(
      moldableHome,
      'workspaces',
      'personal',
      'apps',
      'mail',
      'data',
    )
    const legacyPath = path.join(dataDir, 'messages', 'legacy-message.json')
    const detail: MailMessageDetail = {
      id: 'legacy-message',
      threadId: 'legacy-thread',
      from: 'sender@example.com',
      to: 'me@example.com',
      cc: '',
      subject: 'Migrated message',
      date: 'Thu, 27 Aug 2026 12:00:00 +0000',
      snippet: 'A cached message',
      labelIds: ['INBOX'],
      unread: false,
      starred: false,
      important: false,
      internalDate: Date.parse('2026-08-27T12:00:00.000Z'),
      bodyText: 'Already downloaded',
      bodyHtml: '',
      bodyHtmlText: '',
      attachments: [],
    }
    await mkdir(path.dirname(legacyPath), { recursive: true })
    await writeFile(
      legacyPath,
      JSON.stringify({
        cachedAt: '2026-08-27T12:00:00.000Z',
        detailCached: true,
        message: detail,
      } satisfies CachedMailMessage),
    )

    const migrated = await runWithMailAccountContext(
      {
        workspaceId: 'personal',
        accountId: 'legacy-account',
        useLegacyStorage: true,
      },
      () => readCachedMessage('personal', 'legacy-message'),
    )

    expect(migrated).toMatchObject({ subject: 'Migrated message' })
    const localPath = path.join(
      moldableHome,
      'cache',
      'workspaces',
      'personal',
      'apps',
      'mail',
      'messages',
      'legacy-message.json',
    )
    expect(JSON.parse(await readFile(localPath, 'utf8'))).toMatchObject({
      message: { id: 'legacy-message' },
    })
    await expect(stat(legacyPath)).resolves.toBeDefined()
    await expect(
      stat(path.join(dataDir, 'local-cache-migration-v1.json')),
    ).resolves.toBeDefined()
  })
})
