import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    return NextResponse.json({
      ok: true,
      config: {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseAnonKey,
        supabaseUrlLength: supabaseUrl?.length || 0,
        supabaseKeyLength: supabaseAnonKey?.length || 0,
        // 不顯示完整值，只顯示前後幾個字元
        supabaseUrlPreview: supabaseUrl 
          ? `${supabaseUrl.substring(0, 20)}...${supabaseUrl.substring(supabaseUrl.length - 10)}`
          : '未設定',
        supabaseKeyPreview: supabaseAnonKey
          ? `${supabaseAnonKey.substring(0, 20)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 10)}`
          : '未設定',
      },
      message: '測試端點正常運作'
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

