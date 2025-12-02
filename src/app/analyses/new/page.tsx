'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createClientClient } from '@/lib/auth'
import AuthGuard from '@/components/AuthGuard'

export default function NewAnalysisPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [formData, setFormData] = useState({
    performance_analysis: '', // 業務表現深度分析（必填）
    highlights_improvements: '', // 亮點與改進點（必填）
    improvement_suggestions: '', // 具體改善建議（必填）
    score_tags: '', // 評分與標籤（必填）
    customer_questions: '', // 通話過程中提出的所有問題，依照時間順序排列（可選）
    transcript: '', // 逐字稿（可選）
    customer_profile: '', // 客戶畫像（可選）
    notes: '', // 備註（可選）
    salesperson_name: '', // 業務名（可選）
    customer_name: '', // 客戶名字（可選）
    tags: '', // 標籤（可選，逗號分隔）
    customer_id: '', // 客戶 ID（可選）
    recording_id: '', // 錄音 ID（可選）
    score: '', // 評分（可選，0-100）
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // 檢查身份驗證狀態
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 清除任何之前的錯誤訊息
        setMessage(null)
        
        const supabase = createClientClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsAuthenticated(true)
        } else {
          // 如果沒有 session，重定向到登入頁
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/login')
      } finally {
        setCheckingAuth(false)
      }
    }
    checkAuth()
  }, [router])

  const handleFileUpload = async (fileToUpload: File) => {
    setUploading(true)
    try {
      // 檢查環境變數
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('缺少 Supabase 環境變數。請檢查 Vercel 環境變數設定。')
      }

      // 在客戶端創建 Supabase 客戶端（直接上傳，繞過 Vercel 限制）
      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      // 生成唯一檔案名稱
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const fileExtension = fileToUpload.name.split('.').pop()
      const fileName = `${timestamp}_${randomString}.${fileExtension}`

      console.log('Uploading file directly to Supabase:', { 
        fileName, 
        size: fileToUpload.size, 
        type: fileToUpload.type 
      })

      // 直接上傳到 Supabase Storage（不經過 Vercel API）
      const { data, error } = await supabase.storage
        .from('recordings')
        .upload(fileName, fileToUpload, {
          contentType: fileToUpload.type || 'application/octet-stream',
          upsert: false,
        })

      if (error) {
        console.error('Supabase storage upload error:', error)
        throw new Error(`上傳失敗: ${error.message}`)
      }

      if (!data) {
        throw new Error('上傳成功但未返回資料')
      }

      // 獲取公開 URL
      const { data: urlData } = supabase.storage
        .from('recordings')
        .getPublicUrl(data.path)

      console.log('Upload successful:', { fileName: data.path, url: urlData.publicUrl })

      setUploadedFileUrl(urlData.publicUrl)
      return urlData.publicUrl
    } catch (error) {
      console.error('Upload error:', error)
      setMessage({ type: 'error', text: `檔案上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}` })
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // 如果有檔案，先上傳
      let fileUrl = uploadedFileUrl
      if (file && !uploadedFileUrl) {
        fileUrl = await handleFileUpload(file)
        if (!fileUrl) {
          setLoading(false)
          return
        }
      }

      // 處理 tags（轉換成陣列）
      const tags_array = formData.tags
        ? formData.tags.split(',').map((tag) => tag.trim()).filter((tag) => tag)
        : null

      // 獲取 session token 用於身份驗證
      const supabase = createClientClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setMessage({ type: 'error', text: '請先登入' })
        setLoading(false)
        router.push('/login')
        return
      }

      const response = await fetch('/api/analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          // 新的必填欄位
          performance_analysis: formData.performance_analysis,
          highlights_improvements: formData.highlights_improvements,
          improvement_suggestions: formData.improvement_suggestions,
          score_tags: formData.score_tags,
          // 可選欄位
          customer_questions: formData.customer_questions || null,
          transcript: formData.transcript || null,
          customer_profile: formData.customer_profile || null,
          notes: formData.notes || null,
          salesperson_name: formData.salesperson_name || null,
          customer_name: formData.customer_name || null,
          tags: tags_array,
          customer_id: formData.customer_id || null,
          recording_id: formData.recording_id || null,
          score: formData.score ? parseInt(formData.score) : null,
          recording_file_url: fileUrl || null,
          analyzed_by: 'manual',
          // 不再生成 analysis_text，因為已經有分開的欄位了，避免數據重複和超過 Vercel 限制
          analysis_text: null,
        }),
      })

      // 檢查回應狀態
      if (!response.ok) {
        // 處理 401 錯誤（Unauthorized）
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({ error: 'Unauthorized. Please login first.' }))
          setMessage({ 
            type: 'error', 
            text: '身份驗證失敗，請重新登入' 
          })
          setLoading(false)
          // 等待 2 秒後跳轉到登入頁
          setTimeout(() => {
            router.push('/login')
          }, 2000)
          return
        }
        // 處理 413 錯誤（Payload Too Large）
        if (response.status === 413) {
          const errorData = await response.json().catch(() => ({ error: '請求數據過大' }))
          setMessage({ 
            type: 'error', 
            text: errorData.error || '請求數據過大，超過伺服器限制（4.5MB）。請減少文字內容或分開提交。' 
          })
          setLoading(false)
          return
        }
        // 處理其他錯誤
        const errorData = await response.json().catch(() => ({ error: '發生錯誤' }))
        console.error('API error:', response.status, errorData)
        setMessage({ type: 'error', text: errorData.error || `儲存失敗 (狀態碼: ${response.status})` })
        setLoading(false)
        return
      }

      const result = await response.json()

      if (result.ok) {
        setMessage({ type: 'success', text: '分析結果已成功儲存！' })
        // 清空表單
        setFormData({
          performance_analysis: '',
          highlights_improvements: '',
          improvement_suggestions: '',
          score_tags: '',
          customer_questions: '',
          transcript: '',
          customer_profile: '',
          notes: '',
          salesperson_name: '',
          customer_name: '',
          tags: '',
          customer_id: '',
          recording_id: '',
          score: '',
        })
        setFile(null)
        setUploadedFileUrl(null)
        // 3 秒後跳轉到列表頁
        setTimeout(() => {
          router.push('/analyses')
        }, 2000)
      } else {
        setMessage({ type: 'error', text: result.error || '儲存失敗' })
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: '發生錯誤，請稍後再試' })
    } finally {
      setLoading(false)
    }
  }

  // 如果正在檢查身份驗證，顯示載入中
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-600 dark:text-zinc-400">載入中...</p>
        </div>
      </div>
    )
  }

  // 如果未登入，不顯示內容（會重定向到登入頁）
  if (!isAuthenticated) {
    return null
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
        <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-2">
            新增分析結果
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            將 Gemini 的分析結果貼上並儲存
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
          {/* 必填欄位區塊 */}
          <div className="space-y-4 pb-4 border-b border-zinc-200 dark:border-zinc-700">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">必填欄位</h3>
            
            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                業務表現深度分析 * <span className="text-red-500">必填</span>
              </label>
              <textarea
                required
                value={formData.performance_analysis}
                onChange={(e) => setFormData({ ...formData, performance_analysis: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="輸入業務表現的深度分析..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                亮點與改進點 * <span className="text-red-500">必填</span>
              </label>
              <textarea
                required
                value={formData.highlights_improvements}
                onChange={(e) => setFormData({ ...formData, highlights_improvements: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="輸入亮點與改進點..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                具體改善建議 * <span className="text-red-500">必填</span>
              </label>
              <textarea
                required
                value={formData.improvement_suggestions}
                onChange={(e) => setFormData({ ...formData, improvement_suggestions: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="輸入具體改善建議..."
              />
            </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                評分與標籤 * <span className="text-red-500">必填</span>
            </label>
            <textarea
              required
                value={formData.score_tags}
                onChange={(e) => setFormData({ ...formData, score_tags: e.target.value })}
                rows={6}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="輸入評分與標籤資訊..."
            />
            </div>
          </div>

          {/* 可選欄位區塊 */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">可選欄位</h3>

            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                逐字稿（可選）
              </label>
              <textarea
                value={formData.transcript}
                onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="逐字稿內容..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
              客戶畫像（可選）
            </label>
            <textarea
              value={formData.customer_profile}
              onChange={(e) => setFormData({ ...formData, customer_profile: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="描述客戶的特徵、需求、偏好等畫像資訊..."
            />
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                通話過程中提出的所有問題，依照時間順序排列（可選）
              </label>
              <textarea
                value={formData.customer_questions}
                onChange={(e) => setFormData({ ...formData, customer_questions: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：[00:30] 第一個問題：...&#10;[02:15] 第二個問題：...&#10;[05:40] 第三個問題：..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                備註（可選）
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="額外的備註..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                業務名（可選）
              </label>
              <input
                type="text"
                value={formData.salesperson_name}
                onChange={(e) => setFormData({ ...formData, salesperson_name: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="業務姓名"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                客戶名字（可選）
              </label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="客戶姓名"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                標籤（可選，用逗號分隔）
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="標籤1, 標籤2, 標籤3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                評分（可選，0-100）
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
              客戶 ID（可選）
              <span className="text-zinc-500 text-xs ml-2">(必須是 UUID 格式，或留空)</span>
            </label>
            <input
              type="text"
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="留空或輸入 UUID (例如: a1b2c3d4-e5f6-7890-1234-567890abcdef)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
                錄音檔（可選，最大 100MB）
              </label>
              <input
                type="file"
                accept="audio/*,video/*"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0]
                  if (selectedFile) {
                    setFile(selectedFile)
                    setUploadedFileUrl(null) // 重置已上傳的 URL
                  }
                }}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {file && (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  已選擇: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
              {uploadedFileUrl && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                  ✓ 檔案已上傳
                </p>
              )}
              {uploading && (
                <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                  上傳中...
                </p>
              )}
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '儲存中...' : '儲存分析結果'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-zinc-600 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              🏠 回到首頁
            </button>
            <button
              type="button"
              onClick={() => router.push('/analyses')}
              className="px-6 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
    </AuthGuard>
  )
}

