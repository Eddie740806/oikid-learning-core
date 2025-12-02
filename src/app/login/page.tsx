'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientClient } from '@/lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // 檢查是否已經登入
  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClientClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.push('/')
          router.refresh()
        }
      } catch (error) {
        console.error('Session check error:', error)
      }
    }
    checkSession()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🔐 [Login] ====== LOGIN FORM SUBMITTED ======')
    console.log('🔐 [Login] Email:', email)
    setLoading(true)
    setError('')

    try {
      const supabase = createClientClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data.user && data.session) {
        console.log('🔐 [Login] Login successful, starting activity tracking...')
        console.log('🔐 [Login] User:', data.user.email, 'ID:', data.user.id)
        
        // 檢查是否已經記錄過（使用 localStorage）
        const sessionId = data.session.access_token.substring(0, 20)
        const storageKey = `login_recorded_${data.user.id}_${sessionId}`
        const alreadyRecorded = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
        
        if (!alreadyRecorded) {
          // 等待 session cookie 完全設置
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // 記錄登入活動（帶重試機制）
          const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : ''
          let loginActivityRecorded = false
          let retryCount = 0
          const maxRetries = 3
          
          console.log('📝 [Login] Attempting to record login activity...')
          
          while (!loginActivityRecorded && retryCount < maxRetries) {
            try {
              console.log(`📝 [Login] Attempt ${retryCount + 1}/${maxRetries}...`)
              const response = await fetch('/api/admin/activity', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${data.session.access_token}`,
                },
                credentials: 'include',
                body: JSON.stringify({
                  activity_type: 'login',
                  user_agent: userAgent,
                }),
              })
              
              if (response.ok) {
                const result = await response.json()
                if (result.ok) {
                  loginActivityRecorded = true
                  // 記錄到 localStorage
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(storageKey, Date.now().toString())
                    setTimeout(() => {
                      localStorage.removeItem(storageKey)
                    }, 60 * 60 * 1000) // 1 小時後清除
                  }
                  console.log('✅ [Login] Login activity recorded successfully')
                  console.log('✅ [Login] User:', data.user.email, 'ID:', data.user.id)
                  console.log('✅ [Login] Activity ID:', result.data?.id)
                } else {
                  console.warn(`⚠️ [Login] Failed to log login activity (attempt ${retryCount + 1}):`, result.error)
                }
              } else {
                const errorText = await response.text()
                console.warn(`⚠️ [Login] Failed to log login activity (attempt ${retryCount + 1}), status: ${response.status}`)
                console.warn(`⚠️ [Login] Error details:`, errorText)
              }
            } catch (err: any) {
              console.error(`❌ [Login] Error logging login activity (attempt ${retryCount + 1}):`, err)
              console.error(`❌ [Login] Error message:`, err.message)
            }
            
            if (!loginActivityRecorded && retryCount < maxRetries - 1) {
              // 等待後重試（每次重試等待時間遞增）
              const waitTime = 300 * (retryCount + 1)
              console.log(`⏳ [Login] Retrying in ${waitTime}ms...`)
              await new Promise(resolve => setTimeout(resolve, waitTime))
              retryCount++
            } else {
              retryCount++
            }
          }
          
          if (!loginActivityRecorded) {
            console.error('❌ [Login] Failed to record login activity after all retries.')
            console.error('❌ [Login] The ActivityTracker component will attempt to record login as a backup.')
          } else {
            console.log('✅ [Login] All login tracking completed successfully')
          }
        } else {
          console.log('⏭️ [Login] Login already recorded (from localStorage), skipping...')
        }
        
        // 等待一小段時間確保日誌顯示
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // 登入成功，重定向到首頁
        console.log('🔄 [Login] Redirecting to home page...')
        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || '登入失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-2">
            Oikid Learning Core
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            請登入以繼續
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              電子郵件
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              密碼
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>首次使用？請聯繫管理員創建帳號</p>
        </div>
      </div>
    </div>
  )
}

