import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRightLeft,
  Delete,
  History as HistoryIcon,
  Loader2,
  Sigma,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppHeader,
  Badge,
  Button,
  IconButton,
  Input,
  SearchField,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Tabs,
  TabsContent,
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  ToolbarCenter,
  useWorkspace,
} from '@moldable-ai/ui'
import {
  BASIC_KEYS,
  type Key,
  SCIENTIFIC_KEYS,
  balanceParens,
  reciprocal,
  toggleSign,
} from './lib/keypad'
import { evaluate, formatResult } from '@/lib/calc'
import type { HistoryEntry } from '@/lib/history'
import { CATEGORIES, type CategoryId, convert, unitSymbol } from '@/lib/units'
import { cn } from '@/lib/utils'

type AngleMode = 'deg' | 'rad'

interface CalcSeed {
  expr: string
  nonce: number
}

interface ConvertSeed {
  category?: CategoryId
  nonce: number
}

interface HistorySeed {
  query?: string
  nonce: number
}

// Navigation intent queued by the server's drive contract
// (calculator.ui.navigate / calculator.ui.showHistory).
interface UiIntent {
  id: string
  view: 'calc' | 'convert' | 'history'
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}

// ---------------------------------------------------------------------------
// History data hooks (shared across panes)
// ---------------------------------------------------------------------------

function useRecordHistory() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entry: {
      kind: HistoryEntry['kind']
      expression: string
      result: string
      resultValue: number
    }) => {
      const res = await fetchWithWorkspace('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      if (!res.ok) throw new Error('Failed to record')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history', workspaceId] })
    },
  })
}

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

const KEYBOARD_MAP: Record<string, string> = {
  '*': '×',
  '/': '÷',
  '-': '−',
  '+': '+',
  '^': '^',
  '(': '(',
  ')': ')',
  '!': '!',
}

