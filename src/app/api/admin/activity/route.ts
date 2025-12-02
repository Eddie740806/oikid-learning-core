import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth-server'
import { requireAdmin, getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'

// POST: 記錄新活動
export async function POST(request: NextRequest) {
  try {
    // 檢查身份驗證（不需要管理員，所有已登入用戶都可以記錄自己的活動）
    const body = await request.json()
    const { activity_type } = body
    
    console.log(`[Activity API] Received ${activity_type} activity request`)
    
    const user = await getCurrentUser(request)
    if (!user) {
      console.error('[Activity API] Failed to get current user. Auth header:', request.headers.get('authorization') ? 'present' : 'missing')
      console.error('[Activity API] Cookies:', request.cookies.getAll().map(c => c.name))
      return NextResponse.json(
        { ok: false, error: 'Unauthorized - Could not identify user' },
        { status: 401 }
      )
    }
    
    console.log(`[Activity API] User identified: ${user.email} (${user.id})`)

    const { page_path, action, metadata, user_agent } = body

    if (!activity_type) {
      return NextResponse.json(
        { ok: false, error: 'activity_type is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient(request)
    // 使用 Admin 客戶端進行數據庫操作，確保有權限繞過 RLS
    const supabaseAdmin = createAdminClient()

    // 獲取 IP 地址（從請求頭）
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'

    // 如果是登入活動，同時創建登入會話並更新最後登入時間
    if (activity_type === 'login') {
      const loginTime = new Date().toISOString()
      console.log(`[Activity API] Processing login for user ${user.email} (${user.id})`)
      
      // 創建登入會話
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('login_sessions')
        .insert({
          user_id: user.id,
          login_at: loginTime,
          ip_address: ipAddress,
          user_agent: user_agent || '',
          is_active: true,
        })
        .select()
        .single()

      if (sessionError) {
        console.error('[Activity API] Error creating login session:', sessionError)
        console.error('[Activity API] Session error details:', JSON.stringify(sessionError, null, 2))
      } else {
        console.log(`[Activity API] Login session created: ${session?.id}`)
      }

      // 直接更新 user_profiles.last_login_at（使用 Admin 客戶端繞過 RLS）
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          last_login_at: loginTime,
          last_activity_at: loginTime,
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('[Activity API] Error updating last_login_at:', updateError)
        console.error('[Activity API] Update error details:', JSON.stringify(updateError, null, 2))
      } else {
        console.log(`[Activity API] Updated last_login_at for user ${user.email} at ${loginTime}`)
      }
    }

    // 如果是登出活動，更新登入會話
    if (activity_type === 'logout') {
      const logoutTime = new Date().toISOString()
      
      // 先查詢最近的活躍會話
      const { data: activeSession, error: queryError } = await supabaseAdmin
        .from('login_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('login_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (queryError) {
        console.error('[Activity API] Error querying active session:', queryError)
      } else if (activeSession) {
        // 更新找到的會話
        const { error: updateError } = await supabaseAdmin
          .from('login_sessions')
          .update({
            logout_at: logoutTime,
            is_active: false,
          })
          .eq('id', activeSession.id)

        if (updateError) {
          console.error('[Activity API] Error updating login session:', updateError)
        } else {
          console.log(`[Activity API] Updated logout time for session ${activeSession.id}`)
        }
      } else {
        // 如果沒有找到活躍會話，嘗試更新最近的會話（可能已經被標記為非活躍）
        const { data: recentSession } = await supabaseAdmin
          .from('login_sessions')
          .select('id')
          .eq('user_id', user.id)
          .order('login_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (recentSession) {
          const { error: updateError } = await supabaseAdmin
            .from('login_sessions')
            .update({
              logout_at: logoutTime,
              is_active: false,
            })
            .eq('id', recentSession.id)

          if (updateError) {
            console.error('[Activity API] Error updating recent login session:', updateError)
          } else {
            console.log(`[Activity API] Updated logout time for recent session ${recentSession.id}`)
          }
        }
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

    // 使用 Admin 客戶端插入活動記錄，確保有權限
    const { data: activity, error } = await supabaseAdmin
      .from('user_activity_logs')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[Activity API] Error inserting activity log:', error)
      console.error('[Activity API] Insert error details:', JSON.stringify(error, null, 2))
      console.error('[Activity API] Insert data:', JSON.stringify(insertData, null, 2))
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    console.log(`[Activity API] ✅ Activity log inserted successfully: ${activity?.id} for ${activity_type}`)
    console.log(`[Activity API] ✅ User: ${user.email} (${user.id})`)

    // 如果是登入活動，再次確認 last_login_at 已更新（雙重保障）
    if (activity_type === 'login') {
      const loginTime = new Date().toISOString()
      const { data: profileCheck } = await supabaseAdmin
        .from('user_profiles')
        .select('last_login_at, email')
        .eq('id', user.id)
        .single()
      
      console.log(`[Activity API] Checking last_login_at for ${user.email}:`, profileCheck?.last_login_at)
      
      if (profileCheck?.last_login_at) {
        console.log(`[Activity API] ✅ Confirmed: last_login_at = ${profileCheck.last_login_at}`)
      } else {
        console.warn(`[Activity API] ⚠️ Warning: last_login_at is null for user ${user.email}, retrying update...`)
        // 再次嘗試更新
        const { error: retryError } = await supabaseAdmin
          .from('user_profiles')
          .update({
            last_login_at: loginTime,
            last_activity_at: loginTime,
          })
          .eq('id', user.id)

        if (retryError) {
          console.error(`[Activity API] ❌ Retry failed:`, retryError)
        } else {
          console.log(`[Activity API] ✅ Retry successful: last_login_at updated to ${loginTime}`)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      data: activity,
    })
  } catch (error: any) {
    console.error('[Activity API] ❌ Fatal error:', error)
    console.error('[Activity API] ❌ Error message:', error.message)
    console.error('[Activity API] ❌ Error stack:', error.stack)
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
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

