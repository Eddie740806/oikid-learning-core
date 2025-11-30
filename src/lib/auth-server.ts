import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// 服務端 Supabase 客戶端（用於 API 路由）
export function createServerClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  // 從 cookie 中讀取 Supabase session
  // Supabase 使用 sb-<project-ref>-auth-token 格式的 cookie
  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || ''
  const authTokenCookie = request.cookies.get(`sb-${projectRef}-auth-token`)
  const accessToken = authTokenCookie?.value

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
      } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

// 獲取當前用戶（服務端，用於 API 路由）
export async function getCurrentUser(request: NextRequest) {
  const supabase = createServerClient(request)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  // 獲取用戶角色
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, name, email')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email,
    role: profile?.role || 'salesperson',
    name: profile?.name || user.email,
  }
}

// 檢查用戶是否已登入（服務端，用於 API 路由）
export async function requireAuth(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

// 檢查用戶是否為管理員（服務端，用於 API 路由）
export async function requireAdmin(request: NextRequest) {
  const user = await requireAuth(request)
  if (user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }
  return user
}

