import { authorizeMailApiRequest } from './request-security'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

function request(
  path: string,
  options: { method?: string; origin?: string } = {},
) {
  const headers = new Headers()
  if (options.origin) headers.set('origin', options.origin)
  return new Request(`https://mail.localhost:1355${path}`, {
    method: options.method ?? 'GET',
    headers,
  })
}

describe('Mail API request security', () => {
  beforeEach(() => {
    process.env.MOLDABLE_APP_URL = 'https://mail.localhost:1355'
    process.env.NODE_ENV = 'production'
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('rejects hostile web origins even for read-only endpoints', () => {
    expect(
      authorizeMailApiRequest(
        request('/api/messages', { origin: 'https://attacker.example' }),
      ),
    ).toMatchObject({ allowed: false, status: 403 })
  })

  it('allows the Mail webview on its own origin without a cookie handshake', () => {
    expect(
      authorizeMailApiRequest(
        request('/api/messages', { origin: 'https://mail.localhost:1355' }),
      ).allowed,
    ).toBe(true)
  })

  it('limits trusted desktop origins to host-facing routes', () => {
    expect(
      authorizeMailApiRequest(
        request('/api/moldable/today', { origin: 'tauri://localhost' }),
      ).allowed,
    ).toBe(true)
    expect(
      authorizeMailApiRequest(
        request('/api/messages', { origin: 'tauri://localhost' }),
      ).allowed,
    ).toBe(false)
  })

  it('allows originless Moldable host RPC calls', () => {
    expect(
      authorizeMailApiRequest(request('/api/moldable/rpc', { method: 'POST' }))
        .allowed,
    ).toBe(true)
  })

  it('keeps the Google callback and health probe reachable', () => {
    expect(authorizeMailApiRequest(request('/api/auth/callback')).allowed).toBe(
      true,
    )
    expect(
      authorizeMailApiRequest(request('/api/moldable/health')).allowed,
    ).toBe(true)
  })
})
