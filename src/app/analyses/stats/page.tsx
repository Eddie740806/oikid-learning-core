'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface StatsData {
  total: number
  averageScore: number
  scoreDistribution: Record<string, number>
  salespersonStats: Record<string, { count: number; avgScore: number }>
  tagStats: Record<string, number>
  recentCount: number
  recent30Count: number
}

export default function StatsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/analyses/stats')
      const result = await response.json()

      if (result.ok) {
        setStats(result.data)
      } else {
        setError(result.error || '載入失敗')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('發生錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  // 取得前 N 名業務
  const getTopSalespersons = (n: number = 5) => {
    if (!stats) return []
    return Object.entries(stats.salespersonStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, n)
  }

  // 取得前 N 名標籤
  const getTopTags = (n: number = 10) => {
    if (!stats) return []
    return Object.entries(stats.tagStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
            載入中...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-2">
                資料統計儀表板
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400">
                分析結果的整體統計資料
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/analyses')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                ← 返回列表
              </button>
              <button
                onClick={() => router.push('/')}
                className="bg-zinc-600 hover:bg-zinc-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                🏠 回到首頁
              </button>
            </div>
          </div>
        </div>

        {/* 總覽卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              總分析數
            </div>
            <div className="text-3xl font-bold text-black dark:text-zinc-50">
              {stats.total}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              平均評分
            </div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {stats.averageScore.toFixed(1)}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              近 7 天新增
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.recentCount}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              近 30 天新增
            </div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {stats.recent30Count}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 評分分布 */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
              評分分布
            </h2>
            <div className="space-y-3">
              {Object.entries(stats.scoreDistribution).map(([range, count]) => {
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
                return (
                  <div key={range}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-black dark:text-zinc-50">
                        {range} 分
                      </span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {count} 筆 ({percentage.toFixed(1)}%)
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
              })}
            </div>
          </div>

          {/* 業務統計 */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
              業務統計（前 5 名）
            </h2>
            <div className="space-y-3">
              {getTopSalespersons(5).map(([name, data]) => {
                const percentage = stats.total > 0 ? (data.count / stats.total) * 100 : 0
                return (
                  <div key={name}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-black dark:text-zinc-50">
                        {name}
                      </span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {data.count} 筆 | 平均 {data.avgScore.toFixed(1)} 分
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
              })}
            </div>
          </div>
        </div>

        {/* 標籤統計 */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
            標籤統計（前 10 名）
          </h2>
          <div className="flex flex-wrap gap-3">
            {getTopTags(10).map(([tag, count]) => (
              <div
                key={tag}
                className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
              >
                <span>{tag}</span>
                <span className="bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded-full">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

