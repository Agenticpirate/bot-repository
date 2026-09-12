import type { MailDraft } from '../client/types'
import { handleMailCard } from './chat-cards'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const gmail = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(), send: vi.fn() }))
vi.mock('./gmail-service', () => ({
  getGmailDraft: gmail.get,
  saveGmailDraft: gmail.save,
  sendGmailDraft: gmail.send,
}))

let draft: MailDraft
let home: string
const originalEnv = { ...process.env }
const fields = {
  draftId: 'draft-1',
  to: 'friend@example.com',
  cc: '',
  bcc: '',
  subject: 'Garden visit',
  body: 'See you Saturday!',
}
beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'mail-card-'))
  process.env = { ...originalEnv, MOLDABLE_HOME: home, MOLDABLE_APP_ID: 'mail' }
  delete process.env.MOLDABLE_APP_DATA_DIR
  draft = {
    id: 'draft-1',
    composer: { mode: 'new', ...fields },
    createdAt: 1,
    updatedAt: 1,
  }
  gmail.get.mockReset().mockImplementation(async () => structuredClone(draft))
  gmail.save.mockReset().mockImplementation(async (_workspace, values) => {
    draft = {
      ...draft,
      composer: { ...draft.composer, ...values },
      updatedAt: draft.updatedAt + 1,
    }
    return structuredClone(draft)
  })
  gmail.send.mockReset().mockResolvedValue({ id: 'sent-1' })
})
afterEach(async () => {
  process.env = originalEnv
  await rm(home, { recursive: true, force: true })
})
const read = () =>
  handleMailCard(
    'mail.cards.read',
    { draftId: draft.id },
    'personal',
    'primary',
  )
async function input() {
  const result = await read()
  if (!('revision' in result)) throw new Error('Draft missing')
  return { ...fields, expectedRevision: result.revision }
}

describe('inline Mail draft authority', () => {
  it('presents only a record reference and saves without sending', async () => {
    const result = await handleMailCard(
      'mail.cards.present',
      { draftId: draft.id },
      'personal',
      'primary',
    )
    expect(result).toMatchObject({
      appCard: {
        resourcePath: '/index.html?card=draft',
        input: { draftId: draft.id, accountId: 'primary' },
      },
    })
    expect(JSON.stringify(result)).not.toContain(fields.body)
    const saved = await handleMailCard(
      'mail.cards.save',
      { ...(await input()), body: 'Changed locally' },
      'personal',
      'primary',
    )
    expect(saved).toMatchObject({
      state: 'draft',
      draft: { composer: { body: 'Changed locally' } },
    })
    expect(gmail.send).not.toHaveBeenCalled()
  })
  it('rejects stale values changed by another client', async () => {
    const stale = await input()
    draft.composer.subject = 'Updated from Mail'
    await expect(
      handleMailCard('mail.cards.send', stale, 'personal', 'primary'),
    ).rejects.toThrow('changed')
    expect(gmail.save).not.toHaveBeenCalled()
    expect(gmail.send).not.toHaveBeenCalled()
  })
  it('serializes simultaneous sends and reopens the durable sent state', async () => {
    const values = await input()
    const results = await Promise.all([
      handleMailCard('mail.cards.send', values, 'personal', 'primary'),
      handleMailCard('mail.cards.send', values, 'personal', 'primary'),
    ])
    expect(
      results.every((result) => 'state' in result && result.state === 'sent'),
    ).toBe(true)
    expect(gmail.send).toHaveBeenCalledTimes(1)
    gmail.get.mockRejectedValue(new Error('Gmail consumed the draft'))
    expect(await read()).toMatchObject({ state: 'sent', messageId: 'sent-1' })
    await handleMailCard('mail.cards.send', values, 'personal', 'primary')
    expect(gmail.send).toHaveBeenCalledTimes(1)
  })
  it('retains an uncertain send instead of resending after a lost provider response', async () => {
    const values = await input()
    gmail.send.mockRejectedValueOnce(new Error('Connection lost after send'))
    await expect(
      handleMailCard('mail.cards.send', values, 'personal', 'primary'),
    ).rejects.toThrow('Connection lost')
    expect(await read()).toMatchObject({ state: 'uncertain' })
    await expect(
      handleMailCard('mail.cards.send', values, 'personal', 'primary'),
    ).rejects.toThrow('unresolved')
    expect(gmail.send).toHaveBeenCalledTimes(1)
  })
  it('preserves attached drafts and isolates receipts across workspaces and accounts', async () => {
    const values = await input()
    draft.attachments = [
      {
        id: 'attachment-1',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 1,
        inline: false,
      },
    ]
    expect(await read()).toMatchObject({ state: 'attachments' })
    await expect(
      handleMailCard('mail.cards.send', values, 'personal', 'primary'),
    ).rejects.toThrow('attachments')
    expect(gmail.save).not.toHaveBeenCalled()
    draft.attachments = []
    await handleMailCard(
      'mail.cards.send',
      { ...values, expectedRevision: (await input()).expectedRevision },
      'personal',
      'primary',
    )
    expect(
      await handleMailCard(
        'mail.cards.read',
        { draftId: draft.id },
        'work',
        'primary',
      ),
    ).toMatchObject({ state: 'draft' })
    expect(
      await handleMailCard(
        'mail.cards.read',
        { draftId: draft.id },
        'personal',
        'secondary',
      ),
    ).toMatchObject({ state: 'draft' })
  })
})
