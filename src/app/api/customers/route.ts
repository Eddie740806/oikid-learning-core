import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST: 新增客戶
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 驗證必要欄位
    const {
      display_name,
      phone,
      contact_key,
      source,
      grade,
      english_level,
      tags,
      confidence,
      notes,
      last_seen_at,
    } = body

    // 準備插入資料
    const { data, error } = await supabase
      .from('customers')
      .insert({
        display_name: display_name || null,
        phone: phone || null,
        contact_key: contact_key || null,
        source: source || null,
        grade: grade || null,
        english_level: english_level || null,
        tags: tags || null,
        confidence: confidence || null,
        notes: notes || null,
        last_seen_at: last_seen_at || null,
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

// GET: 查詢客戶列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      data,
      count: count || data?.length || 0,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
