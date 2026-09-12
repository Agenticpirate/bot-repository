import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

interface AivaultSecretMeta {
  name: string
  secretId?: string
  secret_id?: string
  revokedAtMs?: number | null
  revoked_at_ms?: number | null
}

const SAFE_ENV_KEYS = [
  'AIVAULT_DIR',
  'AIVAULTD_SOCKET',
  'AIVAULTD_SHARED_SOCKET',
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'LOGNAME',
  'PATH',
  'SHELL',
  'TMP',
  'TMPDIR',
  'USER',
] as const

export async function hasXOAuthCredential(
  workspaceId: string,
): Promise<boolean> {
  try {
    return (await findWorkspaceSecret(workspaceId, 'X_OAUTH_JSON')) !== null
  } catch {
    return false
  }
}

export async function upsertXOAuthCredential(
  workspaceId: string,
  value: string,
): Promise<void> {
  const temporaryDir = await mkdtemp(join(tmpdir(), 'moldable-x-oauth-'))
  const valueFile = join(temporaryDir, 'secret.json')
  try {
    await writeFile(valueFile, value, { mode: 0o600 })
    const existing = await findWorkspaceSecret(workspaceId, 'X_OAUTH_JSON')
    const existingId = existing?.secretId ?? existing?.secret_id
    if (existingId) {
      await runAivault([
        'secrets',
        'rotate',
        '--id',
        existingId,
        '--value-file',
        valueFile,
      ])
    } else {
      await runAivault([
        'secrets',
        'create',
        '--name',
        'X_OAUTH_JSON',
        '--value-file',
        valueFile,
        '--scope',
        'workspace',
        '--workspace-id',
        workspaceId,
      ])
    }
  } finally {
    await rm(temporaryDir, { recursive: true, force: true })
  }
}

export async function deleteXOAuthCredential(
  workspaceId: string,
): Promise<void> {
  const existing = await findWorkspaceSecret(workspaceId, 'X_OAUTH_JSON')
  const existingId = existing?.secretId ?? existing?.secret_id
  if (existingId) await runAivault(['secrets', 'delete', '--id', existingId])
}

export async function invokeXJson<T>(
  workspaceId: string,
  path: string,
): Promise<T> {
  const output = await runAivault([
    'json',
    'x/bookmarks',
    '--workspace-id',
    workspaceId,
    '--method',
    'GET',
    '--path',
    path,
  ])
  const parsed = JSON.parse(output.toString('utf8')) as {
    response?: { status?: number; json?: unknown }
  }
  if (parsed.response?.status && parsed.response.status >= 400) {
    throw new Error(`X returned HTTP ${parsed.response.status}`)
  }
  return (parsed.response?.json ?? parsed) as T
}

async function findWorkspaceSecret(
  workspaceId: string,
  name: string,
): Promise<AivaultSecretMeta | null> {
  const output = await runAivault([
    'secrets',
    'list',
    '--verbose',
    '--scope',
    'workspace',
    '--workspace-id',
    workspaceId,
  ])
  const secrets = JSON.parse(output.toString('utf8')) as AivaultSecretMeta[]
  return (
    secrets.find(
      (secret) =>
        secret.name === name && !(secret.revokedAtMs ?? secret.revoked_at_ms),
    ) ?? null
  )
}

function runAivault(args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn('aivault', args, {
      env: safeEnvironment(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) return resolve(Buffer.concat(stdout))
      const detail = Buffer.concat(stderr).toString('utf8').trim()
      reject(
        new Error(detail || `aivault exited with code ${code ?? 'unknown'}`),
      )
    })
  })
}

function safeEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const key of SAFE_ENV_KEYS) {
    const value = process.env[key]
    if (value) env[key] = value
  }
  return env
}
