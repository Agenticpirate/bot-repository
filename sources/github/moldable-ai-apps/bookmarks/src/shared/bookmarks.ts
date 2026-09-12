export type AuthMethod = 'browser' | 'oauth'

export interface BookmarkFolder {
  id: string
  name: string
  count?: number
}

export interface BookmarkFolderStatus extends BookmarkFolder {
  selected: boolean
}

export interface BookmarkMedia {
  key?: string
  type: 'photo' | 'video' | 'animated_gif' | 'unknown'
  url?: string
  previewUrl?: string
  altText?: string
  width?: number
  height?: number
}

export interface QuotedPost {
  id: string
  text: string
  url: string
  authorHandle?: string
  authorName?: string
}

export interface BookmarkRecord {
  id: string
  url: string
  text: string
  authorId?: string
  authorHandle?: string
  authorName?: string
  authorProfileImageUrl?: string
  postedAt?: string | null
  bookmarkedAt?: string | null
  sortIndex?: string | null
  syncedAt: string
  language?: string
  conversationId?: string
  links: string[]
  media: BookmarkMedia[]
  quotedPost?: QuotedPost
  folderIds: string[]
  folderNames: string[]
  engagement?: {
    likes?: number
    reposts?: number
    replies?: number
    quotes?: number
    bookmarks?: number
    views?: number
  }
  source: 'x-api' | 'x-browser-session'
}

export interface BrowserProfile {
  browserId: string
  browserName: string
  backend: 'chromium' | 'firefox'
  profileId: string
  profileName: string
  hasXSession: boolean
}

export interface BrowserConnection {
  method: 'browser'
  browserId: string
  browserName: string
  profileId: string
  profileName: string
  connectedAt: string
}

export interface OAuthConnection {
  method: 'oauth'
  clientId: string
  xUserId: string
  username?: string
  connectedAt: string
}

export type Connection = BrowserConnection | OAuthConnection

export interface SyncState {
  status: 'idle' | 'syncing' | 'error'
  phase?: string
  startedAt?: string
  lastSyncAt?: string
  lastFullSyncAt?: string
  lastError?: string
  totalBookmarks: number
  addedLastSync: number
  pagesLastSync: number
  retryAt?: string
}

export interface AppStatus {
  connected: boolean
  connection: Connection | null
  sync: SyncState
  profiles: BrowserProfile[]
  folders: BookmarkFolderStatus[]
  storage: {
    format: 'jsonl'
    workspaceScoped: true
    path: string
  }
}

export interface BookmarkPage {
  items: BookmarkRecord[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
}

export interface SyncResult {
  added: number
  total: number
  pages: number
  folders: number
  completedAt: string
}
