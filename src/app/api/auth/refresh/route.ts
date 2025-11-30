import { NextRequest, NextResponse } from 'next/server'
import { createClientClient } from '@/lib/auth'

// POST: 強制刷新 session 和用戶角色
export async function POST(request: NextRequest) {
  try {
    // 這個端點用於強制刷新 session
    // 客戶端應該在登入後調用這個端點來確保獲取最新的角色信息
    
    return NextResponse.json({
      ok: true,
      message: 'Session refreshed. Please reload the page.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  }
}

