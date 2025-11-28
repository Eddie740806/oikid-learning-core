import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 確保這個路由是動態的
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// 增加 body size 限制
export const maxDuration = 60 // 60 秒超時

// 確保所有回應都是 JSON 格式
function jsonResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    // 檢查環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey
      })
      return jsonResponse({
        ok: false,
        error: '伺服器配置錯誤：缺少 Supabase 環境變數。請檢查 Vercel 環境變數設定。',
        details: {
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseAnonKey
        }
      }, 500)
    }

    // 在 API 路由中創建 Supabase 客戶端
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return jsonResponse({
        ok: false,
        error: '未提供檔案'
      }, 400)
    }

    // 檢查檔案大小（限制 100MB）
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return jsonResponse({
        ok: false,
        error: '檔案大小超過 100MB 限制'
      }, 400)
    }

    // 檢查檔案大小是否為 0
    if (file.size === 0) {
      return jsonResponse({
        ok: false,
        error: '檔案大小為 0，請選擇有效的檔案'
      }, 400)
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
    console.log('Uploading file:', { 
      fileName, 
      size: file.size, 
      type: file.type,
      supabaseUrl: supabaseUrl ? 'configured' : 'missing'
    })

    // 先檢查 bucket 是否存在
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    if (bucketError) {
      console.error('Error listing buckets:', bucketError)
      return jsonResponse({
        ok: false,
        error: `無法連接到 Supabase Storage: ${bucketError.message}`,
        details: {
          errorType: 'bucket_list_error',
          message: bucketError.message
        }
      }, 500)
    }

    const recordingsBucket = buckets?.find(b => b.name === 'recordings')
    if (!recordingsBucket) {
      console.error('Recordings bucket not found. Available buckets:', buckets?.map(b => b.name))
      return jsonResponse({
        ok: false,
        error: '找不到 recordings bucket，請確認 Supabase Storage 配置',
        details: {
          errorType: 'bucket_not_found',
          availableBuckets: buckets?.map(b => b.name) || []
        }
      }, 500)
    }

    const { data, error } = await supabase.storage
      .from('recordings')
      .upload(fileName, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (error) {
      console.error('Supabase storage upload error:', {
        message: error.message,
        error: JSON.stringify(error, null, 2)
      })
      return jsonResponse({
        ok: false,
        error: `上傳失敗: ${error.message}`,
        details: {
          errorType: 'upload_error',
          message: error.message
        }
      }, 400)
    }

    if (!data) {
      console.error('Upload succeeded but no data returned')
      return jsonResponse({
        ok: false,
        error: '上傳成功但未返回資料',
        details: {
          errorType: 'no_data_returned'
        }
      }, 500)
    }

    // 獲取公開 URL
    const { data: urlData } = supabase.storage
      .from('recordings')
      .getPublicUrl(data.path)

    console.log('Upload successful:', { fileName: data.path, url: urlData.publicUrl })

    return jsonResponse({
      ok: true,
      data: {
        file_name: fileName,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type,
      },
    })
  } catch (error) {
    // 確保所有錯誤都返回 JSON 格式
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return jsonResponse({
      ok: false,
      error: errorMessage,
      details: {
        errorType: 'unexpected_error',
        message: errorMessage,
        // 只在開發環境顯示 stack
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      }
    }, 500)
  }
}

