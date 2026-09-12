import { getMailAccountContext } from './mail-account-context'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

type AivaultBody = string | Record<string, unknown> | unknown[]

type AivaultRequest = {
  method?: string
  path?: string
  headers?: Record<string, string>
  body?: AivaultBody
}

export type AivaultSecretMeta = {
  name: string
  secretId?: string
  secret_id?: string
  revokedAtMs?: number | null
  revoked_at_ms?: number | null
}

const AIVAULT_ENV_KEYS = [
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

const MAX_AIVAULT_CONCURRENCY = 4
let activeAivaultCommands = 0
const pendingAivaultCommands: Array<() => void> = []

async function withAivaultSlot<T>(task: () => Promise<T>): Promise<T> {
  if (activeAivaultCommands >= MAX_AIVAULT_CONCURRENCY) {
    await new Promise<void>((resolve) => pendingAivaultCommands.push(resolve))
  }

  activeAivaultCommands += 1
  try {
    return await task()
  } finally {
    activeAivaultCommands -= 1
    pendingAivaultCommands.shift()?.()
  }
}

function aivaultContextArgs(
  workspaceId?: string,
  explicitGroupId?: string | null,
): string[] {
  const id = workspaceId?.trim()
  if (!id) return []

  const groupId = explicitGroupId?.trim()

  return groupId
    ? ['--workspace-id', id, '--group-id', groupId]
    : ['--workspace-id', id]
}

export function googleGmailCredentialId(
  workspaceId: string,
  groupId?: string | null,
) {
  const normalizedWorkspaceId = workspaceId.trim()
  if (!normalizedWorkspaceId) {
    throw new Error('A workspace ID is required for Gmail credentials')
  }

  const normalizedGroupId = groupId?.trim()
  return normalizedGroupId
    ? `google-gmail:group:${normalizedWorkspaceId}:${normalizedGroupId}`
    : `google-gmail:ws:${normalizedWorkspaceId}`
}

export function aivaultInvocationScopeArgs({
  workspaceId,
  capability,
  groupId,
  credentialId,
}: {
  workspaceId: string
  capability: string
  groupId?: string | null
  credentialId?: string | null
}) {
  const args = aivaultContextArgs(workspaceId, groupId)
  const exactCredentialId =
    credentialId === undefined && capability.startsWith('google-gmail/')
      ? googleGmailCredentialId(workspaceId, groupId)
      : credentialId?.trim()

  if (exactCredentialId) args.push('--credential', exactCredentialId)
  return args
}

function getAivaultEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const key of AIVAULT_ENV_KEYS) {
    const value = process.env[key]
    if (value) env[key] = value
  }
  return env
}

