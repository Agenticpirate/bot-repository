import {
  isRegisteredMailWorkspace,
  registeredMailWorkspaceIds,
} from './workspace-registry'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Mail workspace registry', () => {
  it('ignores retained directories after workspace deletion', async () => {
    const root = mkdtempSync(join(tmpdir(), 'mail-workspaces-'))
    mkdirSync(join(root, 'workspaces', 'deleted'), { recursive: true })
    writeFileSync(
      join(root, 'workspaces.json'),
      JSON.stringify({
        activeWorkspace: 'personal',
        workspaces: [{ id: 'personal' }],
      }),
    )
    await expect(registeredMailWorkspaceIds(root)).resolves.toEqual([
      'personal',
    ])
    await expect(isRegisteredMailWorkspace('deleted', root)).resolves.toBe(
      false,
    )
  })

  it('fails closed when the host registry is unavailable', async () => {
    const root = mkdtempSync(join(tmpdir(), 'mail-workspaces-'))
    await expect(registeredMailWorkspaceIds(root)).resolves.toEqual([])
  })
})
