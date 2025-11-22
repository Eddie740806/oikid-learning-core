import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST: 批量刪除分析結果
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, action } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'IDs array is required' },
        { status: 400 }
      )
    }

    if (action === 'delete') {
      // 批量刪除
      const { error } = await supabase
        .from('analyses')
        .delete()
        .in('id', ids)

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json({ 
        ok: true, 
        message: `Successfully deleted ${ids.length} analysis(es)` 
      })
    } else if (action === 'update') {
      // 批量更新
      const { fields } = body
      
      if (!fields || typeof fields !== 'object') {
        return NextResponse.json(
          { ok: false, error: 'Fields object is required for update' },
          { status: 400 }
        )
      }

      // 準備更新資料（只包含提供的欄位）
      const updateData: any = {}
      if (fields.salesperson_name !== undefined) {
        updateData.salesperson_name = fields.salesperson_name || null
      }
      if (fields.tags !== undefined) {
        updateData.tags = fields.tags || null
      }
      if (fields.score !== undefined) {
        updateData.score = fields.score !== '' ? parseInt(fields.score) : null
      }
      if (fields.customer_name !== undefined) {
        updateData.customer_name = fields.customer_name || null
      }

      const { error } = await supabase
        .from('analyses')
        .update(updateData)
        .in('id', ids)

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json({ 
        ok: true, 
        message: `Successfully updated ${ids.length} analysis(es)` 
      })
    } else {
      return NextResponse.json(
        { ok: false, error: 'Invalid action. Use "delete" or "update"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

