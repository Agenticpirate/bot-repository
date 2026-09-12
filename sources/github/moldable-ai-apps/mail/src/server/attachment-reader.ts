import {
  type MailAttachment,
  type MailMessageDetail,
  getAttachment,
} from './gmail-service'
import { readPdfWithPlugin } from './pdf-plugin-reader'
import { Worker } from 'node:worker_threads'
import { z } from 'zod'

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
const MAX_TEXT_CHARACTERS = 32_000
const PDF_TIMEOUT_MS = 15_000
let activePdfReaders = 0

export const attachmentReadSchema = z
  .object({
    id: z.string().min(1).max(2048),
    startPage: z.number().int().min(1).max(10_000).default(1),
    pageCount: z.number().int().min(1).max(5).default(3),
    textOffset: z.number().int().min(0).max(10_000_000).default(0),
  })
  .strict()

const pageSchema = z
  .object({
    page: z.number().int().positive(),
    text: z.string().max(MAX_TEXT_CHARACTERS),
    textOffset: z.number().int().nonnegative(),
    needsOcr: z.boolean(),
    source: z.enum(['native', 'ocr']).optional(),
    confidence: z.number().min(0).max(1).optional(),
    links: z.array(z.string().max(2048)).max(50),
  })
  .strict()

const extractionSchema = z
  .object({
    totalPages: z.number().int().positive(),
    pages: z.array(pageSchema).max(5),
    next: z
      .object({
        startPage: z.number().int().positive(),
        textOffset: z.number().int().nonnegative(),
      })
      .strict()
      .nullable(),
  })
  .strict()

function supportedType(attachment: MailAttachment): 'pdf' | 'text' | null {
  if (
    attachment.mimeType === 'application/pdf' ||
    /\.pdf$/i.test(attachment.filename)
  )
    return 'pdf'
  if (['text/plain', 'text/csv', 'text/markdown'].includes(attachment.mimeType))
    return 'text'
  return null
}

export function readableAttachmentMetadata(attachment: MailAttachment) {
  return {
    id: attachment.id,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    canReadText: Boolean(
      attachment.attachmentId &&
        supportedType(attachment) &&
        attachment.size <= MAX_ATTACHMENT_BYTES,
    ),
  }
}

/** One bounded worker per request keeps hostile or malformed PDFs off the Mail
 * server's event loop. It receives bytes only, never account credentials. */
export function extractPdfAttachment(
  bytes: Uint8Array,
  options: Pick<
    z.infer<typeof attachmentReadSchema>,
    'startPage' | 'pageCount' | 'textOffset'
  >,
) {
  if (bytes.byteLength > MAX_ATTACHMENT_BYTES)
    throw new Error('Attachment exceeds the 20 MiB reading limit.')
  const pluginResult = readPdfWithPlugin(bytes, options)
  if (pluginResult)
    return pluginResult.then((result) => extractionSchema.parse(result))
  if (activePdfReaders >= 2)
    throw new Error(
      'Two PDFs are already being read. Retry after those reads finish.',
    )
  activePdfReaders++
  return new Promise<z.infer<typeof extractionSchema>>((resolve, reject) => {
    let settled = false
    const worker = new Worker(
      new URL('./pdf-text-worker.mjs', import.meta.url),
      {
        workerData: { bytes, ...options, maxCharacters: MAX_TEXT_CHARACTERS },
        resourceLimits: { maxOldGenerationSizeMb: 256 },
        // App dev mode runs under tsx; this worker is plain ESM and needs no loader.
        execArgv: [],
      },
    )
    const timer = setTimeout(() => {
      settled = true
      void worker.terminate()
      reject(
        new Error('PDF text extraction timed out. Try a smaller page range.'),
      )
    }, PDF_TIMEOUT_MS)
    worker.once('message', (message: unknown) => {
      settled = true
      clearTimeout(timer)
      void worker.terminate()
      const result = extractionSchema.safeParse(message)
      if (result.success) resolve(result.data)
      else reject(new Error('PDF text extraction returned an invalid result.'))
    })
    worker.once('error', (error) => {
      settled = true
      clearTimeout(timer)
      reject(
        new Error(
          `Could not read this PDF: ${error instanceof Error ? error.message : 'extraction failed'}`,
        ),
      )
    })
    worker.once('exit', (code) => {
      clearTimeout(timer)
      if (!settled)
        reject(
          new Error(
            `PDF text extraction stopped before completing (exit ${code}).`,
          ),
        )
    })
  }).finally(() => {
    activePdfReaders--
  })
}

export async function readMessageAttachment(
  workspaceId: string,
  message: MailMessageDetail,
  input: z.infer<typeof attachmentReadSchema>,
) {
  // Resolve through this message's authoritative parts. A caller cannot supply
  // a provider attachment ID belonging to a different message or account.
  const attachment = message.attachments.find(
    (candidate) => candidate.id === input.id,
  )
  if (!attachment?.attachmentId)
    throw new Error(
      'Attachment does not belong to this message or is not downloadable.',
    )
  const type = supportedType(attachment)
  if (!type)
    throw new Error(
      'Text reading supports PDF, plain-text, CSV, and Markdown attachments.',
    )
  if (attachment.size > MAX_ATTACHMENT_BYTES)
    throw new Error('Attachment exceeds the 20 MiB reading limit.')
  const download = await getAttachment(
    workspaceId,
    message.id,
    attachment.attachmentId,
    attachment.mimeType,
  )
  if (download.data.byteLength > MAX_ATTACHMENT_BYTES)
    throw new Error('Attachment exceeds the 20 MiB reading limit.')
  let content: z.infer<typeof extractionSchema>
  if (type === 'pdf') {
    content = await extractPdfAttachment(download.data, input)
  } else {
    if (input.startPage !== 1)
      throw new Error('Text attachments have one logical page.')
    const text = new TextDecoder('utf-8', { fatal: true }).decode(download.data)
    if (input.textOffset > text.length)
      throw new Error('Text offset is beyond the attachment.')
    const end = Math.min(text.length, input.textOffset + MAX_TEXT_CHARACTERS)
    content = {
      totalPages: 1,
      pages: [
        {
          page: 1,
          text: text.slice(input.textOffset, end),
          textOffset: input.textOffset,
          needsOcr: false,
          links: [],
        },
      ],
      next: end < text.length ? { startPage: 1, textOffset: end } : null,
    }
  }
  return {
    ...readableAttachmentMetadata(attachment),
    ...content,
    source: { messageId: message.id, attachmentId: attachment.id },
    contentTrust: 'untrusted-source-data' as const,
    ...(content.pages.some((page) => page.needsOcr)
      ? {
          limitation:
            'Some pages have missing or unreliable text and need OCR or visual verification; do not treat those pages as successfully read.',
        }
      : {}),
  }
}
