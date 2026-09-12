'use client'

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  AppWindow,
  ArrowLeft,
  ArrowUp,
  ArrowUpFromLine,
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  FileMinus,
  FilePenLine,
  FilePlus,
  FileQuestion,
  FileSymlink,
  FileX,
  Folder,
  FolderGit,
  FolderOpen,
  FolderPlus,
  GitBranch,
  GitCommit,
  GitPullRequest,
  History,
  LayoutList,
  type LucideIcon,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Terminal,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import {
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type UIEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AppHeader,
  Avatar,
  AvatarFallback,
  AvatarImage,
  ConfirmDialog,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
  MoldableLoadingScreen,
  Separator,
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  sendToMoldable,
  useMoldableCommands,
  useMoldableNavigationPop,
  useWorkspace,
} from '@moldable-ai/ui'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { formatDistanceToNow } from 'date-fns'

const HISTORY_PAGE_SIZE = 50
const INITIAL_DIFF_LINE_LIMIT = 800
const DIFF_LINE_INCREMENT = 800
const MAX_RENDERED_DIFF_LINES = 4000
const MAX_RENDERED_DIFF_CHARS = 350000
const IMAGE_FILE_EXTENSIONS = new Set([
  'apng',
  'avif',
  'gif',
  'jpg',
  'jpeg',
  'png',
  'svg',
  'webp',
])

function isPreviewableImagePath(filePath?: string | null) {
  const extension = filePath?.split('.').pop()?.toLowerCase()
  return extension ? IMAGE_FILE_EXTENSIONS.has(extension) : false
}

interface GitFile {
  path: string
  index: string
  working_dir: string
}

interface RecentRepo {
  name: string
  path: string
  isDirty?: boolean
  changedCount?: number
  branch?: string
  ahead?: number
  preferredCommitAction?: PreferredCommitAction
  sectionId?: string
}

type RepoSortMode = 'name' | 'changes'

interface RepoSection {
  id: string
  name: string
  collapsed: boolean
  position: number
  sortMode: RepoSortMode
}

interface ExistingPullRequest {
  url: string
  number?: number
  title?: string
  state?: string
  baseBranch?: string
  headBranch?: string
}

interface PullRequestStatus {
  canOpen: boolean
  reason?: string
  provider?: 'github'
  owner?: string
  repo?: string
  remoteName?: string
  baseBranch?: string
  headBranch?: string
  compareUrl?: string
  isPushed?: boolean
  branchCommitCount?: number
  existingPullRequest?: ExistingPullRequest
}

interface GitData {
  currentBranch: string
  repoName: string
  repoPath: string
  files: GitFile[]
  recentRepos: RecentRepo[]
  repoSections: RepoSection[]
  unorganizedRepoSort: RepoSortMode
  branches: string[]
  isClean?: boolean
  pullRequest?: PullRequestStatus
}

type GitUiIntent = {
  id: string
  view: 'repositories' | 'repository' | 'changes' | 'history'
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}

interface DetectedEditor {
  id: string
  name: string
  appName: string
  appPath: string
  kind?: 'mac-app' | 'moldable-app'
  moldableAppId?: string
  icon?: string
  iconPath?: string
}

interface LogEntry {
  hash: string
  date: string
  message: string
  author_name: string
  author_email: string
  avatarUrl?: string
  isUnpushed?: boolean
}

interface CommitFile {
  path: string
  oldPath?: string
  status: string
}

interface HistoryPage {
  history: LogEntry[]
  hasMore: boolean
  nextOffset?: number
}

interface CommitInput {
  paths: string[]
  repoPath?: string
  summary: string
  description: string
}

type PreferredCommitAction = 'commit' | 'commit-and-push' | 'commit-and-open-pr'

interface GeneratedCommitMessage {
  summary: string
  description?: string
}

interface CodeReviewFinding {
  severity?: string
  file?: string
  title?: string
  details?: string
  suggestion?: string
}

interface CodeReviewResult {
  summary: string
  findings: CodeReviewFinding[]
}

interface FileDiffResponse {
  diff?: string | null
  truncated?: boolean
  originalLength?: number
}

interface DiffPreview {
  lines: string[]
  hasMore: boolean
  clippedByCharacterLimit: boolean
}

function getDiffPreviewLines(
  diff: string | null | undefined,
  lineLimit: number,
): DiffPreview {
  if (!diff) {
    return { lines: [], hasMore: false, clippedByCharacterLimit: false }
  }

  const lines: string[] = []
  const maxChars = Math.min(diff.length, MAX_RENDERED_DIFF_CHARS)
  let start = 0

  while (start < maxChars && lines.length < lineLimit) {
    const nextNewline = diff.indexOf('\n', start)
    const rawEnd = nextNewline === -1 ? diff.length : nextNewline
    const end = Math.min(rawEnd, maxChars)
    lines.push(diff.slice(start, end))

    if (nextNewline === -1 || rawEnd >= maxChars) {
      start = end
      break
    }

    start = nextNewline + 1
  }

  return {
    lines,
    hasMore: start < diff.length && lines.length > 0,
    clippedByCharacterLimit:
      start >= MAX_RENDERED_DIFF_CHARS && start < diff.length,
  }
}

function getAppMonogram(name: string) {
  const letters = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return letters || name.slice(0, 2).toUpperCase()
}

function AppIcon({
  editor,
  className = 'size-7',
}: {
  editor?: DetectedEditor | null
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const iconSrc = editor?.id
    ? `/api/git?editorIcon=${encodeURIComponent(editor.id)}&v=2`
    : undefined

  useEffect(() => {
    setFailed(false)
  }, [iconSrc])

  if (iconSrc && !failed) {
    return (
      <img
        src={iconSrc}
        alt=""
        className={cn(className, 'object-contain')}
        onError={() => setFailed(true)}
      />
    )
  }

  if (editor?.name === 'Xcode') {
    return <Wrench className={className} />
  }

  if (editor?.kind === 'moldable-app') {
    return (
      <span
        className={cn(
          'bg-muted text-muted-foreground flex items-center justify-center rounded-md',
          className,
        )}
      >
        {editor.icon ? (
          <span className="text-[15px] leading-none">{editor.icon}</span>
        ) : (
          <Code2 className="size-[70%]" />
        )}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'bg-muted text-muted-foreground flex items-center justify-center rounded-md text-[11px] font-bold tracking-normal',
        className,
      )}
    >
      {getAppMonogram(editor?.name ?? 'App')}
    </span>
  )
}

function CommitAvatar({
  commit,
  className = 'size-5',
}: {
  commit: LogEntry
  className?: string
}) {
  const fallback =
    commit.author_name
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

  if (commit.avatarUrl) {
    return (
      <Avatar className={className}>
        <AvatarImage
          src={commit.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
        />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
    )
  }

  return (
    <Avatar className={className}>
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  )
}

const COMMIT_ACTIONS: {
  value: PreferredCommitAction
  label: string
  Icon: LucideIcon
}[] = [
  { value: 'commit', label: 'Commit', Icon: GitCommit },
  { value: 'commit-and-push', label: 'Commit & push', Icon: ArrowUp },
  {
    value: 'commit-and-open-pr',
    label: 'Commit & open PR',
    Icon: GitPullRequest,
  },
]

const SHIP_ALL_CONCURRENCY = 3
const UNASSIGNED_REPO_SECTION_ID = 'repo-section:unassigned'

function sortRepos(repos: RecentRepo[], sortMode: RepoSortMode) {
  return [...repos].sort((left, right) => {
    if (sortMode === 'changes') {
      const getChangePriority = (repo: RecentRepo) => {
        if ((repo.changedCount ?? 0) > 0) return 0
        if ((repo.ahead ?? 0) > 0) return 1
        return 2
      }
      const priorityDifference =
        getChangePriority(left) - getChangePriority(right)
      if (priorityDifference !== 0) return priorityDifference
    }

    return left.name.localeCompare(right.name, undefined, {
      sensitivity: 'base',
    })
  })
}

function DraggableRepoRow({
  repo,
  disabled,
  children,
}: {
  repo: RecentRepo
  disabled: boolean
  children: (
    dragHandleProps: ButtonHTMLAttributes<HTMLButtonElement>,
  ) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `repo:${repo.path}`,
    data: { repoPath: repo.path },
    disabled,
  })
  const dragHandleProps = {
    ...attributes,
    ...listeners,
  } as ButtonHTMLAttributes<HTMLButtonElement>

  return (
    <div ref={setNodeRef} className={cn(isDragging && 'opacity-25')}>
      {children(dragHandleProps)}
    </div>
  )
}

function RepoSectionDropZone({
  sectionId,
  active,
  children,
}: {
  sectionId: string | null
  active: boolean
  children: ReactNode
}) {
  const dropId = sectionId
    ? `repo-section:${sectionId}`
    : UNASSIGNED_REPO_SECTION_ID
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
    data: { sectionId },
  })

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'overflow-hidden rounded-xl border transition-colors',
        isOver
          ? 'border-primary/50 bg-primary/5 ring-primary/20 ring-2'
          : 'border-border/60 bg-card',
        active && 'min-h-10',
      )}
    >
      {children}
    </section>
  )
}

