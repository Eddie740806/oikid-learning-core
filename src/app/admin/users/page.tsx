'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminGuard from '@/components/AdminGuard'
import { createClientClient } from '@/lib/auth'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  is_active: boolean | null
  last_login_at: string | null
  last_activity_at: string | null
  created_at: string
}

export default function UsersManagementPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null)
  
  // 篩選和搜尋
  const [filters, setFilters] = useState({
    role: '',
    is_active: '',
    search: '',
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })

  // 表單狀態
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'salesperson',
    is_active: true,
  })

  const [resetPasswordData, setResetPasswordData] = useState({
    new_password: '',
    confirm_password: '',
  })

  useEffect(() => {
    fetchUsers()
  }, [filters, pagination.page])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClientClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams()
      if (filters.role) params.append('role', filters.role)
      if (filters.is_active) params.append('is_active', filters.is_active)
      if (filters.search) params.append('search', filters.search)
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })

      const result = await response.json()

      if (result.ok) {
        setUsers(result.data || [])
        setPagination(prev => ({
          ...prev,
          total: result.pagination?.total || 0,
          totalPages: result.pagination?.totalPages || 0,
        }))
      } else {
        if (response.status === 401 || response.status === 403) {
          router.push('/login')
          return
        }
        setError(result.error || '載入失敗')
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('發生錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      alert('請填寫郵箱和密碼')
      return
    }

    try {
      const supabase = createClientClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.ok) {
        alert('用戶創建成功')
        setShowCreateForm(false)
        setFormData({
          email: '',
          password: '',
          name: '',
          role: 'salesperson',
          is_active: true,
        })
        fetchUsers()
      } else {
        alert(result.error || '創建失敗')
      }
    } catch (err) {
      console.error('Error creating user:', err)
      alert('發生錯誤，請稍後再試')
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    try {
      const supabase = createClientClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          is_active: formData.is_active,
        }),
      })

      const result = await response.json()

      if (result.ok) {
        alert('用戶更新成功')
        setEditingUser(null)
        setFormData({
          email: '',
          password: '',
          name: '',
          role: 'salesperson',
          is_active: true,
        })
        fetchUsers()
      } else {
        alert(result.error || '更新失敗')
      }
    } catch (err) {
      console.error('Error updating user:', err)
      alert('發生錯誤，請稍後再試')
    }
  }

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`確定要刪除用戶 ${email} 嗎？此操作無法復原。`)) {
      return
    }

    try {
      const supabase = createClientClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })

      const result = await response.json()

      if (result.ok) {
        alert('用戶刪除成功')
        fetchUsers()
      } else {
        alert(result.error || '刪除失敗')
      }
    } catch (err) {
      console.error('Error deleting user:', err)
      alert('發生錯誤，請稍後再試')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showResetPassword) return

    if (resetPasswordData.new_password !== resetPasswordData.confirm_password) {
      alert('兩次輸入的密碼不一致')
      return
    }

    if (resetPasswordData.new_password.length < 6) {
      alert('密碼長度至少需要 6 個字符')
      return
    }

    try {
      const supabase = createClientClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/admin/users/${showResetPassword}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          new_password: resetPasswordData.new_password,
        }),
      })

      const result = await response.json()

      if (result.ok) {
        alert('密碼重置成功')
        setShowResetPassword(null)
        setResetPasswordData({
          new_password: '',
          confirm_password: '',
        })
      } else {
        alert(result.error || '重置失敗')
      }
    } catch (err) {
      console.error('Error resetting password:', err)
      alert('發生錯誤，請稍後再試')
    }
  }

  const startEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: '',
      name: user.name || '',
      role: user.role,
      is_active: user.is_active ?? true,
    })
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-black py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-2">
                  用戶管理
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400">
                  管理系統用戶帳號和權限
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="bg-zinc-600 hover:bg-zinc-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  ← 返回儀表板
                </button>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  + 創建用戶
                </button>
              </div>
            </div>
          </div>

          {/* 篩選器 */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  搜尋
                </label>
                <input
                  type="text"
                  placeholder="搜尋郵箱或姓名..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  角色
                </label>
                <select
                  value={filters.role}
                  onChange={(e) => {
                    setFilters({ ...filters, role: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                >
                  <option value="">全部</option>
                  <option value="admin">管理員</option>
                  <option value="salesperson">業務</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  狀態
                </label>
                <select
                  value={filters.is_active}
                  onChange={(e) => {
                    setFilters({ ...filters, is_active: e.target.value })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                >
                  <option value="">全部</option>
                  <option value="true">啟用</option>
                  <option value="false">停用</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({ role: '', is_active: '', search: '' })
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="w-full bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  清除篩選
                </button>
              </div>
            </div>
          </div>

          {/* 創建用戶表單 */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                  創建新用戶
                </h2>
                <form onSubmit={handleCreateUser}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        郵箱 *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        密碼 *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        姓名
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        角色
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                      >
                        <option value="salesperson">業務</option>
                        <option value="admin">管理員</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_active_create"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="mr-2"
                      />
                      <label htmlFor="is_active_create" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        啟用帳號
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      創建
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false)
                        setFormData({
                          email: '',
                          password: '',
                          name: '',
                          role: 'salesperson',
                          is_active: true,
                        })
                      }}
                      className="flex-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 編輯用戶表單 */}
          {editingUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                  編輯用戶
                </h2>
                <form onSubmit={handleUpdateUser}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        郵箱
                      </label>
                      <input
                        type="email"
                        value={editingUser.email}
                        disabled
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        姓名
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        角色
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                      >
                        <option value="salesperson">業務</option>
                        <option value="admin">管理員</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_active_edit"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="mr-2"
                      />
                      <label htmlFor="is_active_edit" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        啟用帳號
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      更新
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser(null)
                        setFormData({
                          email: '',
                          password: '',
                          name: '',
                          role: 'salesperson',
                          is_active: true,
                        })
                      }}
                      className="flex-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 重置密碼表單 */}
          {showResetPassword && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
                  重置密碼
                </h2>
                <form onSubmit={handleResetPassword}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        新密碼 *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={resetPasswordData.new_password}
                        onChange={(e) => setResetPasswordData({ ...resetPasswordData, new_password: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        確認密碼 *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={resetPasswordData.confirm_password}
                        onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirm_password: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      重置
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetPassword(null)
                        setResetPasswordData({
                          new_password: '',
                          confirm_password: '',
                        })
                      }}
                      className="flex-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-black dark:text-zinc-50 font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 錯誤訊息 */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* 用戶列表 */}
          {loading ? (
            <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
              載入中...
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-100 dark:bg-zinc-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          郵箱
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          姓名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          角色
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          狀態
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          最後登入
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          最後活動
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-black dark:text-zinc-50">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-black dark:text-zinc-50">
                            {user.name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'admin'
                                ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                            }`}>
                              {user.role === 'admin' ? '管理員' : '業務'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.is_active
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            }`}>
                              {user.is_active ? '啟用' : '停用'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                            {user.last_login_at
                              ? new Date(user.last_login_at).toLocaleString('zh-TW')
                              : '從未登入'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                            {user.last_activity_at
                              ? new Date(user.last_activity_at).toLocaleString('zh-TW')
                              : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEdit(user)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                編輯
                              </button>
                              <button
                                onClick={() => setShowResetPassword(user.id)}
                                className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                              >
                                重置密碼
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                刪除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 分頁 */}
              {pagination.totalPages > 1 && (
                <div className="mt-6 flex justify-center items-center gap-4">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一頁
                  </button>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    第 {pagination.page} 頁，共 {pagination.totalPages} 頁（總計 {pagination.total} 筆）
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一頁
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminGuard>
  )
}