function CalculatorPane({ seed }: { seed: CalcSeed }) {
  const [expr, setExpr] = useState('')
  const [lastExpression, setLastExpression] = useState('')
  const [bigResult, setBigResult] = useState('')
  const [justEvaluated, setJustEvaluated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scientific, setScientific] = useState(false)
  const [angleMode, setAngleMode] = useState<AngleMode>('deg')
  const record = useRecordHistory()

  // Seed the buffer when the user re-uses an entry from History.
  useEffect(() => {
    if (seed.nonce === 0) return
    setExpr(seed.expr)
    setJustEvaluated(false)
    setError(null)
    setBigResult('')
    setLastExpression('')
  }, [seed])

  const preview = useMemo(() => {
    if (!expr.trim()) return null
    try {
      const value = evaluate(balanceParens(expr), angleMode)
      return formatResult(value)
    } catch {
      return null
    }
  }, [expr, angleMode])

  const doEquals = useCallback(() => {
    if (!expr.trim()) return
    try {
      const balanced = balanceParens(expr)
      const value = evaluate(balanced, angleMode)
      const formatted = formatResult(value)
      record.mutate({
        kind: 'calc',
        expression: balanced,
        result: formatted,
        resultValue: value,
      })
      setLastExpression(balanced)
      setBigResult(formatted)
      // Chain from the raw numeric value (no grouping commas).
      setExpr(String(value))
      setJustEvaluated(true)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }, [expr, angleMode, record])

  const handleKey = useCallback(
    (key: Key) => {
      setError(null)

      if (key.action === 'clear') {
        setExpr('')
        setJustEvaluated(false)
        setBigResult('')
        setLastExpression('')
        return
      }
      if (key.action === 'back') {
        setJustEvaluated(false)
        setExpr((prev) => prev.slice(0, -1))
        return
      }
      if (key.action === 'sign') {
        setJustEvaluated(false)
        setExpr((prev) => toggleSign(prev))
        return
      }
      if (key.action === 'reciprocal') {
        setJustEvaluated(false)
        setExpr((prev) => reciprocal(prev))
        return
      }
      if (key.action === 'equals') {
        doEquals()
        return
      }
      if (!key.append) return

      // After "=", a number/function starts fresh; an operator continues from
      // the result so you can keep computing.
      if (justEvaluated) {
        setJustEvaluated(false)
        if (key.kind === 'op') {
          setExpr((prev) => prev + key.append)
        } else {
          setExpr(key.append)
        }
        return
      }
      setExpr((prev) => prev + key.append)
    },
    [doEquals, justEvaluated],
  )

  // Physical keyboard support.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      // Don't hijack typing in inputs (e.g. the Convert/History fields).
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return
      }

      if (e.key >= '0' && e.key <= '9') {
        handleKey({ label: e.key, kind: 'num', append: e.key })
      } else if (e.key === '.') {
        handleKey({ label: '.', kind: 'num', append: '.' })
      } else if (e.key === '%') {
        handleKey({ label: '%', kind: 'op', append: '/100' })
      } else if (e.key in KEYBOARD_MAP) {
        const append = KEYBOARD_MAP[e.key]
        handleKey({
          label: append,
          kind: e.key === '(' || e.key === ')' || e.key === '!' ? 'fn' : 'op',
          append,
        })
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault()
        handleKey({ label: '=', kind: 'action', action: 'equals' })
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        handleKey({ label: '⌫', kind: 'action', action: 'back' })
      } else if (e.key === 'Escape') {
        handleKey({ label: 'AC', kind: 'action', action: 'clear' })
      } else {
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey])

  const bigText = justEvaluated ? bigResult : expr || '0'
  const subText = justEvaluated
    ? lastExpression
    : preview
      ? `= ${preview}`
      : ' '

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col">
      {/* Display */}
      <div className="bg-background z-10 shrink-0 pb-4">
        <div className="border-border bg-card rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setScientific((s) => !s)}
              className={cn(
                'text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                scientific && 'text-foreground',
              )}
            >
              <Sigma className="size-3.5" />
              Scientific
            </button>
            <SegmentedControl
              aria-label="Angle mode"
              value={angleMode}
              onValueChange={(value) => setAngleMode(value as AngleMode)}
              density="compact"
              aria-hidden={!scientific}
              className={cn(!scientific && 'pointer-events-none invisible')}
            >
              <SegmentedControlItem value="deg">DEG</SegmentedControlItem>
              <SegmentedControlItem value="rad">RAD</SegmentedControlItem>
            </SegmentedControl>
          </div>

          <div className="mt-3 text-right">
            <div className="text-muted-foreground h-5 truncate font-mono text-sm">
              {error ? (
                <span className="text-destructive">{error}</span>
              ) : (
                subText
              )}
            </div>
            <div className="text-foreground mt-1 truncate font-mono text-4xl font-semibold tabular-nums tracking-tight">
              {bigText}
            </div>
          </div>
        </div>
      </div>

      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto pb-[calc(var(--chat-safe-padding,0px)+1rem)]">
        {/* Scientific keypad */}
        {scientific && (
          <div className="grid grid-cols-4 gap-2">
            {SCIENTIFIC_KEYS.map((key) => (
              <KeypadButton
                key={key.label}
                k={key}
                onPress={handleKey}
                science
              />
            ))}
          </div>
        )}

        {/* Basic keypad */}
        <div className={cn('grid grid-cols-4 gap-2', scientific && 'mt-4')}>
          {BASIC_KEYS.map((key) => (
            <KeypadButton key={key.label} k={key} onPress={handleKey} />
          ))}
        </div>
      </div>
    </div>
  )
}