export default function GitFlowPage() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [screen, setScreen] = useState<'home' | 'detail'>('home')
  const [showAllRepos, setShowAllRepos] = useState(false)
  const [unorganizedReposCollapsed, setUnorganizedReposCollapsed] =
    useState(false)
  const [editingSection, setEditingSection] = useState<{
    id: string
    name: string
  } | null>(null)
  const [deleteSectionTarget, setDeleteSectionTarget] =
    useState<RepoSection | null>(null)
  const [activeDragRepoPath, setActiveDragRepoPath] = useState<string | null>(
    null,
  )
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null)
  const [view, setView] = useState<'changes' | 'history'>('changes')
  const [shippingPaths, setShippingPaths] = useState<Set<string>>(new Set())
  const [isShippingAll, setIsShippingAll] = useState(false)
  const [shipFeedback, setShipFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [selectedActionFiles, setSelectedActionFiles] = useState<Set<string>>(
    new Set(),
  )
  const [selectedCommitFile, setSelectedCommitFile] = useState<string | null>(
    null,
  )
  const [pendingDiscardPaths, setPendingDiscardPaths] = useState<
    string[] | null
  >(null)

  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [codeReview, setCodeReview] = useState<CodeReviewResult | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [chatActionFeedback, setChatActionFeedback] = useState<string | null>(
    null,
  )
  const [dismissedFindingKeys, setDismissedFindingKeys] = useState<Set<string>>(
    new Set(),
  )
  const [isHandingOffToChat, setIsHandingOffToChat] = useState(false)
  const [fileFilter, setFileFilter] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [preferredEditorId, setPreferredEditorId] = useState<string | null>(
    null,
  )
  const [preferredCommitAction, setPreferredCommitAction] =
    useState<PreferredCommitAction>('commit')
  const fileFilterInputRef = useRef<HTMLInputElement | null>(null)
  const selectionAnchorRef = useRef<string | null>(null)
  const initializedSelectionRepoRef = useRef<string | null>(null)
  const seenIntentIds = useRef<Set<string>>(new Set())
  const savingSectionIdRef = useRef<string | null>(null)
  const repoDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  // Query for Git data (status, branches, etc)
  const {
    data,
    isLoading: loading,
    refetch: fetchData,
  } = useQuery<GitData>({
    queryKey: ['git-status', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/git')
      if (!res.ok) throw new Error('Failed to fetch git data')
      const json = await res.json()
      return json
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    refetchOnWindowFocus: true, // Refresh when the app is focused
  })

  // Query for Log History
  const {
    data: historyPages,
    fetchNextPage: fetchNextHistoryPage,
    hasNextPage: hasNextHistoryPage,
    isFetchingNextPage: isFetchingNextHistoryPage,
  } = useInfiniteQuery<HistoryPage>({
    queryKey: ['git-history', workspaceId, data?.repoPath],
    queryFn: async ({ pageParam }) => {
      const offset =
        typeof pageParam === 'number' && Number.isFinite(pageParam)
          ? pageParam
          : 0
      const params = new URLSearchParams({
        history: '1',
        limit: String(HISTORY_PAGE_SIZE),
        offset: String(offset),
      })
      if (data?.repoPath) params.set('repoPath', data.repoPath)
      const res = await fetchWithWorkspace(`/api/git?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch history')
      return res.json()
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
    enabled: !!data?.repoPath, // Enable even when not in history view to show pending last commit
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  })
  const history = useMemo(
    () => historyPages?.pages.flatMap((page) => page.history) ?? [],
    [historyPages],
  )

  const { data: editorData } = useQuery<{
    editors: DetectedEditor[]
    preferredEditorId?: string
    preferredCommitAction?: PreferredCommitAction
  }>({
    queryKey: ['git-editors', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/git?editors=1')
      if (!res.ok) throw new Error('Failed to fetch editors')
      return res.json()
    },
    staleTime: 60_000,
  })

  const editors = useMemo(
    () => editorData?.editors ?? [],
    [editorData?.editors],
  )

  const { data: commitFiles = [], isLoading: loadingCommitFiles } = useQuery<
    CommitFile[]
  >({
    queryKey: ['git-commit-files', workspaceId, data?.repoPath, selectedCommit],
    queryFn: async () => {
      if (!selectedCommit) return []
      const params = new URLSearchParams({
        hash: selectedCommit,
        files: '1',
      })
      if (data?.repoPath) params.set('repoPath', data.repoPath)
      const res = await fetchWithWorkspace(`/api/git?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch commit files')
      const json = await res.json()
      return json.files ?? []
    },
    enabled: !!selectedCommit,
  })

  const selectedChangedFile = useMemo(
    () => data?.files.find((file) => file.path === selectedFile),
    [data?.files, selectedFile],
  )
  const changedPathSet = useMemo(
    () => new Set((data?.files ?? []).map((file) => file.path)),
    [data?.files],
  )
  const selectedCommitPaths = useMemo(
    () =>
      Array.from(selectedFiles).filter((filePath) =>
        changedPathSet.has(filePath),
      ),
    [changedPathSet, selectedFiles],
  )
  const selectedCommitPathCount = selectedCommitPaths.length
  const selectedCommitFileEntry = useMemo(
    () => commitFiles.find((file) => file.path === selectedCommitFile),
    [commitFiles, selectedCommitFile],
  )
  const selectedDiffPath = selectedCommit ? selectedCommitFile : selectedFile
  const selectedImageStatus = selectedCommit
    ? selectedCommitFileEntry?.status
    : selectedChangedFile
      ? `${selectedChangedFile.index}${selectedChangedFile.working_dir}`
      : undefined
  const selectedDiffIsImage = isPreviewableImagePath(selectedDiffPath)

  // Query for File Diff
  const { data: fileDiffResponse, isLoading: loadingDiff } =
    useQuery<FileDiffResponse | null>({
      queryKey: [
        'git-diff',
        workspaceId,
        data?.repoPath,
        selectedFile,
        selectedCommit,
        selectedCommitFile,
      ],
      queryFn: async () => {
        if (selectedCommit) {
          if (!selectedCommitFile) return null

          const params = new URLSearchParams({
            hash: selectedCommit,
            file: selectedCommitFile,
          })
          if (data?.repoPath) params.set('repoPath', data.repoPath)
          const res = await fetchWithWorkspace(`/api/git?${params.toString()}`)
          if (!res.ok) throw new Error('Failed to fetch commit diff')
          return (await res.json()) as FileDiffResponse
        }

        if (!selectedFile) return null
        const params = new URLSearchParams({ file: selectedFile })
        if (data?.repoPath) params.set('repoPath', data.repoPath)
        const res = await fetchWithWorkspace(`/api/git?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to fetch diff')
        return (await res.json()) as FileDiffResponse
      },
      enabled:
        !selectedDiffIsImage &&
        (selectedCommit ? !!selectedCommitFile : !!selectedFile),
    })

  const imagePreviewParams = useMemo(() => {
    if (!selectedDiffIsImage || !selectedDiffPath) return null

    const params = new URLSearchParams({
      image: '1',
      file: selectedDiffPath,
    })
    if (data?.repoPath) params.set('repoPath', data.repoPath)
    if (selectedCommit) params.set('hash', selectedCommit)
    if (selectedImageStatus) params.set('status', selectedImageStatus)
    return params.toString()
  }, [
    data?.repoPath,
    selectedCommit,
    selectedDiffIsImage,
    selectedDiffPath,
    selectedImageStatus,
  ])

  const {
    data: imagePreviewBlob,
    isLoading: loadingImagePreview,
    isError: imagePreviewFailed,
  } = useQuery<Blob | null>({
    queryKey: [
      'git-image-preview',
      workspaceId,
      data?.repoPath,
      selectedDiffPath,
      selectedCommit,
      selectedImageStatus,
    ],
    queryFn: async () => {
      if (!imagePreviewParams) return null
      const res = await fetchWithWorkspace(`/api/git?${imagePreviewParams}`)
      if (!res.ok) throw new Error('Failed to load image preview')
      return res.blob()
    },
    enabled: !!imagePreviewParams,
  })

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!imagePreviewBlob) {
      setImagePreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(imagePreviewBlob)
    setImagePreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [imagePreviewBlob])

  const [diffLineLimit, setDiffLineLimit] = useState(INITIAL_DIFF_LINE_LIMIT)
  const fileDiff = fileDiffResponse?.diff ?? null
  const diffPreview = useMemo(
    () => getDiffPreviewLines(fileDiff, diffLineLimit),
    [diffLineLimit, fileDiff],
  )
  const diffLines = diffPreview.lines
  const diffPreviewIsCapped =
    Boolean(fileDiffResponse?.truncated) ||
    diffPreview.hasMore ||
    diffPreview.clippedByCharacterLimit

  useEffect(() => {
    setDiffLineLimit(INITIAL_DIFF_LINE_LIMIT)
  }, [selectedCommit, selectedDiffPath])

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  // Mutation for generating a commit message from selected diffs
  const generateCommitMessageMutation = useMutation({
    mutationFn: async (input: { paths: string[]; repoPath?: string }) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateCommitMessage',
          paths: input.paths,
          repoPath: input.repoPath,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to generate commit message')
      }
      return json as GeneratedCommitMessage
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  // Mutation for reviewing selected changes
  const reviewCodeMutation = useMutation({
    mutationFn: async (input: { paths: string[]; repoPath?: string }) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reviewCode',
          paths: input.paths,
          repoPath: input.repoPath,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to review code')
      }
      return json as CodeReviewResult
    },
    onSuccess: (review) => {
      setDismissedFindingKeys(new Set())
      setCodeReview(review)
      setIsReviewModalOpen(true)
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  // Mutation for Committing
  const commitMutation = useMutation({
    mutationFn: async (input: CommitInput) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          paths: input.paths,
          summary: input.summary,
          description: input.description,
          repoPath: input.repoPath,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Commit failed')
      return json
    },
    onSuccess: () => {
      setSummary('')
      setDescription('')
      setSelectedFiles(new Set())
      setSelectedActionFiles(new Set())
      setSelectedFile(null)
      setSelectedCommit(null)
      setSelectedCommitFile(null)
      queryClient.invalidateQueries({ queryKey: ['git-status', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['git-history', workspaceId] })
    },
    onSettled: () => {
      // Ensure we refresh status regardless of success/error
      queryClient.invalidateQueries({ queryKey: ['git-status', workspaceId] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const commitAndPushMutation = useMutation({
    mutationFn: async (input: CommitInput) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commitAndPush',
          paths: input.paths,
          summary: input.summary,
          description: input.description,
          repoPath: input.repoPath,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Commit and push failed')
      return json
    },
    onSuccess: () => {
      setSummary('')
      setDescription('')
      setSelectedFiles(new Set())
      setSelectedActionFiles(new Set())
      setSelectedFile(null)
      setSelectedCommit(null)
      setSelectedCommitFile(null)
      queryClient.invalidateQueries({ queryKey: ['git-status', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['git-history', workspaceId] })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['git-status', workspaceId] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  // Mutation for Pushing
  const pushMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push', repoPath: data?.repoPath }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Push failed')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-status', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['git-history', workspaceId] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const commitAndOpenPullRequestMutation = useMutation({
    mutationFn: async (input: CommitInput) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commitAndOpenPullRequest',
          paths: input.paths,
          summary: input.summary,
          description: input.description,
          repoPath: input.repoPath,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to commit and open pull request')
      }
      return json as {
        draft: {
          title: string
          body: string
          url: string
          baseBranch: string
          headBranch: string
        }
        branch?: {
          created?: boolean
          branchName?: string
          baseBranch?: string
        }
      }
    },
    onSuccess: (result) => {
      setSummary('')
      setDescription('')
      setSelectedFiles(new Set())
      setSelectedActionFiles(new Set())
      setSelectedFile(null)
      setSelectedCommit(null)
      setSelectedCommitFile(null)
      queryClient.invalidateQueries({ queryKey: ['git-status', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['git-history', workspaceId] })
      sendToMoldable({
        type: 'moldable:open-url',
        url: result.draft.url,
      })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const openPullRequestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'openPullRequest',
          repoPath: data?.repoPath,
        }),
      })
      const json = await res.json()
      if (!res.ok)
        throw new Error(json.error || 'Failed to prepare pull request')
      return json as {
        title: string
        body: string
        url: string
        baseBranch: string
        headBranch: string
      }
    },
    onSuccess: (draft) => {
      sendToMoldable({
        type: 'moldable:open-url',
        url: draft.url,
      })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  // Mutation for Undoing Commit
  const undoMutation = useMutation({
    mutationFn: async (commit: LogEntry) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'undo', hash: commit.hash }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Undo failed')
      return { json, commit }
    },
    onSuccess: ({ commit }) => {
      setView('changes')
      setSelectedCommit(null)
      setSelectedCommitFile(null)

      // Restore summary and description
      setSummary(commit.message)
      // Note: Full description isn't in simple log message usually,
      // but we restore what we have from the message.

      queryClient
        .invalidateQueries({ queryKey: ['git-status', workspaceId] })
        .then(() => {
          // After status refreshes, select all files
          const status = queryClient.getQueryData<GitData>([
            'git-status',
            workspaceId,
          ])
          if (status?.files) {
            const changedPaths = status.files.map((f) => f.path)
            const firstPath = changedPaths[0] ?? null
            setSelectedFiles(new Set(changedPaths))
            setSelectedFile(firstPath)
            setSelectedActionFiles(firstPath ? new Set([firstPath]) : new Set())
            selectionAnchorRef.current = firstPath
          }
        })
      queryClient.invalidateQueries({ queryKey: ['git-history', workspaceId] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  // Mutation for changing repo
  const repoMutation = useMutation({
    mutationFn: async (repoPath: string) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: repoPath }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to change repo')
      return json
    },
    onSuccess: (json: GitData) => {
      queryClient.setQueryData<GitData>(
        ['git-status', workspaceId],
        (previous) => ({
          ...json,
          recentRepos: json.recentRepos ?? previous?.recentRepos ?? [],
        }),
      )
      const changedPaths = json.files?.map((file) => file.path) ?? []
      const firstFile = changedPaths[0] ?? null
      initializedSelectionRepoRef.current = json.repoPath
      setSelectedFile(firstFile)
      setSelectedCommit(null)
      setSelectedCommitFile(null)
      setSelectedFiles(new Set(changedPaths))
      setSelectedActionFiles(firstFile ? new Set([firstFile]) : new Set())
      selectionAnchorRef.current = firstFile
      queryClient.invalidateQueries({ queryKey: ['git-history', workspaceId] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const removeRepoMutation = useMutation({
    mutationFn: async (repoPath: string) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeRepo', path: repoPath }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to remove repository')
      return json as GitData & { removedPath: string }
    },
    onSuccess: (json) => {
      queryClient.setQueryData<GitData>(['git-status', workspaceId], json)
      const changedPaths = json.files?.map((file) => file.path) ?? []
      const firstFile = changedPaths[0] ?? null
      initializedSelectionRepoRef.current = json.repoPath
      setSelectedFile(firstFile)
      setSelectedCommit(null)
      setSelectedCommitFile(null)
      setSelectedFiles(new Set(changedPaths))
      setSelectedActionFiles(firstFile ? new Set([firstFile]) : new Set())
      selectionAnchorRef.current = firstFile
      queryClient.invalidateQueries({ queryKey: ['git-history', workspaceId] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const repoOrganizationMutation = useMutation({
    mutationFn: async (
      input:
        | { action: 'createRepoSection'; sectionName: string }
        | {
            action: 'updateRepoSection'
            sectionId: string
            sectionName?: string
            collapsed?: boolean
            sortMode?: RepoSortMode
          }
        | {
            action: 'updateUnorganizedRepoSort'
            sortMode: RepoSortMode
          }
        | { action: 'deleteRepoSection'; sectionId: string }
        | {
            action: 'assignRepoSection'
            path: string
            sectionId: string | null
          },
    ) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to organize repositories')
      }
      return json as RepoSection | { ok: true }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['git-status', workspaceId] }),
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const branchMutation = useMutation({
    mutationFn: async (branch: string) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkoutBranch',
          branch,
          repoPath: data?.repoPath,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to switch branch')
      return json as GitData
    },
    onSuccess: (json) => {
      queryClient.setQueryData<GitData>(
        ['git-status', workspaceId],
        (previous) => ({
          ...json,
          recentRepos: previous?.recentRepos ?? [],
        }),
      )
      const changedPaths = json.files?.map((file) => file.path) ?? []
      const firstFile = changedPaths[0] ?? null
      setCodeReview(null)
      setSelectedFile(firstFile)
      setSelectedCommit(null)
      setSelectedCommitFile(null)
      setSelectedFiles(new Set(changedPaths))
      setSelectedActionFiles(firstFile ? new Set([firstFile]) : new Set())
      selectionAnchorRef.current = firstFile
      queryClient.invalidateQueries({ queryKey: ['git-status', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['git-history', workspaceId] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const repositoryControlsDisabled =
    generateCommitMessageMutation.isPending ||
    reviewCodeMutation.isPending ||
    commitMutation.isPending ||
    commitAndPushMutation.isPending ||
    pushMutation.isPending ||
    commitAndOpenPullRequestMutation.isPending ||
    openPullRequestMutation.isPending ||
    undoMutation.isPending ||
    repoMutation.isPending ||
    removeRepoMutation.isPending ||
    repoOrganizationMutation.isPending ||
    branchMutation.isPending

  const discardChangesMutation = useMutation({
    mutationFn: async (paths: string[]) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discardChanges',
          paths,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to discard changes')
      }
      return { json, paths }
    },
    onSuccess: ({ paths }) => {
      setCodeReview(null)
      setSelectedFiles((previous) => {
        const next = new Set(previous)
        paths.forEach((filePath) => next.delete(filePath))
        return next
      })
      setSelectedActionFiles((previous) => {
        const next = new Set(previous)
        paths.forEach((filePath) => next.delete(filePath))
        return next
      })
      if (selectedFile && paths.includes(selectedFile)) {
        setSelectedFile(null)
      }
      queryClient.invalidateQueries({ queryKey: ['git-status', workspaceId] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const addToGitignoreMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addToGitignore',
          path: filePath,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to add file to .gitignore')
      }
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-status', workspaceId] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const filteredFiles = useMemo(() => {
    const files = data?.files ?? []
    const filter = fileFilter.trim().toLowerCase()

    if (!filter) return files

    return files.filter((file) => file.path.toLowerCase().includes(filter))
  }, [data?.files, fileFilter])

  const visibleChangedFileCount = filteredFiles.length

  useEffect(() => {
    if (!data?.repoPath) return

    const hadStaleSelectedPaths = Array.from(selectedFiles).some(
      (filePath) => !changedPathSet.has(filePath),
    )

    setSelectedFiles((previous) => {
      let didDropPath = false
      const next = new Set<string>()

      previous.forEach((filePath) => {
        if (changedPathSet.has(filePath)) {
          next.add(filePath)
        } else {
          didDropPath = true
        }
      })

      return didDropPath ? next : previous
    })

    setSelectedActionFiles((previous) => {
      let didDropPath = false
      const next = new Set<string>()

      previous.forEach((filePath) => {
        if (changedPathSet.has(filePath)) {
          next.add(filePath)
        } else {
          didDropPath = true
        }
      })

      return didDropPath ? next : previous
    })

    if (selectedFile && !changedPathSet.has(selectedFile)) {
      const nextPath = filteredFiles[0]?.path ?? data.files[0]?.path ?? null
      setSelectedFile(nextPath)
      selectionAnchorRef.current = nextPath
    }

    if (
      hadStaleSelectedPaths &&
      error &&
      (error.includes('pathspec') || error.includes('did not match any files'))
    ) {
      setError(null)
    }
  }, [
    changedPathSet,
    data?.files,
    data?.repoPath,
    error,
    filteredFiles,
    selectedFile,
    selectedFiles,
  ])

  const selectRelativeFile = useCallback(
    (direction: -1 | 1) => {
      if (view !== 'changes' || filteredFiles.length === 0) return

      const currentIndex = filteredFiles.findIndex(
        (file) => file.path === selectedFile,
      )
      const fallbackIndex = direction > 0 ? -1 : 0
      const startIndex = currentIndex >= 0 ? currentIndex : fallbackIndex
      const nextIndex = Math.min(
        filteredFiles.length - 1,
        Math.max(0, startIndex + direction),
      )

      const nextPath = filteredFiles[nextIndex]?.path ?? null
      setSelectedCommit(null)
      setSelectedFile(nextPath)
      setSelectedActionFiles(nextPath ? new Set([nextPath]) : new Set())
      selectionAnchorRef.current = nextPath
    },
    [filteredFiles, selectedFile, view],
  )

  const handleOpenFileInEditor = async (filePath: string) => {
    try {
      setError(null)
      const selectedEditor =
        editors.find((editor) => editor.id === preferredEditorId) ??
        editors[0] ??
        null

      if (selectedEditor?.kind === 'moldable-app') {
        if (!data?.repoPath) {
          throw new Error('No repository is selected.')
        }

        const fullPath = filePath.startsWith('/')
          ? filePath
          : `${data.repoPath.replace(/\/+$/, '')}/${filePath}`

        sendToMoldable({
          type: 'moldable:open-app',
          appId: selectedEditor.moldableAppId ?? 'code-editor',
          message: {
            type: 'moldable:open-file',
            projectPath: data.repoPath,
            filePath: fullPath,
          },
        })
        return
      }

      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'openInEditor',
          path: filePath,
          editorId: preferredEditorId,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to open file')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file')
    }
  }

  const getContextActionPaths = (filePath: string) => {
    if (selectedActionFiles.has(filePath)) {
      return Array.from(selectedActionFiles)
    }

    return [filePath]
  }

  const requestDiscardChanges = (filePath: string) => {
    const paths = getContextActionPaths(filePath)
    if (paths.length === 0) return

    setError(null)
    setPendingDiscardPaths(paths)
  }

  const confirmDiscardChanges = () => {
    if (!pendingDiscardPaths || pendingDiscardPaths.length === 0) return

    const paths = pendingDiscardPaths
    setPendingDiscardPaths(null)
    discardChangesMutation.mutate(paths)
  }

  const handleAddToGitignore = (filePath: string) => {
    setError(null)
    addToGitignoreMutation.mutate(filePath)
  }

  const handleRevealInFinder = (filePath: string) => {
    if (!data?.repoPath) return

    const fullPath = filePath.startsWith('/')
      ? filePath
      : `${data.repoPath.replace(/\/+$/, '')}/${filePath}`

    sendToMoldable({
      type: 'moldable:show-in-folder',
      path: fullPath,
    })
  }

  // Initialize each selected repo with every changed file selected.
  useEffect(() => {
    const repoPath = data?.repoPath ?? null
    if (!repoPath || initializedSelectionRepoRef.current === repoPath) return

    const changedPaths = data?.files.map((file) => file.path) ?? []
    const firstFile = changedPaths[0] ?? null

    initializedSelectionRepoRef.current = repoPath
    setSelectedFile(firstFile)
    setSelectedFiles(new Set(changedPaths))
    setSelectedActionFiles(firstFile ? new Set([firstFile]) : new Set())
    selectionAnchorRef.current = firstFile
  }, [data?.files, data?.repoPath])

  useEffect(() => {
    if (
      editorData?.preferredEditorId &&
      editors.some((editor) => editor.id === editorData.preferredEditorId)
    ) {
      setPreferredEditorId(editorData.preferredEditorId)
      return
    }

    if (!preferredEditorId && editors.length > 0) {
      setPreferredEditorId(editors[0].id)
    }
  }, [editorData?.preferredEditorId, editors, preferredEditorId])

  // The composer's default action follows the currently open repo's own
  // preference (which already resolves to the global fallback server-side).
  const currentRepoPreferredAction = useMemo(
    () =>
      data?.recentRepos?.find((repo) => repo.path === data?.repoPath)
        ?.preferredCommitAction,
    [data?.recentRepos, data?.repoPath],
  )

  useEffect(() => {
    if (currentRepoPreferredAction) {
      setPreferredCommitAction(currentRepoPreferredAction)
    } else if (editorData?.preferredCommitAction) {
      setPreferredCommitAction(editorData.preferredCommitAction)
    }
  }, [currentRepoPreferredAction, editorData?.preferredCommitAction])

  useEffect(() => {
    if (!isFilterOpen) return
    fileFilterInputRef.current?.focus()
  }, [isFilterOpen])

  useEffect(() => {
    if (view !== 'changes' || filteredFiles.length === 0) return
    if (
      selectedFile &&
      filteredFiles.some((file) => file.path === selectedFile)
    ) {
      return
    }

    const nextPath = filteredFiles[0]?.path ?? null
    setSelectedFile(nextPath)
    setSelectedActionFiles(nextPath ? new Set([nextPath]) : new Set())
    selectionAnchorRef.current = nextPath
  }, [filteredFiles, selectedFile, view])

  useEffect(() => {
    if (!selectedCommit) {
      setSelectedCommitFile(null)
      return
    }

    if (loadingCommitFiles) return

    if (commitFiles.length === 0) {
      setSelectedCommitFile(null)
      return
    }

    if (
      selectedCommitFile &&
      commitFiles.some((file) => file.path === selectedCommitFile)
    ) {
      return
    }

    setSelectedCommitFile(commitFiles[0].path)
  }, [commitFiles, loadingCommitFiles, selectedCommit, selectedCommitFile])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName?.toLowerCase()
      const isTypingTarget =
        tagName === 'input' ||
        tagName === 'textarea' ||
        target?.isContentEditable === true

      if (isTypingTarget || view !== 'changes') return
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

      event.preventDefault()
      selectRelativeFile(event.key === 'ArrowDown' ? 1 : -1)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectRelativeFile, view])

  const getFileSelectionRange = useCallback(
    (fromPath: string, toPath: string) => {
      const fromIndex = filteredFiles.findIndex(
        (file) => file.path === fromPath,
      )
      const toIndex = filteredFiles.findIndex((file) => file.path === toPath)

      if (fromIndex === -1 || toIndex === -1) return [toPath]

      const startIndex = Math.min(fromIndex, toIndex)
      const endIndex = Math.max(fromIndex, toIndex)
      return filteredFiles
        .slice(startIndex, endIndex + 1)
        .map((file) => file.path)
    },
    [filteredFiles],
  )

  const handleFileSelect = (
    filePath: string,
    event?: MouseEvent<HTMLElement>,
  ) => {
    const isRangeSelect = event?.shiftKey === true
    const isToggleSelect = event?.metaKey === true || event?.ctrlKey === true

    setSelectedCommit(null)
    setSelectedCommitFile(null)
    setSelectedFile(filePath)

    if (isRangeSelect) {
      const anchorPath = selectionAnchorRef.current ?? selectedFile ?? filePath
      const rangePaths = getFileSelectionRange(anchorPath, filePath)

      setSelectedActionFiles((previous) => {
        const next = isToggleSelect ? new Set(previous) : new Set<string>()
        rangePaths.forEach((path) => next.add(path))
        return next
      })
      return
    }

    selectionAnchorRef.current = filePath

    if (isToggleSelect) {
      setSelectedActionFiles((previous) => {
        const next = new Set(previous)
        if (next.has(filePath)) {
          next.delete(filePath)
        } else {
          next.add(filePath)
        }
        return next
      })
      return
    }

    setSelectedActionFiles(new Set([filePath]))
  }

  const handleFileContextMenu = (filePath: string) => {
    setSelectedCommit(null)
    setSelectedCommitFile(null)
    setSelectedFile(filePath)

    if (selectedActionFiles.has(filePath)) return

    selectionAnchorRef.current = filePath
    setSelectedActionFiles(new Set([filePath]))
  }

  const handleCommitSelect = (hash: string) => {
    setSelectedFile(null)
    setSelectedActionFiles(new Set())
    setSelectedCommit(hash)
    setSelectedCommitFile(null)
  }

  const handleChangesTabSelect = () => {
    const nextPath = filteredFiles[0]?.path ?? data?.files?.[0]?.path ?? null
    setView('changes')
    setSelectedCommit(null)
    setSelectedCommitFile(null)
    setSelectedFile(nextPath)
    setSelectedActionFiles(nextPath ? new Set([nextPath]) : new Set())
    selectionAnchorRef.current = nextPath
  }

  const handleHistoryTabSelect = () => {
    setView('history')
    setSelectedFile(null)
    setSelectedActionFiles(new Set())
    setSelectedCommit(history?.[0]?.hash ?? null)
    setSelectedCommitFile(null)
  }

  useMoldableNavigationPop((message) => {
    const entryId = message.entry?.id

    if (entryId === 'repo') {
      setScreen('home')
      setView('changes')
      setSelectedFile(null)
      setSelectedCommit(null)
      setSelectedCommitFile(null)
      return
    }
  })

  const handleHistoryScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (!hasNextHistoryPage || isFetchingNextHistoryPage) return

      const element = event.currentTarget
      const remaining =
        element.scrollHeight - element.scrollTop - element.clientHeight
      if (remaining < 240) {
        void fetchNextHistoryPage()
      }
    },
    [fetchNextHistoryPage, hasNextHistoryPage, isFetchingNextHistoryPage],
  )

  const prepareCommitInput = async (): Promise<CommitInput | null> => {
    const paths = selectedCommitPaths
    const repoPath = data?.repoPath

    if (paths.length === 0) {
      setError('Please select at least one changed file to commit.')
      return null
    }

    setError(null)
    generateCommitMessageMutation.reset()
    reviewCodeMutation.reset()
    commitMutation.reset()

    let commitSummary = summary.trim()
    let commitDescription = description.trim()

    if (!commitSummary) {
      try {
        const generated = await generateCommitMessageMutation.mutateAsync({
          paths,
          repoPath,
        })
        commitSummary = generated.summary.trim()
        commitDescription = generated.description?.trim() ?? ''
        setSummary(commitSummary)
        setDescription(commitDescription)
      } catch {
        return null
      }
    }

    return {
      paths,
      repoPath,
      summary: commitSummary,
      description: commitDescription,
    }
  }

  const handleCommit = async () => {
    const input = await prepareCommitInput()
    if (!input) return

    commitMutation.mutate(input)
  }

  const handleCommitAndPush = async () => {
    const input = await prepareCommitInput()
    if (!input) return

    commitAndPushMutation.mutate(input)
  }

  const handleCommitAndOpenPullRequest = async () => {
    const input = await prepareCommitInput()
    if (!input) return

    commitAndOpenPullRequestMutation.mutate(input)
  }

  const copyError = () => {
    if (error) {
      navigator.clipboard.writeText(error)
    }
  }

  const copyCommitHash = () => {
    if (selectedCommit) {
      navigator.clipboard.writeText(selectedCommit)
    }
  }

  const buildReviewPrompt = (findings?: CodeReviewFinding[]) => {
    if (!codeReview) return ''

    const selectedPaths = selectedCommitPaths
    const reviewFindings = findings ?? codeReview.findings

    return [
      `Help me fix code review feedback in the Git app at ${data?.repoPath ?? 'the current repository'}.`,
      '',
      `Selected files (${selectedPaths.length}):`,
      selectedPaths.length > 0
        ? selectedPaths.map((path) => `- ${path}`).join('\n')
        : '- No specific files selected',
      '',
      'Review summary:',
      codeReview.summary,
      '',
      'Review findings:',
      reviewFindings.length > 0
        ? reviewFindings
            .map((finding, index) => {
              return [
                `${index + 1}. ${finding.title ?? 'Review finding'}`,
                finding.severity ? `Severity: ${finding.severity}` : null,
                finding.file ? `File: ${finding.file}` : null,
                finding.details ? `Details: ${finding.details}` : null,
                finding.suggestion
                  ? `Suggested fix: ${finding.suggestion}`
                  : null,
              ]
                .filter(Boolean)
                .join('\n')
            })
            .join('\n\n')
        : '- No findings, but please review the summary and suggest any worthwhile fixes.',
      '',
      'Please make the necessary code changes directly in this app.',
    ].join('\n')
  }

  const loadReviewIntoChat = (findings?: CodeReviewFinding[]) => {
    const prompt = buildReviewPrompt(findings)
    if (!prompt) return

    try {
      setIsHandingOffToChat(true)
      setChatActionFeedback(null)

      const instructions = `The user is working in the Git app at ${data?.repoPath ?? 'the current repository'}. They want help addressing code review feedback. Use the repository and findings below as the active task context.\n\n${prompt}`
      sendToMoldable({
        type: 'moldable:set-chat-instructions',
        text: instructions,
      })
      sendToMoldable({ type: 'moldable:set-chat-input', text: prompt })

      window.setTimeout(() => {
        setIsHandingOffToChat(false)
        setChatActionFeedback('Loaded review details into chat.')
        window.setTimeout(() => setChatActionFeedback(null), 4000)
      }, 600)
    } catch {
      setIsHandingOffToChat(false)
      setChatActionFeedback('Could not load review details into chat.')
      window.setTimeout(() => setChatActionFeedback(null), 4000)
    }
  }

  const getFindingKey = (finding: CodeReviewFinding, index: number) => {
    return `${finding.file ?? 'finding'}::${finding.title ?? 'untitled'}::${index}`
  }

  const dismissFinding = (finding: CodeReviewFinding, index: number) => {
    const key = getFindingKey(finding, index)
    setDismissedFindingKeys((previous) => new Set(previous).add(key))
  }

  const copyFinding = async (finding: CodeReviewFinding, index: number) => {
    const findingText = [
      `${index + 1}. ${finding.title ?? 'Review finding'}`,
      finding.severity ? `Severity: ${finding.severity}` : null,
      finding.file ? `File: ${finding.file}` : null,
      finding.details ? `Details: ${finding.details}` : null,
      finding.suggestion ? `Suggested fix: ${finding.suggestion}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    await navigator.clipboard.writeText(findingText)
  }

  const copyAllReview = async () => {
    if (!codeReview) return

    const reviewText = [
      'Code Review',
      '',
      'Review summary:',
      codeReview.summary,
      '',
      'Review findings:',
      visibleFindings.length > 0
        ? visibleFindings
            .map(({ finding, originalIndex }) => {
              return [
                `${originalIndex + 1}. ${finding.title ?? 'Review finding'}`,
                finding.severity ? `Severity: ${finding.severity}` : null,
                finding.file ? `File: ${finding.file}` : null,
                finding.details ? `Details: ${finding.details}` : null,
                finding.suggestion
                  ? `Suggested fix: ${finding.suggestion}`
                  : null,
              ]
                .filter(Boolean)
                .join('\n')
            })
            .join('\n\n')
        : 'No review items remaining',
    ].join('\n')

    try {
      await navigator.clipboard.writeText(reviewText)
      setChatActionFeedback('Copied review details.')
      window.setTimeout(() => setChatActionFeedback(null), 4000)
    } catch {
      setChatActionFeedback('Could not copy review details.')
      window.setTimeout(() => setChatActionFeedback(null), 4000)
    }
  }

  const toggleFile = (path: string) => {
    setCodeReview(null)
    setSelectedFiles((previous) => {
      const next = new Set(previous)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    setCodeReview(null)
    if (checked && data?.files) {
      setSelectedFiles(new Set(data.files.map((f) => f.path)))
    } else {
      setSelectedFiles(new Set())
    }
  }

  const handleRepoChange = (repoPath: string) => {
    if (repositoryControlsDisabled) return

    setError(null)
    setCodeReview(null)
    if (screen === 'home') {
      pushMoldableNavigation({
        id: 'repo',
        title: repoPath.split('/').filter(Boolean).pop() ?? 'Repository',
      })
    }
    setScreen('detail')
    setView('changes')
    repoMutation.mutate(repoPath)
  }

  const handleRepoBack = () => {
    popMoldableNavigation('repo')
    setScreen('home')
    setView('changes')
    setSelectedFile(null)
    setSelectedCommit(null)
    setSelectedCommitFile(null)
  }

  const handleBranchChange = (branch: string) => {
    if (repositoryControlsDisabled || branch === data?.currentBranch) return

    setError(null)
    branchMutation.mutate(branch)
  }

  const shipRepo = useCallback(
    async (repoPath: string) => {
      setShippingPaths((previous) => new Set(previous).add(repoPath))
      setError(null)
      try {
        const res = await fetchWithWorkspace('/api/git', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'quickShip', repoPath }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Quick action failed')

        const result = json as {
          repoName: string
          action: PreferredCommitAction
          pullRequestUrl?: string
          pushed?: boolean
        }

        if (result.pullRequestUrl) {
          sendToMoldable({
            type: 'moldable:open-url',
            url: result.pullRequestUrl,
          })
        }

        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Quick action failed')
        return null
      } finally {
        setShippingPaths((previous) => {
          const next = new Set(previous)
          next.delete(repoPath)
          return next
        })
        queryClient.invalidateQueries({
          queryKey: ['git-status', workspaceId],
        })
        queryClient.invalidateQueries({
          queryKey: ['git-history', workspaceId],
        })
      }
    },
    [fetchWithWorkspace, queryClient, workspaceId],
  )

  const pushRepo = useCallback(
    async (repoPath: string) => {
      setShippingPaths((previous) => new Set(previous).add(repoPath))
      setError(null)
      try {
        const res = await fetchWithWorkspace('/api/git', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'push', repoPath }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Push failed')
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Push failed')
        return false
      } finally {
        setShippingPaths((previous) => {
          const next = new Set(previous)
          next.delete(repoPath)
          return next
        })
        queryClient.invalidateQueries({
          queryKey: ['git-status', workspaceId],
        })
        queryClient.invalidateQueries({
          queryKey: ['git-history', workspaceId],
        })
      }
    },
    [fetchWithWorkspace, queryClient, workspaceId],
  )

  const dirtyRepos = useMemo(
    () =>
      (data?.recentRepos ?? []).filter(
        (repo) => repo.isDirty && (repo.changedCount ?? 0) > 0,
      ),
    [data?.recentRepos],
  )

  // Every known repo, dirty ones first, so the "View all" list lets you reach a
  // clean repo's detail view (history, past diffs) — not just the dirty ones.
  const allRepos = useMemo(() => {
    const repos = [...(data?.recentRepos ?? [])]
    return repos.sort((a, b) => {
      const aDirty = a.isDirty && (a.changedCount ?? 0) > 0 ? 1 : 0
      const bDirty = b.isDirty && (b.changedCount ?? 0) > 0 ? 1 : 0
      if (aDirty !== bDirty) return bDirty - aDirty
      return a.name.localeCompare(b.name)
    })
  }, [data?.recentRepos])
  const repoSections = useMemo(
    () =>
      [...(data?.repoSections ?? [])].sort(
        (left, right) => left.position - right.position,
      ),
    [data?.repoSections],
  )
  const hasCustomSections = repoSections.length > 0
  const visibleDirtyRepos = useMemo(
    () =>
      hasCustomSections
        ? dirtyRepos.filter((repo) => !repo.sectionId)
        : dirtyRepos,
    [dirtyRepos, hasCustomSections],
  )
  const unassignedRepos = useMemo(
    () => allRepos.filter((repo) => !repo.sectionId),
    [allRepos],
  )
  const activeDragRepo = activeDragRepoPath
    ? allRepos.find((repo) => repo.path === activeDragRepoPath)
    : undefined

  const createSection = async (repoPath?: string) => {
    const existingNames = new Set(
      repoSections.map((section) => section.name.toLocaleLowerCase()),
    )
    let index = 1
    let name = 'New section'
    while (existingNames.has(name.toLocaleLowerCase())) {
      index += 1
      name = `New section ${index}`
    }

    const created = (await repoOrganizationMutation.mutateAsync({
      action: 'createRepoSection',
      sectionName: name,
    })) as RepoSection
    if (repoPath) {
      await repoOrganizationMutation.mutateAsync({
        action: 'assignRepoSection',
        path: repoPath,
        sectionId: created.id,
      })
    }
    setEditingSection({ id: created.id, name: created.name })
  }

  const saveSectionRename = async (section: RepoSection) => {
    if (savingSectionIdRef.current === section.id) return
    const nextName = editingSection?.name.trim()
    setEditingSection(null)
    if (!nextName || nextName === section.name) return

    savingSectionIdRef.current = section.id
    try {
      await repoOrganizationMutation.mutateAsync({
        action: 'updateRepoSection',
        sectionId: section.id,
        sectionName: nextName,
      })
    } finally {
      savingSectionIdRef.current = null
    }
  }

  const assignRepoSection = (repoPath: string, sectionId: string | null) =>
    repoOrganizationMutation.mutate({
      action: 'assignRepoSection',
      path: repoPath,
      sectionId,
    })

  const handleRepoDragStart = (event: DragStartEvent) => {
    const repoPath = event.active.data.current?.repoPath
    setActiveDragRepoPath(typeof repoPath === 'string' ? repoPath : null)
  }

  const handleRepoDragEnd = (event: DragEndEvent) => {
    setActiveDragRepoPath(null)
    const repoPath = event.active.data.current?.repoPath
    const sectionId = event.over?.data.current?.sectionId
    if (
      typeof repoPath !== 'string' ||
      (typeof sectionId !== 'string' && sectionId !== null)
    ) {
      return
    }
    const repo = allRepos.find((candidate) => candidate.path === repoPath)
    if ((repo?.sectionId ?? null) === sectionId) return
    void assignRepoSection(repoPath, sectionId)
  }

  const handleShipAll = async () => {
    if (isShippingAll || dirtyRepos.length === 0) return

    setIsShippingAll(true)
    setShipFeedback(null)

    const reposToShip = [...dirtyRepos]
    let nextRepoIndex = 0

    // Run a small worker pool instead of a waterfall. Three concurrent repos is
    // fast enough for multi-repo cleanup without stampeding git hooks, pushes,
    // or AI commit-message generation.
    const workerCount = Math.min(SHIP_ALL_CONCURRENCY, reposToShip.length)
    const results = await Promise.all(
      Array.from({ length: workerCount }, async () => {
        let shipped = 0
        let failed = 0

        while (nextRepoIndex < reposToShip.length) {
          const repo = reposToShip[nextRepoIndex]
          nextRepoIndex += 1

          const result = await shipRepo(repo.path)
          if (result) {
            shipped += 1
          } else {
            failed += 1
          }
        }

        return { shipped, failed }
      }),
    )

    const shipped = results.reduce((total, result) => total + result.shipped, 0)
    const failed = results.reduce((total, result) => total + result.failed, 0)

    setIsShippingAll(false)
    setShipFeedback(
      failed === 0
        ? `Shipped ${shipped} ${shipped === 1 ? 'repo' : 'repos'}. Inbox zero.`
        : `Shipped ${shipped}, ${failed} need attention.`,
    )
    window.setTimeout(() => setShipFeedback(null), 5000)
  }

  const getCommitActionPresentation = (action?: PreferredCommitAction) => {
    if (action === 'commit-and-open-pr') {
      return { Icon: GitPullRequest, label: 'Commit & open PR' }
    }
    if (action === 'commit') {
      return { Icon: GitCommit, label: 'Commit' }
    }
    return { Icon: ArrowUp, label: 'Commit & push' }
  }

  const renderRepoQuickAction = (repo: RecentRepo) => {
    const repoDirty = repo.isDirty && (repo.changedCount ?? 0) > 0
    const hasUnpushedCommits = (repo.ahead ?? 0) > 0
    if (!repoDirty && !hasUnpushedCommits) return null

    const isShipping = shippingPaths.has(repo.path)
    if (!repoDirty) {
      return (
        <button
          type="button"
          onClick={() => void pushRepo(repo.path)}
          disabled={isShipping || isShippingAll}
          title="Push"
          aria-label={`Push ${repo.name}`}
          className="bg-primary text-primary-foreground flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-2"
        >
          {isShipping ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <ArrowUp className="size-3.5" />
          )}
          <span className="hidden sm:inline">Push</span>
        </button>
      )
    }

    const actionPresentation = getCommitActionPresentation(
      repo.preferredCommitAction,
    )
    const ActionIcon = actionPresentation.Icon

    return (
      <div className="bg-primary text-primary-foreground flex shrink-0 overflow-hidden rounded-lg shadow-sm">
        <button
          type="button"
          onClick={() => void shipRepo(repo.path)}
          disabled={isShipping || isShippingAll}
          title={actionPresentation.label}
          aria-label={`${actionPresentation.label} ${repo.name}`}
          className="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-2"
        >
          {isShipping ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <ActionIcon className="size-3.5" />
          )}
          <span className="hidden sm:inline">{actionPresentation.label}</span>
        </button>
        <div className="bg-primary-foreground/20 my-1.5 w-px shrink-0" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Change default action for ${repo.name}`}
              disabled={isShipping || isShippingAll}
              className="hover:bg-primary-foreground/10 inline-flex w-8 shrink-0 cursor-pointer items-center justify-center transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="text-muted-foreground truncate px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider">
              Default action · {repo.name}
            </div>
            {COMMIT_ACTIONS.map((option) => {
              const OptionIcon = option.Icon
              return (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() =>
                    void handlePreferredCommitActionChange(
                      option.value,
                      repo.path,
                    )
                  }
                >
                  <OptionIcon className="size-3.5" />
                  {option.label}
                  {repo.preferredCommitAction === option.value ? (
                    <span className="text-muted-foreground ml-auto text-[11px]">
                      Default
                    </span>
                  ) : null}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  const renderRepoContextMenu = (repo: RecentRepo, trigger: ReactNode) => (
    <ContextMenu key={repo.path}>
      <ContextMenuTrigger asChild>{trigger}</ContextMenuTrigger>
      <ContextMenuContent className="border-border/60 bg-popover/95 w-64 rounded-xl p-1.5 shadow-2xl backdrop-blur">
        {repoSections.map((section) => (
          <ContextMenuItem
            key={section.id}
            disabled={repositoryControlsDisabled}
            onSelect={() => void assignRepoSection(repo.path, section.id)}
            className="cursor-pointer rounded-lg py-2 text-[13px] font-semibold"
          >
            <Folder className="size-4" />
            <span className="min-w-0 flex-1 truncate">
              Move to {section.name}
            </span>
            {repo.sectionId === section.id ? (
              <Check className="text-muted-foreground size-3.5" />
            ) : null}
          </ContextMenuItem>
        ))}
        {repoSections.length > 0 ? (
          <ContextMenuItem
            disabled={repositoryControlsDisabled}
            onSelect={() => void assignRepoSection(repo.path, null)}
            className="cursor-pointer rounded-lg py-2 text-[13px] font-semibold"
          >
            <Folder className="size-4" />
            <span className="min-w-0 flex-1 truncate">Move to Unorganized</span>
            {!repo.sectionId ? (
              <Check className="text-muted-foreground size-3.5" />
            ) : null}
          </ContextMenuItem>
        ) : null}
        <ContextMenuItem
          disabled={repositoryControlsDisabled}
          onSelect={() => void createSection(repo.path).catch(() => undefined)}
          className="cursor-pointer rounded-lg py-2 text-[13px] font-semibold"
        >
          <FolderPlus className="size-4" />
          Move to new section
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          disabled={repositoryControlsDisabled}
          onSelect={() => removeRepoMutation.mutate(repo.path)}
          className="cursor-pointer rounded-lg py-2 text-[13px] font-semibold"
        >
          <Trash2 className="size-4" />
          Remove repository
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )

  const renderOrganizedRepoRow = (repo: RecentRepo) => {
    const repoDirty = repo.isDirty && (repo.changedCount ?? 0) > 0
    const aheadCount = repo.ahead ?? 0

    return (
      <DraggableRepoRow
        key={repo.path}
        repo={repo}
        disabled={repositoryControlsDisabled}
      >
        {(dragHandleProps) =>
          renderRepoContextMenu(
            repo,
            <div className="hover:bg-accent/40 group flex items-center transition-colors">
              <button
                onClick={() => handleRepoChange(repo.path)}
                disabled={repositoryControlsDisabled}
                className="flex min-w-0 flex-1 cursor-grab items-center gap-3 px-3 py-2.5 text-left active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60"
                {...dragHandleProps}
              >
                <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
                  <FolderGit className="size-4" />
                </span>
                <span className="truncate text-[13px] font-medium">
                  {repo.name}
                </span>
                {repo.branch && (
                  <span className="text-muted-foreground hidden shrink-0 items-center gap-1 text-[11px] sm:inline-flex">
                    <GitBranch className="size-2.5" />
                    {repo.branch}
                  </span>
                )}
                <span className="ml-auto shrink-0 text-[11px] font-medium">
                  {repoDirty ? (
                    <span className="text-primary">
                      {repo.changedCount}{' '}
                      {repo.changedCount === 1 ? 'change' : 'changes'}
                    </span>
                  ) : aheadCount > 0 ? (
                    <span className="text-primary">{aheadCount} unpushed</span>
                  ) : (
                    <span className="text-muted-foreground/50">clean</span>
                  )}
                </span>
              </button>
              {renderRepoQuickAction(repo)}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={repositoryControlsDisabled}
                    title={`Organize ${repo.name}`}
                    aria-label={`Organize ${repo.name}`}
                    className="text-muted-foreground hover:bg-accent hover:text-foreground mr-2 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Folder className="size-3.5" />
                      Move to
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">
                      {repoSections.map((section) => (
                        <DropdownMenuItem
                          key={section.id}
                          onSelect={() =>
                            void assignRepoSection(repo.path, section.id)
                          }
                        >
                          <span className="w-4">
                            {repo.sectionId === section.id ? (
                              <Check className="size-3.5" />
                            ) : null}
                          </span>
                          {section.name}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        onSelect={() => void assignRepoSection(repo.path, null)}
                      >
                        <span className="w-4">
                          {!repo.sectionId ? (
                            <Check className="size-3.5" />
                          ) : null}
                        </span>
                        Unorganized
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem
                    onSelect={() =>
                      void createSection(repo.path).catch(() => undefined)
                    }
                  >
                    <FolderPlus className="size-3.5" />
                    Move to new section
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => removeRepoMutation.mutate(repo.path)}
                  >
                    <Trash2 className="size-3.5" />
                    Remove repository
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>,
          )
        }
      </DraggableRepoRow>
    )
  }

  const renderRepoSection = (
    section: RepoSection | null,
    repos: RecentRepo[],
  ) => {
    const collapsed = section?.collapsed ?? unorganizedReposCollapsed
    const label = section?.name ?? 'Unorganized'
    const isEditing = section && editingSection?.id === section.id
    const sortMode = section?.sortMode ?? data?.unorganizedRepoSort ?? 'name'
    const sortedRepos = sortRepos(repos, sortMode)

    return (
      <RepoSectionDropZone
        key={section?.id ?? UNASSIGNED_REPO_SECTION_ID}
        sectionId={section?.id ?? null}
        active={Boolean(activeDragRepoPath)}
      >
        <div className="border-border/50 flex h-9 items-center border-b px-1.5">
          {isEditing ? (
            <form
              className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5"
              onSubmit={(event) => {
                event.preventDefault()
                void saveSectionRename(section).catch(() => undefined)
              }}
            >
              <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
              <Input
                autoFocus
                aria-label="Section name"
                value={editingSection.name}
                maxLength={60}
                onChange={(event) =>
                  setEditingSection({
                    id: section.id,
                    name: event.target.value,
                  })
                }
                onBlur={() =>
                  void saveSectionRename(section).catch(() => undefined)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    setEditingSection(null)
                  }
                }}
                className="h-7 min-w-0 flex-1 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
              />
            </form>
          ) : (
            <button
              type="button"
              aria-expanded={!collapsed}
              onClick={() => {
                if (section) {
                  repoOrganizationMutation.mutate({
                    action: 'updateRepoSection',
                    sectionId: section.id,
                    collapsed: !collapsed,
                  })
                } else {
                  setUnorganizedReposCollapsed(!collapsed)
                }
              }}
              className="text-muted-foreground hover:text-foreground flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-1.5 text-left text-xs font-semibold transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              <span className="truncate">{label}</span>
              <span className="tabular-nums">{repos.length}</span>
            </button>
          )}
          <Select
            value={sortMode}
            disabled={repositoryControlsDisabled}
            onValueChange={(value) => {
              const nextSortMode = value as RepoSortMode
              if (section) {
                repoOrganizationMutation.mutate({
                  action: 'updateRepoSection',
                  sectionId: section.id,
                  sortMode: nextSortMode,
                })
              } else {
                repoOrganizationMutation.mutate({
                  action: 'updateUnorganizedRepoSort',
                  sortMode: nextSortMode,
                })
              }
            }}
          >
            <SelectTrigger
              aria-label={`Sort ${label} repositories`}
              className="mr-1 h-7 w-[6.75rem] shrink-0 border-0 bg-transparent px-2 text-[11px] font-medium shadow-none focus:ring-1"
            >
              <span>{sortMode === 'changes' ? 'Changes' : 'Name'}</span>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="changes">Changes</SelectItem>
            </SelectContent>
          </Select>
          {section && !isEditing ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Section options for ${section.name}`}
                  className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors"
                >
                  <MoreHorizontal className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onSelect={() =>
                    setEditingSection({ id: section.id, name: section.name })
                  }
                >
                  <Pencil className="size-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setDeleteSectionTarget(section)}
                >
                  <Trash2 className="size-3.5" />
                  Delete section
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        {!collapsed ? (
          <div className="divide-border/60 divide-y">
            {sortedRepos.length > 0 ? (
              sortedRepos.map(renderOrganizedRepoRow)
            ) : (
              <div className="text-muted-foreground px-3 py-3 text-center text-[11px]">
                {activeDragRepoPath
                  ? 'Drop a repository here'
                  : 'No repositories'}
              </div>
            )}
          </div>
        ) : null}
      </RepoSectionDropZone>
    )
  }

  useMoldableCommands({
    'switch-repository': (payload) => {
      const repoPath = (payload as { repoPath?: unknown } | null)?.repoPath
      if (typeof repoPath === 'string') {
        handleRepoChange(repoPath)
      }
    },
  })

  // Today deep-link: opening a repo card from the Today view sends
  // { type: 'moldable:navigate', path } — switch straight to that repo.
  const handleRepoChangeRef = useRef(handleRepoChange)
  handleRepoChangeRef.current = handleRepoChange

  const consumeUiIntent = useCallback(async () => {
    if (repositoryControlsDisabled) return
    const response = await fetchWithWorkspace('/api/moldable/ui-intent')
    if (!response.ok) return
    const intent = (await response.json()) as GitUiIntent | null
    if (!intent || seenIntentIds.current.has(intent.id)) return

    if (intent.view === 'repositories') {
      if (screen === 'detail') popMoldableNavigation('repo')
      setScreen('home')
      setView('changes')
    } else if (intent.entityId) {
      handleRepoChangeRef.current(intent.entityId)
      if (intent.view === 'history') {
        setView('history')
      } else {
        setView('changes')
      }
    }

    seenIntentIds.current.add(intent.id)
    await fetchWithWorkspace(
      `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
      { method: 'DELETE' },
    )
  }, [fetchWithWorkspace, repositoryControlsDisabled, screen])

  useEffect(() => {
    void consumeUiIntent()
    const handleAppApiChanged = (event: MessageEvent) => {
      const payload = event.data as {
        type?: string
        workspaceId?: string
        targetAppId?: string
        method?: string
      }
      if (payload.type !== 'moldable:app-api-changed') return
      if (
        payload.targetAppId !== 'git-flow' ||
        payload.workspaceId !== workspaceId
      )
        return
      if (payload.method?.startsWith('git-flow.')) {
        void queryClient.invalidateQueries({
          queryKey: ['git-status', workspaceId],
        })
        void queryClient.invalidateQueries({
          queryKey: ['git-history', workspaceId],
        })
      }
      void consumeUiIntent()
    }
    window.addEventListener('message', handleAppApiChanged)
    return () => window.removeEventListener('message', handleAppApiChanged)
  }, [consumeUiIntent, queryClient, workspaceId])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; path?: unknown } | null
      if (data?.type === 'moldable:navigate' && typeof data.path === 'string') {
        handleRepoChangeRef.current(data.path)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const handleReviewCode = () => {
    const paths = selectedCommitPaths

    if (paths.length === 0) {
      setError('Please select at least one changed file to review.')
      return
    }
    setError(null)
    reviewCodeMutation.mutate({ paths, repoPath: data?.repoPath })
  }

  const selectedApp =
    editors.find((editor) => editor.id === preferredEditorId) ??
    editors[0] ??
    null

  const handlePreferredEditorChange = async (editorId: string) => {
    setPreferredEditorId(editorId)

    try {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setPreferredEditor',
          editorId,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error || 'Failed to save preferred editor')
      }

      queryClient.invalidateQueries({ queryKey: ['git-editors', workspaceId] })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save preferred editor',
      )
    }
  }

  const handlePreferredCommitActionChange = async (
    action: PreferredCommitAction,
    repoPath?: string,
  ) => {
    // Only update the detail composer's own state when editing the repo it is
    // currently showing (or the global fallback). Row menus on the home screen
    // pass another repo's path and should not move the composer.
    if (!repoPath || repoPath === data?.repoPath) {
      setPreferredCommitAction(action)
    }

    try {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setPreferredCommitAction',
          preferredCommitAction: action,
          repoPath,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error || 'Failed to save preferred commit action')
      }

      queryClient.invalidateQueries({ queryKey: ['git-editors', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['git-status', workspaceId] })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save preferred commit action',
      )
    }
  }

  const handlePickFolder = async () => {
    if (repositoryControlsDisabled) return

    try {
      const selected = await new Promise<string | null>((resolve) => {
        const requestId = crypto.randomUUID()

        const handler = (event: MessageEvent) => {
          if (
            event.data?.type === 'moldable:folder-selected' &&
            event.data?.requestId === requestId
          ) {
            window.removeEventListener('message', handler)
            resolve(event.data.path ?? null)
          }
        }

        window.addEventListener('message', handler)
        sendToMoldable({
          type: 'moldable:select-folder',
          requestId,
          title: 'Select Git Repository',
        })

        window.setTimeout(() => {
          window.removeEventListener('message', handler)
          resolve(null)
        }, 60000)
      })

      if (selected) {
        handleRepoChange(selected)
      }
    } catch {
      setError('Failed to open folder picker.')
    }
  }

  const hasUnpushedCommits =
    history?.some((commit) => commit.isUnpushed) ?? false
  const existingPullRequest = data?.pullRequest?.existingPullRequest
  const canViewPullRequest = Boolean(existingPullRequest?.url)
  const canOpenPullRequest = data?.pullRequest?.canOpen === true
  const pullRequestTitle = canViewPullRequest
    ? `View PR #${existingPullRequest?.number ?? ''}`.trim()
    : canOpenPullRequest
      ? `Open PR into ${data?.pullRequest?.baseBranch ?? 'base'}`
      : (data?.pullRequest?.reason ?? 'Branch is not ready for a PR')
  const preferredCommitLabel =
    preferredCommitAction === 'commit-and-open-pr'
      ? 'Commit & open PR'
      : preferredCommitAction === 'commit-and-push'
        ? 'Commit & push'
        : 'Commit'
  const changedFileCount = data?.files?.length ?? 0
  const hasChangedFiles = changedFileCount > 0
  const hasVisibleChangedFiles = visibleChangedFileCount > 0
  const latestCommit = history?.[0]
  const canUndoSelectedCommit =
    !!selectedCommit &&
    latestCommit?.hash === selectedCommit &&
    latestCommit.isUnpushed === true
  const pendingDiscardCount = pendingDiscardPaths?.length ?? 0
  const pendingDiscardPreview = pendingDiscardPaths?.slice(0, 5) ?? []

  const visibleFindings = codeReview
    ? codeReview.findings
        .map((finding, index) => ({ finding, originalIndex: index }))
        .filter(
          ({ finding, originalIndex }) =>
            !dismissedFindingKeys.has(getFindingKey(finding, originalIndex)),
        )
    : []

  const errorTitle = (() => {
    if (generateCommitMessageMutation.isError) return 'Generation Failed'
    if (reviewCodeMutation.isError) return 'Review Failed'
    if (commitMutation.isError) return 'Commit Failed'
    if (commitAndPushMutation.isError) return 'Commit Failed'
    if (pushMutation.isError) return 'Push Failed'
    if (commitAndOpenPullRequestMutation.isError) return 'Pull Request Failed'
    if (openPullRequestMutation.isError) return 'Pull Request Failed'
    if (undoMutation.isError) return 'Undo Failed'
    if (branchMutation.isError) return 'Branch Failed'
    if (repoMutation.isError) return 'Repository Failed'
    return 'Action Failed'
  })()

  type FileStatusKind =
    | 'added'
    | 'copied'
    | 'deleted'
    | 'modified'
    | 'renamed'
    | 'unmerged'
    | 'untracked'

  const getChangedFileStatusKind = (file: GitFile): FileStatusKind => {
    const status = `${file.index}${file.working_dir}`

    if (status.includes('U')) return 'unmerged'
    if (status.includes('?')) return 'untracked'
    if (status.includes('D')) return 'deleted'
    if (status.includes('A')) return 'added'
    if (status.includes('R')) return 'renamed'
    if (status.includes('C')) return 'copied'
    return 'modified'
  }

  const getCommitFileStatusKind = (status: string): FileStatusKind => {
    if (status.startsWith('A')) return 'added'
    if (status.startsWith('D')) return 'deleted'
    if (status.startsWith('R')) return 'renamed'
    if (status.startsWith('C')) return 'copied'
    if (status.startsWith('U')) return 'unmerged'
    return 'modified'
  }

  const getFileStatusPresentation = (
    status: FileStatusKind,
  ): {
    Icon: LucideIcon
    label: string
    title: string
    className: string
  } => {
    if (status === 'added') {
      return {
        Icon: FilePlus,
        label: 'A',
        title: 'Added',
        className: 'text-green-600 dark:text-green-400',
      }
    }

    if (status === 'deleted') {
      return {
        Icon: FileMinus,
        label: 'D',
        title: 'Deleted',
        className: 'text-red-600 dark:text-red-400',
      }
    }

    if (status === 'renamed') {
      return {
        Icon: FileSymlink,
        label: 'R',
        title: 'Renamed',
        className: 'text-amber-600 dark:text-amber-400',
      }
    }

    if (status === 'copied') {
      return {
        Icon: Copy,
        label: 'C',
        title: 'Copied',
        className: 'text-amber-600 dark:text-amber-400',
      }
    }

    if (status === 'unmerged') {
      return {
        Icon: FileX,
        label: '!',
        title: 'Conflict',
        className: 'text-destructive',
      }
    }

    if (status === 'untracked') {
      return {
        Icon: FileQuestion,
        label: 'U',
        title: 'Untracked',
        className: 'text-amber-600 dark:text-amber-400',
      }
    }

    return {
      Icon: FilePenLine,
      label: 'M',
      title: 'Modified',
      className: 'text-blue-600 dark:text-blue-400',
    }
  }

  const renderErrorOverlay = () =>
    error ? (
      <>
        <div
          className="bg-background/20 animate-in fade-in pointer-events-auto absolute inset-0 z-40 cursor-pointer backdrop-blur-[2px] duration-300"
          onClick={() => setError(null)}
        />
        <div className="pointer-events-none absolute inset-x-0 top-[15%] z-50 flex justify-center px-4">
          <div className="border-destructive/30 bg-background/95 animate-in fade-in slide-in-from-top-4 pointer-events-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-lg border shadow-2xl duration-300">
            <div className="border-destructive/20 bg-destructive/10 text-destructive flex items-center justify-between border-b px-3 py-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                <Terminal className="size-3.5" />
                {errorTitle}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={copyError}
                  className="bg-destructive/10 hover:bg-destructive/20 border-destructive/20 flex cursor-pointer items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-bold transition-colors active:scale-95"
                >
                  <Copy className="size-3" />
                  Copy Error
                </button>
                <button
                  onClick={() => setError(null)}
                  className="hover:bg-destructive/10 cursor-pointer rounded p-1 transition-colors active:scale-95"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="custom-scrollbar max-h-[300px] overflow-auto bg-zinc-950 p-4 font-mono text-[11px] leading-relaxed text-red-400">
              <pre className="whitespace-pre-wrap">{error}</pre>
            </div>
            <div className="bg-muted/30 text-muted-foreground flex items-center gap-1.5 px-3 py-2 text-[10px] italic">
              <ShieldAlert className="size-3" />
              Fix the issues and try again.
            </div>
          </div>
        </div>
      </>
    ) : null

  const renderDiffContent = () => (
    <div className="custom-scrollbar bg-muted/30 min-h-0 flex-1 overflow-auto pb-[var(--chat-safe-padding)] dark:bg-zinc-950/20">
      {selectedDiffIsImage ? (
        loadingImagePreview ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <RefreshCw className="text-primary/40 size-6 animate-spin" />
          </div>
        ) : imagePreviewUrl ? (
          <div className="flex min-h-full items-center justify-center p-6">
            <img
              src={imagePreviewUrl}
              alt={selectedDiffPath ?? 'Selected image'}
              className="border-border bg-background max-h-full max-w-full rounded-md border object-contain shadow-sm"
            />
          </div>
        ) : (
          <div className="text-muted-foreground flex min-h-[400px] items-center justify-center px-8 text-center text-sm">
            {imagePreviewFailed
              ? 'Image preview is unavailable for this change.'
              : 'No image preview to display.'}
          </div>
        )
      ) : loadingDiff ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <RefreshCw className="text-primary/40 size-6 animate-spin" />
        </div>
      ) : (
        <div className="min-w-fit py-4 font-mono text-[13px] leading-relaxed">
          {diffLines.length > 0 ? (
            <>
              {diffLines.map((line: string, i: number) => {
                const isAddition =
                  line.startsWith('+') && !line.startsWith('+++')
                const isDeletion =
                  line.startsWith('-') && !line.startsWith('---')
                const isHeader =
                  line.startsWith('diff') ||
                  line.startsWith('index') ||
                  line.startsWith('@@') ||
                  line.startsWith('---') ||
                  line.startsWith('+++')

                return (
                  <div
                    key={i}
                    className={cn(
                      'hover:bg-foreground/[0.03] group grid grid-cols-[50px_1fr] border-l-4 border-transparent',
                      isAddition &&
                        'border-l-green-600/50 bg-green-500/10 dark:border-l-green-500/60',
                      isDeletion &&
                        'border-l-red-600/50 bg-red-500/10 dark:border-l-red-500/60',
                      isHeader &&
                        'text-muted-foreground bg-sky-500/5 py-0.5 font-bold tracking-tight',
                    )}
                  >
                    <div className="border-foreground/5 table-cell select-none border-r pr-5 text-right align-middle font-sans text-[10px] opacity-40 dark:opacity-20">
                      {i + 1}
                    </div>
                    <div
                      className={cn(
                        'whitespace-pre px-5 tabular-nums',
                        isAddition && 'text-green-700 dark:text-green-400',
                        isDeletion && 'text-red-700 dark:text-red-400',
                        isHeader && 'text-sky-700 dark:text-sky-300',
                        !isAddition &&
                          !isDeletion &&
                          !isHeader &&
                          'text-foreground/80 dark:text-zinc-300',
                      )}
                    >
                      {line || ' '}
                    </div>
                  </div>
                )
              })}
              {diffPreviewIsCapped && (
                <div className="border-border/70 bg-background/80 sticky bottom-0 mt-3 flex min-w-[560px] items-center justify-between gap-4 border-t px-5 py-3 font-sans text-[12px] shadow-sm backdrop-blur">
                  <div className="text-muted-foreground min-w-0">
                    Previewing {diffLines.length.toLocaleString()} lines
                    {fileDiffResponse?.truncated
                      ? ' from a large diff.'
                      : diffPreview.clippedByCharacterLimit
                        ? ' from a large diff.'
                        : '.'}{' '}
                    {diffLineLimit >= MAX_RENDERED_DIFF_LINES ||
                    fileDiffResponse?.truncated ||
                    diffPreview.clippedByCharacterLimit
                      ? 'Open the file in your editor for the full context.'
                      : 'Load more only when you need additional context.'}
                  </div>
                  {diffPreview.hasMore &&
                    diffLineLimit < MAX_RENDERED_DIFF_LINES &&
                    !diffPreview.clippedByCharacterLimit &&
                    !fileDiffResponse?.truncated && (
                      <button
                        type="button"
                        onClick={() =>
                          setDiffLineLimit((current) =>
                            Math.min(
                              current + DIFF_LINE_INCREMENT,
                              MAX_RENDERED_DIFF_LINES,
                            ),
                          )
                        }
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors"
                      >
                        Show more
                      </button>
                    )}
                </div>
              )}
            </>
          ) : (
            <div className="flex min-h-[400px] items-center justify-center font-sans italic opacity-20">
              No changes to display
            </div>
          )}
        </div>
      )}
    </div>
  )

  if (loading && !data) {
    return (
      <div className="flex h-screen flex-col bg-transparent">
        <Toolbar
          position="top"
          variant="plain"
          material="none"
          className="border-0"
        />
        <MoldableLoadingScreen label="Accessing Git repository" />
      </div>
    )
  }

  if (screen === 'home') {
    const allClean = dirtyRepos.length === 0
    const hasRepos = (data?.recentRepos?.length ?? 0) > 0

    const homeActions = (
      <div className="flex items-center justify-end gap-0.5">
        {!allClean && (
          <ToolbarButton
            material="ultra-thin"
            size="icon-xl"
            onClick={handleShipAll}
            disabled={isShippingAll}
            title="Commit & ship all dirty repos"
            aria-label="Commit & ship all dirty repos"
            className="text-primary hover:bg-accent flex cursor-pointer items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isShippingAll ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <ArrowUpFromLine className="size-4" />
            )}
          </ToolbarButton>
        )}
        <ToolbarButton
          material="ultra-thin"
          size="icon-xl"
          onClick={handlePickFolder}
          disabled={repositoryControlsDisabled}
          title="Open a local repository"
          aria-label="Open a local repository"
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex cursor-pointer items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FolderOpen className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          material="ultra-thin"
          size="icon-xl"
          onClick={() => void createSection().catch(() => undefined)}
          disabled={repoOrganizationMutation.isPending}
          title="New repository section"
          aria-label="New repository section"
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex cursor-pointer items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FolderPlus className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          material="ultra-thin"
          size="icon-xl"
          onClick={() => fetchData()}
          disabled={loading}
          title="Refresh"
          aria-label="Refresh"
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex cursor-pointer items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
        </ToolbarButton>
      </div>
    )

    return (
      <div className="text-foreground flex h-screen flex-col overflow-hidden bg-transparent">
        <AppHeader
          title="Git"
          desktop={false}
          actions={[
            {
              label: 'Open repository',
              icon: Folder,
              onPress: handlePickFolder,
            },
            {
              label: 'New section',
              icon: FolderPlus,
              onPress: () => void createSection().catch(() => undefined),
              placement: 'overflow',
            },
            {
              label: 'Refresh',
              icon: RefreshCw,
              onPress: () => void fetchData(),
              placement: 'overflow',
            },
          ]}
        />
        <Toolbar
          position="top"
          variant="plain"
          material="none"
          className="git-flow-web-toolbar border-0"
        >
          <ToolbarActions>{homeActions}</ToolbarActions>
        </Toolbar>
        <div className="git-flow-home-scroll relative min-h-0 flex-1 overflow-y-auto">
          {renderErrorOverlay()}

          {!hasRepos ? (
            <div className="relative flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                <CheckCircle2 className="size-9" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold tracking-tight">All clean</h2>
                <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                  Add a repository to start tracking your changes.
                </p>
              </div>
              <button
                onClick={handlePickFolder}
                disabled={repositoryControlsDisabled}
                className="border-border bg-background hover:bg-accent mt-1 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <FolderOpen className="size-3.5" />
                Open a repository
              </button>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-2xl space-y-3 p-3 sm:p-4">
              {shipFeedback && (
                <div className="bg-primary/10 text-primary border-primary/20 animate-in fade-in slide-in-from-top-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold">
                  <CheckCircle2 className="size-3.5" />
                  {shipFeedback}
                </div>
              )}

              {allClean ? (
                <div className="border-border/60 bg-card flex flex-col items-center gap-3 rounded-xl border px-6 py-10 text-center shadow-sm">
                  <div className="flex size-14 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold tracking-tight">
                      All clean
                    </h2>
                    <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                      No repositories have uncommitted changes. You&apos;re at
                      inbox zero.
                    </p>
                  </div>
                </div>
              ) : !hasCustomSections && visibleDirtyRepos.length > 0 ? (
                <div className="space-y-2">
                  {visibleDirtyRepos.map((repo) => {
                    const aheadCount = repo.ahead ?? 0

                    return renderRepoContextMenu(
                      repo,
                      <div className="border-border/60 bg-card hover:bg-accent/30 group flex items-center gap-3 rounded-xl border p-3 shadow-sm transition-colors">
                        <button
                          onClick={() => handleRepoChange(repo.path)}
                          disabled={
                            isShippingAll || shippingPaths.has(repo.path)
                          }
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left disabled:cursor-not-allowed"
                        >
                          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                            <FolderGit className="size-[18px]" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold tracking-tight">
                                {repo.name}
                              </span>
                              {repo.branch && (
                                <span className="text-muted-foreground bg-muted inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                                  <GitBranch className="size-2.5" />
                                  {repo.branch}
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                              {repo.changedCount} uncommitted{' '}
                              {repo.changedCount === 1 ? 'change' : 'changes'}
                              {aheadCount > 0
                                ? ` · ${aheadCount} unpushed`
                                : ''}
                            </p>
                          </div>
                        </button>

                        {renderRepoQuickAction(repo)}
                      </div>,
                    )
                  })}
                </div>
              ) : null}

              {allRepos.length > 0 &&
                (hasCustomSections ? (
                  <DndContext
                    sensors={repoDragSensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleRepoDragStart}
                    onDragCancel={() => setActiveDragRepoPath(null)}
                    onDragEnd={handleRepoDragEnd}
                  >
                    <div className="space-y-2">
                      {repoSections.map((section) =>
                        renderRepoSection(
                          section,
                          allRepos.filter(
                            (repo) => repo.sectionId === section.id,
                          ),
                        ),
                      )}
                      {renderRepoSection(null, unassignedRepos)}
                    </div>
                    <DragOverlay dropAnimation={null}>
                      {activeDragRepo ? (
                        <div className="bg-accent border-border flex h-10 w-64 items-center gap-2 rounded-lg border px-3 shadow-lg">
                          <FolderGit className="text-muted-foreground size-4" />
                          <span className="truncate text-xs font-semibold">
                            {activeDragRepo.name}
                          </span>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowAllRepos((value) => !value)}
                      className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 text-xs font-bold transition-colors"
                    >
                      <ChevronRight
                        className={cn(
                          'size-3.5 transition-transform',
                          showAllRepos && 'rotate-90',
                        )}
                      />
                      {showAllRepos ? 'Hide repositories' : 'View all'} (
                      {allRepos.length})
                    </button>
                    {showAllRepos && (
                      <div className="divide-border/60 divide-y overflow-hidden rounded-xl border">
                        {allRepos.map((repo) => {
                          const repoDirty =
                            repo.isDirty && (repo.changedCount ?? 0) > 0
                          const aheadCount = repo.ahead ?? 0
                          return renderRepoContextMenu(
                            repo,
                            <div className="hover:bg-accent/40 group flex items-center transition-colors">
                              <button
                                onClick={() => handleRepoChange(repo.path)}
                                disabled={
                                  isShippingAll || removeRepoMutation.isPending
                                }
                                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
                                  <FolderGit className="size-4" />
                                </span>
                                <span className="truncate text-[13px] font-medium">
                                  {repo.name}
                                </span>
                                {repo.branch && (
                                  <span className="text-muted-foreground hidden shrink-0 items-center gap-1 text-[11px] sm:inline-flex">
                                    <GitBranch className="size-2.5" />
                                    {repo.branch}
                                  </span>
                                )}
                                <span className="ml-auto shrink-0 text-[11px] font-medium">
                                  {repoDirty ? (
                                    <span className="text-primary">
                                      {repo.changedCount}{' '}
                                      {repo.changedCount === 1
                                        ? 'change'
                                        : 'changes'}
                                    </span>
                                  ) : aheadCount > 0 ? (
                                    <span className="text-primary">
                                      {aheadCount} unpushed
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/50">
                                      clean
                                    </span>
                                  )}
                                </span>
                              </button>
                              {renderRepoQuickAction(repo)}
                              <button
                                type="button"
                                onClick={() =>
                                  removeRepoMutation.mutate(repo.path)
                                }
                                disabled={
                                  isShippingAll || removeRepoMutation.isPending
                                }
                                title={`Remove ${repo.name} from Git`}
                                aria-label={`Remove ${repo.name} from Git`}
                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive mr-2 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-0 transition-all focus:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 group-hover:opacity-100"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>,
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
        {deleteSectionTarget ? (
          <ConfirmDialog
            open
            title={`Delete “${deleteSectionTarget.name}”?`}
            description="Repositories in this section will move to Unorganized. No repositories or files will be deleted."
            confirmLabel="Delete section"
            pendingLabel="Deleting…"
            variant="destructive"
            onOpenChange={(open) => {
              if (!open) setDeleteSectionTarget(null)
            }}
            onConfirm={async () => {
              await repoOrganizationMutation.mutateAsync({
                action: 'deleteRepoSection',
                sectionId: deleteSectionTarget.id,
              })
              setDeleteSectionTarget(null)
            }}
            getErrorMessage={() => 'The section could not be deleted.'}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="text-foreground flex h-screen flex-col overflow-hidden bg-transparent">
      <AppHeader
        title={
          data?.repoName || data?.repoPath?.split('/').pop() || 'Repository'
        }
        back={handleRepoBack}
        backLabel="Back to repositories"
        desktop={false}
        actions={[
          {
            label: 'Refresh',
            icon: RefreshCw,
            onPress: () => void fetchData(),
          },
        ]}
      />
      <AlertDialog
        open={pendingDiscardPaths !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDiscardPaths(null)
        }}
      >
        <AlertDialogContent className="max-h-[calc(100vh-var(--chat-safe-padding)-2rem)] sm:max-w-md">
          <AlertDialogHeader className="items-start text-left">
            <AlertDialogTitle>
              {pendingDiscardCount === 1
                ? 'Discard selected file?'
                : `Discard ${pendingDiscardCount} selected files?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left leading-6">
              This will permanently discard uncommitted changes in the selected
              {pendingDiscardCount === 1 ? ' file' : ' files'} below. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="bg-muted/50 border-border/60 max-h-48 overflow-auto rounded-lg border p-2.5">
            <ul className="space-y-1.5">
              {pendingDiscardPreview.map((filePath) => (
                <li
                  key={filePath}
                  title={filePath}
                  className="text-foreground break-all font-mono text-xs leading-5"
                >
                  {filePath}
                </li>
              ))}
            </ul>
            {pendingDiscardCount > pendingDiscardPreview.length ? (
              <p className="text-muted-foreground mt-2 text-xs">
                +{pendingDiscardCount - pendingDiscardPreview.length} more
              </p>
            ) : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={discardChangesMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={discardChangesMutation.isPending}
              onClick={confirmDiscardChanges}
            >
              {pendingDiscardCount === 1
                ? 'Discard file'
                : `Discard ${pendingDiscardCount} files`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <Toolbar
        position="top"
        variant="plain"
        material="none"
        className="git-flow-web-toolbar"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <ToolbarButton
            material="ultra-thin"
            size="icon-xl"
            type="button"
            onClick={handleRepoBack}
            title="Back to repositories"
            aria-label="Back to repositories"
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex shrink-0 cursor-pointer items-center justify-center transition-colors"
          >
            <ArrowLeft className="size-4" />
          </ToolbarButton>
          <div className="flex min-w-0 items-center gap-2">
            <Select
              value={data?.repoPath || undefined}
              onValueChange={handleRepoChange}
              disabled={repositoryControlsDisabled}
            >
              <SelectTrigger
                className={cn(
                  'hover:bg-muted/35 border-border/60 bg-background [&>svg]:text-muted-foreground h-9 min-w-[200px] max-w-[320px] overflow-hidden rounded-[15px] border px-2.5 shadow-sm transition-colors [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:opacity-100',
                  repositoryControlsDisabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                  <FolderGit className="text-foreground size-3.5 shrink-0" />
                  <span className="text-foreground min-w-0 flex-1 truncate whitespace-nowrap text-left text-[11px] font-bold leading-none">
                    {data?.repoName || data?.repoPath?.split('/').pop()}
                  </span>
                  {data?.isClean === false ? (
                    <span
                      className="bg-primary inline-block size-2 shrink-0 rounded-full"
                      aria-label="Repository has uncommitted changes"
                      title="Repository has uncommitted changes"
                    />
                  ) : null}
                </div>
              </SelectTrigger>
              <SelectContent>
                <div className="bg-muted/10 border-b p-1">
                  <ToolbarButton
                    material="ultra-thin"
                    onClick={handlePickFolder}
                    disabled={repositoryControlsDisabled}
                    className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FolderOpen className="size-3.5" />
                    Open Local Repository...
                  </ToolbarButton>
                </div>
                {data?.recentRepos?.map((repo) => (
                  <SelectItem key={repo.path} value={repo.path}>
                    <div className="flex flex-col items-start gap-0.5 py-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold leading-none">
                          {repo.name}
                        </span>
                        {repo.isDirty ? (
                          <span
                            className="bg-primary inline-block size-2 rounded-full"
                            aria-label={`${repo.name} has uncommitted changes`}
                            title="Repository has uncommitted changes"
                          />
                        ) : null}
                      </div>
                      <span className="text-muted-foreground max-w-[220px] truncate font-mono text-[9.5px] opacity-60">
                        {repo.path}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branch Selector */}
          <div className="flex items-center gap-2">
            <Select
              value={data?.currentBranch || undefined}
              onValueChange={handleBranchChange}
              disabled={repositoryControlsDisabled || !data?.repoPath}
            >
              <SelectTrigger
                className={cn(
                  'hover:bg-muted/35 border-border/60 bg-background [&>svg]:text-muted-foreground h-9 w-[160px] overflow-hidden rounded-[15px] border px-2.5 font-medium shadow-sm transition-colors [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:opacity-100',
                  repositoryControlsDisabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                  <GitBranch className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 overflow-hidden truncate whitespace-nowrap text-left text-[11px] leading-none">
                    {data?.currentBranch || 'Select branch'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {data?.branches?.map((branch: string) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editors.length > 0 && (
            <div className="flex items-center gap-2">
              <Select
                value={preferredEditorId ?? editors[0]?.id}
                onValueChange={handlePreferredEditorChange}
              >
                <SelectTrigger
                  aria-label="Preferred editor"
                  className="hover:bg-muted/35 border-border/60 bg-background [&>svg]:text-muted-foreground h-9 w-[68px] rounded-[15px] border px-1.5 shadow-sm transition-colors [&>svg]:size-3.5 [&>svg]:opacity-100"
                >
                  <div className="flex min-w-0 flex-1 items-center justify-center pl-1">
                    {selectedApp ? (
                      <AppIcon
                        editor={selectedApp}
                        className="size-6 rounded-md"
                      />
                    ) : (
                      <AppWindow className="text-muted-foreground size-5" />
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent
                  align="end"
                  className="border-border/70 bg-popover w-[220px] rounded-[14px] p-1 shadow-xl"
                >
                  {editors.map((editor) => (
                    <SelectItem
                      key={editor.id}
                      value={editor.id}
                      className="focus:bg-muted/45 h-11 rounded-[10px] px-2.5 pr-4 text-base font-normal tracking-normal [&>span:first-child]:hidden"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <AppIcon
                          editor={editor}
                          className="size-6 shrink-0 rounded-md"
                        />
                        <span className="truncate leading-none">
                          {editor.name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <ToolbarActions className="gap-3">
          {canViewPullRequest || canOpenPullRequest ? (
            <ToolbarButton
              material="ultra-thin"
              onClick={() => {
                if (existingPullRequest?.url) {
                  sendToMoldable({
                    type: 'moldable:open-url',
                    url: existingPullRequest.url,
                  })
                  return
                }

                openPullRequestMutation.mutate()
              }}
              disabled={repositoryControlsDisabled && !canViewPullRequest}
              title={pullRequestTitle}
              className="hover:bg-primary/10 text-primary flex cursor-pointer items-center gap-2 px-3 text-xs font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {openPullRequestMutation.isPending ? (
                <RefreshCw className="size-3.5 shrink-0 animate-spin" />
              ) : (
                <GitPullRequest className="size-3.5 shrink-0" />
              )}
              {canViewPullRequest ? 'View PR' : 'Open PR'}
            </ToolbarButton>
          ) : null}
          <ToolbarButton
            material="ultra-thin"
            onClick={() => pushMutation.mutate()}
            disabled={repositoryControlsDisabled || !hasUnpushedCommits}
            title={hasUnpushedCommits ? 'Push to Remote' : 'No commits to push'}
            className="hover:bg-primary/10 text-primary flex cursor-pointer items-center gap-2 px-3 text-xs font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pushMutation.isPending ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <ArrowUp className="size-3.5" />
            )}
            Push
          </ToolbarButton>
          <div className="bg-border/60 h-4 w-px" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarButton
                  material="ultra-thin"
                  size="icon-xl"
                  onClick={() => fetchData()}
                  disabled={repositoryControlsDisabled || loading}
                  className="hover:bg-accent text-muted-foreground flex cursor-pointer items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Refresh status"
                >
                  <RefreshCw
                    className={cn(
                      'size-4',
                      loading && 'text-primary animate-spin',
                    )}
                  />
                </ToolbarButton>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Refresh status</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </ToolbarActions>
      </Toolbar>

      <div className="git-flow-repository-content relative flex flex-1 overflow-hidden">
        {/* Commit Hook Error HUD */}
        {renderErrorOverlay()}

        {/* Code Review Modal */}
        {isReviewModalOpen && codeReview && (
          <>
            <div
              className="bg-background/50 animate-in fade-in absolute inset-0 z-40 cursor-pointer backdrop-blur-sm duration-200"
              onClick={() => setIsReviewModalOpen(false)}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-[var(--chat-safe-padding)] top-0 z-50 flex min-h-0 items-center justify-center p-4 md:p-8">
              <div className="bg-background pointer-events-auto flex h-[min(calc(85vh-var(--chat-safe-padding)),900px)] max-h-full min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-xl border shadow-2xl">
                <div className="bg-muted/30 flex items-start justify-between gap-4 border-b px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="text-primary size-4" />
                      <h2 className="text-sm font-bold tracking-tight">
                        Code Review
                      </h2>
                      {visibleFindings.length > 0 && (
                        <span className="text-muted-foreground text-[11px]">
                          {visibleFindings.length}{' '}
                          {visibleFindings.length === 1
                            ? 'finding'
                            : 'findings'}
                        </span>
                      )}
                    </div>
                    {visibleFindings.length > 0 && (
                      <p className="text-muted-foreground mt-1 max-w-3xl text-xs leading-relaxed">
                        {codeReview.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setIsReviewModalOpen(false)}
                      className="hover:bg-accent cursor-pointer rounded-md p-2 transition-colors active:scale-95"
                      aria-label="Close code review"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {chatActionFeedback && (
                  <div className="bg-primary/10 text-primary border-b px-4 py-2 text-[11px] font-medium">
                    {chatActionFeedback}
                  </div>
                )}

                <div className="relative min-h-0 flex-1">
                  {(reviewCodeMutation.isPending || isHandingOffToChat) && (
                    <div className="bg-background/75 absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                      <RefreshCw className="text-primary size-6 animate-spin" />
                      <div className="space-y-1 text-center">
                        <p className="text-sm font-semibold">
                          {isHandingOffToChat
                            ? 'Handing off to chat…'
                            : 'Verifying fixes…'}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {isHandingOffToChat
                            ? 'Keeping this review open so you can verify fixes after.'
                            : 'Re-running code review on the current changes.'}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="custom-scrollbar h-full overflow-y-auto p-4 md:p-5">
                    {visibleFindings.length === 0 ? (
                      <div className="text-muted-foreground flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-center">
                        <ShieldAlert className="size-8 opacity-40" />
                        <p className="text-foreground text-sm font-semibold">
                          No review items remaining
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {visibleFindings.map(({ finding, originalIndex }) => (
                          <div
                            key={`${finding.file ?? 'finding'}-${originalIndex}`}
                            className="bg-card rounded-lg border p-4 shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-sm font-semibold tracking-tight">
                                    {finding.title ??
                                      `Finding ${originalIndex + 1}`}
                                  </h3>
                                  <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[10px] font-bold uppercase">
                                    {finding.severity ?? 'note'}
                                  </span>
                                </div>
                                {finding.file && (
                                  <p className="text-muted-foreground mt-1 break-all font-mono text-[11px]">
                                    {finding.file}
                                  </p>
                                )}
                              </div>
                              <TooltipProvider>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() =>
                                          copyFinding(finding, originalIndex)
                                        }
                                        className="border-border bg-background hover:bg-accent cursor-pointer rounded-md border p-2 transition-all active:scale-95"
                                        aria-label="Copy finding"
                                      >
                                        <Copy className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p>Copy finding</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <button
                                    onClick={() =>
                                      loadReviewIntoChat([finding])
                                    }
                                    className="border-border bg-background hover:bg-accent flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] font-bold transition-all active:scale-95"
                                  >
                                    <MessageSquare className="size-3.5" />
                                    Fix in chat
                                  </button>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() =>
                                          dismissFinding(finding, originalIndex)
                                        }
                                        className="border-border bg-background hover:bg-accent cursor-pointer rounded-md border p-2 transition-all active:scale-95"
                                        aria-label="Dismiss finding"
                                      >
                                        <Ban className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p>Dismiss finding</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TooltipProvider>
                            </div>

                            {finding.details && (
                              <div className="mt-3">
                                <p className="text-foreground/70 text-[11px] font-bold uppercase tracking-wider">
                                  Details
                                </p>
                                <p className="text-foreground/85 mt-1 text-sm leading-relaxed">
                                  {finding.details}
                                </p>
                              </div>
                            )}

                            {finding.suggestion && (
                              <div className="bg-muted/40 mt-3 rounded-md border p-3">
                                <p className="text-foreground/70 text-[11px] font-bold uppercase tracking-wider">
                                  Suggested fix
                                </p>
                                <p className="text-foreground/85 mt-1 text-sm leading-relaxed">
                                  {finding.suggestion}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-muted/20 flex items-center justify-between gap-3 border-t px-4 py-3">
                  <div className="flex items-center gap-2">
                    {visibleFindings.length > 0 && (
                      <>
                        <button
                          onClick={copyAllReview}
                          className="border-border bg-background hover:bg-accent flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] font-bold transition-all active:scale-95"
                        >
                          <Copy className="size-3.5" />
                          Copy all
                        </button>
                        <button
                          onClick={() => loadReviewIntoChat()}
                          disabled={isHandingOffToChat}
                          className="border-border bg-background hover:bg-accent flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <MessageSquare className="size-3.5" />
                          Fix all in chat
                        </button>
                        <button
                          onClick={handleReviewCode}
                          disabled={reviewCodeMutation.isPending}
                          className="border-border bg-background hover:bg-accent flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {reviewCodeMutation.isPending ? (
                            <>
                              <RefreshCw className="size-3.5 animate-spin" />
                              Re-running review...
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="size-3.5" />
                              Re-run code review
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Separator orientation="vertical" className="h-6" />
                    <button
                      onClick={() => setIsReviewModalOpen(false)}
                      className="border-border bg-background hover:bg-accent cursor-pointer rounded-md border px-3 py-2 text-[11px] font-bold transition-all active:scale-95"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Sidebar */}
        <aside className="bg-muted/5 flex w-72 shrink-0 flex-col border-r">
          <div className="flex h-10 shrink-0 items-center border-b px-2">
            <button
              onClick={handleChangesTabSelect}
              className={cn(
                'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm py-1.5 text-[11px] font-bold transition-all',
                view === 'changes'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/50',
              )}
            >
              <LayoutList className="size-3" />
              Changes
            </button>
            <div className="bg-border/60 mx-1 h-4 w-px shrink-0 self-center rounded-full" />
            <button
              onClick={handleHistoryTabSelect}
              className={cn(
                'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm py-1.5 text-[11px] font-bold transition-all',
                view === 'history'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/50',
              )}
            >
              <History className="size-3" />
              History
            </button>
          </div>

          {view === 'changes' ? (
            <>
              <div className="bg-muted/10 flex shrink-0 items-center justify-between gap-2 border-b p-3.5">
                {isFilterOpen ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Search className="text-muted-foreground size-3.5 shrink-0" />
                    <input
                      ref={fileFilterInputRef}
                      value={fileFilter}
                      onChange={(e) => setFileFilter(e.target.value)}
                      placeholder="Filter changed files"
                      className="bg-background focus:ring-primary h-8 min-w-0 flex-1 rounded-md border px-2.5 text-xs outline-none focus:ring-1"
                    />
                    <button
                      onClick={() => {
                        setFileFilter('')
                        setIsFilterOpen(false)
                      }}
                      className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors"
                      aria-label="Close file filter"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={
                          hasChangedFiles &&
                          selectedCommitPathCount === changedFileCount
                        }
                        onCheckedChange={(checked) =>
                          handleSelectAll(checked === true)
                        }
                      />
                      <h2 className="text-foreground text-[12px] font-semibold">
                        {changedFileCount} changed{' '}
                        {changedFileCount === 1 ? 'file' : 'files'}
                      </h2>
                    </div>
                    <button
                      onClick={() => setIsFilterOpen(true)}
                      className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors"
                      aria-label="Filter changed files"
                      title="Filter changed files"
                    >
                      <Search className="size-3.5" />
                    </button>
                  </>
                )}
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
                  {!hasChangedFiles ? (
                    <div className="-mt-8 flex h-full flex-col items-center justify-center opacity-40 grayscale">
                      <div className="border-muted mb-3 flex size-12 items-center justify-center rounded-full border-2 border-dashed">
                        <GitCommit className="size-6" />
                      </div>
                      <p className="text-xs font-semibold">Workspace clean</p>
                      <p className="mt-1 px-6 text-center text-[10px] opacity-70">
                        No uncommitted changes detected.
                      </p>
                    </div>
                  ) : !hasVisibleChangedFiles ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                      <Search className="text-muted-foreground size-5 opacity-50" />
                      <p className="text-xs font-semibold">No matching files</p>
                      <p className="text-muted-foreground text-[10px]">
                        Try a different filter.
                      </p>
                    </div>
                  ) : (
                    <div
                      className="space-y-0.5"
                      role="listbox"
                      aria-multiselectable="true"
                    >
                      {filteredFiles.map((file) => {
                        const isActionSelected = selectedActionFiles.has(
                          file.path,
                        )
                        const isPrimarySelected = selectedFile === file.path
                        const discardCount = isActionSelected
                          ? selectedActionFiles.size
                          : 1
                        const fileStatus = getFileStatusPresentation(
                          getChangedFileStatusKind(file),
                        )
                        const FileStatusIcon = fileStatus.Icon

                        return (
                          <ContextMenu key={file.path}>
                            <ContextMenuTrigger asChild>
                              <div
                                onClick={(event) =>
                                  handleFileSelect(file.path, event)
                                }
                                onContextMenu={() =>
                                  handleFileContextMenu(file.path)
                                }
                                role="option"
                                aria-selected={isActionSelected}
                                className={cn(
                                  'group flex w-full cursor-pointer select-none items-center gap-3 rounded-md p-2 text-left transition-all',
                                  isPrimarySelected
                                    ? 'bg-primary/10 shadow-sm'
                                    : isActionSelected
                                      ? 'bg-accent/70'
                                      : 'hover:bg-accent/40',
                                )}
                              >
                                <div
                                  className="flex items-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={selectedFiles.has(file.path)}
                                    onCheckedChange={() =>
                                      toggleFile(file.path)
                                    }
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span
                                      className={cn(
                                        'truncate text-xs font-medium tracking-tight opacity-70 transition-opacity group-hover:opacity-100',
                                        isPrimarySelected
                                          ? 'text-primary opacity-100'
                                          : isActionSelected
                                            ? 'text-foreground opacity-90'
                                            : 'text-muted-foreground',
                                      )}
                                    >
                                      {file.path}
                                    </span>
                                    <span
                                      className={cn(
                                        'flex size-4 shrink-0 items-center justify-center',
                                        fileStatus.className,
                                      )}
                                      title={fileStatus.title}
                                      aria-label={fileStatus.title}
                                    >
                                      <FileStatusIcon className="size-4" />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="border-border/60 bg-popover/95 w-64 rounded-xl p-1.5 shadow-2xl backdrop-blur">
                              <ContextMenuItem
                                variant="destructive"
                                disabled={discardChangesMutation.isPending}
                                onSelect={() => {
                                  setTimeout(
                                    () => requestDiscardChanges(file.path),
                                    0,
                                  )
                                }}
                                className="cursor-pointer rounded-lg py-2 text-[13px] font-semibold"
                              >
                                <Trash2 className="size-4" />
                                Discard changes
                                {discardCount > 1 ? (
                                  <span className="text-muted-foreground ml-auto text-[11px]">
                                    {discardCount}
                                  </span>
                                ) : null}
                              </ContextMenuItem>
                              <ContextMenuItem
                                disabled={addToGitignoreMutation.isPending}
                                onSelect={() => handleAddToGitignore(file.path)}
                                className="cursor-pointer rounded-lg py-2 text-[13px] font-semibold"
                              >
                                <FilePlus className="size-4" />
                                Add file to .gitignore
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                onSelect={() => handleRevealInFinder(file.path)}
                                className="cursor-pointer rounded-lg py-2 text-[13px] font-semibold"
                              >
                                <FolderOpen className="size-4" />
                                Reveal in Finder
                              </ContextMenuItem>
                              <ContextMenuItem
                                disabled={editors.length === 0}
                                onSelect={() =>
                                  void handleOpenFileInEditor(file.path)
                                }
                                className="cursor-pointer rounded-lg py-2 text-[13px] font-semibold"
                              >
                                {selectedApp ? (
                                  <AppIcon
                                    editor={selectedApp}
                                    className="size-4 rounded-[4px]"
                                  />
                                ) : (
                                  <Code2 className="size-4" />
                                )}
                                Open in chosen editor
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        )
                      })}
                    </div>
                  )}
                </div>

                {hasChangedFiles && (
                  <div className="bg-muted/20 shrink-0 border-t p-4">
                    <div className="space-y-1.5">
                      <input
                        placeholder="Leave blank to autogenerate a conventional commit message"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        disabled={
                          commitMutation.isPending ||
                          commitAndPushMutation.isPending ||
                          generateCommitMessageMutation.isPending ||
                          reviewCodeMutation.isPending ||
                          commitAndOpenPullRequestMutation.isPending
                        }
                        className="bg-background focus:ring-primary placeholder:text-muted-foreground/50 w-full rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm outline-none focus:ring-1 disabled:opacity-50"
                      />
                      <textarea
                        placeholder="Description (optional)"
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={
                          commitMutation.isPending ||
                          commitAndPushMutation.isPending ||
                          generateCommitMessageMutation.isPending ||
                          reviewCodeMutation.isPending ||
                          commitAndOpenPullRequestMutation.isPending
                        }
                        className="bg-background focus:ring-primary placeholder:text-muted-foreground/50 w-full resize-none rounded-md border px-3 py-1.5 text-xs shadow-sm outline-none focus:ring-1 disabled:opacity-50"
                      />
                      {codeReview && visibleFindings.length > 0 && (
                        <button
                          onClick={() => setIsReviewModalOpen(true)}
                          className="bg-background/80 hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md border p-3 text-left text-xs font-medium shadow-sm transition-all active:scale-[0.99]"
                        >
                          <ShieldAlert className="text-primary size-3.5 shrink-0" />
                          <span className="min-w-0">
                            Code review: {visibleFindings.length}{' '}
                            {visibleFindings.length === 1
                              ? 'finding'
                              : 'findings'}
                          </span>
                        </button>
                      )}
                      <div className="space-y-1.5 pt-1.5">
                        <button
                          onClick={handleReviewCode}
                          className="border-border bg-background text-foreground hover:bg-accent flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border py-2 text-xs font-bold shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            selectedCommitPathCount === 0 ||
                            commitMutation.isPending ||
                            commitAndPushMutation.isPending ||
                            generateCommitMessageMutation.isPending ||
                            reviewCodeMutation.isPending ||
                            pushMutation.isPending ||
                            commitAndOpenPullRequestMutation.isPending
                          }
                        >
                          {reviewCodeMutation.isPending ? (
                            <>
                              <RefreshCw className="size-3 animate-spin" />
                              Reviewing code...
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="size-3" />
                              Review code
                            </>
                          )}
                        </button>
                        <div className="bg-primary text-primary-foreground flex overflow-hidden rounded-md shadow-md">
                          <button
                            onClick={
                              preferredCommitAction === 'commit-and-open-pr'
                                ? handleCommitAndOpenPullRequest
                                : preferredCommitAction === 'commit-and-push'
                                  ? handleCommitAndPush
                                  : handleCommit
                            }
                            className="flex flex-1 cursor-pointer items-center justify-center gap-2 py-2 text-xs font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={
                              selectedCommitPathCount === 0 ||
                              commitMutation.isPending ||
                              commitAndPushMutation.isPending ||
                              generateCommitMessageMutation.isPending ||
                              reviewCodeMutation.isPending ||
                              pushMutation.isPending ||
                              commitAndOpenPullRequestMutation.isPending
                            }
                          >
                            {generateCommitMessageMutation.isPending ? (
                              <>
                                <RefreshCw className="size-3 animate-spin" />
                                Generating message...
                              </>
                            ) : commitMutation.isPending ? (
                              <>
                                <RefreshCw className="size-3 animate-spin" />
                                Committing...
                              </>
                            ) : commitAndPushMutation.isPending ? (
                              <>
                                <RefreshCw className="size-3 animate-spin" />
                                Pushing...
                              </>
                            ) : commitAndOpenPullRequestMutation.isPending ? (
                              <>
                                <RefreshCw className="size-3 animate-spin" />
                                Preparing PR...
                              </>
                            ) : pushMutation.isPending ? (
                              <>
                                <RefreshCw className="size-3 animate-spin" />
                                Pushing...
                              </>
                            ) : (
                              preferredCommitLabel
                            )}
                          </button>
                          <div className="bg-primary-foreground/20 my-2 w-px shrink-0" />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label="Choose commit action"
                                className="hover:bg-primary-foreground/10 inline-flex w-10 shrink-0 cursor-pointer items-center justify-center transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={
                                  selectedCommitPathCount === 0 ||
                                  commitMutation.isPending ||
                                  commitAndPushMutation.isPending ||
                                  generateCommitMessageMutation.isPending ||
                                  reviewCodeMutation.isPending ||
                                  pushMutation.isPending ||
                                  commitAndOpenPullRequestMutation.isPending
                                }
                              >
                                <ChevronDown className="size-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                              <DropdownMenuItem
                                onClick={() =>
                                  void handlePreferredCommitActionChange(
                                    'commit',
                                    data?.repoPath,
                                  )
                                }
                              >
                                <GitCommit className="size-3.5" />
                                Commit
                                {preferredCommitAction === 'commit' ? (
                                  <span className="text-muted-foreground ml-auto text-[11px]">
                                    Default
                                  </span>
                                ) : null}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  void handlePreferredCommitActionChange(
                                    'commit-and-push',
                                    data?.repoPath,
                                  )
                                }
                              >
                                <ArrowUp className="size-3.5" />
                                Commit &amp; push
                                {preferredCommitAction === 'commit-and-push' ? (
                                  <span className="text-muted-foreground ml-auto text-[11px]">
                                    Default
                                  </span>
                                ) : null}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  void handlePreferredCommitActionChange(
                                    'commit-and-open-pr',
                                    data?.repoPath,
                                  )
                                }
                              >
                                <GitPullRequest className="size-3.5" />
                                Commit &amp; open PR
                                {preferredCommitAction ===
                                'commit-and-open-pr' ? (
                                  <span className="text-muted-foreground ml-auto text-[11px]">
                                    Default
                                  </span>
                                ) : null}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show last commit if unpushed */}
                {history?.[0]?.isUnpushed && (
                  <div className="bg-muted/10 shrink-0 border-t">
                    <div className="flex items-center justify-between px-4 pb-1 pt-3">
                      <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                        Pending Commit
                      </span>
                      <button
                        onClick={() => undoMutation.mutate(history[0])}
                        disabled={undoMutation.isPending}
                        className="text-muted-foreground hover:text-destructive flex cursor-pointer items-center gap-1.5 text-[10px] font-bold transition-colors disabled:opacity-50"
                      >
                        <RotateCcw
                          className={cn(
                            'size-3',
                            undoMutation.isPending && 'animate-spin',
                          )}
                        />
                        Undo
                      </button>
                    </div>
                    <div
                      onClick={() => handleCommitSelect(history[0].hash)}
                      className={cn(
                        'group relative flex w-full cursor-pointer flex-col px-4 py-2 text-left transition-colors',
                        selectedCommit === history[0].hash
                          ? 'bg-primary/5'
                          : 'hover:bg-muted/30',
                      )}
                    >
                      {selectedCommit === history[0].hash && (
                        <div className="bg-primary absolute inset-y-0 left-0 w-0.5" />
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={cn(
                            'line-clamp-1 text-[12px] font-semibold tracking-tight transition-colors',
                            selectedCommit === history[0].hash
                              ? 'text-primary'
                              : 'text-foreground/90 group-hover:text-foreground',
                          )}
                        >
                          {history[0].message}
                        </span>
                        <div
                          title="Not pushed to remote"
                          className="text-primary mt-0.5 flex shrink-0 items-center gap-1"
                        >
                          <ArrowUp className="size-3" />
                        </div>
                      </div>
                      <div className="mt-1 flex min-w-0 items-center gap-1.5">
                        <CommitAvatar commit={history[0]} />
                        <span className="text-muted-foreground truncate text-[11px] font-medium">
                          {history[0].author_name}
                        </span>
                        <span className="text-muted-foreground/40 text-[11px]">
                          •
                        </span>
                        <span className="text-muted-foreground shrink-0 text-[11px] font-medium">
                          {formatDistanceToNow(new Date(history[0].date), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              onScroll={handleHistoryScroll}
              className="custom-scrollbar flex-1 overflow-y-auto"
            >
              <div className="divide-border/40 divide-y">
                {history?.map((commit) => (
                  <div
                    key={commit.hash}
                    onClick={() => handleCommitSelect(commit.hash)}
                    className={cn(
                      'group relative flex w-full cursor-pointer flex-col px-4 py-2 text-left transition-colors',
                      selectedCommit === commit.hash
                        ? 'bg-primary/5'
                        : 'hover:bg-muted/50',
                    )}
                  >
                    {selectedCommit === commit.hash && (
                      <div className="bg-primary absolute inset-y-0 left-0 w-0.5" />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          'line-clamp-1 text-[12px] font-semibold tracking-tight transition-colors',
                          selectedCommit === commit.hash
                            ? 'text-primary'
                            : 'text-foreground/90 group-hover:text-foreground',
                        )}
                      >
                        {commit.message}
                      </span>
                      {commit.isUnpushed && (
                        <div
                          title="Not pushed to remote"
                          className="text-primary mt-0.5 flex shrink-0 items-center gap-1"
                        >
                          <ArrowUp className="size-3" />
                        </div>
                      )}
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5">
                      <CommitAvatar commit={commit} />
                      <span className="text-muted-foreground truncate text-[11px] font-medium">
                        {commit.author_name}
                      </span>
                      <span className="text-muted-foreground/40 text-[11px]">
                        •
                      </span>
                      <span className="text-muted-foreground shrink-0 text-[11px] font-medium">
                        {formatDistanceToNow(new Date(commit.date), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {isFetchingNextHistoryPage && (
                <div className="text-muted-foreground flex h-10 items-center justify-center text-[11px] font-medium">
                  Loading more commits...
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="bg-card flex min-w-0 flex-1 flex-col overflow-hidden">
          {selectedFile || selectedCommit ? (
            <>
              <div className="bg-background/50 flex h-10 shrink-0 items-center justify-between border-b px-4">
                <div className="flex items-center gap-2 overflow-hidden text-[11px] font-semibold">
                  {selectedCommit && (
                    <span className="text-muted-foreground shrink-0 text-[10px] uppercase tracking-wider">
                      Commit:
                    </span>
                  )}
                  {selectedCommit ? (
                    <button
                      onClick={copyCommitHash}
                      title="Copy commit hash"
                      className="border-muted-foreground/40 hover:text-primary cursor-pointer truncate border-b border-dashed pb-0.5 transition-colors"
                    >
                      {selectedCommit.substring(0, 12)}
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        selectedFile && handleOpenFileInEditor(selectedFile)
                      }
                      title={
                        selectedApp
                          ? `Open with ${selectedApp.name}`
                          : 'Open with editor'
                      }
                      className="border-muted-foreground/40 hover:text-primary cursor-pointer truncate border-b border-dashed pb-0.5 text-left transition-colors"
                    >
                      {selectedFile}
                    </button>
                  )}
                </div>
                {canUndoSelectedCommit && (
                  <div className="flex items-center gap-3">
                    {canUndoSelectedCommit && latestCommit && (
                      <button
                        onClick={() => undoMutation.mutate(latestCommit)}
                        disabled={undoMutation.isPending}
                        className="hover:bg-destructive/10 text-destructive flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[10px] font-bold transition-all active:scale-95 disabled:opacity-50"
                        title="Undo last commit (keep changes)"
                      >
                        <RotateCcw
                          className={cn(
                            'size-3',
                            undoMutation.isPending && 'animate-spin',
                          )}
                        />
                        Undo Commit
                      </button>
                    )}
                  </div>
                )}
              </div>
              {selectedCommit ? (
                <div className="flex min-h-0 flex-1">
                  <aside className="bg-muted/10 flex w-[320px] shrink-0 flex-col border-r">
                    <div className="bg-background/40 flex h-10 shrink-0 items-center justify-center border-b px-3 text-[12px] font-semibold">
                      {loadingCommitFiles
                        ? 'Loading files'
                        : `${commitFiles.length} changed ${
                            commitFiles.length === 1 ? 'file' : 'files'
                          }`}
                    </div>
                    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                      {loadingCommitFiles ? (
                        <div className="flex h-full items-center justify-center">
                          <RefreshCw className="text-primary/40 size-5 animate-spin" />
                        </div>
                      ) : commitFiles.length === 0 ? (
                        <div className="text-muted-foreground flex h-full items-center justify-center px-6 text-center text-xs">
                          No file changes found for this commit.
                        </div>
                      ) : (
                        <div className="divide-border/40 divide-y">
                          {commitFiles.map((file) => {
                            const fileStatus = getFileStatusPresentation(
                              getCommitFileStatusKind(file.status),
                            )
                            const FileStatusIcon = fileStatus.Icon

                            return (
                              <button
                                key={`${file.status}:${file.path}`}
                                onClick={() => setSelectedCommitFile(file.path)}
                                className={cn(
                                  'group flex w-full cursor-pointer select-none items-center gap-3 px-4 py-3 text-left text-[12px] font-semibold transition-colors',
                                  selectedCommitFile === file.path
                                    ? 'bg-primary/10 text-foreground'
                                    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                                )}
                              >
                                <span className="min-w-0 flex-1 truncate">
                                  {file.path}
                                </span>
                                <span
                                  className={cn(
                                    'flex size-4 shrink-0 items-center justify-center',
                                    fileStatus.className,
                                  )}
                                  title={
                                    file.oldPath
                                      ? `${fileStatus.title}: ${file.oldPath} -> ${file.path}`
                                      : fileStatus.title
                                  }
                                  aria-label={fileStatus.title}
                                >
                                  <FileStatusIcon className="size-4" />
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </aside>

                  <section className="flex min-w-0 flex-1 flex-col">
                    <div className="bg-background/40 flex h-10 shrink-0 items-center border-b px-5 text-[13px] font-semibold">
                      <span className="text-muted-foreground min-w-0 truncate">
                        {selectedCommitFile ?? 'Select a changed file'}
                      </span>
                    </div>
                    {renderDiffContent()}
                  </section>
                </div>
              ) : (
                renderDiffContent()
              )}
            </>
          ) : (
            <div className="group flex flex-1 flex-col items-center justify-center gap-8 p-12 text-center opacity-40">
              <div className="border-muted bg-muted/5 flex size-28 rotate-6 items-center justify-center rounded-3xl border-2 border-dashed transition-transform duration-500 group-hover:rotate-0">
                <GitPullRequest className="text-muted-foreground size-14 -rotate-6 transition-transform duration-500 group-hover:rotate-0" />
              </div>
              <div className="max-w-[340px] space-y-2">
                <h3 className="text-foreground text-xl font-bold tracking-tight">
                  Git Repository Insight
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Select any entry from your local changes to inspect the
                  unified diff and review line-by-line before committing.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
