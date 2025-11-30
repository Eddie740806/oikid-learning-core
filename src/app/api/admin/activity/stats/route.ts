import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth-server'
import { requireAdmin } from '@/lib/auth-server'

// GET: 獲取活動統計數據（用於儀表板）
export async function GET(request: NextRequest) {
  try {
    // 檢查管理員權限
    await requireAdmin(request)

    const supabase = createServerClient(request)
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // 計算日期範圍
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 1. 總活動數
    const { count: totalActivities } = await supabase
      .from('user_activity_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())

    // 2. 今日登入數
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count: todayLogins } = await supabase
      .from('user_activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('activity_type', 'login')
      .gte('created_at', todayStart.toISOString())

    // 3. 活躍用戶數（最近7天有活動的用戶）
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const { data: activeUsers } = await supabase
      .from('user_activity_logs')
      .select('user_id')
      .gte('created_at', sevenDaysAgo.toISOString())
      .gte('created_at', startDate.toISOString())

    const uniqueActiveUsers = new Set(activeUsers?.map(a => a.user_id) || []).size

    // 4. 登入趨勢（最近30天，按天分組）
    const { data: loginTrends } = await supabase
      .from('user_activity_logs')
      .select('created_at')
      .eq('activity_type', 'login')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // 處理登入趨勢數據（按天分組）
    const loginTrendMap: Record<string, number> = {}
    loginTrends?.forEach(login => {
      const date = new Date(login.created_at).toISOString().split('T')[0]
      loginTrendMap[date] = (loginTrendMap[date] || 0) + 1
    })

    // 5. 最活躍用戶（前10名）
    const { data: topUsers } = await supabase
      .from('user_activity_logs')
      .select('user_id, user_profiles!inner(email)')
      .gte('created_at', startDate.toISOString())

    const userActivityCount: Record<string, { count: number; email: string; name: string }> = {}
    topUsers?.forEach(activity => {
      const userId = activity.user_id
      const profile = activity.user_profiles as any
      if (!userActivityCount[userId]) {
        userActivityCount[userId] = {
          count: 0,
          email: profile?.email || '',
          name: profile?.email || '', // 使用 email 作為 name，因為 name 欄位可能不存在
        }
      }
      userActivityCount[userId].count++
    })

    const topUsersList = Object.entries(userActivityCount)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([userId, data]) => ({
        user_id: userId,
        ...data,
      }))

    // 6. 最常訪問頁面（前10名）
    const { data: pageViews } = await supabase
      .from('user_activity_logs')
      .select('page_path')
      .eq('activity_type', 'page_view')
      .not('page_path', 'is', null)
      .gte('created_at', startDate.toISOString())

    const pageViewCount: Record<string, number> = {}
    pageViews?.forEach(view => {
      const path = view.page_path || ''
      pageViewCount[path] = (pageViewCount[path] || 0) + 1
    })

    const topPages = Object.entries(pageViewCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({
        path,
        count,
      }))

    // 7. 活動類型分布
    const { data: activityTypes } = await supabase
      .from('user_activity_logs')
      .select('activity_type')
      .gte('created_at', startDate.toISOString())

    const activityTypeCount: Record<string, number> = {}
    activityTypes?.forEach(activity => {
      const type = activity.activity_type
      activityTypeCount[type] = (activityTypeCount[type] || 0) + 1
    })

    // 8. 最近活動（最近20條）
    const { data: recentActivities } = await supabase
      .from('user_activity_logs')
      .select(`
        *,
        user_profiles:user_id (
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      ok: true,
      data: {
        totalActivities: totalActivities || 0,
        todayLogins: todayLogins || 0,
        activeUsers: uniqueActiveUsers,
        loginTrend: Object.entries(loginTrendMap).map(([date, count]) => ({
          date,
          count,
        })),
        topUsers: topUsersList,
        topPages,
        activityTypeDistribution: activityTypeCount,
        recentActivities: recentActivities || [],
      },
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

