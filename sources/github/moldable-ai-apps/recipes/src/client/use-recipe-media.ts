import { useCallback, useMemo } from 'react'
import { useWorkspace } from '@moldable-ai/ui'

export type RecipeMedia = {
  src: string
  path: string
  name: string
  altText: string
  kind: 'image'
}

function isExternalUrl(src: string): boolean {
  return (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:') ||
    src.startsWith('blob:')
  )
}

/**
 * Image upload + URL resolution for recipes. Uploaded images are stored by the
 * server under `assets/<uuid>.<ext>` and referenced by that relative `src`;
 * `resolveMediaUrl` turns a stored ref into a served, workspace-scoped URL.
 * External URLs (e.g. legacy Unsplash links) pass through untouched.
 */
export function useRecipeMedia() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  const resolveMediaUrl = useCallback(
    (src: string | undefined | null): string => {
      if (!src) return ''
      if (isExternalUrl(src)) return src
      const clean = src.replace(/^\//, '')
      // Uploaded images are stored as `assets/<uuid>.<ext>` and served by the
      // app server. Everything else is a bundled/public asset served statically.
      if (clean.startsWith('assets/')) {
        const params = new URLSearchParams({ path: clean })
        if (workspaceId) params.set('workspace', workspaceId)
        return `/api/recipes/media?${params.toString()}`
      }
      if (src.startsWith('/')) return src
      // Bundled sample photos live under public/recipes/.
      if (!clean.includes('/')) return `/recipes/${clean}`
      return `/${clean}`
    },
    [workspaceId],
  )

  const uploadFile = useCallback(
    async (file: File): Promise<RecipeMedia> => {
      const body = new FormData()
      body.append('file', file)
      const res = await fetchWithWorkspace('/api/recipes/media', {
        method: 'POST',
        body,
      })
      if (!res.ok) {
        const detail = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(detail?.error ?? 'Failed to upload image')
      }
      return (await res.json()) as RecipeMedia
    },
    [fetchWithWorkspace],
  )

  const uploadPaths = useCallback(
    async (paths: string[]): Promise<RecipeMedia[]> => {
      const res = await fetchWithWorkspace('/api/recipes/media-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      })
      if (!res.ok) {
        const detail = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(detail?.error ?? 'Failed to import images')
      }
      return (await res.json()) as RecipeMedia[]
    },
    [fetchWithWorkspace],
  )

  return { resolveMediaUrl, uploadFile, uploadPaths }
}

export function useResolvedMarkdown(markdown: string): string {
  const { resolveMediaUrl } = useRecipeMedia()
  return useMemo(() => {
    if (!markdown) return ''
    return markdown
      .replace(
        /(!\[[^\]]*\]\()(\s*)([^)\s]+)(\s*\))/g,
        (_m, pre, _s, src, post) => `${pre}${resolveMediaUrl(src)}${post}`,
      )
      .replace(
        /(<img[^>]*\ssrc=")([^"]+)(")/g,
        (_m, pre, src, post) => `${pre}${resolveMediaUrl(src)}${post}`,
      )
  }, [markdown, resolveMediaUrl])
}
