import {
  applyInboundMailFilters,
  createMailFilter,
  listMailFilters,
  matchesMailFilter,
} from './filters'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const WORKSPACE = 'filters-test'
let temporaryHome: string
let previousHome: string | undefined
let previousAppId: string | undefined

beforeEach(async () => {
  temporaryHome = await mkdtemp(path.join(tmpdir(), 'mail-filters-'))
  previousHome = process.env.HOME
  previousAppId = process.env.MOLDABLE_APP_ID
  process.env.HOME = temporaryHome
  process.env.MOLDABLE_APP_ID = 'mail'
})

afterEach(async () => {
  if (previousHome === undefined) delete process.env.HOME
  else process.env.HOME = previousHome
  if (previousAppId === undefined) delete process.env.MOLDABLE_APP_ID
  else process.env.MOLDABLE_APP_ID = previousAppId
  await rm(temporaryHome, { recursive: true, force: true })
})

describe('native Mail filters', () => {
  it('normalizes matching and archives only matching Inbox mail', async () => {
    const filter = await createMailFilter(WORKSPACE, {
      name: 'Coinbase statements',
      accountId: 'primary',
      match: {
        fromDomains: ['Mail.Coinbase.Com'],
        subjectContains: [' Statement '],
      },
    })
    expect(filter.match).toEqual({
      fromDomains: ['mail.coinbase.com'],
      subjectContains: ['statement'],
    })
    expect(
      matchesMailFilter(filter.match, {
        from: 'Coinbase <notices@mail.coinbase.com>',
        subject: 'Your monthly statement is ready',
      }),
    ).toBe(true)

    const archived: string[] = []
    const result = await applyInboundMailFilters({
      workspaceId: WORKSPACE,
      accountId: 'primary',
      message: {
        id: 'matching-message',
        from: 'Coinbase <notices@mail.coinbase.com>',
        subject: 'Your monthly statement is ready',
        labelIds: ['INBOX'],
      },
      archive: async (messageId) => {
        archived.push(messageId)
      },
    })
    expect(result).toEqual({ archived: true, filterIds: [filter.id] })
    expect(archived).toEqual(['matching-message'])

    const nonInboxResult = await applyInboundMailFilters({
      workspaceId: WORKSPACE,
      accountId: 'primary',
      message: {
        id: 'already-archived',
        from: 'Coinbase <notices@mail.coinbase.com>',
        subject: 'Your monthly statement is ready',
        labelIds: ['ALL'],
      },
      archive: async (messageId) => {
        archived.push(messageId)
      },
    })
    expect(nonInboxResult).toEqual({ archived: false, filterIds: [] })
    expect(archived).toEqual(['matching-message'])
  })

  it('keeps filter definitions workspace scoped', async () => {
    await createMailFilter(WORKSPACE, {
      name: 'Global known noise',
      match: { fromAddresses: ['newsletter@example.com'] },
    })
    expect(await listMailFilters(WORKSPACE)).toHaveLength(1)
    expect(await listMailFilters('different-workspace')).toEqual([])
  })
})
