import { authorizeBookmarksApiRequest } from './request-security'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const originalEnvironment = { ...process.env }

describe('Bookmarks API request security', () => {
  beforeEach(() => {
    process.env.MOLDABLE_APP_URL = 'https://bookmarks.localhost:1355'
    process.env.NODE_ENV = 'production'
  })

  afterEach(() => {
    process.env = { ...originalEnvironment }
  })

  it('rejects foreign web origins from private bookmark data', () => {
    expect(
      authorizeBookmarksApiRequest(
        request('/api/bookmarks', 'GET', 'https://attacker.example'),
      ),
    ).toMatchObject({ allowed: false, status: 403 })
  })

  it('allows the same app origin and originless host RPC', () => {
    expect(
      authorizeBookmarksApiRequest(
        request('/api/bookmarks', 'GET', 'https://bookmarks.localhost:1355'),
      ).allowed,
    ).toBe(true)
    expect(
      authorizeBookmarksApiRequest(request('/api/moldable/rpc', 'POST'))
        .allowed,
    ).toBe(true)
  })

  it('limits the desktop origin to host-facing routes', () => {
    expect(
      authorizeBookmarksApiRequest(
        request('/api/moldable/today', 'GET', 'tauri://localhost'),
      ).allowed,
    ).toBe(true)
    expect(
      authorizeBookmarksApiRequest(
        request('/api/bookmarks', 'GET', 'tauri://localhost'),
      ).allowed,
    ).toBe(false)
  })

  it('keeps the OAuth callback reachable', () => {
    expect(
      authorizeBookmarksApiRequest(request('/api/auth/x/callback', 'GET'))
        .allowed,
    ).toBe(true)
  })
})

function request(path: string, method: string, origin?: string): Request {
  const headers = new Headers()
  if (origin) headers.set('origin', origin)
  return new Request(`https://bookmarks.localhost:1355${path}`, {
    method,
    headers,
  })
}
