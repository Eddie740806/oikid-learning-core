'use client'

import { useState } from 'react'

interface ExportButtonProps {
  data: any
  filename?: string
  label?: string
}

export default function ExportButton({ data, filename, label = '導出 CSV' }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = () => {
    try {
      setExporting(true)

      // 將數據轉換為 CSV 格式
      let csvContent = ''

      if (Array.isArray(data)) {
        if (data.length === 0) {
          alert('沒有數據可導出')
          return
        }

        // 獲取所有鍵作為標題
        const headers = Object.keys(data[0])
        csvContent = headers.join(',') + '\n'

        // 添加數據行
        data.forEach((row) => {
          const values = headers.map((header) => {
            const value = row[header]
            if (value === null || value === undefined) return ''
            // 處理包含逗號、引號或換行的值
            const stringValue = String(value)
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`
            }
            return stringValue
          })
          csvContent += values.join(',') + '\n'
        })
      } else if (typeof data === 'object') {
        // 如果是對象，轉換為鍵值對
        csvContent = '項目,值\n'
        Object.entries(data).forEach(([key, value]) => {
          const stringValue = String(value || '')
          const escapedValue = stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue
          csvContent += `${key},${escapedValue}\n`
        })
      }

      // 創建 Blob 並下載
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename || `export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('導出失敗，請稍後再試')
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {exporting ? '導出中...' : label}
    </button>
  )
}


