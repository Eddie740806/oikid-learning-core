import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-server'

// GET: 獲取用戶列表
export async function GET(request: NextRequest) {
  try {
    // 檢查管理員權限
    await requireAdmin(request)

    const supabaseAdmin = createAdminClient()
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // 構建查詢
    let query = supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 應用篩選
    if (role) {
      query = query.eq('role', role)
    }
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }
    if (search) {
      // 只搜尋 email，因為 name 欄位可能不存在
      query = query.ilike('email', `%${search}%`)
    }

    const { data: users, error, count } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      data: users || [],
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

// POST: 創建新用戶
export async function POST(request: NextRequest) {
  try {
    // 檢查管理員權限
    await requireAdmin(request)

    const body = await request.json()
    const { email, password, name, role = 'salesperson', is_active = true } = body

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // 使用 Admin API 創建用戶
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自動確認郵箱
      user_metadata: {
        name: name || email,
      },
    })

    if (authError) {
      console.error('Error creating user:', authError)
      return NextResponse.json(
        { ok: false, error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { ok: false, error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // 更新 user_profiles 表
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        name: name || email,
        role,
        is_active,
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Error updating user profile:', profileError)
      // 即使更新 profile 失敗，用戶已經創建，所以只記錄錯誤
    }

    // 獲取完整的用戶資料
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    return NextResponse.json({
      ok: true,
      data: {
        id: authData.user.id,
        email: authData.user.email,
        name: profile?.name || name || email,
        role: profile?.role || role,
        is_active: profile?.is_active ?? is_active,
        created_at: authData.user.created_at,
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

