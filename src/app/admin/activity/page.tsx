'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminGuard from '@/components/AdminGuard'
import { createClientClient } from '@/lib/auth'

interface Activity {
  id: string
  user_id: string
  activity_type: string
  page_path: string | null
  action: string | null
  metadata: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user_profiles: {
    email: string
    name: string | null
    role: string
  } | null
}

export default function ActivityPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 篩選和搜尋
  const [filters, setFilters] = useState({
    user_id: '',
    activity_type: '',
    page_path: '',
    start_date: '',
    end_date: '',
  })
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })

  useEffect(() => {
    fetchActivities()
  }, [filters, sortBy, sortOrder, pagination.page])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClientClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams()
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.activity_type) params.append('activity_type', filters.activity_type)
      if (filters.page_path) params.append('page_path', filters.page_path)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())
      params.append('sort_by', sortBy)
      params.append('sort_order', sortOrder)

      const response = await fetch(`/api/admin/activity?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })

      const result = await response.json()

      if (result.ok) {
        setActivities(result.data || [])
        setPagination(prev => ({
          ...prev,
          total: result.pagination?.total || 0,
          totalPages: result.pagination?.totalPages || 0,
        }))
      } else {
        if (response.status === 401 || response.status === 403) {
          router.push('/login')
          return
        }
        setError(result.error || '載入失敗')
      }
    } catch (err) {
      console.error('Error fetching activities:', err)
      setError('發生錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    // 準備 CSV 數據
    const headers = ['時間', '用戶', '活動類型', '頁面路徑', '操作', 'IP地址', '瀏覽器']
    const rows = activities.map(activity => [
      new Date(activity.created_at).toLocaleString('zh-TW'),
      activity.user_profiles?.email || activity.user_id,
      activity.activity_type,
      activity.page_path || '',
      activity.action || '',
      activity.ip_address || '',
      activity.user_agent || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          const cellStr = String(cell || '')
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(',')
      )
    ].join('\n')

    // 下載 CSV
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `activity_logs_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  return (
    <AdminGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-2">
                  活動追蹤
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400">
                  查看所有用戶的活動記錄
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="bg-zinc-600 hover:bg-zinc-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  ← 返回儀表板
                </button>
                <button
                  onClick={handleExport}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  導出 CSV
                </button>
              </div>
            </div>
          </div>

          {/* 篩選器 */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  用戶 ID
                </label>
                <input
                  type="text"
                  placeholder="用戶 ID..."
                  value={filters.user_id}
                  onChange={(e) => {
                    setFilters({ ...filters, user_id: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  活動類型
                </label>
                <select
                  value={filters.activity_type}
                  onChange={(e) => {
                    setFilters({ ...filters, activity_type: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                >
                  <option value="">全部</option>
                  <option value="login">登入</option>
                  <option value="logout">登出</option>
                  <option value="page_view">頁面訪問</option>
                  <option value="action">操作</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  頁面路徑
                </label>
                <input
                  type="text"
                  placeholder="頁面路徑..."
                  value={filters.page_path}
                  onChange={(e) => {
                    setFilters({ ...filters, page_path: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  開始日期
                </label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => {
                    setFilters({ ...filters, start_date: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  結束日期
                </label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => {
                    setFilters({ ...filters, end_date: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({
                      user_id: '',
                      activity_type: '',
                      page_path: '',
                      start_date: '',
                      end_date: '',
                    })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  清除篩選
                </button>
              </div>
            </div>
          </div>

          {/* 排序 */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                排序：
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              >
                <option value="created_at">時間</option>
                <option value="activity_type">活動類型</option>
                <option value="page_path">頁面路徑</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
              >
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </select>
            </div>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* 活動列表 */}
          {loading ? (
            <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
              載入中...
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          IP地址
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                      {activities.map((activity) => (
                        <tr key={activity.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                            {new Date(activity.created_at).toLocaleString('zh-TW')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-black dark:text-zinc-50">
                            {activity.user_profiles?.email || activity.user_id}
                            {activity.user_profiles?.name && (
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                {activity.user_profiles.name}
                              </div>
                            )}
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                            {activity.ip_address || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 分頁 */}
              {pagination.totalPages > 1 && (
                <div className="mt-6 flex justify-center items-center gap-4">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一頁
                  </button>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    第 {pagination.page} 頁，共 {pagination.totalPages} 頁（總計 {pagination.total} 筆）
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一頁
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminGuard>
  )
}

