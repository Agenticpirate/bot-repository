const TRUSTED_TAURI_ORIGINS = new Set([
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
])
const TRUSTED_DEV_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '')
}

function isTrustedHostOrigin(origin: string) {
  const normalized = normalizeOrigin(origin)
  if (TRUSTED_TAURI_ORIGINS.has(normalized)) return true
  return (
    process.env.NODE_ENV !== 'production' && TRUSTED_DEV_ORIGINS.has(normalized)
  )
}

function isSameAppOrigin(request: Request, origin: string) {
  const normalized = normalizeOrigin(origin)
  if (normalized === new URL(request.url).origin) return true

  const appUrl = process.env.MOLDABLE_APP_URL
  if (!appUrl) return false
  try {
    return normalized === new URL(appUrl).origin
  } catch {
    return false
  }
}

function isPublicHostPath(pathname: string, method: string) {
  if (pathname === '/api/moldable/health') return method === 'GET'
  if (pathname === '/api/moldable/commands') return method === 'GET'
  if (pathname === '/api/moldable/today') return method === 'GET'
  return pathname === '/api/moldable/today/dismiss' && method === 'POST'
}

function isUnauthenticatedCallback(pathname: string, method: string) {
  return pathname === '/api/auth/callback' && method === 'GET'
}

export type MailApiAuthorization =
  | { allowed: true; corsOrigin?: string }
  | { allowed: false; status: 403; message: string }

/** Mail is private local app state. Trust the app's own origin and originless
 * Moldable host calls; reject a genuinely foreign browser origin. */
export function authorizeMailApiRequest(
  request: Request,
): MailApiAuthorization {
  const url = new URL(request.url)
  const pathname = url.pathname
  const method = request.method.toUpperCase()
  const originHeader = request.headers.get('origin')
  const origin = originHeader ? normalizeOrigin(originHeader) : null

  if (isUnauthenticatedCallback(pathname, method)) return { allowed: true }
  if (pathname === '/api/moldable/health' && method === 'GET') {
    return { allowed: true, ...(origin ? { corsOrigin: origin } : {}) }
  }

  if (
    origin &&
    !isSameAppOrigin(request, origin) &&
    !isTrustedHostOrigin(origin)
  ) {
    return {
      allowed: false,
      status: 403,
      message: 'This origin is not allowed to access Mail.',
    }
  }

  if (
    origin &&
    isTrustedHostOrigin(origin) &&
    isPublicHostPath(pathname, method)
  ) {
    return { allowed: true, corsOrigin: origin }
  }

  if (method === 'OPTIONS') {
    if (
      origin &&
      (isSameAppOrigin(request, origin) || isTrustedHostOrigin(origin))
    ) {
      return { allowed: true, corsOrigin: origin }
    }
    return {
      allowed: false,
      status: 403,
      message: 'This origin is not allowed to access Mail.',
    }
  }

  if (origin && !isSameAppOrigin(request, origin)) {
    return {
      allowed: false,
      status: 403,
      message: 'The Moldable host cannot call this private Mail endpoint.',
    }
  }

  return { allowed: true, ...(origin ? { corsOrigin: origin } : {}) }
}

export function applyMailCorsHeaders(headers: Headers, origin?: string) {
  if (!origin) return
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set(
    'Access-Control-Allow-Headers',
    'content-type, x-mail-account-id, x-moldable-workspace, x-moldable-workspace-id',
  )
  headers.set(
    'Access-Control-Allow-Methods',
    'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
  )
  headers.append('Vary', 'Origin')
}
