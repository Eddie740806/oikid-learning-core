import { NextRequest, NextResponse } from 'next/server'
import { createClientClient } from '@/lib/auth'

// GET: 獲取當前 session（用於調試）
export async function GET(request: NextRequest) {
  try {
    // 這個端點用於調試，檢查 session 是否正確傳遞
    const authHeader = request.headers.get('authorization')
    const cookies = request.cookies.getAll()
    
    return NextResponse.json({
      ok: true,
      hasAuthHeader: !!authHeader,
      cookies: cookies.map(c => ({ name: c.name, hasValue: !!c.value, valueLength: c.value?.length || 0 })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  }
}

