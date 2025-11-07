'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Customer {
  id: string
  created_at: string
  display_name: string | null
  phone: string | null
  contact_key: string | null
  source: string | null
  grade: string | null
  english_level: string | null
  tags: string | null
  confidence: string | null
  notes: string | null
  last_seen_at: string | null
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/customers')
      const result = await response.json()

      if (result.ok) {
        setCustomers(result.data || [])
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-2">
              客戶管理
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              共 {customers.length} 位客戶
            </p>
          </div>
          <button
            onClick={() => router.push('/customers/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            + 新增客戶
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
            載入中...
          </div>
        ) : error ? (
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg">
            {error}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
            <p className="mb-4">還沒有客戶資料</p>
            <button
              onClick={() => router.push('/customers/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              新增第一位客戶
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                        {customer.display_name || '未命名客戶'}
                      </h2>
                      {customer.grade && (
                        <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                          {customer.grade}
                        </span>
                      )}
                      {customer.english_level && (
                        <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm">
                          {customer.english_level}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {customer.phone && (
                        <span>電話: {customer.phone}</span>
                      )}
                      {customer.source && (
                        <span>來源: {customer.source}</span>
                      )}
                      <span>{formatDate(customer.created_at)}</span>
                    </div>
                  </div>
                </div>

                {customer.contact_key && (
                  <div className="mb-2">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">聯絡人代號: </span>
                    <span className="text-black dark:text-zinc-50">{customer.contact_key}</span>
                  </div>
                )}

                {customer.tags && (
                  <div className="mb-2">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">標籤: </span>
                    <span className="text-black dark:text-zinc-50">{customer.tags}</span>
                  </div>
                )}

                {customer.notes && (
                  <div className="mb-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                      備註：
                    </h3>
                    <p className="text-black dark:text-zinc-50">{customer.notes}</p>
                  </div>
                )}

                <div className="text-xs text-zinc-400 dark:text-zinc-500">
                  ID: {customer.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

