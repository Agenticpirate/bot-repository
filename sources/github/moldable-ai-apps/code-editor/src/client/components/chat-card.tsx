import { useQuery } from '@tanstack/react-query'
import { FileCode } from 'lucide-react'
import { useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'

interface CodeCard {
  title: string
  relativePath: string
  detail: string
  codeBlocks: { code: string; language: string }[]
  binaryEmptyStates: { title: string; description: string }[]
  truncationNotice: string
}
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const query = useQuery({
    queryKey: [
      'chat-code',
      new URLSearchParams(location.search).get('cardInput'),
    ],
    queryFn: () =>
      callCardApp<CodeCard>('code-editor', 'code-editor.native.file.read'),
    refetchInterval: 30_000,
  })
  const file = query.data
  return (
    <div ref={contentRef} className="bg-background">
      {query.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading code…
        </p>
      )}
      {(error || query.error) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || query.error?.message}
        </p>
      )}
      {file && (
        <>
          <div hidden={expanded}>
            <button
              type="button"
              className="border-border focus-visible:outline-ring w-full cursor-pointer rounded-xl border p-4 text-left focus-visible:outline-2"
              onClick={() => {
                setError(undefined)
                void openQuickLook().catch((error) => setError(String(error)))
              }}
            >
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <FileCode className="size-4 shrink-0" />
                <span className="truncate">{file.relativePath}</span>
              </h2>
              <pre className="text-muted-foreground mt-3 max-h-28 overflow-hidden text-xs">
                <code>
                  {file.codeBlocks[0]?.code
                    .split('\n')
                    .slice(0, 5)
                    .join('\n') ?? 'Binary file'}
                </code>
              </pre>
            </button>
          </div>
          {expanded && (
            <article className="space-y-4 p-4">
              <h1 className="break-all text-lg font-semibold">
                {file.relativePath}
              </h1>
              <p className="text-muted-foreground text-xs">{file.detail}</p>
              {file.codeBlocks.map((block, index) => (
                <pre
                  key={index}
                  className="bg-muted overflow-auto rounded-lg p-4 text-xs leading-relaxed"
                >
                  <code>{block.code}</code>
                </pre>
              ))}
              {file.binaryEmptyStates.map((state) => (
                <p key={state.title} className="text-muted-foreground text-sm">
                  {state.description}
                </p>
              ))}
              {file.truncationNotice && (
                <p className="text-muted-foreground text-xs">
                  {file.truncationNotice}
                </p>
              )}
            </article>
          )}
        </>
      )}
    </div>
  )
}
