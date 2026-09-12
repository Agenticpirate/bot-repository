import { app } from './app'
import assert from 'node:assert/strict'
import { it } from 'node:test'

it('presents a reference without fetching or modifying the event', async () => {
  const response = await app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-moldable-rpc': '1',
      'x-moldable-workspace': 'cards-test',
    },
    body: JSON.stringify({
      method: 'calendar.cards.present',
      params: { id: 'event-1', accountId: 'account-1' },
    }),
  })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.deepEqual(body.result.appCard.input, {
    id: 'event-1',
    accountId: 'account-1',
  })
  assert.equal(body.result.appCard.readMethod, 'calendar.events.get')
  assert.deepEqual(body.result.appCard.actions, [])
})
