import { readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const MAX_WORKSPACES_FILE_BYTES = 1024 * 1024

export async function registeredMailWorkspaceIds(
  moldableHome = process.env.MOLDABLE_HOME ?? join(homedir(), '.moldable'),
): Promise<string[]> {
  try {
    const path = join(moldableHome, 'workspaces.json')
    const metadata = await stat(path)
    if (!metadata.isFile() || metadata.size > MAX_WORKSPACES_FILE_BYTES) {
      return []
    }
    const parsed: unknown = JSON.parse(await readFile(path, 'utf8'))
    if (!isRecord(parsed) || !Array.isArray(parsed.workspaces)) return []
    return [
      ...new Set(
        parsed.workspaces.flatMap((workspace) =>
          isRecord(workspace) && isWorkspaceId(workspace.id)
            ? [workspace.id]
            : [],
        ),
      ),
    ].sort()
  } catch {
    return []
  }
}

export async function isRegisteredMailWorkspace(
  workspaceId: string,
  moldableHome?: string,
) {
  if (!isWorkspaceId(workspaceId)) return false
  return (await registeredMailWorkspaceIds(moldableHome)).includes(workspaceId)
}

function isWorkspaceId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
