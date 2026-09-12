import { handleMessageCard } from './chat-message-cards'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, thread } = vi.hoisted(() => ({ get: vi.fn(), thread: vi.fn() }))
vi.mock('./gmail-service', () => ({ getMessage: get, getThread: thread }))

beforeEach(() => {
  thread
    .mockReset()
    .mockImplementation(async (workspace, id) => ({
      id,
      messages: [await get(workspace, 'two')],
    }))
  get.mockReset().mockImplementation(async (_workspace, id) => ({
    id,
    threadId: 'thread-1',
    from: 'Friend',
    to: 'Me',
    subject: 'Garden visit',
    date: '2026-09-10',
    snippet: 'Saturday?',
    unread: true,
    bodyText: 'Private body',
    bodyHtml: '<p>Private body</p>',
    attachments: [],
  }))
})
describe('compact email cards', () => {
  it('presents bound account/message references without reading or mutating email', async () => {
    expect(
      await handleMessageCard(
        'mail.cards.messages.present',
        { messageIds: ['one', 'two'] },
        'personal',
        'primary',
      ),
    ).toMatchObject({
      appCard: {
        input: { accountId: 'primary', messageIds: ['one', 'two'] },
        actions: [],
      },
    })
    expect(get).not.toHaveBeenCalled()
  })
  it('hydrates previews without full bodies and details only for bound messages', async () => {
    const preview = await handleMessageCard(
      'mail.cards.messages.read',
      { messageIds: ['one', 'two'] },
      'personal',
      'primary',
    )
    expect(JSON.stringify(preview)).not.toContain('Private body')
    expect(
      await handleMessageCard(
        'mail.cards.messages.read',
        { messageIds: ['one', 'two'], detailId: 'two' },
        'personal',
        'primary',
      ),
    ).toMatchObject({ messages: [{ id: 'two', bodyText: 'Private body' }] })
    await expect(
      handleMessageCard(
        'mail.cards.messages.read',
        { messageIds: ['one'], detailId: 'foreign' },
        'personal',
        'primary',
      ),
    ).rejects.toThrow('not part')
  })
})

it('derives thread scope from the bound message and caps large thread payloads', async () => {
  thread.mockImplementation(async (workspace, id) => ({
    id,
    messages: await Promise.all(
      Array.from({ length: 40 }, (_, i) => get(workspace, String(i))),
    ),
  }))
  const result = await handleMessageCard(
    'mail.cards.messages.read',
    { messageIds: ['one'], detailId: 'one' },
    'personal',
    'primary',
  )
  expect(thread).toHaveBeenCalledWith('personal', 'thread-1')
  expect(result).toMatchObject({ totalMessages: 40, threadTruncated: true })
  expect('messages' in result && result.messages).toHaveLength(30)
  expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThan(240_000)
})
