'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientClient } from '@/lib/auth'

interface AdminGuardProps {
  children: React.ReactNode
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const supabase = createClientClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        // 獲取用戶角色
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (error || !profile) {
          console.error('Error fetching user profile:', error)
          router.push('/')
          return
        }

        if (profile.role !== 'admin') {
          // 不是管理員，顯示 403 錯誤
          setIsAdmin(false)
        } else {
          setIsAdmin(true)
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-600 dark:text-zinc-400 mb-4">載入中...</div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-6 rounded-lg">
            <h1 className="text-2xl font-bold mb-2">403 禁止訪問</h1>
            <p className="mb-4">您沒有權限訪問此頁面。只有管理員可以訪問後台管理系統。</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              返回首頁
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

