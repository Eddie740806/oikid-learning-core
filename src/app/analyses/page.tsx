'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Analysis {
  id: string
  created_at: string
  analysis_text: string
  transcript: string | null
  customer_profile: string | null
  score: number | null
  tags: string[] | null
  notes: string | null
  salesperson_name: string | null
  customer_name: string | null
  recording_file_url: string | null
  analyzed_by: string
  customer_id: string | null
  recording_id: string | null
}

export default function AnalysesPage() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [allAnalyses, setAllAnalyses] = useState<Analysis[]>([]) // 儲存所有資料，用於取得業務名和標籤列表
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 篩選條件
  const [filters, setFilters] = useState({
    salesperson_name: '',
    score_min: '',
    score_max: '',
    tags: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  
  // 批量選擇
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBatchActions, setShowBatchActions] = useState(false)
  
  // 排序
  const [sortBy, setSortBy] = useState<'created_at' | 'score' | 'salesperson_name' | 'customer_name'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // 批量編輯
  const [showBatchEdit, setShowBatchEdit] = useState(false)
  const [batchEditFields, setBatchEditFields] = useState({
    salesperson_name: '',
    tags: '',
    score: '',
    customer_name: '',
  })

  useEffect(() => {
    fetchAllAnalyses() // 先載入全部資料以取得業務名和標籤列表
    fetchAnalyses()
  }, [])

  // 載入所有資料以取得業務名和標籤選項
  const fetchAllAnalyses = async () => {
    try {
      const response = await fetch('/api/analyses?limit=10000')
      const result = await response.json()
      if (result.ok) {
        setAllAnalyses(result.data || [])
      }
    } catch (err) {
      console.error('Error fetching all analyses:', err)
    }
  }

  // 取得所有業務名（去重）
  const getAllSalespersons = () => {
    const salespersons = new Set<string>()
    allAnalyses.forEach(a => {
      if (a.salesperson_name) {
        salespersons.add(a.salesperson_name)
      }
    })
    return Array.from(salespersons).sort()
  }

  // 取得所有標籤（去重）
  const getAllTags = () => {
    const tags = new Set<string>()
    allAnalyses.forEach(a => {
      if (a.tags && a.tags.length > 0) {
        a.tags.forEach(tag => tags.add(tag))
      }
    })
    return Array.from(tags).sort()
  }

  const fetchAnalyses = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filters.salesperson_name) {
        params.append('salesperson_name', filters.salesperson_name)
      }
      if (filters.score_min) {
        params.append('score_min', filters.score_min)
      }
      if (filters.score_max) {
        params.append('score_max', filters.score_max)
      }
      if (filters.tags) {
        params.append('tags', filters.tags)
      }

      const response = await fetch(`/api/analyses?${params.toString()}`)
      const result = await response.json()

      if (result.ok) {
        const data = result.data || []
        // 套用排序
        const sortedData = sortAnalyses(data)
        setAnalyses(sortedData)
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

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleApplyFilters = () => {
    fetchAnalyses()
  }

  const handleClearFilters = () => {
    setFilters({
      salesperson_name: '',
      score_min: '',
      score_max: '',
      tags: '',
    })
    // 清空後重新載入
    setTimeout(() => {
      fetchAnalyses()
    }, 100)
  }

  // 排序功能
  const sortAnalyses = (data: Analysis[]) => {
    const sorted = [...data]
    sorted.sort((a, b) => {
      let aVal: any
      let bVal: any
      
      switch (sortBy) {
        case 'created_at':
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
          break
        case 'score':
          aVal = a.score ?? -1
          bVal = b.score ?? -1
          break
        case 'salesperson_name':
          aVal = a.salesperson_name || ''
          bVal = b.salesperson_name || ''
          break
        case 'customer_name':
          aVal = a.customer_name || ''
          bVal = b.customer_name || ''
          break
        default:
          return 0
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    
    return sorted
  }

  // 處理排序變更
  const handleSortChange = (field: 'created_at' | 'score' | 'salesperson_name' | 'customer_name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    // 重新排序現有資料
    const sorted = sortAnalyses(analyses)
    setAnalyses(sorted)
  }

  // 批量選擇
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(analyses.map(a => a.id)))
      setShowBatchActions(true)
    } else {
      setSelectedIds(new Set())
      setShowBatchActions(false)
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
    setShowBatchActions(newSelected.size > 0)
  }

  // 批量刪除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    
    if (!confirm(`確定要刪除選取的 ${selectedIds.size} 筆分析結果嗎？此操作無法復原。`)) {
      return
    }

    try {
      const response = await fetch('/api/analyses/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: 'delete',
        }),
      })

      const result = await response.json()

      if (result.ok) {
        setSelectedIds(new Set())
        setShowBatchActions(false)
        fetchAnalyses()
        alert(`成功刪除 ${selectedIds.size} 筆分析結果`)
      } else {
        alert(result.error || '批量刪除失敗')
      }
    } catch (error) {
      console.error('Batch delete error:', error)
      alert('批量刪除時發生錯誤')
    }
  }

  // 批量編輯
  const handleBatchEdit = async () => {
    if (selectedIds.size === 0) return

    const fields: any = {}
    if (batchEditFields.salesperson_name) {
      fields.salesperson_name = batchEditFields.salesperson_name
    }
    if (batchEditFields.tags) {
      fields.tags = batchEditFields.tags.split(',').map(t => t.trim()).filter(t => t)
    }
    if (batchEditFields.score) {
      fields.score = batchEditFields.score
    }
    if (batchEditFields.customer_name) {
      fields.customer_name = batchEditFields.customer_name
    }

    if (Object.keys(fields).length === 0) {
      alert('請至少填寫一個要更新的欄位')
      return
    }

    try {
      const response = await fetch('/api/analyses/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: 'update',
          fields,
        }),
      })

      const result = await response.json()

      if (result.ok) {
        setSelectedIds(new Set())
        setShowBatchActions(false)
        setShowBatchEdit(false)
        setBatchEditFields({
          salesperson_name: '',
          tags: '',
          score: '',
          customer_name: '',
        })
        fetchAnalyses()
        alert(`成功更新 ${selectedIds.size} 筆分析結果`)
      } else {
        alert(result.error || '批量更新失敗')
      }
    } catch (error) {
      console.error('Batch update error:', error)
      alert('批量更新時發生錯誤')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這筆分析結果嗎？此操作無法復原。')) {
      return
    }

    try {
      const response = await fetch(`/api/analyses/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.ok) {
        // 重新載入列表
        fetchAnalyses()
      } else {
        alert(result.error || '刪除失敗')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('刪除時發生錯誤')
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

  // 格式化分析文字，改善排版並智能分段
  const formatAnalysisText = (text: string) => {
    if (!text) return ''
    
    let formatted = text
      // 移除多個連續空格，保留單個空格
      .replace(/[ \t]{2,}/g, ' ')
      // 移除行首行尾空格
      .replace(/^[ \t]+|[ \t]+$/gm, '')
      // 將多個連續換行縮減為最多兩個換行（保留段落分隔）
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    
    // 智能分段：在特定模式後插入雙換行
    // 1. 在標題模式後分段（如「第二部分:」、「A.」、「一、」）
    formatted = formatted.replace(/([。！？])\s*([第][一二三四五六七八九十\d]+[部分節項])/g, '$1\n\n$2')
    formatted = formatted.replace(/([。！？])\s*([A-Z][.、：:])/g, '$1\n\n$2')
    formatted = formatted.replace(/([。！？])\s*([一二三四五六七八九十][.、：:])/g, '$1\n\n$2')
    
    // 2. 在評分項目後分段（如「語速、語調、用詞清晰度(10/10分):」）
    formatted = formatted.replace(/([。！？])\s*([^。！？\n]+\([^)]+分\)[:：])/g, '$1\n\n$2')
    
    // 3. 在時間戳記前分段（如「[01:27]」）
    formatted = formatted.replace(/([。！？])\s*(\[[\d:]+\])/g, '$1\n\n$2')
    
    // 4. 在子標題模式後分段（如「A. 溝通技巧」後）
    formatted = formatted.replace(/([A-Z][.、：:]\s*[^。！？\n]+)\s*([（(][\d/]+分[）)])/g, '$1 $2\n\n')
    
    // 5. 在評分項目標題後分段（如「語速、語調、用詞清晰度(10/10分):」後）
    formatted = formatted.replace(/([^。！？\n]+\([^)]+分\)[:：])\s*/g, '$1\n\n')
    
    // 清理多餘的換行
    formatted = formatted.replace(/\n{3,}/g, '\n\n')
    
    return formatted
  }

  // 匯出為 CSV
  const exportToCSV = () => {
    if (analyses.length === 0) {
      alert('沒有資料可以匯出')
      return
    }

    // 準備 CSV 標題行
    const headers = [
      '日期',
      '業務名',
      '客戶名字',
      '評分',
      '標籤',
      '分析結果',
      '逐字稿',
      '客戶畫像',
      '備註',
      '錄音檔連結',
      '分析方式',
      'ID'
    ]

    // 準備資料行
    const rows = analyses.map((analysis) => {
      return [
        formatDate(analysis.created_at),
        analysis.salesperson_name || '',
        analysis.customer_name || '',
        analysis.score !== null ? analysis.score.toString() : '',
        analysis.tags ? analysis.tags.join('; ') : '',
        analysis.analysis_text.replace(/\n/g, ' ').replace(/,/g, '，'), // 移除換行和逗號，避免 CSV 格式問題
        analysis.transcript ? analysis.transcript.replace(/\n/g, ' ').replace(/,/g, '，') : '',
        analysis.customer_profile ? analysis.customer_profile.replace(/\n/g, ' ').replace(/,/g, '，') : '',
        analysis.notes ? analysis.notes.replace(/,/g, '，') : '',
        analysis.recording_file_url || '',
        analysis.analyzed_by,
        analysis.id
      ]
    })

    // 轉換為 CSV 格式
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // 處理包含引號或逗號的內容
          const cellStr = String(cell || '')
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(',')
      )
    ].join('\n')

    // 建立檔名（包含篩選資訊）
    const filterInfo = []
    if (filters.salesperson_name) filterInfo.push(`業務-${filters.salesperson_name}`)
    if (filters.score_min) filterInfo.push(`評分${filters.score_min}+`)
    if (filters.score_max) filterInfo.push(`評分-${filters.score_max}`)
    if (filters.tags) filterInfo.push(`標籤-${filters.tags.replace(/,/g, '_')}`)
    const fileName = filterInfo.length > 0
      ? `分析結果_${filterInfo.join('_')}_${new Date().toISOString().split('T')[0]}.csv`
      : `分析結果_${new Date().toISOString().split('T')[0]}.csv`

    // 加入 BOM 讓 Excel 正確顯示中文
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 匯出為 JSON
  const exportToJSON = () => {
    if (analyses.length === 0) {
      alert('沒有資料可以匯出')
      return
    }

    const jsonData = analyses.map((analysis) => ({
      日期: formatDate(analysis.created_at),
      業務名: analysis.salesperson_name || '',
      客戶名字: analysis.customer_name || '',
      評分: analysis.score,
      標籤: analysis.tags || [],
      分析結果: analysis.analysis_text,
      逐字稿: analysis.transcript || '',
      客戶畫像: analysis.customer_profile || '',
      備註: analysis.notes || '',
      錄音檔連結: analysis.recording_file_url || '',
      分析方式: analysis.analyzed_by,
      ID: analysis.id
    }))

    // 建立檔名（包含篩選資訊）
    const filterInfo = []
    if (filters.salesperson_name) filterInfo.push(`業務-${filters.salesperson_name}`)
    if (filters.score_min) filterInfo.push(`評分${filters.score_min}+`)
    if (filters.score_max) filterInfo.push(`評分-${filters.score_max}`)
    if (filters.tags) filterInfo.push(`標籤-${filters.tags.replace(/,/g, '_')}`)
    const fileName = filterInfo.length > 0
      ? `分析結果_${filterInfo.join('_')}_${new Date().toISOString().split('T')[0]}.json`
      : `分析結果_${new Date().toISOString().split('T')[0]}.json`

    const jsonString = JSON.stringify(jsonData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-2">
                分析結果列表
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400">
                共 {analyses.length} 筆分析結果
                {(filters.salesperson_name || filters.score_min || filters.score_max || filters.tags) && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    (已篩選)
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => router.push('/')}
                className="bg-zinc-600 hover:bg-zinc-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                🏠 回到首頁
              </button>
              <button
                onClick={() => router.push('/analyses/stats')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                📊 統計儀表板
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                🔍 {showFilters ? '隱藏篩選' : '顯示篩選'}
              </button>
              {analyses.length > 0 && (
                <button
                  onClick={exportToCSV}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  📥 匯出 CSV
                </button>
              )}
              {analyses.length > 0 && (
                <button
                  onClick={exportToJSON}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  📥 匯出 JSON
                </button>
              )}
              <button
                onClick={() => router.push('/analyses/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                + 新增分析
              </button>
            </div>
          </div>

          {/* 篩選面板 */}
          {showFilters && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow mb-6">
              <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">
                篩選條件
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 業務名篩選 */}
                <div>
                  <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                    業務名
                  </label>
                  <select
                    value={filters.salesperson_name}
                    onChange={(e) => handleFilterChange('salesperson_name', e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">全部業務</option>
                    {getAllSalespersons().map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 評分範圍 */}
                <div>
                  <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                    最低評分
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.score_min}
                    onChange={(e) => handleFilterChange('score_min', e.target.value)}
                    placeholder="例如: 80"
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                    最高評分
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.score_max}
                    onChange={(e) => handleFilterChange('score_max', e.target.value)}
                    placeholder="例如: 100"
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 標籤篩選 */}
                <div>
                  <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                    標籤（可選多個，用逗號分隔）
                  </label>
                  <select
                    value={filters.tags}
                    onChange={(e) => handleFilterChange('tags', e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">全部標籤</option>
                    {getAllTags().map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    或手動輸入多個標籤，用逗號分隔
                  </p>
                  <input
                    type="text"
                    value={filters.tags}
                    onChange={(e) => handleFilterChange('tags', e.target.value)}
                    placeholder="例如: 電話開發,demo砍單"
                    className="w-full mt-2 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleApplyFilters}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  套用篩選
                </button>
                <button
                  onClick={handleClearFilters}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  清除篩選
                </button>
              </div>
            </div>
          )}

          {/* 排序控制 */}
          {analyses.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow mb-4">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-medium text-black dark:text-zinc-50">排序方式：</span>
                <button
                  onClick={() => handleSortChange('created_at')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === 'created_at'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-black dark:text-zinc-50 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                  }`}
                >
                  日期 {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSortChange('score')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === 'score'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-black dark:text-zinc-50 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                  }`}
                >
                  評分 {sortBy === 'score' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSortChange('salesperson_name')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === 'salesperson_name'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-black dark:text-zinc-50 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                  }`}
                >
                  業務名 {sortBy === 'salesperson_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSortChange('customer_name')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === 'customer_name'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-black dark:text-zinc-50 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                  }`}
                >
                  客戶名 {sortBy === 'customer_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
          )}

          {/* 批量操作工具列 */}
          {showBatchActions && selectedIds.size > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 p-4 rounded-lg mb-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-black dark:text-zinc-50">
                    已選取 {selectedIds.size} 筆
                  </span>
                  <button
                    onClick={() => {
                      setSelectedIds(new Set())
                      setShowBatchActions(false)
                      setShowBatchEdit(false)
                    }}
                    className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    取消選擇
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBatchEdit(!showBatchEdit)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    ✏️ 批量編輯
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    🗑️ 批量刪除
                  </button>
                </div>
              </div>

              {/* 批量編輯表單 */}
              {showBatchEdit && (
                <div className="mt-4 p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <h4 className="text-sm font-semibold text-black dark:text-zinc-50 mb-3">批量更新欄位（留空則不更新）：</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-black dark:text-zinc-50 mb-1">
                        業務名
                      </label>
                      <input
                        type="text"
                        value={batchEditFields.salesperson_name}
                        onChange={(e) => setBatchEditFields({ ...batchEditFields, salesperson_name: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 text-sm"
                        placeholder="留空則不更新"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-black dark:text-zinc-50 mb-1">
                        客戶名
                      </label>
                      <input
                        type="text"
                        value={batchEditFields.customer_name}
                        onChange={(e) => setBatchEditFields({ ...batchEditFields, customer_name: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 text-sm"
                        placeholder="留空則不更新"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-black dark:text-zinc-50 mb-1">
                        標籤（用逗號分隔）
                      </label>
                      <input
                        type="text"
                        value={batchEditFields.tags}
                        onChange={(e) => setBatchEditFields({ ...batchEditFields, tags: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 text-sm"
                        placeholder="例如: 標籤1, 標籤2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-black dark:text-zinc-50 mb-1">
                        評分
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={batchEditFields.score}
                        onChange={(e) => setBatchEditFields({ ...batchEditFields, score: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 text-sm"
                        placeholder="0-100"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleBatchEdit}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      確認更新
                    </button>
                    <button
                      onClick={() => {
                        setShowBatchEdit(false)
                        setBatchEditFields({
                          salesperson_name: '',
                          tags: '',
                          score: '',
                          customer_name: '',
                        })
                      }}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
            載入中...
          </div>
        ) : error ? (
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg">
            {error}
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
            <p className="mb-4">還沒有分析結果</p>
            <button
              onClick={() => router.push('/analyses/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              新增第一筆分析
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 全選控制 */}
            {analyses.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.size === analyses.length && analyses.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-black dark:text-zinc-50">
                  全選 ({selectedIds.size}/{analyses.length})
                </span>
              </div>
            )}
            {analyses.map((analysis) => (
              <div
                key={analysis.id}
                className={`bg-white dark:bg-zinc-900 p-6 rounded-lg shadow hover:shadow-lg transition-shadow ${
                  selectedIds.has(analysis.id) ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(analysis.id)}
                      onChange={(e) => handleSelectOne(analysis.id, e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* 日期 */}
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {formatDate(analysis.created_at)}
                      </span>
                      
                      {/* 客戶名 */}
                      {analysis.customer_name && (
                        <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-full text-sm font-medium">
                          {analysis.customer_name}
                        </span>
                      )}
                      
                      {/* 評分 */}
                      {analysis.score !== null && (
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                          評分: {analysis.score}
                        </span>
                      )}
                      
                      {/* 業務名 */}
                      {analysis.salesperson_name && (
                        <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-full text-sm font-medium">
                          {analysis.salesperson_name}
                        </span>
                      )}
                      
                      {/* 標籤 */}
                      {analysis.tags && analysis.tags.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {analysis.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded-full text-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 操作按鈕 */}
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => router.push(`/analyses/${analysis.id}/edit`)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-2"
                      title="編輯"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(analysis.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors p-2"
                      title="刪除"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 詳細內容收合 */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50">
                    查看詳細內容
                  </summary>
                  <div className="mt-4 space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    {/* 客戶名字（如果有） */}
                    {analysis.customer_name && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                          客戶名字：
                        </h3>
                        <p className="text-black dark:text-zinc-50">{analysis.customer_name}</p>
                      </div>
                    )}

                    {/* 分析結果 */}
                    <div>
                      <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
                        分析結果：
                      </h3>
                      <div className="text-black dark:text-zinc-50">
                        <div className="space-y-4">
                          {formatAnalysisText(analysis.analysis_text)
                            .split('\n\n')
                            .filter(p => p.trim())
                            .map((paragraph, idx) => {
                              const trimmed = paragraph.trim()
                              if (!trimmed) return null
                              
                              // 檢查是否為大標題（如「第二部分:業務表現深度分析」）
                              const isMainHeading = /^[第][一二三四五六七八九十\d]+[部分節項]/.test(trimmed)
                              
                              // 檢查是否為中標題（如「A. 溝通技巧 (25/25分)」）
                              const isSubHeading = /^[A-Z][.、：:]\s*/.test(trimmed) && 
                                                   (trimmed.includes('分') || trimmed.length < 60)
                              
                              // 檢查是否為小標題（如「語速、語調、用詞清晰度(10/10分):」）
                              const isSmallHeading = /\([^)]+分\)[:：]/.test(trimmed) && trimmed.length < 80
                              
                              // 檢查是否為列表項
                              const isListItem = /^[•·▪▫○●■□▲△]\s*/.test(trimmed) ||
                                                /^[（(][一二三四五六七八九十\d]+[）)]\s*/.test(trimmed)
                              
                              // 大標題樣式
                              if (isMainHeading) {
                                return (
                                  <div key={idx} className="mt-6 mb-4 first:mt-0">
                                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                                      {trimmed}
                                    </h2>
                                  </div>
                                )
                              }
                              
                              // 中標題樣式（有背景色區分）
                              if (isSubHeading) {
                                // 提取評分
                                const scoreMatch = trimmed.match(/\(([^)]+分)\)/)
                                const scoreText = scoreMatch ? scoreMatch[1] : ''
                                const titleText = trimmed.replace(/\([^)]+分\)/, '').trim()
                                
                                return (
                                  <div key={idx} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 mb-4 border border-zinc-200 dark:border-zinc-700">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                        {titleText}
                                      </h3>
                                      {scoreText && (
                                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm font-medium">
                                          {scoreText}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              }
                              
                              // 小標題樣式（有背景色區分）
                              if (isSmallHeading) {
                                // 提取評分
                                const scoreMatch = trimmed.match(/\(([^)]+分)\)/)
                                const scoreText = scoreMatch ? scoreMatch[1] : ''
                                const titleText = trimmed.replace(/\([^)]+分\)[:：]/, '').trim()
                                
                                return (
                                  <div key={idx} className="bg-zinc-50 dark:bg-zinc-800/30 rounded-lg p-3 mb-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                                        {titleText}
                                      </h4>
                                      {scoreText && (
                                        <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded text-xs font-medium">
                                          {scoreText}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              }
                              
                              // 列表項樣式
                              if (isListItem) {
                                return (
                                  <div key={idx} className="ml-4 mb-2">
                                    <span className="text-zinc-600 dark:text-zinc-400 mr-2">•</span>
                                    <span className="text-zinc-800 dark:text-zinc-200">
                                      {trimmed.replace(/^[•·▪▫○●■□▲△]\s*/, '').replace(/^[（(][一二三四五六七八九十\d]+[）)]\s*/, '').replace(/^[A-Z][.、]\s*/, '')}
                                    </span>
                                  </div>
                                )
                              }
                              
                              // 正文樣式（有背景色和內距）
                              return (
                                <div key={idx} className="bg-zinc-50 dark:bg-zinc-800/30 rounded-lg p-4 mb-3">
                                  <div className="text-zinc-800 dark:text-zinc-200 leading-7 text-base">
                                    {trimmed.split('\n').map((line, lineIdx) => {
                                      const trimmedLine = line.trim()
                                      if (!trimmedLine) return null
                                      
                                      // 處理時間戳記
                                      const hasTimestamp = /\[[\d:]+\]/.test(trimmedLine)
                                      if (hasTimestamp) {
                                        return (
                                          <div key={lineIdx} className="mb-2">
                                            <span className="text-zinc-500 dark:text-zinc-400 text-sm font-mono mr-2">
                                              {trimmedLine.match(/\[[\d:]+\]/)?.[0]}
                                            </span>
                                            <span>{trimmedLine.replace(/\[[\d:]+\]\s*/, '')}</span>
                                          </div>
                                        )
                                      }
                                      
                                      return (
                                        <p key={lineIdx} className="mb-2 last:mb-0">
                                          {trimmedLine}
                                        </p>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    </div>

                    {/* 客戶畫像 */}
                    {analysis.customer_profile && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                          客戶畫像：
                        </h3>
                        <div className="text-black dark:text-zinc-50 whitespace-pre-wrap">
                          {analysis.customer_profile}
                        </div>
                      </div>
                    )}

                    {/* 逐字稿 */}
                    {analysis.transcript && (
                      <details>
                        <summary className="cursor-pointer text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50">
                          查看逐字稿
                        </summary>
                        <div className="mt-2 p-4 bg-zinc-50 dark:bg-zinc-800 rounded text-black dark:text-zinc-50 whitespace-pre-wrap">
                          {analysis.transcript}
                        </div>
                      </details>
                    )}

                    {/* 備註 */}
                    {analysis.notes && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                          備註：
                        </h3>
                        <p className="text-black dark:text-zinc-50">{analysis.notes}</p>
                      </div>
                    )}

                    {/* 錄音檔 */}
                    {analysis.recording_file_url && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                          錄音檔：
                        </h3>
                        <a
                          href={analysis.recording_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-2"
                        >
                          📎 下載錄音檔
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