function runAivault(args: string[]): Promise<Buffer> {
  return withAivaultSlot(
    () =>
      new Promise((resolve, reject) => {
        const child = spawn('aivault', args, {
          env: getAivaultEnv(),
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        const stdout: Buffer[] = []
        const stderr: Buffer[] = []

        child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
        child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
        child.on('error', reject)
        child.on('close', (code) => {
          if (code === 0) {
            resolve(Buffer.concat(stdout))
            return
          }

          const stderrText = Buffer.concat(stderr).toString('utf8').trim()
          const command = args.slice(0, 2).join(' ')
          const errorKind = stderrText.match(
            /\b[A-Z][A-Za-z0-9]*(?:Ambiguous|Denied|Error|Expired|Invalid|NotFound|Unavailable|Unauthorized)\b/,
          )?.[0]
          const message = `aivault ${command} failed${errorKind ? ` (${errorKind})` : ''}`
          const error = new Error(message) as Error & {
            status?: number
            response?: { command: string; exitCode?: number }
          }
          error.status = code ?? undefined
          error.response = { command, exitCode: code ?? undefined }
          reject(error)
        })
      }),
  )
}

export async function listWorkspaceSecrets(
  workspaceId: string,
): Promise<AivaultSecretMeta[]> {
  const output = await runAivault([
    'secrets',
    'list',
    '--verbose',
    '--scope',
    'workspace',
    '--workspace-id',
    workspaceId,
  ])
  return JSON.parse(output.toString('utf8')) as AivaultSecretMeta[]
}

export async function listGroupSecrets(
  workspaceId: string,
  groupId: string,
): Promise<AivaultSecretMeta[]> {
  const output = await runAivault([
    'secrets',
    'list',
    '--verbose',
    '--scope',
    'group',
    '--workspace-id',
    workspaceId,
    '--group-id',
    groupId,
  ])
  return JSON.parse(output.toString('utf8')) as AivaultSecretMeta[]
}

export function secretId(meta: AivaultSecretMeta): string | null {
  return meta.secretId ?? meta.secret_id ?? null
}

function isActive(meta: AivaultSecretMeta) {
  return !(meta.revokedAtMs ?? meta.revoked_at_ms)
}

export async function findWorkspaceSecret(
  workspaceId: string,
  name: string,
): Promise<AivaultSecretMeta | null> {
  const secrets = await listWorkspaceSecrets(workspaceId)
  return (
    secrets.find((secret) => secret.name === name && isActive(secret)) ?? null
  )
}

export async function findGroupSecret(
  workspaceId: string,
  groupId: string,
  name: string,
): Promise<AivaultSecretMeta | null> {
  const secrets = await listGroupSecrets(workspaceId, groupId)
  return (
    secrets.find((secret) => secret.name === name && isActive(secret)) ?? null
  )
}

export async function upsertWorkspaceSecret(
  workspaceId: string,
  name: string,
  value: string,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'moldable-gmail-token-'))
  const valueFile = join(dir, 'secret.json')

  try {
    await writeFile(valueFile, value, { mode: 0o600 })
    const existing = await findWorkspaceSecret(workspaceId, name)
    const existingId = existing ? secretId(existing) : null

    if (existingId) {
      await runAivault([
        'secrets',
        'rotate',
        '--id',
        existingId,
        '--value-file',
        valueFile,
      ])
      return
    }

    await runAivault([
      'secrets',
      'create',
      '--name',
      name,
      '--value-file',
      valueFile,
      '--scope',
      'workspace',
      ...aivaultContextArgs(workspaceId),
    ])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function upsertGroupSecret(
  workspaceId: string,
  groupId: string,
  name: string,
  value: string,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'moldable-gmail-token-'))
  const valueFile = join(dir, 'secret.json')

  try {
    await writeFile(valueFile, value, { mode: 0o600 })
    const existing = await findGroupSecret(workspaceId, groupId, name)
    const existingId = existing ? secretId(existing) : null

    if (existingId) {
      await runAivault([
        'secrets',
        'rotate',
        '--id',
        existingId,
        '--value-file',
        valueFile,
      ])
      return
    }

    await runAivault([
      'secrets',
      'create',
      '--name',
      name,
      '--value-file',
      valueFile,
      '--scope',
      'group',
      '--workspace-id',
      workspaceId,
      '--group-id',
      groupId,
    ])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function deleteWorkspaceSecret(
  workspaceId: string,
  name: string,
): Promise<void> {
  const existing = await findWorkspaceSecret(workspaceId, name)
  const existingId = existing ? secretId(existing) : null
  if (!existingId) return
  await runAivault(['secrets', 'delete', '--id', existingId])
}

export async function deleteGroupSecret(
  workspaceId: string,
  groupId: string,
  name: string,
): Promise<void> {
  const existing = await findGroupSecret(workspaceId, groupId, name)
  const existingId = existing ? secretId(existing) : null
  if (!existingId) return
  await runAivault(['secrets', 'delete', '--id', existingId])
}

export async function invokeAivaultJson<T>(
  workspaceId: string,
  capability: string,
  request: AivaultRequest,
  options: { groupId?: string | null; credentialId?: string | null } = {},
): Promise<T> {
  const accountContext = getMailAccountContext(workspaceId)
  const groupId =
    options.groupId === undefined
      ? accountContext?.vaultGroupId
      : options.groupId
  const args = [
    'json',
    capability,
    ...aivaultInvocationScopeArgs({
      workspaceId,
      capability,
      groupId,
      credentialId: options.credentialId,
    }),
  ]
  if (request.method) args.push('--method', request.method)
  if (request.path) args.push('--path', request.path)
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    args.push('--header', `${name}=${value}`)
  }
  if (request.body !== undefined) {
    args.push(
      '--body',
      typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body),
    )
  }

  const output = await runAivault(args)
  const rawOutput = output.toString('utf8')
  let parsed: { response?: { json?: unknown; status?: number } }
  try {
    parsed = JSON.parse(rawOutput) as {
      response?: { json?: unknown; status?: number }
    }
  } catch (parseError) {
    const error = new Error(
      `aivault ${capability} returned non-JSON output`,
    ) as Error & {
      cause?: unknown
      response?: { capability: string; format: 'invalid-json' }
    }
    error.cause = parseError
    error.response = { capability, format: 'invalid-json' }
    throw error
  }

  if (parsed.response?.status && parsed.response.status >= 400) {
    const body = parsed.response.json as
      | {
          error?: { message?: string; code?: number | string }
          message?: string
        }
      | undefined
    const message =
      body?.error?.message ??
      body?.message ??
      `${capability} returned HTTP ${parsed.response.status}`
    const error = new Error(message) as Error & {
      status?: number
      response?: { status?: number }
      code?: number | string
    }
    error.status = parsed.response.status
    error.response = { status: parsed.response.status }
    error.code = body?.error?.code
    throw error
  }

  return (parsed.response?.json ?? parsed) as T
}

export async function invokeAivaultRaw(
  workspaceId: string,
  capability: string,
  request: AivaultRequest,
): Promise<Buffer> {
  const accountContext = getMailAccountContext(workspaceId)
  const groupId = accountContext?.vaultGroupId
  const args = [
    'invoke',
    capability,
    ...aivaultInvocationScopeArgs({ workspaceId, capability, groupId }),
  ]
  if (request.method) args.push('--method', request.method)
  if (request.path) args.push('--path', request.path)
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    args.push('--header', `${name}=${value}`)
  }
  if (request.body !== undefined) {
    args.push(
      '--body',
      typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body),
    )
  }

  return runAivault(args)
}
