'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientClient } from '@/lib/auth'

export default function Navbar() {
  const [user, setUser] = useState<{ email: string; role: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createClientClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (authUser) {
          // 獲取用戶角色
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role, name, email')
            .eq('id', authUser.id)
            .single()

          setUser({
            email: authUser.email || '',
            role: profile?.role || 'salesperson',
            name: profile?.name || authUser.email || '',
          })
        }
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
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
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {user.role === 'admin' ? '管理員' : '業務'}
                </p>
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

