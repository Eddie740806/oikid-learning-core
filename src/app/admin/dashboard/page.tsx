'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminGuard from '@/components/AdminGuard'
import { createClientClient } from '@/lib/auth'

interface DashboardStats {
  totalActivities: number
  todayLogins: number
  activeUsers: number
  loginTrend: Array<{ date: string; count: number }>
  topUsers: Array<{ user_id: string; email: string; name?: string; count: number }>
  topPages: Array<{ path: string; count: number }>
  activityTypeDistribution: Record<string, number>
  recentActivities: Array<{
    id: string
    user_id: string
    activity_type: string
    page_path: string | null
    action: string | null
    created_at: string
    user_profiles: {
      email: string
      name?: string | null
    } | null
  }>
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchStats()
  }, [days])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClientClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/admin/activity/stats?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })

      const result = await response.json()

      if (result.ok) {
        setStats(result.data)
      } else {
        if (response.status === 401 || response.status === 403) {
          router.push('/login')
          return
        }
        setError(result.error || '載入失敗')
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError('發生錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'login': '登入',
      'logout': '登出',
      'page_view': '頁面訪問',
      'action': '操作',
    }
    return labels[type] || type
  }

  // 計算登入趨勢圖的最大值（用於顯示比例）
  const maxLoginCount = stats?.loginTrend.length
    ? Math.max(...stats.loginTrend.map(t => t.count))
    : 1

  return (
    <AdminGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-2">
                  管理員儀表板
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400">
                  系統整體統計和活動概覽
                </p>
              </div>
              <div className="flex gap-3">
                <select
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                >
                  <option value="7">最近7天</option>
                  <option value="30">最近30天</option>
                  <option value="90">最近90天</option>
                </select>
                <button
                  onClick={() => router.push('/admin/users')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  用戶管理
                </button>
                <button
                  onClick={() => router.push('/admin/activity')}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  活動追蹤
                </button>
              </div>
            </div>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
              載入中...
            </div>
          ) : stats ? (
            <>
              {/* 總覽統計卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
                  <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                    總活動數
                  </div>
                  <div className="text-3xl font-bold text-black dark:text-zinc-50">
                    {stats.totalActivities.toLocaleString()}
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
                  <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                    今日登入
                  </div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {stats.todayLogins}
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
                  <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                    活躍用戶
                  </div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.activeUsers}
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
                  <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                    最活躍用戶數
                  </div>
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.topUsers.length}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* 登入趨勢圖 */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
                    登入趨勢（最近{days}天）
                  </h2>
                  <div className="space-y-2">
                    {stats.loginTrend.length > 0 ? (
                      stats.loginTrend.map((trend, index) => {
                        const percentage = maxLoginCount > 0 ? (trend.count / maxLoginCount) * 100 : 0
                        return (
                          <div key={index}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-black dark:text-zinc-50">
                                {new Date(trend.date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {trend.count} 次
                              </span>
                            </div>
                            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                        暫無數據
                      </div>
                    )}
                  </div>
                </div>

                {/* 最活躍用戶 */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
                    最活躍用戶（前10名）
                  </h2>
                  <div className="space-y-3">
                    {stats.topUsers.length > 0 ? (
                      stats.topUsers.map((user, index) => {
                        const percentage = stats.totalActivities > 0 
                          ? (user.count / stats.totalActivities) * 100 
                          : 0
                        return (
                          <div key={user.user_id}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-black dark:text-zinc-50">
                                {index + 1}. {user.name || user.email || '未知用戶'}
                              </span>
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {user.count} 次
                              </span>
                            </div>
                            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                        暫無數據
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* 最常訪問頁面 */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
                    最常訪問頁面（前10名）
                  </h2>
                  <div className="space-y-2">
                    {stats.topPages.length > 0 ? (
                      stats.topPages.map((page) => {
                        const percentage = stats.totalActivities > 0
                          ? (page.count / stats.totalActivities) * 100
                          : 0
                        return (
                          <div key={page.path}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-black dark:text-zinc-50 truncate">
                                {page.path}
                              </span>
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {page.count} 次
                              </span>
                            </div>
                            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                        暫無數據
                      </div>
                    )}
                  </div>
                </div>

                {/* 活動類型分布 */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
                    活動類型分布
                  </h2>
                  <div className="space-y-3">
                    {Object.entries(stats.activityTypeDistribution).length > 0 ? (
                      Object.entries(stats.activityTypeDistribution).map(([type, count]) => {
                        const percentage = stats.totalActivities > 0
                          ? (count / stats.totalActivities) * 100
                          : 0
                        return (
                          <div key={type}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-black dark:text-zinc-50">
                                {getActivityTypeLabel(type)}
                              </span>
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {count} 次 ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                        暫無數據
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 最近活動 */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
                  最近活動
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-100 dark:bg-zinc-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          時間
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          用戶
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          活動類型
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          頁面路徑
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                      {stats.recentActivities.map((activity) => (
                        <tr key={activity.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                            {new Date(activity.created_at).toLocaleString('zh-TW')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-black dark:text-zinc-50">
                            {activity.user_profiles?.email || activity.user_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              activity.activity_type === 'login'
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                : activity.activity_type === 'logout'
                                ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                : activity.activity_type === 'page_view'
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                            }`}>
                              {getActivityTypeLabel(activity.activity_type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {activity.page_path || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                            {activity.action || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </AdminGuard>
  )
}

