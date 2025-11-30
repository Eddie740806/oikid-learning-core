import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-server'

// GET: 取得統計資料
export async function GET(request: NextRequest) {
  try {
    // 檢查身份驗證
    try {
      await requireAuth(request)
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized. Please login first.' },
        { status: 401 }
      )
    }
    // 取得所有分析結果
    const { data: allAnalyses, error } = await supabase
      .from('analyses')
      .select('*')

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    if (!allAnalyses || allAnalyses.length === 0) {
      return NextResponse.json({
        ok: true,
        data: {
          total: 0,
          averageScore: 0,
          scoreDistribution: {},
          salespersonStats: {},
          tagStats: {},
          recentCount: 0,
        },
      })
    }

    // 計算總數
    const total = allAnalyses.length

    // 計算平均評分
    const scores = allAnalyses
      .map((a: any) => a.score)
      .filter((s: any) => s !== null && s !== undefined)
    const averageScore = scores.length > 0
      ? scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length
      : 0

    // 評分分布（0-20, 21-40, 41-60, 61-80, 81-100）
    const scoreDistribution: Record<string, number> = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
    }
    scores.forEach((score: number) => {
      if (score <= 20) scoreDistribution['0-20']++
      else if (score <= 40) scoreDistribution['21-40']++
      else if (score <= 60) scoreDistribution['41-60']++
      else if (score <= 80) scoreDistribution['61-80']++
      else scoreDistribution['81-100']++
    })

    // 業務統計
    const salespersonStats: Record<string, { count: number; avgScore: number; scores?: number[] }> = {}
    allAnalyses.forEach((analysis: any) => {
      const name = analysis.salesperson_name || '未指定'
      if (!salespersonStats[name]) {
        salespersonStats[name] = { count: 0, avgScore: 0, scores: [] }
      }
      salespersonStats[name].count++
      if (analysis.score !== null && analysis.score !== undefined) {
        if (!salespersonStats[name].scores) {
          salespersonStats[name].scores = []
        }
        salespersonStats[name].scores!.push(analysis.score)
      }
    })

    // 計算每個業務的平均評分
    Object.keys(salespersonStats).forEach((name) => {
      const stats = salespersonStats[name]
      if (stats.scores && stats.scores.length > 0) {
        stats.avgScore = stats.scores.reduce((sum: number, s: number) => sum + s, 0) / stats.scores.length
        delete stats.scores
      }
    })

    // 標籤統計
    const tagStats: Record<string, number> = {}
    allAnalyses.forEach((analysis: any) => {
      if (analysis.tags && Array.isArray(analysis.tags)) {
        analysis.tags.forEach((tag: string) => {
          tagStats[tag] = (tagStats[tag] || 0) + 1
        })
      }
    })

    // 最近 7 天的分析數量
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentCount = allAnalyses.filter((a: any) => {
      const createdAt = new Date(a.created_at)
      return createdAt >= sevenDaysAgo
    }).length

    // 最近 30 天的分析數量
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recent30Count = allAnalyses.filter((a: any) => {
      const createdAt = new Date(a.created_at)
      return createdAt >= thirtyDaysAgo
    }).length

    return NextResponse.json({
      ok: true,
      data: {
        total,
        averageScore: Math.round(averageScore * 100) / 100,
        scoreDistribution,
        salespersonStats,
        tagStats,
        recentCount,
        recent30Count,
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

