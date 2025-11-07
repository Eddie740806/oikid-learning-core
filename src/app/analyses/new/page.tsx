'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewAnalysisPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [formData, setFormData] = useState({
    analysis_text: '',
    transcript: '',
    customer_profile: '',
    score: '',
    tags: '',
    notes: '',
    salesperson_name: '',
    customer_name: '',
    customer_id: '',
    recording_id: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)

  const handleFileUpload = async (fileToUpload: File) => {
    setUploading(true)
    try {
      const formDataToUpload = new FormData()
      formDataToUpload.append('file', fileToUpload)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataToUpload,
      })

      const result = await response.json()

      if (result.ok) {
        setUploadedFileUrl(result.data.file_url)
        return result.data.file_url
      } else {
        throw new Error(result.error || '上傳失敗')
      }
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

      const response = await fetch('/api/analyses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysis_text: formData.analysis_text,
          transcript: formData.transcript || null,
          customer_profile: formData.customer_profile || null,
          score: formData.score ? parseInt(formData.score) : null,
          tags: tags_array,
          notes: formData.notes || null,
          salesperson_name: formData.salesperson_name || null,
          customer_name: formData.customer_name || null,
          customer_id: formData.customer_id || null,
          recording_id: formData.recording_id || null,
          recording_file_url: fileUrl || null,
          analyzed_by: 'manual',
        }),
      })

      const result = await response.json()

      if (result.ok) {
        setMessage({ type: 'success', text: '分析結果已成功儲存！' })
        // 清空表單
        setFormData({
          analysis_text: '',
          transcript: '',
          customer_profile: '',
          score: '',
          tags: '',
          notes: '',
          salesperson_name: '',
          customer_name: '',
          customer_id: '',
          recording_id: '',
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

  return (
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
          <div>
            <label className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
              分析結果 * <span className="text-zinc-500 text-xs">(從 Gemini 複製的分析文字)</span>
            </label>
            <textarea
              required
              value={formData.analysis_text}
              onChange={(e) => setFormData({ ...formData, analysis_text: e.target.value })}
              rows={12}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="貼上 Gemini 的分析結果..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                評分（可選）
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
  )
}

