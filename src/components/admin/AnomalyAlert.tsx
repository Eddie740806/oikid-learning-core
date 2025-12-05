'use client'

import { useState, useEffect } from 'react'
import { createClientClient } from '@/lib/auth'

interface Anomaly {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high'
  user_id: string
  user_email: string
  name: string
  description: string
  detected_at: string
  details: any
}

interface AnomalyAlertProps {
  startDate?: string
  endDate?: string
}

export default function AnomalyAlert({ startDate, endDate }: AnomalyAlertProps) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetchAnomalies()
  }, [startDate, endDate])

  const fetchAnomalies = async () => {
    try {
      setLoading(true)
      const supabase = createClientClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)

      const response = await fetch(`/api/admin/activity/anomalies?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })

      const result = await response.json()
      if (result.ok) {
        setAnomalies(result.data || [])
      }
    } catch (err) {
      console.error('Error fetching anomalies:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null
  }

  if (anomalies.length === 0) {
    return null
  }

  const highSeverityCount = anomalies.filter(a => a.severity === 'high').length
  const mediumSeverityCount = anomalies.filter(a => a.severity === 'medium').length

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700'
      case 'low':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700'
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      multiple_logins: '同時多個登入',
      frequent_login: '頻繁登入',
      inactive: '長時間無活動',
    }
    return labels[type] || type
  }

  return (
    <div className="mb-6">
      <div
        className={`${getSeverityColor(highSeverityCount > 0 ? 'high' : mediumSeverityCount > 0 ? 'medium' : 'low')} border rounded-lg p-4 cursor-pointer`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold">⚠️ 異常活動提醒</span>
            <span className="text-sm">
              共發現 {anomalies.length} 個異常
              {highSeverityCount > 0 && `（${highSeverityCount} 個高風險）`}
              {mediumSeverityCount > 0 && `（${mediumSeverityCount} 個中風險）`}
            </span>
          </div>
          <span className="text-sm">{expanded ? '收起' : '展開'}</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 bg-white dark:bg-zinc-900 rounded-lg shadow p-4 space-y-3">
          {anomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`border-l-4 ${getSeverityColor(anomaly.severity)} p-3 rounded`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{getTypeLabel(anomaly.type)}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      anomaly.severity === 'high' ? 'bg-red-200 dark:bg-red-800' :
                      anomaly.severity === 'medium' ? 'bg-yellow-200 dark:bg-yellow-800' :
                      'bg-blue-200 dark:bg-blue-800'
                    }`}>
                      {anomaly.severity === 'high' ? '高風險' :
                       anomaly.severity === 'medium' ? '中風險' : '低風險'}
                    </span>
                  </div>
                  <p className="text-sm mb-1">
                    <span className="font-medium">{anomaly.name || anomaly.user_email}</span>
                    {' - '}
                    {anomaly.description}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(anomaly.detected_at).toLocaleString('zh-TW')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}




