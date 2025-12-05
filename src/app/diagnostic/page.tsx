'use client'

import { useState, useEffect } from 'react'
import { createClientClient } from '@/lib/auth'
import AuthGuard from '@/components/AuthGuard'

export default function DiagnosticPage() {
    const [sessionInfo, setSessionInfo] = useState<any>(null)
    const [testResult, setTestResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        checkSession()
    }, [])

    const checkSession = async () => {
        try {
            const supabase = createClientClient()
            const { data: { session }, error } = await supabase.auth.getSession()

            if (error) {
                setSessionInfo({ error: error.message })
                return
            }

            if (!session) {
                setSessionInfo({ error: 'No session found' })
                return
            }

            setSessionInfo({
                user: {
                    id: session.user.id,
                    email: session.user.email,
                },
                accessToken: {
                    length: session.access_token.length,
                    first50: session.access_token.substring(0, 50) + '...',
                    last50: '...' + session.access_token.substring(session.access_token.length - 50),
                },
                expiresAt: new Date(session.expires_at! * 1000).toLocaleString(),
            })
        } catch (error) {
            console.error('Session check error:', error)
            setSessionInfo({ error: String(error) })
        }
    }

    const testAPI = async () => {
        setLoading(true)
        setTestResult(null)

        try {
            const supabase = createClientClient()
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                setTestResult({ error: 'No session' })
                setLoading(false)
                return
            }

            // 測試獲取分析列表
            console.log('Testing GET /api/analyses...')
            const listResponse = await fetch('/api/analyses?limit=1', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            })

            const listResult = await listResponse.json()

            const result: any = {
                listAPI: {
                    status: listResponse.status,
                    ok: listResponse.ok,
                    result: listResult,
                }
            }

            // 如果有分析結果，測試獲取單一分析
            if (listResult.ok && listResult.data && listResult.data.length > 0) {
                const analysisId = listResult.data[0].id
                console.log('Testing GET /api/analyses/' + analysisId)

                const getResponse = await fetch(`/api/analyses/${analysisId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                })

                const getResult = await getResponse.json()

                result.getAPI = {
                    status: getResponse.status,
                    ok: getResponse.ok,
                    result: getResult,
                }
            }

            setTestResult(result)
        } catch (error) {
            console.error('Test error:', error)
            setTestResult({ error: String(error) })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthGuard>
            <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-6">
                        認證診斷工具
                    </h1>

                    <div className="space-y-6">
                        {/* Session 資訊 */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
                            <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
                                Session 資訊
                            </h2>
                            <button
                                onClick={checkSession}
                                className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                重新檢查 Session
                            </button>
                            <pre className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg overflow-auto text-sm">
                                {JSON.stringify(sessionInfo, null, 2)}
                            </pre>
                        </div>

                        {/* API 測試 */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
                            <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
                                API 測試
                            </h2>
                            <button
                                onClick={testAPI}
                                disabled={loading}
                                className="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                {loading ? '測試中...' : '測試 API 請求'}
                            </button>
                            {testResult && (
                                <pre className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg overflow-auto text-sm">
                                    {JSON.stringify(testResult, null, 2)}
                                </pre>
                            )}
                        </div>

                        {/* 說明 */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                使用說明
                            </h3>
                            <ul className="list-disc list-inside space-y-2 text-blue-800 dark:text-blue-200">
                                <li>點擊「重新檢查 Session」查看當前的 session 狀態</li>
                                <li>點擊「測試 API 請求」測試 API 是否能正確認證</li>
                                <li>檢查 Console 查看詳細的日誌輸出</li>
                                <li>如果 API 測試失敗，請查看伺服器日誌</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGuard>
    )
}
