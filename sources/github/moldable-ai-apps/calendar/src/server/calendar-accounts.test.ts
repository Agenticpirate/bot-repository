import { app } from './app'
import {
  getCalendarAccountsState,
  registerCalendarAccount,
  removeCalendarAccount,
  setActiveCalendarAccount,
} from './calendar-accounts'
import assert from 'node:assert/strict'
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'

const originalEnv = { ...process.env }
let tempHome = ''
let fakeBin = ''
let fakeVaultState = ''

const fakeAivault = `#!/usr/bin/env node
const fs = require('node:fs')
const args = process.argv.slice(2)
const statePath = process.env.AIVAULT_DIR
const readState = () => {
  try { return JSON.parse(fs.readFileSync(statePath, 'utf8')) }
  catch { return { secrets: [] } }
}
const writeState = (state) => fs.writeFileSync(statePath, JSON.stringify(state))
const valueAfter = (name) => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}
const state = readState()

if (args[0] === 'secrets' && args[1] === 'list') {
  const scope = valueAfter('--scope')
  const workspaceId = valueAfter('--workspace-id')
  const groupId = valueAfter('--group-id')
  const matches = state.secrets
    .filter((secret) =>
      secret.scope === scope &&
      secret.workspaceId === workspaceId &&
      (scope !== 'group' || secret.groupId === groupId),
    )
    .map((secret) => ({ name: secret.name, secretId: secret.id }))
  process.stdout.write(JSON.stringify(matches))
  process.exit(0)
}

if (args[0] === 'secrets' && args[1] === 'create') {
  const scope = valueAfter('--scope')
  const workspaceId = valueAfter('--workspace-id')
  const groupId = valueAfter('--group-id')
  const name = valueAfter('--name')
  const value = fs.readFileSync(valueAfter('--value-file'), 'utf8')
  state.secrets.push({
    id: [scope, workspaceId, groupId || 'workspace', name].join(':'),
    scope,
    workspaceId,
    groupId,
    name,
    value,
  })
  writeState(state)
  process.stdout.write('{}')
  process.exit(0)
}

if (args[0] === 'secrets' && args[1] === 'rotate') {
  const secret = state.secrets.find((candidate) => candidate.id === valueAfter('--id'))
  if (!secret) process.exit(2)
  secret.value = fs.readFileSync(valueAfter('--value-file'), 'utf8')
  writeState(state)
  process.stdout.write('{}')
  process.exit(0)
}

if (args[0] === 'secrets' && args[1] === 'delete') {
  state.secrets = state.secrets.filter((secret) => secret.id !== valueAfter('--id'))
  writeState(state)
  process.stdout.write('{}')
  process.exit(0)
}

if (args[0] === 'json' && args[1] === 'google-calendar/lists') {
  const workspaceId = valueAfter('--workspace-id')
  const groupId = valueAfter('--group-id')
  const secret = state.secrets.find((candidate) =>
    candidate.workspaceId === workspaceId &&
    candidate.name === 'GOOGLE_CALENDAR_OAUTH' &&
    (groupId ? candidate.groupId === groupId : candidate.scope === 'workspace'),
  )
  if (!secret) process.exit(3)
  const value = JSON.parse(secret.value)
  process.stdout.write(JSON.stringify({
    response: { status: 200, json: { id: value.emailAddress || value.refreshToken } },
  }))
  process.exit(0)
}

if (args[0] === 'json' && args[1] === 'google-calendar/events') {
  const workspaceId = valueAfter('--workspace-id')
  const groupId = valueAfter('--group-id')
  const secret = state.secrets.find((candidate) =>
    candidate.workspaceId === workspaceId &&
    candidate.name === 'GOOGLE_CALENDAR_OAUTH' &&
    candidate.groupId === groupId,
  )
  if (!secret) process.exit(3)
  const value = JSON.parse(secret.value)
  const event = {
    id: 'event-' + value.emailAddress,
    summary: 'Planning for ' + value.emailAddress,
    start: { dateTime: '2026-08-28T14:00:00.000Z' },
    end: { dateTime: '2026-08-28T15:00:00.000Z' },
    attendees: [{ email: value.emailAddress, self: true, responseStatus: 'needsAction' }],
  }
  if (valueAfter('--method') === 'PATCH') {
    state.lastPatchGroupId = groupId
    writeState(state)
    process.stdout.write(JSON.stringify({ response: { status: 200, json: event } }))
    process.exit(0)
  }
  const path = valueAfter('--path') || ''
  const json = path.includes('/events/' + encodeURIComponent(event.id))
    ? event
    : { items: [event] }
  process.stdout.write(JSON.stringify({ response: { status: 200, json } }))
  process.exit(0)
}

process.stderr.write('Unsupported fake aivault command')
process.exit(4)
`

