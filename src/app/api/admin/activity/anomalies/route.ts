import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth-server'
import { requireAdmin } from '@/lib/auth-server'

// GET: 獲取異常活動列表
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const supabase = createServerClient(request)
    const { searchParams } = new URL(request.url)
    
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // 計算日期範圍（默認最近30天）
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate ? new Date(startDate) : (() => {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      return d
    })()

    const anomalies: Array<{
      id: string
      type: string
      severity: 'low' | 'medium' | 'high'
      user_id: string
      user_email: string
      name: string
      description: string
      detected_at: string
      details: any
    }> = []

    // 1. 檢測同時多個登入（同一用戶在不同IP同時登入）
    const { data: loginSessions } = await supabase
      .from('login_sessions')
      .select('user_id, login_at, ip_address, user_profiles!inner(email, name)')
      .gte('login_at', start.toISOString())
      .lte('login_at', end.toISOString())
      .order('login_at', { ascending: false })

    if (loginSessions) {
      // 按用戶分組
      const userSessions: Record<string, typeof loginSessions> = {}
      loginSessions.forEach(session => {
        if (!userSessions[session.user_id]) {
          userSessions[session.user_id] = []
        }
        userSessions[session.user_id].push(session)
      })

      // 檢查每個用戶是否有同時多個登入
      Object.entries(userSessions).forEach(([userId, sessions]) => {
        // 檢查是否有在5分鐘內從不同IP登入的情況
        for (let i = 0; i < sessions.length; i++) {
          for (let j = i + 1; j < sessions.length; j++) {
            const timeDiff = Math.abs(
              new Date(sessions[i].login_at).getTime() - 
              new Date(sessions[j].login_at).getTime()
            )
            const fiveMinutes = 5 * 60 * 1000
            
            if (timeDiff < fiveMinutes && sessions[i].ip_address !== sessions[j].ip_address) {
              const profile = sessions[i].user_profiles as any
              anomalies.push({
                id: `multiple-login-${userId}-${i}-${j}`,
                type: 'multiple_logins',
                severity: 'medium',
                user_id: userId,
                user_email: profile?.email || '',
                name: profile?.name || profile?.email || '',
                description: `用戶在5分鐘內從不同IP地址登入（${sessions[i].ip_address} 和 ${sessions[j].ip_address}）`,
                detected_at: new Date(Math.max(
                  new Date(sessions[i].login_at).getTime(),
                  new Date(sessions[j].login_at).getTime()
                )).toISOString(),
                details: {
                  session1: {
                    login_at: sessions[i].login_at,
                    ip_address: sessions[i].ip_address,
                  },
                  session2: {
                    login_at: sessions[j].login_at,
                    ip_address: sessions[j].ip_address,
                  },
                },
              })
            }
          }
        }
      })
    }

    // 2. 檢測頻繁登入/登出（短時間內多次登入登出）
    const { data: frequentLogins } = await supabase
      .from('user_activity_logs')
      .select('user_id, created_at, user_profiles!inner(email, name)')
      .eq('activity_type', 'login')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    if (frequentLogins) {
      const userLogins: Record<string, typeof frequentLogins> = {}
      frequentLogins.forEach(login => {
        if (!userLogins[login.user_id]) {
          userLogins[login.user_id] = []
        }
        userLogins[login.user_id].push(login)
      })

      Object.entries(userLogins).forEach(([userId, logins]) => {
        // 檢查是否有在1小時內登入超過5次
        const oneHourAgo = new Date()
        oneHourAgo.setHours(oneHourAgo.getHours() - 1)
        
        const recentLogins = logins.filter(l => 
          new Date(l.created_at) >= oneHourAgo
        )

        if (recentLogins.length > 5) {
          const profile = recentLogins[0].user_profiles as any
          anomalies.push({
            id: `frequent-login-${userId}-${Date.now()}`,
            type: 'frequent_login',
            severity: 'low',
            user_id: userId,
            user_email: profile?.email || '',
            name: profile?.name || profile?.email || '',
            description: `用戶在1小時內登入 ${recentLogins.length} 次`,
            detected_at: recentLogins[0].created_at,
            details: {
              login_count: recentLogins.length,
              time_range: '1小時',
            },
          })
        }
      })
    }

    // 3. 檢測長時間無活動（業務帳號創建後長時間未使用）
    const { data: inactiveUsers } = await supabase
      .from('user_profiles')
      .select('id, email, name, role, created_at, last_login_at, last_activity_at')
      .eq('role', 'salesperson')
      .is('last_login_at', null)

    if (inactiveUsers) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      inactiveUsers.forEach(user => {
        const createdDate = new Date(user.created_at)
        if (createdDate < thirtyDaysAgo) {
          anomalies.push({
            id: `inactive-${user.id}`,
            type: 'inactive',
            severity: 'low',
            user_id: user.id,
            user_email: user.email || '',
            name: user.name || user.email || '',
            description: `業務帳號創建超過30天但從未登入`,
            detected_at: new Date().toISOString(),
            details: {
              created_at: user.created_at,
              days_since_creation: Math.floor(
                (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
              ),
            },
          })
        }
      })
    }

    // 按檢測時間排序（最新的在前）
    anomalies.sort((a, b) => 
      new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
    )

    return NextResponse.json({
      ok: true,
      data: anomalies,
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


