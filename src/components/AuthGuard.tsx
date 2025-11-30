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
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          setAuthenticated(true)
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/login')
      } finally {
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