function KeypadButton({
  k,
  onPress,
  science,
}: {
  k: Key
  onPress: (k: Key) => void
  science?: boolean
}) {
  const isEquals = k.action === 'equals'
  const isOp = k.kind === 'op'
  const isAction = k.kind === 'action' && !isEquals

  return (
    <Button
      type="button"
      variant={
        isEquals ? 'default' : isOp || isAction ? 'secondary' : 'outline'
      }
      onClick={() => onPress(k)}
      className={cn(
        'calc-key h-14 cursor-pointer select-none text-lg font-medium',
        science && 'h-11 text-sm',
        isEquals && 'bg-primary text-primary-foreground',
        isOp && 'text-primary font-semibold',
        k.label === 'AC' && 'text-destructive',
      )}
    >
      {k.label === '⌫' ? <Delete className="size-5" /> : k.label}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Convert
// ---------------------------------------------------------------------------

function ConvertPane({ seed }: { seed: ConvertSeed }) {
  const [categoryId, setCategoryId] = useState<CategoryId>('length')
  const [value, setValue] = useState('1')
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0],
    [categoryId],
  )
  const [from, setFrom] = useState(category.units[0].id)
  const [to, setTo] = useState(category.units[1]?.id ?? category.units[0].id)
  const record = useRecordHistory()
  const isCurrency = categoryId === 'currency'

  useEffect(() => {
    if (seed.nonce === 0 || !seed.category) return
    setCategoryId(seed.category)
  }, [seed])

  // Live exchange rates — only fetched while the Currency category is active.
  const ratesQuery = useQuery({
    queryKey: ['rates', workspaceId],
    enabled: isCurrency,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/rates')
      if (!res.ok) throw new Error('Rates unavailable')
      return (await res.json()) as {
        base: string
        rates: Record<string, number>
        updatedAt: string | null
        nextUpdateAt: string | null
        fetchedAt: string
      }
    },
  })
  const rates = ratesQuery.data?.rates

  // Reset unit selection when the category changes.
  useEffect(() => {
    setFrom(category.units[0].id)
    setTo(category.units[1]?.id ?? category.units[0].id)
  }, [category])

  const parsed = Number(value)
  const computed = useMemo(() => {
    if (value.trim() === '' || !Number.isFinite(parsed)) return null
    // Currency results wait for live rates.
    if (isCurrency && !rates) return null
    try {
      const res = convert(parsed, from, to, categoryId, rates)
      return formatResult(res.result)
    } catch {
      return null
    }
  }, [parsed, from, to, categoryId, value, isCurrency, rates])

  const swap = () => {
    setFrom(to)
    setTo(from)
  }

  const save = () => {
    if (computed === null) return
    try {
      const res = convert(parsed, from, to, categoryId, rates)
      record.mutate({
        kind: 'convert',
        expression: `${formatResult(parsed)} ${unitSymbol(from)} → ${unitSymbol(to)}`,
        result: `${computed} ${unitSymbol(to)}`,
        resultValue: res.result,
      })
    } catch {
      // Ignore — the button is disabled when no result is available.
    }
  }

  const ratesUpdatedLabel = useMemo(() => {
    const iso = ratesQuery.data?.updatedAt ?? ratesQuery.data?.fetchedAt
    if (!iso) return null
    const ms = Date.parse(iso)
    if (!Number.isFinite(ms)) return null
    return new Date(ms).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }, [ratesQuery.data])

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryId(cat.id)}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              cat.id === categoryId
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-5">
        {/* From */}
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium">
            From
          </label>
          <div className="flex gap-2">
            <Input
              value={value}
              inputMode="decimal"
              onChange={(e) => setValue(e.target.value)}
              className="font-mono text-lg tabular-nums"
              placeholder="0"
            />
            <UnitSelect
              units={category.units}
              value={from}
              onChange={setFrom}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={swap}
            className="text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
            aria-label="Swap units"
          >
            <ArrowRightLeft className="size-4" />
          </Button>
        </div>

        {/* To */}
        <div className="space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium">
            To
          </label>
          <div className="flex gap-2">
            <div className="border-input bg-muted/40 h-control-md flex flex-1 items-center justify-end rounded-md border px-3 font-mono text-lg tabular-nums">
              {computed ?? '—'}
            </div>
            <UnitSelect units={category.units} value={to} onChange={setTo} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {isCurrency ? (
          ratesQuery.isError ? (
            <Badge variant="destructive" className="text-[11px] font-normal">
              Live rates unavailable — check your connection
            </Badge>
          ) : ratesQuery.isLoading ? (
            <Badge variant="secondary" className="text-[11px] font-normal">
              <Loader2 className="mr-1 size-3 animate-spin" />
              Fetching live rates…
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[11px] font-normal">
              Live rates{ratesUpdatedLabel ? ` · ${ratesUpdatedLabel}` : ''}
            </Badge>
          )
        ) : (
          <span />
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={save}
          disabled={computed === null}
          className="cursor-pointer disabled:cursor-default"
        >
          Save to history
        </Button>
      </div>
    </div>
  )
}

