import { app } from './app'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

test('card evaluations do not write calculation history', async () => {
  const originalEnv = { ...process.env }
  const temporaryHome = await mkdtemp(join(tmpdir(), 'calculator-card-'))
  process.env.MOLDABLE_HOME = temporaryHome
  process.env.MOLDABLE_APP_ID = 'calculator'
  const rpc = async (method: string, params: Record<string, unknown>) =>
    (
      await app.request('/api/moldable/rpc', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-moldable-workspace': 'cards-test',
        },
        body: JSON.stringify({ method, params }),
      })
    ).json()
  try {
    const card = (
      await rpc('calculator.cards.present', { expression: '2 * (3 + 4)' })
    ).result.appCard
    assert.equal(
      (await rpc(card.readMethod, card.input)).result.formatted,
      '14',
    )
    assert.equal(
      (await rpc(card.readMethod, card.input)).result.formatted,
      '14',
    )
    assert.deepEqual((await rpc('calculator.history.recent', {})).result, [])
  } finally {
    process.env = originalEnv
    await rm(temporaryHome, { recursive: true, force: true })
  }
})
