'use client'

import { useState } from 'react'

interface DateRangePickerProps {
  value: { start: string; end: string } | null
  onChange: (range: { start: string; end: string } | null) => void
  onQuickSelect: (days: number) => void
  selectedDays?: number
}

export default function DateRangePicker({
  value,
  onChange,
  onQuickSelect,
  selectedDays,
}: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false)

  const quickOptions = [
    { label: '最近7天', days: 7 },
    { label: '最近30天', days: 30 },
    { label: '最近90天', days: 90 },
    { label: '自定義範圍', days: -1 },
  ]

  const handleQuickSelect = (days: number) => {
    if (days === -1) {
      setShowCustom(true)
      return
    }
    setShowCustom(false)
    onQuickSelect(days)
  }

  const handleCustomRange = () => {
    if (value?.start && value?.end) {
      onChange(value)
      setShowCustom(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const defaultStart = new Date()
  defaultStart.setDate(defaultStart.getDate() - 30)
  const defaultStartStr = defaultStart.toISOString().split('T')[0]

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-2">
        {quickOptions.map((option) => (
          <button
            key={option.days}
            onClick={() => handleQuickSelect(option.days)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              option.days === selectedDays
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-black dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2">
          <input
            type="date"
            value={value?.start || defaultStartStr}
            max={today}
            onChange={(e) =>
              onChange({
                start: e.target.value,
                end: value?.end || today,
              })
            }
            className="px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 text-sm"
          />
          <span className="text-zinc-600 dark:text-zinc-400">至</span>
          <input
            type="date"
            value={value?.end || today}
            max={today}
            min={value?.start || defaultStartStr}
            onChange={(e) =>
              onChange({
                start: value?.start || defaultStartStr,
                end: e.target.value,
              })
            }
            className="px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 text-sm"
          />
          <button
            onClick={handleCustomRange}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
          >
            確定
          </button>
          <button
            onClick={() => {
              setShowCustom(false)
              onQuickSelect(30) // 恢復到默認30天
            }}
            className="px-3 py-1 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 rounded text-sm font-medium"
          >
            取消
          </button>
        </div>
      )}
    </div>
  )
}




