import type { MailMessageSummary } from '../types'
import { mailMessageKey } from './mail-identity'

/** One semantic entry per reader. The host owns its platform history: desktop
 * chrome and iOS WebKit must not compete with a second app-owned history stack. */
export function createMailReaderNavigation(host: {
  push: (entry: { id: string; title: string }) => string
  pop: (id: string) => void
}) {
  let entryId: string | null = null
  return {
    isOpen: () => entryId !== null,
    open(message: Pick<MailMessageSummary, 'id' | 'accountId' | 'subject'>) {
      if (entryId !== null) return
      entryId = host.push({
        id: `message:${mailMessageKey(message)}`,
        title: message.subject || 'Email',
      })
    },
    close(notifyHost: boolean) {
      const previousId = entryId
      entryId = null
      if (notifyHost && previousId !== null) host.pop(previousId)
    },
  }
}
