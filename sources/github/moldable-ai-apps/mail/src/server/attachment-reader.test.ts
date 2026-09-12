import {
  attachmentReadSchema,
  extractPdfAttachment,
  readMessageAttachment,
} from './attachment-reader'
import { type MailMessageDetail, getAttachment } from './gmail-service'
import { readPdfWithPlugin } from './pdf-plugin-reader'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./gmail-service', () => ({ getAttachment: vi.fn() }))
vi.mock('./pdf-plugin-reader', () => ({ readPdfWithPlugin: vi.fn() }))

/** Tiny, fully indexed PDF fixture; no user documents belong in regressions. */
export function textPdf(texts: string[]) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${texts.map((_, index) => `${4 + index * 2} 0 R`).join(' ')}] /Count ${texts.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  for (const text of texts) {
    const streamId = objects.length + 2
    const escaped = text
      .replaceAll('\\', '\\\\')
      .replaceAll('(', '\\(')
      .replaceAll(')', '\\)')
    const stream = `BT /F1 12 Tf 40 700 Td (${escaped}) Tj ET`
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`,
    )
    objects.push(
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    )
  }
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf)
}

const selection = attachmentReadSchema.parse({ id: 'part-1' })
const message = {
  id: 'message-1',
  attachments: [
    {
      id: 'part-1',
      filename: 'statement.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      attachmentId: 'provider-1',
      inline: false,
    },
  ],
} as MailMessageDetail

beforeEach(() => {
  vi.clearAllMocks()
  // Exercise the real fallback worker deterministically, regardless of which
  // plugins happen to be installed/enabled on the developer's machine.
  vi.mocked(readPdfWithPlugin).mockReset().mockReturnValue(null)
})

describe('attachment text reading', () => {
  it('reads actual PDF bytes and follows page cursors', async () => {
    const bytes = textPdf([
      'Balance due: 78.55',
      'Payment instructions',
      'Updated terms',
    ])
    const first = await extractPdfAttachment(bytes, {
      ...selection,
      pageCount: 1,
    })
    expect(first.totalPages).toBe(3)
    expect(first.pages[0]).toMatchObject({
      page: 1,
      text: 'Balance due: 78.55',
      needsOcr: false,
    })
    expect(first.next).toEqual({ startPage: 2, textOffset: 0 })
    const rest = await extractPdfAttachment(bytes, {
      ...selection,
      ...first.next,
    })
    expect(rest.pages.map((page) => page.text)).toEqual([
      'Payment instructions',
      'Updated terms',
    ])
    expect(rest.next).toBeNull()
  })

  it('does not pretend a blank or scanned page was read', async () => {
    const result = await extractPdfAttachment(textPdf(['']), selection)
    expect(result.pages[0]).toMatchObject({ text: '', needsOcr: true })
  })

  it('rejects corrupt PDFs, oversized input, and out-of-range pages', async () => {
    await expect(
      extractPdfAttachment(Buffer.from('not a PDF'), selection),
    ).rejects.toThrow('Could not read this PDF')
    expect(() =>
      extractPdfAttachment(new Uint8Array(20 * 1024 * 1024 + 1), selection),
    ).toThrow('20 MiB')
    await expect(
      extractPdfAttachment(textPdf(['one']), { ...selection, startPage: 2 }),
    ).rejects.toThrow('beyond this PDF')
    expect(() =>
      attachmentReadSchema.parse({ id: 'part-1', pageCount: 6 }),
    ).toThrow()
    expect(() =>
      attachmentReadSchema.parse({
        id: 'part-1',
        url: 'https://attacker.example',
      }),
    ).toThrow()
  })

  it('binds provider downloads to a part of the authorized message', async () => {
    vi.mocked(getAttachment).mockResolvedValue({
      data: textPdf(['Source text']),
      mimeType: 'application/pdf',
    })
    const result = await readMessageAttachment(
      'workspace-1',
      message,
      selection,
    )
    expect(getAttachment).toHaveBeenCalledWith(
      'workspace-1',
      'message-1',
      'provider-1',
      'application/pdf',
    )
    expect(result.source).toEqual({
      messageId: 'message-1',
      attachmentId: 'part-1',
    })
    expect(result.contentTrust).toBe('untrusted-source-data')
    await expect(
      readMessageAttachment('workspace-1', message, {
        ...selection,
        id: 'other-message-part',
      }),
    ).rejects.toThrow('does not belong')
    await expect(
      readMessageAttachment('workspace-1', message, {
        ...selection,
        id: 'provider-1',
      }),
    ).rejects.toThrow('does not belong')
    expect(getAttachment).toHaveBeenCalledTimes(1)
  })

  it('returns a continuation instead of silently clipping long text attachments', async () => {
    const text = 'A'.repeat(32_000) + 'Final amount: 125.00'
    vi.mocked(getAttachment).mockResolvedValue({
      data: Buffer.from(text),
      mimeType: 'text/plain',
    })
    const textMessage = {
      ...message,
      attachments: [
        {
          ...message.attachments[0]!,
          filename: 'statement.txt',
          mimeType: 'text/plain',
        },
      ],
    }
    const first = await readMessageAttachment(
      'workspace-1',
      textMessage,
      selection,
    )
    expect(first.pages[0]?.text).toHaveLength(32_000)
    expect(first.next).toEqual({ startPage: 1, textOffset: 32_000 })
    const second = await readMessageAttachment('workspace-1', textMessage, {
      ...selection,
      ...first.next,
    })
    expect(second.pages[0]?.text).toBe('Final amount: 125.00')
    expect(second.next).toBeNull()
  })
})

describe('PDF Reader plugin integration', () => {
  it('preserves plugin Markdown, OCR metadata, and continuation cursors', async () => {
    const bytes = textPdf(['Balance due: 78.55'])
    const options = { ...selection, pageCount: 1, textOffset: 12 }
    const pluginResult = {
      totalPages: 2,
      pages: [
        {
          page: 1,
          text: '## Balance due: 78.55\n',
          textOffset: 12,
          needsOcr: false,
          source: 'ocr',
          confidence: 0.95,
          links: ['https://example.com/payment'],
        },
      ],
      next: { startPage: 2, textOffset: 0 },
    }
    vi.mocked(readPdfWithPlugin).mockResolvedValue(pluginResult)

    await expect(extractPdfAttachment(bytes, options)).resolves.toEqual(
      pluginResult,
    )
    expect(readPdfWithPlugin).toHaveBeenCalledExactlyOnceWith(bytes, options)
  })

  it('rejects malformed plugin output instead of accepting an invalid page contract', async () => {
    vi.mocked(readPdfWithPlugin).mockResolvedValue({
      totalPages: 1,
      pages: [{ page: 1, text: 'Incomplete page' }],
      next: null,
    })

    await expect(
      extractPdfAttachment(textPdf(['one']), selection),
    ).rejects.toThrow()
  })

  it('propagates plugin failures without silently switching readers', async () => {
    const failure = new Error(
      'Could not read this PDF: Start page is beyond the PDF',
    )
    vi.mocked(readPdfWithPlugin).mockRejectedValue(failure)

    // Valid fallback bytes would succeed if the plugin failure were swallowed.
    await expect(
      extractPdfAttachment(textPdf(['one']), selection),
    ).rejects.toBe(failure)
    expect(readPdfWithPlugin).toHaveBeenCalledTimes(1)
  })

  it('rejects oversized input before invoking either reader', () => {
    expect(() =>
      extractPdfAttachment(new Uint8Array(20 * 1024 * 1024 + 1), selection),
    ).toThrow('20 MiB')
    expect(readPdfWithPlugin).not.toHaveBeenCalled()
  })
})
