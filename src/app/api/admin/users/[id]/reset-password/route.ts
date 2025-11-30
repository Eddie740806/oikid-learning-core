import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-server'

// POST: 重置用戶密碼
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await requireAdmin(request)

    const body = await request.json()
    const { new_password } = body

    if (!new_password) {
      return NextResponse.json(
        { ok: false, error: 'New password is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // 使用 Admin API 更新用戶密碼
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { password: new_password }
      )

    if (error) {
      console.error('Error resetting password:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Password reset successfully',
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

