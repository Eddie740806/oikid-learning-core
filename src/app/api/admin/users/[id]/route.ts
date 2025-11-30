import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-server'

// GET: 獲取單個用戶詳情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await requireAdmin(request)

    const supabaseAdmin = createAdminClient()
    const { data: user, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      data: user,
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

// PUT: 更新用戶
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await requireAdmin(request)

    const body = await request.json()
    const { name, role, is_active, email } = body

    const supabaseAdmin = createAdminClient()

    // 更新 user_profiles（先更新其他欄位，name 欄位單獨處理）
    const updates: any = {}
    if (role !== undefined) updates.role = role
    if (is_active !== undefined) updates.is_active = is_active
    updates.updated_at = new Date().toISOString()

    // 先更新其他欄位（不包含 name，避免 schema cache 錯誤）
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (profileError) {
      console.error('Error updating user profile:', profileError)
      return NextResponse.json(
        { ok: false, error: profileError.message },
        { status: 400 }
      )
    }

    // 如果提供了 name，嘗試單獨更新 name 欄位
    if (name !== undefined) {
      try {
        const { error: nameUpdateError } = await supabaseAdmin
          .from('user_profiles')
          .update({ name: name || null })
          .eq('id', id)

        if (nameUpdateError) {
          // 如果 name 欄位不存在，記錄警告但不阻止更新
          console.warn('Could not update name field (column may not exist):', nameUpdateError.message)
          // 繼續執行，因為其他欄位已經更新成功
        }
      } catch (e: any) {
        console.warn('Error updating name field:', e?.message || e)
        // 繼續執行，因為其他欄位已經更新成功
      }
    }

    // 重新獲取完整的用戶資料（包含可能的 name 更新）
    const { data: finalProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    const resultProfile = finalProfile || profile

    // 如果更新了 email，也需要更新 auth.users
    if (email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { email }
      )

      if (authError) {
        console.error('Error updating user email:', authError)
        // 不返回錯誤，因為 profile 已經更新成功
      }
    }

    return NextResponse.json({
      ok: true,
      data: resultProfile,
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

// DELETE: 刪除用戶
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await requireAdmin(request)

    const supabaseAdmin = createAdminClient()

    // 使用 Admin API 刪除用戶（會自動刪除相關的 user_profiles 記錄，因為有 CASCADE）
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'User deleted successfully',
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
