import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST: 新增分析結果
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      recording_id,
      customer_id,
      customer_name,
      analysis_text,
      analysis_json,
      transcript,
      customer_profile,
      score,
      tags,
      notes,
      salesperson_name,
      recording_file_url,
      analyzed_by = 'manual',
    } = body

    // 驗證必要欄位
    if (!analysis_text) {
      return NextResponse.json(
        { ok: false, error: 'analysis_text is required' },
        { status: 400 }
      )
    }

    // 準備插入資料
    const { data, error } = await supabase
      .from('analyses')
      .insert({
        recording_id: recording_id || null,
        customer_id: customer_id || null,
        customer_name: customer_name || null,
        analysis_text,
        analysis_json: analysis_json || null,
        transcript: transcript || null,
        customer_profile: customer_profile || null,
        score: score || null,
        tags: tags || null,
        notes: notes || null,
        salesperson_name: salesperson_name || null,
        recording_file_url: recording_file_url || null,
        analyzed_by,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: 查詢分析結果列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customer_id = searchParams.get('customer_id')
    const recording_id = searchParams.get('recording_id')
    const salesperson_name = searchParams.get('salesperson_name')
    const score_min = searchParams.get('score_min')
    const score_max = searchParams.get('score_max')
    const tags = searchParams.get('tags') // 逗號分隔的多個標籤
    const limit = parseInt(searchParams.get('limit') || '1000') // 增加 limit 以便篩選後顯示
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('analyses')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 可選的篩選條件
    if (customer_id) {
      query = query.eq('customer_id', customer_id)
    }
    if (recording_id) {
      query = query.eq('recording_id', recording_id)
    }
    if (salesperson_name) {
      query = query.eq('salesperson_name', salesperson_name)
    }
    if (score_min) {
      query = query.gte('score', parseInt(score_min))
    }
    if (score_max) {
      query = query.lte('score', parseInt(score_max))
    }
    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    // 標籤篩選（在查詢後過濾，支援多個標籤）
    let filteredData = data || []
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t)
      if (tagArray.length > 0) {
        filteredData = filteredData.filter((analysis: any) => {
          if (!analysis.tags || !Array.isArray(analysis.tags)) return false
          // 檢查 tags 陣列中是否包含任何一個指定的標籤
          return tagArray.some(tag => analysis.tags.includes(tag))
        })
      }
    }

    return NextResponse.json({
      ok: true,
      data: filteredData,
      count: filteredData.length,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

