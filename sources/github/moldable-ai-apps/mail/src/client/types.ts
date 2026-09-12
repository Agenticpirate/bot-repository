export interface MailProfile {
  emailAddress?: string
  messagesTotal?: number
  threadsTotal?: number
}

export interface MailStatus {
  authenticated: boolean
  profile: MailProfile | null
  syncing?: boolean
  accounts: MailAccount[]
  activeAccountId: string | null
}

export interface MailAccount {
  id: string
  emailAddress: string
  authenticated?: boolean
}

export interface MailMessageSummary {
  id: string
  threadId: string
  accountId?: string
  accountEmailAddress?: string
  from: string
  to: string
  subject: string
  date: string
  snippet: string
  labelIds: string[]
  unread: boolean
  starred: boolean
  important: boolean
  internalDate: number
  snoozedUntil?: number
  bodyText?: string
  bodyHtmlText?: string
  bodyCached?: boolean
  attachments?: MailAttachment[]
  unsubscribe?: MailUnsubscribe
  threadMessageCount?: number
  threadUnreadCount?: number
  threadParticipants?: string[]
}

export interface MailMessageDetail extends MailMessageSummary {
  cc: string
  bodyText: string
  bodyHtml: string
  bodyHtmlText: string
  attachments: MailAttachment[]
}

export interface MailThreadDetail {
  id: string
  messages: MailMessageDetail[]
}

export interface MailAttachment {
  id: string
  filename: string
  mimeType: string
  size: number
  attachmentId?: string
  inline: boolean
}

export interface MailUnsubscribe {
  mailto?: string
  url?: string
  oneClick?: boolean
}

export interface MailContact {
  id: string
  name: string
  email: string
}

export interface MailLabel {
  id: string
  name: string
  type: 'system' | 'user'
  messageListVisibility?: 'hide' | 'show'
  labelListVisibility?: 'labelHide' | 'labelShow' | 'labelShowIfUnread'
  color?: {
    textColor?: string
    backgroundColor?: string
  }
}

export interface MessagesResponse {
  messages: MailMessageSummary[]
  nextPageToken?: string
  resultSizeEstimate: number
  source?: 'cache' | 'gmail' | 'mixed'
  syncing?: boolean
  syncedAt?: string
  scope?: 'account' | 'unified'
  accountErrors?: MailAccountError[]
}

export interface MailAccountError {
  accountId: string
  emailAddress: string
  message: string
}

export interface GeneratedMailSearchQuery {
  naturalLanguageQuery: string
  gmailQuery: string
  labelId: string
  explanation: string
}

export interface ComposerState {
  mode: 'new' | 'reply'
  accountId?: string
  replyToMessageId?: string
  draftId?: string
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  threadId?: string
}

export interface MailDraft {
  attachments?: MailAttachment[]
  id: string
  composer: ComposerState
  createdAt: number
  updatedAt: number
}

export interface MailDraftsResponse {
  drafts: MailDraft[]
  scope?: 'account' | 'unified'
  accountErrors?: MailAccountError[]
}

export type MessageAction =
  | 'archive'
  | 'trash'
  | 'untrash'
  | 'markRead'
  | 'markUnread'
  | 'star'
  | 'unstar'
  | 'important'
  | 'unimportant'
  | 'snooze'
  | 'unsnooze'
  | 'spam'
  | 'notSpam'
