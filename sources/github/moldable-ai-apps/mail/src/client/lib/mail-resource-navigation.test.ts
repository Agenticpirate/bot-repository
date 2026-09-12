import {
  loadMailDraftResource,
  loadMailResource,
  mailResourceFromMessage,
  mailResourceFromSearch,
} from './mail-resource-navigation'
import { describe, expect, it, vi } from 'vitest'

const resource = {
  appId: 'mail',
  resourceType: 'mail.message',
  accountId: 'account-1',
  resourceId: 'old-message',
} as const

describe('Mail source navigation', () => {
  it('accepts the same target from desktop messages and iPhone startup URLs', () => {
    expect(
      mailResourceFromMessage(
        { type: 'moldable:open-resource', workspaceId: 'personal', resource },
        'personal',
      ),
    ).toEqual(resource)
    expect(
      mailResourceFromSearch(
        new URLSearchParams({
          moldableResource: JSON.stringify(resource),
        }).toString(),
      ),
    ).toEqual(resource)
    expect(
      mailResourceFromMessage(
        { type: 'moldable:open-resource', workspaceId: 'work', resource },
        'personal',
      ),
    ).toBeNull()
    expect(
      mailResourceFromMessage(
        {
          type: 'moldable:open-resource',
          workspaceId: 'personal',
          resource: { ...resource, method: 'mail.send' },
        },
        'personal',
      ),
    ).toBeNull()
    expect(mailResourceFromSearch('moldableResource=%7B')).toBeNull()
  })

  it('loads an exact older message directly without depending on the visible inbox', async () => {
    const message = {
      id: resource.resourceId,
      accountId: resource.accountId,
      subject: 'Previous email',
    }
    const fetch = vi.fn().mockResolvedValue(Response.json({ message }))
    expect(await loadMailResource(resource, fetch)).toEqual(message)
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      '/api/messages/old-message?accountId=account-1',
    )
  })

  it('rejects a different account and explains missing messages', async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        message: { id: resource.resourceId, accountId: 'account-2' },
      }),
    )
    await expect(loadMailResource(resource, fetch)).rejects.toThrow(
      'different email',
    )
    fetch.mockResolvedValue(new Response(null, { status: 404 }))
    await expect(loadMailResource(resource, fetch)).rejects.toThrow(
      'no longer available',
    )
  })
})

it('opens the exact attached draft without rewriting or sending it', async () => {
  const target = {
    ...resource,
    resourceType: 'mail.draft' as const,
    resourceId: 'draft-1',
  }
  const draft = {
    id: 'draft-1',
    composer: { accountId: 'account-1' },
    attachments: [{ filename: 'Photo.png' }],
  }
  const fetch = vi.fn().mockResolvedValue(Response.json({ draft }))
  expect(await loadMailDraftResource(target, fetch)).toEqual(draft)
  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    '/api/drafts/draft-1?accountId=account-1',
  )
  fetch.mockResolvedValue(
    Response.json({ draft: { ...draft, composer: { accountId: 'other' } } }),
  )
  await expect(loadMailDraftResource(target, fetch)).rejects.toThrow(
    'different draft',
  )
})
