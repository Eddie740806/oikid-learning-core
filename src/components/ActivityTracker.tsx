'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useActivityTracking } from '@/hooks/useActivityTracking'
import { createClientClient } from '@/lib/auth'

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
  const loginRecordedRef = useRef<Set<string>>(new Set()) // 追蹤已記錄登入的 session ID
  
  // 使用活動追蹤 Hook
  useActivityTracking({
    pagePath: pathname,
    action,
    metadata,
  })

  // 監聽 Supabase auth state change，作為登入記錄的備用機制
  useEffect(() => {
    // 強制輸出，確保日誌可見
    console.log('🔍 [ActivityTracker] ====== ActivityTracker useEffect STARTED ======')
    console.log('🔍 [ActivityTracker] Component mounted, setting up listeners...')
    
    const supabase = createClientClient()
    
    console.log('🔍 [ActivityTracker] Setting up auth state change listener...')
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      console.log(`🔍 [ActivityTracker] Auth state changed: ${event}`, session ? 'Session present' : 'No session')
      
      // 當檢測到新的登入會話時，記錄登入活動
      if (event === 'SIGNED_IN' && session) {
        const sessionId = session.access_token.substring(0, 20) // 使用 token 前20個字符作為唯一標識
        
        console.log('🔍 [ActivityTracker] SIGNED_IN event detected, session ID:', sessionId)
        console.log('🔍 [ActivityTracker] User:', session.user?.email, 'ID:', session.user?.id)
        
        // 使用 localStorage 來避免重複記錄
        const storageKey = `login_recorded_${session.user.id}_${sessionId}`
        const lastRecorded = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
        
        if (!lastRecorded && !loginRecordedRef.current.has(sessionId)) {
          loginRecordedRef.current.add(sessionId)
          console.log('📝 [ActivityTracker] Recording login activity (SIGNED_IN event)...')
          
          // 等待一小段時間確保 session 完全設置
          setTimeout(async () => {
            try {
              const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : ''
              console.log('📝 [ActivityTracker] Sending login activity request...')
              
              const response = await fetch('/api/admin/activity', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                credentials: 'include',
                body: JSON.stringify({
                  activity_type: 'login',
                  user_agent: userAgent,
                }),
              })
              
              console.log('📝 [ActivityTracker] Response status:', response.status)
              
              if (response.ok) {
                const result = await response.json()
                if (result.ok) {
                  // 記錄到 localStorage
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(storageKey, Date.now().toString())
                    setTimeout(() => {
                      localStorage.removeItem(storageKey)
                    }, 60 * 60 * 1000) // 1 小時後清除
                  }
                  console.log('✅ [ActivityTracker] Login activity recorded via auth state change')
                  console.log('✅ [ActivityTracker] Activity ID:', result.data?.id)
                } else {
                  console.warn('⚠️ [ActivityTracker] Failed to log login activity:', result.error)
                }
              } else {
                const errorText = await response.text()
                console.warn('⚠️ [ActivityTracker] Failed to log login activity, status:', response.status)
                console.warn('⚠️ [ActivityTracker] Error details:', errorText)
              }
            } catch (err: any) {
              console.error('❌ [ActivityTracker] Error logging login activity:', err)
              console.error('❌ [ActivityTracker] Error message:', err.message)
            }
          }, 1000) // 等待 1 秒確保 session cookie 設置完成
        } else {
          console.log('⏭️ [ActivityTracker] Login already recorded for this session, skipping...')
        }
      }
      
      // 當登出時，清理記錄
      if (event === 'SIGNED_OUT') {
        console.log('🔍 [ActivityTracker] SIGNED_OUT event detected, clearing login records')
        loginRecordedRef.current.clear()
        // 清除所有相關的 localStorage 記錄
        if (typeof window !== 'undefined') {
          const keys = Object.keys(localStorage)
          keys.forEach(key => {
            if (key.startsWith('login_recorded_')) {
              localStorage.removeItem(key)
            }
          })
        }
      }
    })

    // 檢查初始 session（如果用戶已經登入）
    // 改進邏輯：檢查數據庫中最近是否有登入記錄，而不是依賴 localStorage
    console.log('🔍 [ActivityTracker] Checking initial session...')
    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: any } }) => {
      console.log('🔍 [ActivityTracker] getSession result:', session ? 'Session found' : 'No session')
      if (session) {
        console.log('🔍 [ActivityTracker] ====== Initial session found ======')
        console.log('🔍 [ActivityTracker] User email:', session.user?.email)
        console.log('🔍 [ActivityTracker] User ID:', session.user?.id)
        
        const sessionId = session.access_token.substring(0, 20)
        const storageKey = `login_recorded_${session.user.id}_${sessionId}`
        
        // 檢查 localStorage
        const lastRecorded = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
        console.log('🔍 [ActivityTracker] localStorage check:', lastRecorded ? 'Found' : 'Not found')
        
        // 如果 localStorage 沒有記錄，就直接記錄（不檢查數據庫，因為檢查需要管理員權限）
        // 使用更短的時間窗口（5 分鐘）來避免重複記錄
        const shouldRecord = !lastRecorded || (lastRecorded && (Date.now() - parseInt(lastRecorded)) > 5 * 60 * 1000)
        
        console.log('🔍 [ActivityTracker] Should record?', shouldRecord, 'Last recorded:', lastRecorded)
        
        if (shouldRecord) {
            console.log('📝 [ActivityTracker] Recording login activity now...')
            
            // 等待一小段時間確保一切就緒
            setTimeout(async () => {
              try {
                const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : ''
                console.log('📝 [ActivityTracker] Sending POST request to /api/admin/activity...')
                
                const response = await fetch('/api/admin/activity', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                  credentials: 'include',
                  body: JSON.stringify({
                    activity_type: 'login',
                    user_agent: userAgent,
                  }),
                })
                
                console.log('📝 [ActivityTracker] Response status:', response.status)
                
                if (response.ok) {
                  const result = await response.json()
                  console.log('📝 [ActivityTracker] Response result:', result)
                  if (result.ok) {
                    // 記錄到 localStorage
                    if (typeof window !== 'undefined') {
                      localStorage.setItem(storageKey, Date.now().toString())
                      setTimeout(() => {
                        localStorage.removeItem(storageKey)
                      }, 60 * 60 * 1000)
                    }
                    loginRecordedRef.current.add(sessionId)
                    console.log('✅ [ActivityTracker] Login activity recorded successfully!')
                    console.log('✅ [ActivityTracker] Activity ID:', result.data?.id)
                  } else {
                    console.error('❌ [ActivityTracker] Failed to record login:', result.error)
                  }
                } else {
                  const errorText = await response.text()
                  console.error('❌ [ActivityTracker] Failed to record login, status:', response.status)
                  console.error('❌ [ActivityTracker] Error:', errorText)
                }
              } catch (err: any) {
                console.error('❌ [ActivityTracker] Error recording login:', err)
                console.error('❌ [ActivityTracker] Error message:', err.message)
                console.error('❌ [ActivityTracker] Error stack:', err.stack)
              }
            }, 2000) // 等待 2 秒
        } else {
          console.log('⏭️ [ActivityTracker] Login already recorded, skipping...')
          loginRecordedRef.current.add(sessionId)
        }
      } else {
        console.log('🔍 [ActivityTracker] No initial session found')
      }
    }).catch((err: any) => {
      console.error('❌ [ActivityTracker] Error in getSession:', err)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return <>{children}</>
}

