import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth, requireAdmin } from '@/lib/auth-server'

// GET: 取得單一分析結果
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== GET /api/analyses/[id] ===')
    console.log('Headers:', Object.fromEntries(request.headers.entries()))

    // 檢查身份驗證
    let user
    try {
      console.log('Attempting authentication...')
      user = await requireAuth(request)
      console.log('Authentication successful:', user.email, user.role)
    } catch (error) {
      console.error('Authentication failed:', error)
      return NextResponse.json(
        { ok: false, error: 'Unauthorized. Please login first.' },
        { status: 401 }
      )
    }

    const { id } = await params
    console.log('Fetching analysis with ID:', id)

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

    console.log('Analysis fetched successfully')
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
    // 檢查身份驗證
    try {
      await requireAuth(request)
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized. Please login first.' },
        { status: 401 }
      )
    }
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
      customer_questions,
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

    // 如果 analysis_text 為 null，從新欄位生成（資料庫要求 NOT NULL）
    const finalAnalysisText = analysis_text ||
      `業務表現深度分析：\n${performance_analysis}\n\n亮點與改進點：\n${highlights_improvements}\n\n具體改善建議：\n${improvement_suggestions}\n\n評分與標籤：\n${score_tags}`

    const { data, error } = await supabase
      .from('analyses')
      .update({
        recording_id: recording_id || null,
        customer_id: customer_id || null,
        customer_name: customer_name || null,
        analysis_text: finalAnalysisText, // 確保不為 null（資料庫要求）
        analysis_json: analysis_json || null,
        performance_analysis: performance_analysis || null,
        highlights_improvements: highlights_improvements || null,
        improvement_suggestions: improvement_suggestions || null,
        score_tags: score_tags || null,
        customer_questions: customer_questions || null,
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

// DELETE: 刪除分析結果（僅管理員）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 檢查身份驗證和管理員權限
    try {
      const { requireAdmin } = await import('@/lib/auth')
      await requireAdmin(request)
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden. Admin access required.' },
        { status: 403 }
      )
    }
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

