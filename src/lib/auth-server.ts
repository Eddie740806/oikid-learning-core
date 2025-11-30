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
  // 提取 project ref（例如：從 https://xxxxx.supabase.co 提取 xxxxx）
  const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)
  const projectRef = urlMatch ? urlMatch[1] : ''
  
  // 嘗試從多個可能的 cookie 名稱中讀取
  let accessToken: string | undefined
  
  // 方法 1: 標準格式 sb-<project-ref>-auth-token
  if (projectRef) {
    const authTokenCookie = request.cookies.get(`sb-${projectRef}-auth-token`)
    if (authTokenCookie?.value) {
      try {
        // Supabase 將 session 存儲為 JSON
        const sessionData = JSON.parse(authTokenCookie.value)
        accessToken = sessionData.access_token || sessionData.accessToken
      } catch {
        // 如果不是 JSON，直接使用值
        accessToken = authTokenCookie.value
      }
    }
  }
  
  // 方法 2: 如果標準格式找不到，嘗試從所有 cookie 中查找
  if (!accessToken) {
    const allCookies = request.cookies.getAll()
    for (const cookie of allCookies) {
      // 查找包含 'auth' 或 'supabase' 的 cookie
      if (cookie.name.includes('auth') || cookie.name.includes('supabase')) {
        try {
          const parsed = JSON.parse(cookie.value)
          accessToken = parsed.access_token || parsed.accessToken || parsed.token
        } catch {
          // 如果不是 JSON，可能是直接的 token
          if (cookie.value.length > 50) { // token 通常比較長
            accessToken = cookie.value
          }
        }
        if (accessToken) break
      }
    }
  }

  // 方法 3: 從 Authorization header 讀取（如果客戶端手動設置）
  if (!accessToken) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.replace('Bearer ', '')
    }
  }

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
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabase = createServerClient(request)
    
    // 方法 1: 從 Authorization header 讀取
    const authHeader = request.headers.get('authorization')
    let accessToken: string | undefined
    
    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.replace('Bearer ', '')
    }
    
    // 方法 2: 從 cookie 讀取 Supabase session
    if (!accessToken) {
      const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)
      const projectRef = urlMatch ? urlMatch[1] : ''
      
      if (projectRef) {
        // 嘗試多種可能的 cookie 名稱
        const possibleCookies = [
          `sb-${projectRef}-auth-token`,
          `sb-${projectRef}-auth-token-code-verifier`,
          `supabase.auth.token`,
        ]
        
        for (const cookieName of possibleCookies) {
          const cookie = request.cookies.get(cookieName)
          if (cookie?.value) {
            try {
              const sessionData = JSON.parse(cookie.value)
              accessToken = sessionData.access_token || sessionData.accessToken || sessionData.token
              if (accessToken) break
            } catch {
              // 如果不是 JSON，可能是直接的 token
              if (cookie.value.length > 50) {
                accessToken = cookie.value
                break
              }
            }
          }
        }
      }
    }

    // 方法 3: 從所有 cookie 中查找包含 'access_token' 的
    if (!accessToken) {
      const allCookies = request.cookies.getAll()
      for (const cookie of allCookies) {
        if (cookie.name.includes('auth') || cookie.name.includes('supabase')) {
          try {
            const parsed = JSON.parse(cookie.value)
            accessToken = parsed.access_token || parsed.accessToken || parsed.token
            if (accessToken) break
          } catch {
            // 跳過非 JSON cookie
          }
        }
      }
    }

    // 使用 access token 獲取用戶
    const { data: { user }, error } = accessToken 
      ? await supabase.auth.getUser(accessToken)
      : await supabase.auth.getUser()

    if (error || !user) {
      console.error('Auth error:', error)
      return null
    }

    // 獲取用戶角色
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, name, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
    }

    return {
      id: user.id,
      email: user.email,
      role: profile?.role || 'salesperson',
      name: profile?.name || user.email,
    }
  } catch (error) {
    console.error('getCurrentUser error:', error)
    return null
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

