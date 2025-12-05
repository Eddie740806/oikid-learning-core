import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

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
    
    // 方法 1: 優先從 Authorization header 讀取（客戶端會發送）
    // Next.js headers.get() 是大小寫不敏感的，但我們也嘗試不同的寫法
    const authHeader = request.headers.get('authorization') || 
                      request.headers.get('Authorization') ||
                      request.headers.get('AUTHORIZATION')
    let accessToken: string | undefined
    
    if (authHeader) {
      console.log('Authorization header found:', authHeader.substring(0, 30) + '...')
      // 處理 Bearer token（大小寫不敏感）
      const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
      if (bearerMatch) {
        accessToken = bearerMatch[1].trim()
        console.log('Found access token in Authorization header (Bearer format)')
      } else if (authHeader.length > 50) {
        // 如果沒有 Bearer 前綴，但看起來像 token，直接使用
        accessToken = authHeader.trim()
        console.log('Found access token in Authorization header (direct format)')
      }
    } else {
      console.log('No Authorization header found')
      console.log('Available headers:', Array.from(request.headers.keys()))
    }
    
    // 方法 2: 如果沒有 header，嘗試從 cookie 讀取 Supabase session
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

    // 如果還是沒有 access token，無法驗證用戶
    if (!accessToken) {
      console.error('No access token found in request')
      console.error('Auth header:', authHeader ? 'present' : 'missing')
      console.error('Auth header value:', authHeader ? authHeader.substring(0, 20) + '...' : 'N/A')
      console.error('Cookies:', request.cookies.getAll().map(c => c.name))
      return null
    }
    
    console.log('Access token found, length:', accessToken.length)

    // 使用 access token 創建 Supabase 客戶端並獲取用戶
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })

    console.log('Attempting to get user with token (length:', accessToken.length, ')')
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)

    if (error) {
      console.error('Supabase getUser error:', error)
      console.error('Error message:', error?.message)
      console.error('Error status:', error?.status)
      console.error('Error name:', error?.name)
      // 如果 token 無效或過期，返回 null
      return null
    }
    
    if (!user) {
      console.error('No user returned from getUser')
      return null
    }
    
    console.log('User authenticated successfully:', user.id, user.email)

    // 獲取用戶角色（從資料庫實時查詢，不依賴 JWT）
    // 只查詢 role 和 email，name 欄位可能不存在
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile query error:', profileError)
      console.error('User ID:', user.id)
      console.error('User Email:', user.email)
      // 即使查詢失敗，也返回用戶信息（使用默認角色）
      return {
        id: user.id,
        email: user.email,
        role: 'salesperson', // 默認角色
        name: user.email,
      }
    }

    console.log('Profile loaded for API:', { userId: user.id, role: profile?.role })

    return {
      id: user.id,
      email: user.email,
      role: profile?.role || 'salesperson',
      name: user.email, // 使用 email 作為 name，因為 name 欄位可能不存在
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

