export async function parseJson<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  const json = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null
  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json && json.error
        ? String(json.error)
        : fallback
    throw new Error(message)
  }
  return json as T
}

/**
 * Treat a successful-but-malformed list response as a load failure instead of
 * passing it into rendering code, where `map`, `filter`, or iteration would
 * otherwise throw an uncaught error.
 */
export async function parseJsonArray<T>(
  response: Response,
  fallback: string,
): Promise<T[]> {
  const json = await parseJson<unknown>(response, fallback)
  if (!Array.isArray(json)) {
    throw new Error(`${fallback}: the server returned an invalid list.`)
  }
  return json as T[]
}