before(async () => {
  tempHome = await mkdtemp(join(tmpdir(), 'calendar-accounts-test-'))
  fakeBin = join(tempHome, 'bin')
  fakeVaultState = join(tempHome, 'fake-vault.json')
  await mkdir(fakeBin, { recursive: true })
  const executable = join(fakeBin, 'aivault')
  await writeFile(executable, fakeAivault)
  await chmod(executable, 0o755)
  await writeFile(fakeVaultState, JSON.stringify({ secrets: [] }))
  process.env.MOLDABLE_HOME = tempHome
  process.env.MOLDABLE_APP_ID = 'calendar'
  process.env.MOLDABLE_WORKSPACE_ID = 'personal'
  process.env.AIVAULT_DIR = fakeVaultState
  process.env.PATH = `${fakeBin}:${originalEnv.PATH ?? ''}`
  delete process.env.MOLDABLE_APP_DATA_DIR
})

after(async () => {
  process.env = { ...originalEnv }
  await rm(tempHome, { recursive: true, force: true })
})

describe('Calendar account registry', () => {
  it('migrates the pre-vault token before reading account status', async () => {
    const legacyDataDir = join(
      tempHome,
      'workspaces',
      'legacy',
      'apps',
      'calendar',
      'data',
    )
    await mkdir(legacyDataDir, { recursive: true })
    await writeFile(
      join(legacyDataDir, 'tokens.json'),
      JSON.stringify({ refresh_token: 'legacy@example.com' }),
    )

    const [state, concurrentState] = await Promise.all([
      getCalendarAccountsState('legacy'),
      getCalendarAccountsState('legacy'),
    ])
    assert.equal(state.accounts[0]?.emailAddress, 'legacy@example.com')
    assert.equal(state.activeAccountId, state.accounts[0]?.accountId)
    assert.equal(concurrentState.accounts.length, 1)
    assert.equal(
      await readFile(join(legacyDataDir, 'tokens.json'), 'utf8'),
      'null',
    )
  })

  it('keeps identities separate and reconnects a duplicate in place', async () => {
    const first = await registerCalendarAccount({
      workspaceId: 'personal',
      candidateAccountId: 'account-a',
      vaultPayload: JSON.stringify({ emailAddress: 'ada@example.com' }),
    })
    const second = await registerCalendarAccount({
      workspaceId: 'personal',
      candidateAccountId: 'account-b',
      vaultPayload: JSON.stringify({ emailAddress: 'grace@example.com' }),
    })
    const reconnected = await registerCalendarAccount({
      workspaceId: 'personal',
      candidateAccountId: 'account-a-new',
      vaultPayload: JSON.stringify({ emailAddress: 'ada@example.com' }),
    })

    assert.equal(reconnected.accountId, first.accountId)
    assert.deepEqual(
      (await getCalendarAccountsState('personal')).accounts.map(
        (account) => account.emailAddress,
      ),
      ['ada@example.com', 'grace@example.com'],
    )

    const eventsResponse = await app.request('/api/events?scope=all', {
      headers: { 'x-moldable-workspace-id': 'personal' },
    })
    assert.equal(eventsResponse.status, 200)
    const eventsBody = (await eventsResponse.json()) as {
      events: Array<{
        accountId: string
        accountEmailAddress: string
        id: string
      }>
    }
    assert.deepEqual(
      eventsBody.events.map((event) => event.accountEmailAddress).sort(),
      ['ada@example.com', 'grace@example.com'],
    )

    const graceEvent = eventsBody.events.find(
      (event) => event.accountEmailAddress === 'grace@example.com',
    )
    assert.ok(graceEvent)
    const rsvpResponse = await app.request('/api/rsvp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-moldable-workspace-id': 'personal',
      },
      body: JSON.stringify({
        accountId: graceEvent.accountId,
        eventId: graceEvent.id,
        responseStatus: 'accepted',
      }),
    })
    assert.equal(rsvpResponse.status, 200)

    const routedVault = JSON.parse(await readFile(fakeVaultState, 'utf8')) as {
      lastPatchGroupId?: string
    }
    assert.equal(routedVault.lastPatchGroupId, 'calendar-account-account-b')

    await setActiveCalendarAccount('personal', second.accountId)
    assert.equal(
      (await getCalendarAccountsState('personal')).activeAccountId,
      second.accountId,
    )

    await removeCalendarAccount('personal', second.accountId)
    const remaining = await getCalendarAccountsState('personal')
    assert.equal(remaining.activeAccountId, first.accountId)
    assert.deepEqual(
      remaining.accounts.map((account) => account.emailAddress),
      ['ada@example.com'],
    )

    const vault = JSON.parse(await readFile(fakeVaultState, 'utf8')) as {
      secrets: Array<{ groupId?: string; workspaceId: string }>
    }
    assert.deepEqual(
      vault.secrets
        .filter((secret) => secret.workspaceId === 'personal')
        .map((secret) => secret.groupId),
      ['calendar-account-account-a'],
    )
  })
})
