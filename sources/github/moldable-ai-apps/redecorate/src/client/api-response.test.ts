import { parseJsonArray } from './api-response'
import { describe, expect, it } from 'vitest'

describe('parseJsonArray', () => {
  it('rejects an object response rather than allowing a render-time iteration crash', async () => {
    await expect(
      parseJsonArray(
        new Response(JSON.stringify({})),
        'Failed to load folders',
      ),
    ).rejects.toThrow(
      'Failed to load folders: the server returned an invalid list.',
    )
  })

  it('returns valid list responses unchanged', async () => {
    await expect(
      parseJsonArray<string>(
        new Response(JSON.stringify(['folder-1'])),
        'Failed to load folders',
      ),
    ).resolves.toEqual(['folder-1'])
  })
})
