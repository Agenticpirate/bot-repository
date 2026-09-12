/**
 * Onboarding / "installed dashboards" state, persisted per workspace in
 * localStorage. This is a UX gate, not financial data — it records which
 * dashboards the user installed and whether they've finished the first-run
 * carousel. The live/demo decision is separate and driven by whether an account
 * is connected (see `MoneyApp`).
 */
import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '@moldable-ai/ui'

export interface OnboardingState {
  onboarded: boolean
  installed: string[]
}

const EMPTY: OnboardingState = { onboarded: false, installed: [] }

function storageKey(workspaceId: string) {
  return `money.onboarding.${workspaceId || 'default'}`
}

function read(workspaceId: string): OnboardingState {
  try {
    const raw = localStorage.getItem(storageKey(workspaceId))
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<OnboardingState>
    return {
      onboarded: Boolean(parsed.onboarded),
      installed: Array.isArray(parsed.installed)
        ? parsed.installed.filter((x) => typeof x === 'string')
        : [],
    }
  } catch {
    return EMPTY
  }
}

function write(workspaceId: string, state: OnboardingState) {
  try {
    localStorage.setItem(storageKey(workspaceId), JSON.stringify(state))
  } catch {
    // ignore (private mode / disabled storage)
  }
}

/* ---- dashboard display order (drag-to-reorder; first = default) ---- */

function orderKey(workspaceId: string) {
  return `money.dashOrder.${workspaceId || 'default'}`
}

export function useDashboardOrder(): {
  order: string[]
  setOrder: (ids: string[]) => void
} {
  const { workspaceId } = useWorkspace()
  const [order, setOrderState] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(orderKey(workspaceId))
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed)
        ? parsed.filter((x) => typeof x === 'string')
        : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(orderKey(workspaceId))
      const parsed = raw ? JSON.parse(raw) : []
      setOrderState(Array.isArray(parsed) ? parsed : [])
    } catch {
      setOrderState([])
    }
  }, [workspaceId])

  const setOrder = useCallback(
    (ids: string[]) => {
      setOrderState(ids)
      try {
        localStorage.setItem(orderKey(workspaceId), JSON.stringify(ids))
      } catch {
        // ignore
      }
    },
    [workspaceId],
  )

  return { order, setOrder }
}

/* ---- one-time "your real numbers are in" celebration ---- */

function celebratedKey(workspaceId: string) {
  return `money.celebrated.${workspaceId || 'default'}`
}

/**
 * Tracks whether the user has seen the one-time post-connect celebration for
 * this workspace. Persisted so the delight moment fires exactly once when demo
 * data flips to their real, connected numbers.
 */
export function useCelebrated(): {
  celebrated: boolean
  markCelebrated: () => void
} {
  const { workspaceId } = useWorkspace()
  const [celebrated, setCelebrated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(celebratedKey(workspaceId)) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      setCelebrated(localStorage.getItem(celebratedKey(workspaceId)) === '1')
    } catch {
      setCelebrated(false)
    }
  }, [workspaceId])

  const markCelebrated = useCallback(() => {
    setCelebrated(true)
    try {
      localStorage.setItem(celebratedKey(workspaceId), '1')
    } catch {
      // ignore
    }
  }, [workspaceId])

  return { celebrated, markCelebrated }
}

export function useOnboarding() {
  const { workspaceId } = useWorkspace()
  const [state, setState] = useState<OnboardingState>(() => read(workspaceId))

  // Re-read when the workspace changes.
  useEffect(() => {
    setState(read(workspaceId))
  }, [workspaceId])

  const persist = useCallback(
    (next: OnboardingState) => {
      setState(next)
      write(workspaceId, next)
    },
    [workspaceId],
  )

  const install = useCallback(
    (id: string) =>
      setState((prev) => {
        if (prev.installed.includes(id)) return prev
        const next = { ...prev, installed: [...prev.installed, id] }
        write(workspaceId, next)
        return next
      }),
    [workspaceId],
  )

  const uninstall = useCallback(
    (id: string) =>
      setState((prev) => {
        const next = {
          ...prev,
          installed: prev.installed.filter((x) => x !== id),
        }
        write(workspaceId, next)
        return next
      }),
    [workspaceId],
  )

  const complete = useCallback(
    (installed: string[]) => persist({ onboarded: true, installed }),
    [persist],
  )

  const reset = useCallback(() => persist(EMPTY), [persist])

  return { ...state, install, uninstall, complete, reset, persist }
}
