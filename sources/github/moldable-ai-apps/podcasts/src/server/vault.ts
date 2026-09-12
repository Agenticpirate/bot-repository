import { PodcastError } from './errors'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const ENV_KEYS = [
  'AIVAULT_DIR',
  'AIVAULTD_SOCKET',
  'AIVAULTD_SHARED_SOCKET',
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'LOGNAME',
  'PATH',
  'TMP',
  'TMPDIR',
  'USER',
] as const

/** Broker subprocesses receive environment needed for the vault, never app secrets. */
export function runVault(
  args: string[],
  signal: AbortSignal,
  options: {
    maxOutputBytes: number
    timeoutMs: number
    purpose: 'speech' | 'artwork'
  },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const env: NodeJS.ProcessEnv = {}
    for (const key of ENV_KEYS)
      if (process.env[key]) env[key] = process.env[key]
    const candidates = env.HOME
      ? [
          path.join(env.HOME, '.cargo/bin/aivault'),
          path.join(env.HOME, '.local/bin/aivault'),
        ]
      : []
    const binary =
      process.env.AIVAULT_BIN ??
      candidates.find((candidate) => existsSync(candidate)) ??
      'aivault'
    const child = spawn(binary, args, {
      env,
      signal,
      killSignal: 'SIGKILL',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const chunks: Buffer[] = []
    let size = 0
    let failure: Error | undefined
    const timeout = setTimeout(() => {
      failure = new PodcastError(
        `${options.purpose}_timeout`,
        `OpenAI took too long to finish ${options.purpose}. Retrying may charge the interrupted request again.`,
        502,
      )
      child.kill('SIGKILL')
    }, options.timeoutMs)
    child.stdout.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > options.maxOutputBytes) {
        failure = new PodcastError(
          'response_too_large',
          'OpenAI returned an unexpectedly large response.',
          502,
        )
        child.kill('SIGKILL')
      } else chunks.push(chunk)
    })
    child.stderr.resume()
    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(
        error.name === 'AbortError'
          ? error
          : new PodcastError(
              'vault_unavailable',
              'Could not reach aivault. Check the OpenAI connection in Moldable Settings → Vault.',
              503,
            ),
      )
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      if (signal.aborted)
        reject(new DOMException('Generation cancelled', 'AbortError'))
      else if (failure) reject(failure)
      else if (code !== 0)
        reject(
          new PodcastError(
            'vault_request_failed',
            `OpenAI ${options.purpose} could not be requested. Check the OpenAI connection in Moldable Settings → Vault.`,
            503,
          ),
        )
      else resolve(Buffer.concat(chunks))
    })
  })
}
