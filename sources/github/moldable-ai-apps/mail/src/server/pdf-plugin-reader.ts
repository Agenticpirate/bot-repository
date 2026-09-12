import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const home = () => process.env.MOLDABLE_HOME || join(homedir(), '.moldable')
function enabled(): boolean {
  try {
    const config = JSON.parse(
      readFileSync(join(home(), 'shared/config/plugins.json'), 'utf8'),
    ) as { plugins?: Record<string, { enabled?: boolean }> }
    return config.plugins?.['pdf-reader']?.enabled === true
  } catch {
    return false
  }
}
let active = 0
/** Thin byte transport to the host-installed PDF Reader. Mail keeps ownership
 * of message/account authorization and validates the returned page contract. */
export function readPdfWithPlugin(
  bytes: Uint8Array,
  options: { startPage: number; pageCount: number; textOffset: number },
): Promise<unknown> | null {
  if (!enabled()) return null
  if (bytes.length > 20 * 1024 * 1024)
    throw new Error('Attachment exceeds the 20 MiB reading limit.')
  if (active >= 2)
    throw new Error(
      'Two PDFs are already being read. Retry after those reads finish.',
    )
  const root = join(home(), 'shared/plugins/pdf-reader')
  const current = JSON.parse(
    readFileSync(join(root, 'current.json'), 'utf8'),
  ) as { version?: string }
  if (!current.version || !/^\d+\.\d+\.\d+-\d+$/.test(current.version))
    throw new Error('PDF Reader needs reinstalling in Settings > Plugins.')
  active++
  return new Promise<unknown>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--max-old-space-size=256',
        join(root, 'versions', current.version!, 'bin/read-pdf.mjs'),
        String(options.startPage),
        String(options.pageCount),
        String(options.textOffset),
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { PATH: process.env.PATH, HOME: home() },
      },
    )
    const output: Buffer[] = []
    let size = 0
    let errorText = ''
    let failure: Error | undefined
    const stop = (message: string) => {
      failure ??= new Error(message)
      child.kill('SIGKILL')
    }
    const timeout = setTimeout(
      () => stop('PDF reading timed out. Try a smaller page range.'),
      120_000,
    )
    child.stdout.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 1_000_000) stop('PDF output exceeded its limit.')
      else output.push(chunk)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      errorText = (errorText + chunk.toString()).slice(0, 2_000)
    })
    child.stdin.on('error', () => {
      /* Early exit is reported by close. */
    })
    child.once('error', (error) => {
      failure = error
    })
    child.once('close', (code) => {
      clearTimeout(timeout)
      if (failure || code !== 0) {
        reject(
          failure ??
            new Error(
              `Could not read this PDF: ${errorText || 'PDF engine stopped'}`,
            ),
        )
        return
      }
      if (!enabled()) {
        reject(new Error('PDF Reader was disabled during this read.'))
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(output).toString()))
      } catch {
        reject(new Error('PDF Reader returned an invalid result.'))
      }
    })
    child.stdin.end(bytes)
  }).finally(() => {
    active--
  })
}
