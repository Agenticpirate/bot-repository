import { ArrowLeft, Paperclip } from 'lucide-react'
import { Button } from '@moldable-ai/ui'
import type { MailDraft } from '../types'

/** Keep an attached provider draft intact until Mail supports MIME editing. */
export function AttachedDraftPreview({
  draft,
  onClose,
}: {
  draft: MailDraft
  onClose: () => void
}) {
  return (
    <section className="bg-background h-full overflow-auto p-5">
      <Button variant="ghost" className="mb-4 cursor-pointer" onClick={onClose}>
        <ArrowLeft className="size-4" />
        Back to Mail
      </Button>
      <h1 className="text-xl font-semibold">
        {draft.composer.subject || 'Email draft'}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        To {draft.composer.to}
      </p>
      <p className="my-5 whitespace-pre-wrap break-words text-sm">
        {draft.composer.body}
      </p>
      <ul className="space-y-2">
        {draft.attachments?.map((file, index) => (
          <li key={index} className="flex items-center gap-2 text-sm">
            <Paperclip className="size-4" />
            {file.filename}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-5 text-sm">
        Editing and sending drafts with attachments is currently available in
        Gmail. This preview keeps the original draft intact.
      </p>
    </section>
  )
}
