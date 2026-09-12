import type { MailMessageSummary } from '../types'

export function mailMessageKey(
  message: Pick<MailMessageSummary, 'id' | 'accountId'>,
) {
  return `${encodeURIComponent(message.accountId ?? 'active')}:${encodeURIComponent(message.id)}`
}

export function mailAccountPath(path: string, accountId?: string | null) {
  if (!accountId) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}accountId=${encodeURIComponent(accountId)}`
}
