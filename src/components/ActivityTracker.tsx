'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useActivityTracking } from '@/hooks/useActivityTracking'

interface ActivityTrackerProps {
  children: React.ReactNode
  action?: string
  metadata?: Record<string, any>
}

export default function ActivityTracker({ 
  children, 
  action, 
  metadata 
}: ActivityTrackerProps) {
  const pathname = usePathname()
  
  // 使用活動追蹤 Hook
  useActivityTracking({
    pagePath: pathname,
    action,
    metadata,
  })

  return <>{children}</>
}

