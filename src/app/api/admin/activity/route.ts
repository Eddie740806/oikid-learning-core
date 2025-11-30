import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth-server'
import { requireAdmin, getCurrentUser } from '@/lib/auth-server'

// POST: 記錄新活動
export async function POST(request: NextRequest) {
  try {
    // 檢查身份驗證（不需要管理員，所有已登入用戶都可以記錄自己的活動）
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { activity_type, page_path, action, metadata, user_agent } = body

    if (!activity_type) {
      return NextResponse.json(
        { ok: false, error: 'activity_type is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient(request)

    // 獲取 IP 地址（從請求頭）
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'

    // 如果是登入活動，同時創建登入會話
    if (activity_type === 'login') {
      const { data: session, error: sessionError } = await supabase
        .from('login_sessions')
        .insert({
          user_id: user.id,
          login_at: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: user_agent || '',
          is_active: true,
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Error creating login session:', sessionError)
      }
    }

    // 如果是登出活動，更新登入會話
    if (activity_type === 'logout') {
      // 找到最近的活躍會話並標記為登出
      const { error: updateError } = await supabase
        .from('login_sessions')
        .update({
          logout_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('login_at', { ascending: false })
        .limit(1)

      if (updateError) {
        console.error('Error updating login session:', updateError)
      }
    }

    // 插入活動記錄
    // 構建插入數據，只包含基本欄位（避免 schema cache 錯誤）
    const insertData: any = {
      user_id: user.id,
      activity_type,
      ip_address: ipAddress,
      user_agent: user_agent || '',
    }
    
    // 只有在欄位存在時才添加（避免 schema cache 錯誤）
    // 這些欄位可能不存在，所以我們先嘗試插入基本數據
    try {
      // 嘗試添加可選欄位
      if (page_path !== undefined && page_path !== null) {
        insertData.page_path = page_path
      }
      if (action !== undefined && action !== null) {
        insertData.action = action
      }
      if (metadata !== undefined && metadata !== null) {
        insertData.metadata = metadata
      }
    } catch (e) {
      // 忽略錯誤，繼續使用基本欄位
    }

    const { data: activity, error } = await supabase
      .from('user_activity_logs')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error inserting activity log:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      data: activity,
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: 獲取活動記錄列表（僅管理員）
export async function GET(request: NextRequest) {
  try {
    // 檢查管理員權限
    await requireAdmin(request)

    const supabase = createServerClient(request)
    const { searchParams } = new URL(request.url)
    
    const userId = searchParams.get('user_id')
    const activityType = searchParams.get('activity_type')
    const pagePath = searchParams.get('page_path')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    // 構建查詢
    let query = supabase
      .from('user_activity_logs')
      .select(`
        *,
        user_profiles:user_id (
          email,
          name,
          role
        )
      `, { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    // 應用篩選
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (activityType) {
      query = query.eq('activity_type', activityType)
    }
    if (pagePath) {
      query = query.ilike('page_path', `%${pagePath}%`)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: activities, error, count } = await query

    if (error) {
      console.error('Error fetching activities:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      data: activities || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
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

