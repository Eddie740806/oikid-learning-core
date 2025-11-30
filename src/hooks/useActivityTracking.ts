'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClientClient } from '@/lib/auth'

interface ActivityTrackingOptions {
  pagePath?: string
  action?: string
  metadata?: Record<string, any>
}

export function useActivityTracking(options: ActivityTrackingOptions = {}) {
  const pathname = usePathname()
  const startTimeRef = useRef<number>(Date.now())
  const hasTrackedRef = useRef<boolean>(false)
  const supabase = createClientClient()

  // 追蹤頁面訪問
  useEffect(() => {
    const trackPageView = async () => {
      // 避免重複追蹤
      if (hasTrackedRef.current) return
      hasTrackedRef.current = true

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return

        const pagePath = options.pagePath || pathname
        const startTime = startTimeRef.current

        // 獲取 IP 和 User Agent（在客戶端只能獲取 User Agent）
        const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : ''

        // 發送頁面訪問記錄
        const response = await fetch('/api/admin/activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            activity_type: 'page_view',
            page_path: pagePath,
            action: options.action,
            metadata: {
              ...options.metadata,
              start_time: new Date(startTime).toISOString(),
            },
            user_agent: userAgent,
          }),
        })

        if (!response.ok) {
          console.error('Failed to track page view:', await response.text())
        }
      } catch (error) {
        console.error('Error tracking page view:', error)
      }
    }

    // 重置追蹤狀態
    hasTrackedRef.current = false
    startTimeRef.current = Date.now()

    // 延遲追蹤，避免快速切換頁面時產生過多請求
    const timer = setTimeout(trackPageView, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [pathname, options.pagePath, options.action, options.metadata])

  // 追蹤頁面離開時間（停留時間）
  useEffect(() => {
    const handleBeforeUnload = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user || !hasTrackedRef.current) return

        const startTime = startTimeRef.current
        const endTime = Date.now()
        const duration = endTime - startTime // 毫秒

        // 發送停留時間記錄（使用 sendBeacon 確保在頁面關閉時也能發送）
        const data = JSON.stringify({
          activity_type: 'page_view',
          page_path: options.pagePath || pathname,
          action: 'page_exit',
          metadata: {
            duration_ms: duration,
            duration_seconds: Math.round(duration / 1000),
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
          },
        })

        // 使用 sendBeacon 確保在頁面關閉時也能發送
        if (navigator.sendBeacon) {
          const blob = new Blob([data], { type: 'application/json' })
          navigator.sendBeacon('/api/admin/activity', blob)
        } else {
          // 降級方案：使用 fetch（可能無法在頁面關閉時發送）
          await fetch('/api/admin/activity', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            credentials: 'include',
            body: data,
            keepalive: true,
          })
        }
      } catch (error) {
        console.error('Error tracking page exit:', error)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [pathname, options.pagePath])

  // 手動追蹤操作
  const trackAction = async (action: string, metadata?: Record<string, any>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const response = await fetch('/api/admin/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          activity_type: 'action',
          page_path: options.pagePath || pathname,
          action,
          metadata: {
            ...options.metadata,
            ...metadata,
          },
          user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
        }),
      })

      if (!response.ok) {
        console.error('Failed to track action:', await response.text())
      }
    } catch (error) {
      console.error('Error tracking action:', error)
    }
  }

  return { trackAction }
}

