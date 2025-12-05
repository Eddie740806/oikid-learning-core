'use client'

import { useState, useEffect } from 'react'
import { createClientClient } from '@/lib/auth'

interface BusinessUsageStats {
  user_id: string
  email: string
  name: string
  login_count: number
  action_count: number
  last_login_at: string | null
  last_activity_at: string | null
  timeline: Array<{
    date: string
    logins: number
    actions: number
  }>
}

interface BusinessUsagePanelProps {
  startDate?: string
  endDate?: string
  dimension: 'day' | 'week' | 'month' | 'year'
}

export default function BusinessUsagePanel({
  startDate,
  endDate,
  dimension,
}: BusinessUsagePanelProps) {
  const [stats, setStats] = useState<BusinessUsageStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [startDate, endDate, dimension])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const supabase = createClientClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const params = new URLSearchParams()
      params.append('dimension', dimension)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)

      const response = await fetch(`/api/admin/activity/user-stats?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })

      const result = await response.json()
      if (result.ok) {
        setStats(result.data || [])
      }
    } catch (err) {
      console.error('Error fetching business usage stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (dimension === 'week') {
      // 格式：2024-W01
      const [year, week] = dateStr.split('-W')
      return `${year}年第${parseInt(week)}週`
    } else if (dimension === 'month') {
      // 格式：2024-01
      const [year, month] = dateStr.split('-')
      return `${year}年${parseInt(month)}月`
    } else if (dimension === 'year') {
      return `${dateStr}年`
    } else {
      // 格式：2024-01-01
      const date = new Date(dateStr)
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
        <div className="text-center text-zinc-600 dark:text-zinc-400">載入中...</div>
      </div>
    )
  }

  if (stats.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
          業務使用情況
        </h2>
        <div className="text-center text-zinc-500 dark:text-zinc-400 py-8">
          暫無數據
        </div>
      </div>
    )
  }

  const selectedUserStats = selectedUser
    ? stats.find(s => s.user_id === selectedUser)
    : null

  return (
    <div className="space-y-6">
      {/* 業務列表 */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
          業務使用情況
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-100 dark:bg-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase">
                  業務
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase">
                  登入次數
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase">
                  操作次數
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase">
                  最後登入
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {stats.map((stat) => (
                <tr
                  key={stat.user_id}
                  className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer ${
                    selectedUser === stat.user_id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => setSelectedUser(selectedUser === stat.user_id ? null : stat.user_id)}
                >
                  <td className="px-4 py-3 text-sm text-black dark:text-zinc-50">
                    <div className="font-medium">{stat.name}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{stat.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-black dark:text-zinc-50">
                    {stat.login_count}
                  </td>
                  <td className="px-4 py-3 text-sm text-black dark:text-zinc-50">
                    {stat.action_count}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {stat.last_login_at
                      ? new Date(stat.last_login_at).toLocaleString('zh-TW')
                      : '從未登入'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedUser(selectedUser === stat.user_id ? null : stat.user_id)
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {selectedUser === stat.user_id ? '隱藏詳情' : '查看詳情'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 選中業務的詳細時間線 */}
      {selectedUserStats && selectedUserStats.timeline.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">
            {selectedUserStats.name} 的使用時間線
          </h3>
          <div className="space-y-4">
            {selectedUserStats.timeline.map((item, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-black dark:text-zinc-50">
                    {formatDate(item.date)}
                  </span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600 dark:text-green-400">
                      登入: {item.logins} 次
                    </span>
                    <span className="text-blue-600 dark:text-blue-400">
                      操作: {item.actions} 次
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {item.logins > 0 && (
                    <div className="flex-1">
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">登入</div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${Math.min((item.logins / Math.max(selectedUserStats.login_count, 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {item.actions > 0 && (
                    <div className="flex-1">
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">操作</div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min((item.actions / Math.max(selectedUserStats.action_count, 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}




