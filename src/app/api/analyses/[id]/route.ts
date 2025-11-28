import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET: 取得單一分析結果
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Analysis ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: 更新分析結果
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Analysis ID is required' },
        { status: 400 }
      )
    }

    const {
      recording_id,
      customer_id,
      customer_name,
      analysis_text,
      analysis_json,
      performance_analysis,
      highlights_improvements,
      improvement_suggestions,
      score_tags,
      transcript,
      customer_profile,
      score,
      tags,
      notes,
      salesperson_name,
      recording_file_url,
      analyzed_by,
    } = body

    // 驗證必要欄位（新的必填欄位）
    if (!performance_analysis || !highlights_improvements || !improvement_suggestions || !score_tags) {
      return NextResponse.json(
        { ok: false, error: '業務表現深度分析、亮點與改進點、具體改善建議、評分與標籤為必填欄位' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('analyses')
      .update({
        recording_id: recording_id || null,
        customer_id: customer_id || null,
        customer_name: customer_name || null,
        analysis_text: analysis_text || null, // 保留以向後兼容
        analysis_json: analysis_json || null,
        performance_analysis: performance_analysis || null,
        highlights_improvements: highlights_improvements || null,
        improvement_suggestions: improvement_suggestions || null,
        score_tags: score_tags || null,
        transcript: transcript || null,
        customer_profile: customer_profile || null,
        score: score || null,
        tags: tags || null,
        notes: notes || null,
        salesperson_name: salesperson_name || null,
        recording_file_url: recording_file_url || null,
        analyzed_by: analyzed_by || 'manual',
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: 刪除分析結果
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Analysis ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('analyses')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, message: 'Analysis deleted successfully' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

