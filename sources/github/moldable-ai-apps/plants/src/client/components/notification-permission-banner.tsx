'use client'

import { Bell, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  getMoldableNotificationPermission,
  isInMoldable,
  requestMoldableNotificationPermission,
} from '@moldable-ai/ui'

type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown'

interface NotificationPermissionBannerProps {
  enabled: boolean
  onGranted: () => Promise<void>
}

function isMobileWebHost(): boolean {
  return (
    typeof window !== 'undefined' &&
    'moldableMobile' in (window as Window & { moldableMobile?: unknown })
  )
}

export function NotificationPermissionBanner({
  enabled,
  onGranted,
}: NotificationPermissionBannerProps) {
  const mobileWebHost = isMobileWebHost()
  const [permission, setPermission] = useState<PermissionState>('unknown')
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || mobileWebHost || !isInMoldable()) return
    let active = true
    void getMoldableNotificationPermission()
      .then((result) => {
        if (active) setPermission(result.permission)
      })
      .catch(() => {
        if (active) setPermission('prompt')
      })
    return () => {
      active = false
    }
  }, [enabled, mobileWebHost])

  const requestPermission = useCallback(async () => {
    setRequesting(true)
    setError(null)
    try {
      const result = await requestMoldableNotificationPermission()
      setPermission(result.permission)
      if (result.permission === 'granted') {
        await onGranted()
      } else if (result.permission === 'denied') {
        setError('Notifications are blocked in system settings.')
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Couldn’t enable watering reminders.',
      )
    } finally {
      setRequesting(false)
    }
  }, [onGranted])

  if (
    !enabled ||
    mobileWebHost ||
    !isInMoldable() ||
    permission === 'unknown' ||
    permission === 'granted'
  ) {
    return null
  }

  return (
    <div className="border-border bg-muted/40 mx-4 mb-2 flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2.5">
      <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Bell className="text-primary size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Get watering reminders</p>
        <p className="text-muted-foreground text-xs">
          Allow Plants to notify you when each plant is due.
        </p>
        {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
      </div>
      <Button
        type="button"
        size="sm"
        className="shrink-0 cursor-pointer"
        disabled={requesting}
        onClick={() => void requestPermission()}
      >
        {requesting && <Loader2 className="size-3.5 animate-spin" />}
        Enable
      </Button>
    </div>
  )
}
