import { installAppChangeNotifications } from './app-change-notifications'
import { beforeEach, expect, it, vi } from 'vitest'

const send = vi.hoisted(() => vi.fn())
vi.mock('@moldable-ai/ui', () => ({ sendToMoldable: send }))
const response = new Response('{}', { status: 200 })
const original = vi.fn(async () => response)
beforeEach(() => {
  send.mockReset()
  original.mockClear()
  vi.stubGlobal('location', new URL('https://mail.example.com/'))
  vi.stubGlobal('window', { fetch: original })
})
it('observes a same-app write while preserving the exact request and response', async () => {
  installAppChangeNotifications()
  installAppChangeNotifications()
  const request = new Request('https://mail.example.com/api/drafts', {
    method: 'POST',
    body: 'private body',
  })
  expect(await window.fetch(request)).toBe(response)
  expect(original).toHaveBeenCalledExactlyOnceWith(request, undefined)
  expect(send).toHaveBeenCalledExactlyOnceWith({
    type: 'moldable:app-data-changed',
  })
})
it('ignores reads, external APIs, failed writes and card hydration', async () => {
  installAppChangeNotifications()
  await window.fetch('/api/messages')
  await window.fetch('https://external.example.com/api/drafts', {
    method: 'POST',
  })
  original.mockResolvedValueOnce(new Response('{}', { status: 400 }))
  await window.fetch('/api/drafts', { method: 'POST' })
  expect(send).not.toHaveBeenCalled()
  vi.stubGlobal('location', new URL('https://mail.example.com/?card=messages'))
  vi.stubGlobal('window', { fetch: original })
  installAppChangeNotifications()
  expect(window.fetch).toBe(original)
})
