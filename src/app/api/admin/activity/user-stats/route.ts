import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth-server'
import { requireAdmin } from '@/lib/auth-server'

// GET: 獲取業務使用統計（按時間維度）
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const supabase = createServerClient(request)
    const { searchParams } = new URL(request.url)
    
    const userId = searchParams.get('user_id') // 可選，如果提供則只查詢該用戶
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const dimension = searchParams.get('dimension') || 'day' // day, week, month, year

    // 計算日期範圍
    let start: Date
    let end: Date = new Date()
    
    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      // 根據維度計算默認範圍
      end = new Date()
      start = new Date()
      
      switch (dimension) {
        case 'day':
          start.setDate(start.getDate() - 7) // 最近7天
          break
        case 'week':
          start.setDate(start.getDate() - 28) // 最近4週
          break
        case 'month':
          start.setMonth(start.getMonth() - 6) // 最近6個月
          break
        case 'year':
          start.setFullYear(start.getFullYear() - 1) // 最近1年
          break
        default:
          start.setDate(start.getDate() - 30) // 默認30天
      }
    }

    // 查詢所有業務用戶（role = 'salesperson'）
    const { data: salespersons } = await supabase
      .from('user_profiles')
      .select('id, email, name, role, last_login_at, last_activity_at')
      .eq('role', 'salesperson')
      .order('created_at', { ascending: false })

    if (!salespersons || salespersons.length === 0) {
      return NextResponse.json({
        ok: true,
        data: [],
      })
    }

    // 如果指定了 user_id，只查詢該用戶
    const targetUserIds = userId 
      ? [userId] 
      : salespersons.map(s => s.id)

    // 查詢登入活動
    let loginQuery = supabase
      .from('user_activity_logs')
      .select('user_id, created_at')
      .eq('activity_type', 'login')
      .in('user_id', targetUserIds)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    const { data: loginActivities } = await loginQuery

    // 查詢操作活動（page_view 和 action）
    let actionQuery = supabase
      .from('user_activity_logs')
      .select('user_id, created_at, activity_type')
      .in('user_id', targetUserIds)
      .in('activity_type', ['page_view', 'action'])
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    const { data: actionActivities } = await actionQuery

    // 處理數據：為每個業務計算統計
    const stats = salespersons
      .filter(s => !userId || s.id === userId)
      .map(salesperson => {
        const userId = salesperson.id
        
        // 計算登入次數
        const logins = loginActivities?.filter(a => a.user_id === userId) || []
        const loginCount = logins.length

        // 計算操作次數
        const actions = actionActivities?.filter(a => a.user_id === userId) || []
        const actionCount = actions.length

        // 按時間維度分組統計
        const timeline: Record<string, { logins: number; actions: number }> = {}
        
        // 處理登入時間線
        logins.forEach(login => {
          const dateKey = formatDateByDimension(new Date(login.created_at), dimension)
          if (!timeline[dateKey]) {
            timeline[dateKey] = { logins: 0, actions: 0 }
          }
          timeline[dateKey].logins++
        })

        // 處理操作時間線
        actions.forEach(action => {
          const dateKey = formatDateByDimension(new Date(action.created_at), dimension)
          if (!timeline[dateKey]) {
            timeline[dateKey] = { logins: 0, actions: 0 }
          }
          timeline[dateKey].actions++
        })

        // 轉換為數組並排序
        const timelineArray = Object.entries(timeline)
          .map(([date, data]) => ({
            date,
            logins: data.logins,
            actions: data.actions,
          }))
          .sort((a, b) => a.date.localeCompare(b.date))

        return {
          user_id: userId,
          email: salesperson.email,
          name: salesperson.name || salesperson.email,
          login_count: loginCount,
          action_count: actionCount,
          last_login_at: salesperson.last_login_at,
          last_activity_at: salesperson.last_activity_at,
          timeline: timelineArray,
        }
      })
      .sort((a, b) => {
        // 按最後登入時間排序（有登入的在前）
        if (a.last_login_at && !b.last_login_at) return -1
        if (!a.last_login_at && b.last_login_at) return 1
        if (a.last_login_at && b.last_login_at) {
          return new Date(b.last_login_at).getTime() - new Date(a.last_login_at).getTime()
        }
        return 0
      })

    return NextResponse.json({
      ok: true,
      data: stats,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }
    console.error('API error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 根據維度格式化日期
function formatDateByDimension(date: Date, dimension: string): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  switch (dimension) {
    case 'day':
      return `${year}-${month}-${day}`
    case 'week':
      // 計算週數（ISO週）
      const week = getISOWeek(date)
      return `${year}-W${String(week).padStart(2, '0')}`
    case 'month':
      return `${year}-${month}`
    case 'year':
      return `${year}`
    default:
      return `${year}-${month}-${day}`
  }
}

// 獲取ISO週數
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}




