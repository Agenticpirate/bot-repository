import { getMoldableHome } from '@moldable-ai/storage'
import { type MailMessageDetail, getAttachment } from './gmail-service'
import { getMailAccountContext } from './mail-account-context'
import { createHash, randomUUID } from 'node:crypto'
import {
  mkdir,
  opendir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { z } from 'zod'

const MAX_BYTES = 20 * 1024 * 1024
export const attachmentMaterializeSchema = z
  .object({
    id: z.string().min(1).max(2048),
    mode: z.literal('materialize'),
  })
  .strict()

export function messageAttachmentReference(
  workspaceId: string,
  messageId: string,
  attachmentId: string,
) {
  const context = getMailAccountContext(workspaceId)
  if (!context)
    throw new Error('Attachment requires an authorized Mail account')
  return {
    workspaceId,
    source: {
      kind: 'app' as const,
      appId: 'mail',
      accountId: context.accountId,
      resourceType: 'mail.message',
      resourceId: messageId,
      attachmentId,
    },
  }
}

const pending = new Map<string, Promise<void>>()
async function serialize<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = pending.get(key) ?? Promise.resolve()
  let done!: () => void
  const current = new Promise<void>((resolve) => {
    done = resolve
  })
  pending.set(key, current)
  await previous
  try {
    return await operation()
  } finally {
    done()
    if (pending.get(key) === current) pending.delete(key)
  }
}

async function usage(root: string): Promise<{ bytes: number; files: number }> {
  let bytes = 0
  let files = 0
  let entries = 0
  async function visit(path: string, depth: number) {
    for await (const entry of await opendir(path)) {
      if (++entries > 12_288)
        throw new Error('Attachment staging entry quota exceeded')
      const child = join(path, entry.name)
      if (entry.isSymbolicLink())
        throw new Error('Attachment staging does not allow links')
      if (entry.isDirectory() && depth < 2) await visit(child, depth + 1)
      else if (entry.isFile()) {
        bytes += (await stat(child)).size
        files++
      } else throw new Error('Invalid attachment staging entry')
    }
  }
  await visit(root, 0)
  return { bytes, files }
}

/** Retrieval glue only: parsing and visual inspection belong to shared readers.
 * Storage identity is attachmentSourceIdentity's explicit authority tuple. */
export async function materializeMessageAttachment(
  workspaceId: string,
  message: MailMessageDetail,
  input: z.infer<typeof attachmentMaterializeSchema>,
) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(workspaceId))
    throw new Error('Invalid attachment workspace')
  const attachment = message.attachments.find((entry) => entry.id === input.id)
  if (!attachment?.attachmentId)
    throw new Error(
      'Attachment does not belong to this message or is not downloadable',
    )
  if (attachment.size > MAX_BYTES)
    throw new Error('Attachment exceeds the 20 MiB materialization limit')
  const reference = messageAttachmentReference(
    workspaceId,
    message.id,
    attachment.id,
  )
  const download = await getAttachment(
    workspaceId,
    message.id,
    attachment.attachmentId,
    attachment.mimeType,
  )
  if (download.data.byteLength > MAX_BYTES)
    throw new Error('Attachment exceeds the 20 MiB materialization limit')
  const sha256 = createHash('sha256').update(download.data).digest('hex')
  const filename =
    Array.from(attachment.filename.slice(0, 240), (character) => {
      const code = character.codePointAt(0) ?? 0
      return code < 32 ||
        (code >= 127 && code <= 159) ||
        (code >= 0x202a && code <= 0x202e) ||
        (code >= 0x2066 && code <= 0x2069) ||
        '/\\:'.includes(character)
        ? '_'
        : character
    }).join('') || 'attachment'
  const safeFilename =
    filename === '.' || filename === '..' ? 'attachment' : filename
  const mimeType = /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(attachment.mimeType)
    ? attachment.mimeType
    : 'application/octet-stream'
  const asset = {
    address: `asset:sha256:${sha256}`,
    filename: safeFilename,
    mimeType,
    byteLength: download.data.byteLength,
    sha256,
  }
  const identity = createHash('sha256')
    .update(
      JSON.stringify([
        workspaceId,
        'app',
        'mail',
        reference.source.accountId,
        'mail.message',
        message.id,
        attachment.id,
      ]),
    )
    .digest('hex')
  const root = join(
    getMoldableHome(),
    'workspaces',
    workspaceId,
    'attachment-assets',
    'mail',
  )
  await serialize(root, async () => {
    await mkdir(root, { recursive: true, mode: 0o700 })
    if ((await realpath(root)) !== resolve(root))
      throw new Error('Attachment staging does not allow links')
    const directory = join(root, identity, sha256)
    const path = join(directory, safeFilename)
    const used = await usage(root)
    const existing = await stat(path).catch(() => null)
    if (
      !existing &&
      (used.files >= 4096 ||
        used.bytes + download.data.byteLength > 512 * 1024 * 1024)
    )
      throw new Error(
        'Mail attachment staging quota exceeded (512 MiB / 4096 files)',
      )
    await mkdir(directory, { recursive: true, mode: 0o700 })
    if ((await realpath(directory)) !== resolve(directory))
      throw new Error('Attachment staging does not allow links')
    const temporary = join(directory, `.stage-${randomUUID()}`)
    try {
      await writeFile(temporary, download.data, { flag: 'wx', mode: 0o400 })
      await rename(temporary, path)
    } finally {
      await rm(temporary, { force: true })
    }
  })
  return { reference: { ...reference, asset } }
}
