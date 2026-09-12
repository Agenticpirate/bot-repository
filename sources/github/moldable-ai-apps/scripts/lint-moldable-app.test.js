import {
  isAppOwnedApiIdentifier,
  validateAppApiNamespace,
} from './lint-moldable-app.js'
import assert from 'node:assert/strict'
import test from 'node:test'

test('accepts only the owning app API namespace', () => {
  assert.equal(isAppOwnedApiIdentifier('piano', 'piano'), true)
  assert.equal(isAppOwnedApiIdentifier('piano.songs.list', 'piano'), true)
  assert.equal(isAppOwnedApiIdentifier('songs.list', 'piano'), false)
  assert.equal(isAppOwnedApiIdentifier('pianoforte.play', 'piano'), false)
  assert.equal(isAppOwnedApiIdentifier('piano.', 'piano'), false)
})

test('reports leaked capability and scope identifiers', () => {
  assert.deepEqual(
    validateAppApiNamespace(
      {
        appApi: {
          capabilities: [
            {
              id: 'piano.library',
              scopes: [{ id: 'piano.songs.list' }, { id: 'songs.delete' }],
            },
            { id: 'songs.admin', scopes: [] },
          ],
        },
      },
      'piano',
    ),
    ['scope "songs.delete"', 'capability "songs.admin"'],
  )
})