function UnitSelect({
  units,
  value,
  onChange,
}: {
  units: { id: string; name: string; symbol: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      {/* Cap the dropdown against the chat dock's safe-area inset (same pattern
          as Mail's snooze menu) so long lists like currencies stay scrollable
          and never extend behind the chat. */}
      <SelectContent
        position="popper"
        className="max-h-[min(20rem,calc(100vh-var(--chat-safe-padding,0px)-4rem))] overflow-y-auto"
      >
        {units.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            <span className="font-medium">{u.symbol}</span>
            <span className="text-muted-foreground ml-1.5 text-xs">
              {u.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return ''
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(then).toLocaleDateString()
}

function HistoryPane({
  onReuse,
  seed,
}: {
  onReuse: (entry: HistoryEntry) => void
  seed: HistorySeed
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (seed.nonce === 0) return
    setSearch(seed.query ?? '')
  }, [seed])

  const historyQuery = useQuery({
    queryKey: ['history', workspaceId, search],
    queryFn: async () => {
      const url = search
        ? `/api/history?q=${encodeURIComponent(search)}`
        : '/api/history'
      const res = await fetchWithWorkspace(url)
      if (!res.ok) throw new Error('Failed to load history')
      return (await res.json()) as { entries: HistoryEntry[] }
    },
  })

  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithWorkspace(`/api/history/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['history', workspaceId] }),
  })

  const clearAll = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/history', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to clear')
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['history', workspaceId] }),
  })

  const entries = historyQuery.data?.entries ?? []

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-2 px-5 py-3">
        <SearchField
          aria-label="Search calculation history"
          value={search}
          onValueChange={setSearch}
          placeholder="Search calculations…"
          className="flex-1"
        />
        <IconButton
          label="Clear all history"
          tooltip
          type="button"
          variant="ghost"
          onClick={() => clearAll.mutate()}
          disabled={!entries.length}
          className="text-muted-foreground hover:text-destructive cursor-pointer disabled:cursor-default"
        >
          <Trash2 className="size-4" />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(var(--chat-safe-padding,0px)+1.5rem)]">
        {entries.length === 0 ? (
          <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 text-center text-sm">
            <HistoryIcon className="size-6 opacity-40" />
            {search
              ? 'No matching calculations.'
              : 'Calculations you run will appear here.'}
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="hover:bg-muted/40 group -mx-1 flex items-center gap-2 rounded-md px-1 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => onReuse(entry)}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                  title="Reuse in calculator"
                >
                  <div className="text-muted-foreground truncate font-mono text-xs">
                    {entry.expression}
                  </div>
                  <div className="text-foreground truncate font-mono text-base font-semibold tabular-nums">
                    {entry.result}
                  </div>
                </button>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-muted-foreground whitespace-nowrap text-[10px]">
                    {relativeTime(entry.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteOne.mutate(entry.id)}
                    className="text-muted-foreground hover:text-destructive cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Delete entry"
                  >
                    <Delete className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'calc', label: 'Calculator' },
  { id: 'convert', label: 'Convert' },
] as const

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const [tab, setTab] = useState('calc')
  const [calcSeed, setCalcSeed] = useState<CalcSeed>({ expr: '', nonce: 0 })
  const [convertSeed, setConvertSeed] = useState<ConvertSeed>({ nonce: 0 })
  const [historySeed, setHistorySeed] = useState<HistorySeed>({ nonce: 0 })
  const [historyOpen, setHistoryOpen] = useState(false)
  const nonce = useRef(0)
  const seenIntentIds = useRef(new Set<string>())

  // Re-using a past calculation drops it into the keypad and closes the panel.
  const reuse = useCallback((entry: HistoryEntry) => {
    nonce.current += 1
    setCalcSeed({
      expr:
        entry.kind === 'calc' ? entry.expression : String(entry.resultValue),
      nonce: nonce.current,
    })
    setTab('calc')
    setHistoryOpen(false)
  }, [])

  const applyUiIntent = useCallback(
    async (intent: UiIntent) => {
      nonce.current += 1
      const nextNonce = nonce.current

      if (intent.view === 'calc') {
        setCalcSeed({
          expr:
            typeof intent.params?.expression === 'string'
              ? intent.params.expression
              : '',
          nonce: nextNonce,
        })
        setTab('calc')
        setHistoryOpen(false)
      } else if (intent.view === 'convert') {
        const requestedCategory = intent.params?.category
        const category = CATEGORIES.find(
          (candidate) => candidate.id === requestedCategory,
        )?.id
        setConvertSeed({ category, nonce: nextNonce })
        setTab('convert')
        setHistoryOpen(false)
      } else {
        setHistorySeed({
          query:
            typeof intent.params?.query === 'string'
              ? intent.params.query
              : undefined,
          nonce: nextNonce,
        })
        setHistoryOpen(true)
      }

      seenIntentIds.current.add(intent.id)
      await fetchWithWorkspace(
        `/api/moldable/ui-intent?id=${encodeURIComponent(intent.id)}`,
        { method: 'DELETE' },
      )
    },
    [fetchWithWorkspace],
  )

  const consumeUiIntent = useCallback(async () => {
    const response = await fetchWithWorkspace('/api/moldable/ui-intent')
    if (!response.ok) return
    const intent = (await response.json()) as UiIntent | null
    if (!intent || seenIntentIds.current.has(intent.id)) return
    await applyUiIntent(intent)
  }, [applyUiIntent, fetchWithWorkspace])

  useEffect(() => {
    void consumeUiIntent()
    const handleDriveMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string
        workspaceId?: string
        targetAppId?: string
        method?: string
      }
      if (data.type !== 'moldable:app-api-changed') return
      if (data.targetAppId !== 'calculator' || data.workspaceId !== workspaceId)
        return
      if (!data.method?.startsWith('calculator.')) return
      void consumeUiIntent()
    }
    window.addEventListener('message', handleDriveMessage)
    return () => window.removeEventListener('message', handleDriveMessage)
  }, [consumeUiIntent, workspaceId])

  return (
    <div className="calculator-app text-foreground flex h-full min-h-0 flex-col bg-transparent">
      {/* No in-app title — Moldable Desktop shows the app name in the macOS
          title bar, so duplicating it here would be redundant. */}
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* The two modes are centered in the native title area while History
            remains an independent trailing utility action. It is a record of
            what happened in those modes, not a third mode. */}
        <AppHeader
          title="Calculator"
          desktop={
            <Toolbar
              position="top"
              variant="plain"
              material="none"
              density="default"
              className="border-border/60 border-b"
            >
              <ToolbarCenter>
                <SegmentedControl
                  aria-label="Calculator mode"
                  value={tab}
                  onValueChange={setTab}
                  density="compact"
                >
                  {TABS.map((item) => (
                    <SegmentedControlItem key={item.id} value={item.id}>
                      {item.label}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
              </ToolbarCenter>
              <ToolbarActions>
                <ToolbarButton
                  material="ultra-thin"
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <HistoryIcon className="size-4" />
                  History
                </ToolbarButton>
              </ToolbarActions>
            </Toolbar>
          }
          mobileControls={
            <div className="calculator-mobile-controls flex w-full min-w-0 items-center justify-between gap-2">
              <SegmentedControl
                aria-label="Calculator mode"
                value={tab}
                onValueChange={setTab}
                density="compact"
                className="min-w-0"
              >
                {TABS.map((item) => (
                  <SegmentedControlItem key={item.id} value={item.id}>
                    {item.label}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setHistoryOpen(true)}
                className="text-muted-foreground hover:text-foreground size-11 shrink-0 cursor-pointer"
                aria-label="History"
              >
                <HistoryIcon className="size-5" />
              </Button>
            </div>
          }
        />

        {/* Pad the bottom by the host chat dock's safe-area inset (same pattern
            as Piano/Mail) so the keypad and Save button are never hidden behind
            the chat. Falls back to 0px outside Moldable. */}
        <div className="calculator-content min-h-0 flex-1 overflow-hidden px-4 pt-4">
          <TabsContent
            value="calc"
            className="mt-0 h-full min-h-0 overflow-hidden"
          >
            <CalculatorPane seed={calcSeed} />
          </TabsContent>
          <TabsContent
            value="convert"
            className="mt-0 h-full min-h-0 overflow-y-auto pb-[calc(var(--chat-safe-padding,0px)+1rem)]"
          >
            <ConvertPane seed={convertSeed} />
          </TabsContent>
        </div>
      </Tabs>

      {/* History lives in a slide-over panel (like a calculator's paper tape),
          opened from the toolbar — available from either mode. */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent
          side="right"
          className="flex w-full max-w-sm flex-col gap-0 p-0"
          style={{ maxHeight: '100dvh' }}
        >
          <SheetHeader className="border-border/40 border-b px-5 py-4">
            <SheetTitle>History</SheetTitle>
          </SheetHeader>
          <HistoryPane onReuse={reuse} seed={historySeed} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
