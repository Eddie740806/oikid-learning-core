import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // 檢查檔案大小（限制 100MB）
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { ok: false, error: 'File size exceeds 100MB limit' },
        { status: 400 }
      )
    }

    // 生成唯一檔案名稱
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomString}.${fileExtension}`

    // 轉換為 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 上傳到 Supabase Storage
    console.log('Uploading file:', { fileName, size: file.size, type: file.type })
    const { data, error } = await supabase.storage
      .from('recordings')
      .upload(fileName, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (error) {
      console.error('Supabase storage error:', error)
      return NextResponse.json(
        { ok: false, error: `上傳失敗: ${error.message}` },
        { status: 400 }
      )
    }

    if (!data) {
      console.error('Upload succeeded but no data returned')
      return NextResponse.json(
        { ok: false, error: '上傳成功但未返回資料' },
        { status: 500 }
      )
    }

    // 獲取公開 URL
    const { data: urlData } = supabase.storage
      .from('recordings')
      .getPublicUrl(data.path)

    console.log('Upload successful:', { fileName: data.path, url: urlData.publicUrl })

    return NextResponse.json({
      ok: true,
      data: {
        file_name: fileName,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    )
  }
}

