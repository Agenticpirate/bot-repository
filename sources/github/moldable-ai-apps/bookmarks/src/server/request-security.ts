const TRUSTED_TAURI_ORIGINS = new Set([
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
])
const TRUSTED_DEV_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

export type ApiAuthorization =
  | { allowed: true; corsOrigin?: string }
  | { allowed: false; status: 403; message: string }

export function authorizeBookmarksApiRequest(
  request: Request,
): ApiAuthorization {
  const url = new URL(request.url)
  const method = request.method.toUpperCase()
  const originHeader = request.headers.get('origin')
  const origin = originHeader ? normalizeOrigin(originHeader) : null

  if (url.pathname === '/api/auth/x/callback' && method === 'GET') {
    return { allowed: true }
  }
  if (url.pathname === '/api/moldable/health' && method === 'GET') {
    return { allowed: true, ...(origin ? { corsOrigin: origin } : {}) }
  }
  if (
    origin &&
    !isSameAppOrigin(request, origin) &&
    !isTrustedHostOrigin(origin)
  ) {
    return denied()
  }
  if (
    origin &&
    isTrustedHostOrigin(origin) &&
    isHostRoute(url.pathname, method)
  ) {
    return { allowed: true, corsOrigin: origin }
  }
  if (method === 'OPTIONS') {
    return origin &&
      (isSameAppOrigin(request, origin) || isTrustedHostOrigin(origin))
      ? { allowed: true, corsOrigin: origin }
      : denied()
  }
  if (origin && !isSameAppOrigin(request, origin)) return denied()
  return { allowed: true, ...(origin ? { corsOrigin: origin } : {}) }
}

export function applyBookmarksCors(headers: Headers, origin?: string): void {
  if (!origin) return
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set(
    'Access-Control-Allow-Headers',
    'content-type, x-moldable-workspace, x-moldable-workspace-id',
  )
  headers.set(
    'Access-Control-Allow-Methods',
    'GET, HEAD, POST, DELETE, OPTIONS',
  )
  headers.append('Vary', 'Origin')
}

function normalizeOrigin(value: string): string {
  return value.replace(/\/$/, '')
}

function isSameAppOrigin(request: Request, origin: string): boolean {
  if (normalizeOrigin(origin) === new URL(request.url).origin) return true
  const appUrl = process.env.MOLDABLE_APP_URL
  if (!appUrl) return false
  try {
    return normalizeOrigin(origin) === new URL(appUrl).origin
  } catch {
    return false
  }
}

function isTrustedHostOrigin(origin: string): boolean {
  const normalized = normalizeOrigin(origin)
  return (
    TRUSTED_TAURI_ORIGINS.has(normalized) ||
    (process.env.NODE_ENV !== 'production' &&
      TRUSTED_DEV_ORIGINS.has(normalized))
  )
}

function isHostRoute(pathname: string, method: string): boolean {
  if (pathname === '/api/moldable/health') return method === 'GET'
  if (pathname === '/api/moldable/today') return method === 'GET'
  return pathname === '/api/moldable/today/dismiss' && method === 'POST'
}

function denied(): ApiAuthorization {
  return {
    allowed: false,
    status: 403,
    message: 'This origin is not allowed to access Bookmarks.',
  }
}
