'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientClient } from '@/lib/auth'

export default function Navbar() {
  const [user, setUser] = useState<{ email: string; role: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadUser = async () => {
    try {
      const supabase = createClientClient()
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()

      if (userError) {
        console.error('Auth user error:', userError)
        setLoading(false)
        return
      }

      if (!authUser) {
        setLoading(false)
        return
      }

      // 獲取用戶角色（從資料庫實時查詢，不依賴 JWT）
      // 使用 RPC 函數或直接查詢，確保能獲取到角色
      let profile: { role: string; name: string; email: string } | null = null
      let profileError: any = null

      // 方法 1: 直接查詢
      const { data: profileData, error: queryError } = await supabase
        .from('user_profiles')
        .select('role, name, email')
        .eq('id', authUser.id)
        .maybeSingle() // 使用 maybeSingle 而不是 single，避免找不到記錄時報錯

      if (queryError) {
        console.error('Profile query error:', queryError)
        console.error('Error code:', queryError.code)
        console.error('Error message:', queryError.message)
        console.error('Error details:', queryError.details)
        console.error('Error hint:', queryError.hint)
        profileError = queryError
      } else {
        profile = profileData
      }

      // 如果查詢失敗，嘗試使用 email 查詢（備用方法）
      if (!profile && !profileError) {
        const { data: profileByEmail } = await supabase
          .from('user_profiles')
          .select('role, name, email')
          .eq('email', authUser.email)
          .maybeSingle()
        
        if (profileByEmail) {
          profile = profileByEmail
        }
      }

      if (profileError) {
        console.error('Profile query failed. User ID:', authUser.id, 'Email:', authUser.email)
        // 即使查詢失敗，也設置用戶信息（使用默認角色）
        setUser({
          email: authUser.email || '',
          role: 'salesperson', // 默認角色
          name: authUser.email || '',
        })
      } else if (profile) {
        console.log('Profile loaded successfully:', { role: profile.role, name: profile.name })
        setUser({
          email: authUser.email || '',
          role: profile.role || 'salesperson',
          name: profile.name || authUser.email || '',
        })
      } else {
        console.warn('Profile not found for user:', authUser.id)
        // 如果找不到 profile，使用默認值
        setUser({
          email: authUser.email || '',
          role: 'salesperson',
          name: authUser.email || '',
        })
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
    
    // 監聽 auth 狀態變化，當登入狀態改變時重新載入用戶
    const supabase = createClientClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUser() // 重新載入用戶信息
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    try {
      const supabase = createClientClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return null
  }

  return (
    <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-black dark:text-zinc-50">
              Oikid Learning Core
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link
                href="/analyses"
                className="text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 px-3 py-2 rounded-md text-sm font-medium"
              >
                分析結果
              </Link>
              <Link
                href="/analyses/new"
                className="text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 px-3 py-2 rounded-md text-sm font-medium"
              >
                新增分析
              </Link>
              <Link
                href="/analyses/stats"
                className="text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 px-3 py-2 rounded-md text-sm font-medium"
              >
                統計儀表板
              </Link>
            </div>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-black dark:text-zinc-50">{user.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {user.role === 'admin' ? '管理員' : '業務'}
                  </p>
                  <button
                    onClick={loadUser}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    title="刷新角色信息"
                  >
                    🔄
                  </button>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                登出
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

