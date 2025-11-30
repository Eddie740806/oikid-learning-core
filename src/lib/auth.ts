import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// 服務端 Supabase 客戶端（用於 API 路由）
export function createServerClient(request?: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  // 在 API 路由中，從請求頭中讀取 session
  const authHeader = request?.headers.get('authorization')
  const accessToken = authHeader?.replace('Bearer ', '') || 
                      request?.cookies.get('sb-access-token')?.value

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

// 客戶端 Supabase 客戶端（用於 Client Component）
export function createClientClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'supabase.auth.token',
    },
  })
}

// 獲取當前用戶（服務端，用於 API 路由）
export async function getCurrentUser(request?: NextRequest) {
  const supabase = createServerClient(request)
  
  // 從 cookie 中讀取 session
  const sessionCookie = request?.cookies.get('sb-access-token')?.value
  if (!sessionCookie) {
    return null
  }

  const { data: { user }, error } = await supabase.auth.getUser(sessionCookie)

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
export async function requireAuth(request?: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

// 檢查用戶是否為管理員（服務端，用於 API 路由）
export async function requireAdmin(request?: NextRequest) {
  const user = await requireAuth(request)
  if (user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }
  return user
}

// 用戶角色類型
export type UserRole = 'salesperson' | 'admin'

// 用戶資料類型
export interface UserProfile {
  id: string
  email: string
  role: UserRole
  name: string
}

