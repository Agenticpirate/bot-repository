import { parentPort, workerData } from 'node:worker_threads'
import { getDocumentProxy } from 'unpdf'

// Bytes are supplied by the account-scoped Mail reader. No URLs or paths are
// accepted, and PDF scripts/actions are never executed.
const { bytes, startPage, pageCount, textOffset, maxCharacters } = workerData
const pdf = await getDocumentProxy(new Uint8Array(bytes), {
  isEvalSupported: false,
  useSystemFonts: false,
  verbosity: 0,
})
try {
  if (startPage > pdf.numPages)
    throw new Error('Requested page is beyond this PDF.')
  const pages = []
  let remaining = maxCharacters
  let next = null
  const lastPage = Math.min(pdf.numPages, startPage + pageCount - 1)
  for (let number = startPage; number <= lastPage; number++) {
    const page = await pdf.getPage(number)
    const content = await page.getTextContent()
    const text = content.items
      .filter((item) => 'str' in item)
      .map((item) => `${item.str}${item.hasEOL ? '\n' : ' '}`)
      .join('')
      .trim()
    const offset = number === startPage ? textOffset : 0
    if (offset > text.length)
      throw new Error('Text offset is beyond this page.')
    const end = Math.min(text.length, offset + remaining)
    const annotations = await page.getAnnotations({ intent: 'display' })
    const links = [
      ...new Set(
        annotations
          .map((annotation) => annotation.url)
          .filter(
            (url) =>
              typeof url === 'string' &&
              /^https?:\/\//i.test(url) &&
              url.length <= 2048,
          ),
      ),
    ].slice(0, 50)
    pages.push({
      page: number,
      text: text.slice(offset, end),
      textOffset: offset,
      needsOcr: text.length === 0,
      links,
    })
    remaining -= end - offset
    page.cleanup()
    if (end < text.length) {
      next = { startPage: number, textOffset: end }
      break
    }
    next =
      number < pdf.numPages ? { startPage: number + 1, textOffset: 0 } : null
    if (remaining === 0) break
  }
  parentPort.postMessage({ totalPages: pdf.numPages, pages, next })
} finally {
  await pdf.loadingTask.destroy()
}
