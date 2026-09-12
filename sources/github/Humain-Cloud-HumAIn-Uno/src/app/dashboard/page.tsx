'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

const DashboardPage = dynamic(
  () => import('@/components/dashboard/dashboard-page').then(m => ({ default: m.DashboardPage })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading Dashboard...</p>
        </div>
      </div>
    ),
  }
)

export default function DashboardRoute() {
  const { setCurrentView } = useAppStore()

  useEffect(() => {
    setCurrentView('dashboard')
  }, [setCurrentView])

  return <DashboardPage />
}
