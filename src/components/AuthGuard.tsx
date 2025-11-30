'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientClient } from '@/lib/auth'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClientClient()
        
        // 先檢查現有 session
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          setAuthenticated(true)
          setLoading(false)
          
          // 監聽 auth 狀態變化
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
              router.push('/login')
            } else if (event === 'SIGNED_IN' && session) {
              setAuthenticated(true)
            }
          })

          return () => {
            subscription.unsubscribe()
          }
        } else {
          // 如果沒有 session，嘗試使用 getUser（可能 session 還在設置中）
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            setAuthenticated(true)
            setLoading(false)
          } else {
            router.push('/login')
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/login')
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">載入中...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return <>{children}</>
}

