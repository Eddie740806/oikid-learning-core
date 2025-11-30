# 身份驗證問題排查指南

## 問題 1: 登入後顯示「業務」而不是「管理員」

### 解決步驟：

1. **檢查資料庫中的用戶角色**
   
   在 Supabase Dashboard 的 SQL Editor 中執行：
   ```sql
   SELECT * FROM user_profiles WHERE email = 'eddie740806@gmail.com';
   ```
   
   確認 `role` 欄位是 `admin`。

2. **如果角色不是 admin，更新它**
   ```sql
   UPDATE user_profiles
   SET role = 'admin'
   WHERE email = 'eddie740806@gmail.com';
   ```

3. **清除瀏覽器緩存並重新登入**
   - 清除瀏覽器的 cookie 和 localStorage
   - 重新訪問應用並登入
   - 檢查導航欄是否顯示「管理員」

4. **檢查瀏覽器控制台**
   - 打開開發者工具（F12）
   - 查看 Console 標籤是否有錯誤
   - 查看是否有關於 `user_profiles` 查詢失敗的錯誤

## 問題 2: 點擊「分析結果」會被自動登出

### 可能原因：

1. **Session cookie 沒有正確設置**
2. **API 路由無法讀取 session**
3. **客戶端和服務端的 session 不同步**

### 解決步驟：

1. **檢查瀏覽器中的 cookie**
   - 打開開發者工具（F12）
   - 進入 Application 標籤 > Cookies
   - 查找包含 `supabase` 或 `auth` 的 cookie
   - 確認這些 cookie 存在且有值

2. **檢查 Network 請求**
   - 打開開發者工具（F12）
   - 進入 Network 標籤
   - 點擊「分析結果」連結
   - 查看 `/api/analyses` 請求：
     - 檢查 Request Headers 中是否包含 `Authorization: Bearer ...`
     - 檢查 Request Headers 中是否包含 Cookie
     - 查看 Response 狀態碼（應該是 200，不是 401）

3. **測試 session API**
   - 訪問 `/api/auth/session`（需要登入狀態）
   - 查看返回的 JSON，確認 cookie 是否正確傳遞

4. **清除所有數據並重新登入**
   - 清除瀏覽器的所有 cookie 和 localStorage
   - 重新登入
   - 測試功能

## 調試步驟

### 步驟 1: 檢查用戶角色

在瀏覽器控制台執行：
```javascript
// 檢查當前用戶和角色
const supabase = window.supabase || (await import('@/lib/auth')).createClientClient()
const { data: { user } } = await supabase.auth.getUser()
console.log('User:', user)

const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', user.id)
  .single()
console.log('Profile:', profile)
```

### 步驟 2: 檢查 Session

在瀏覽器控制台執行：
```javascript
const supabase = window.supabase || (await import('@/lib/auth')).createClientClient()
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)
console.log('Access Token:', session?.access_token)
```

### 步驟 3: 測試 API 請求

在瀏覽器控制台執行：
```javascript
const supabase = window.supabase || (await import('@/lib/auth')).createClientClient()
const { data: { session } } = await supabase.auth.getSession()

const response = await fetch('/api/analyses?limit=10', {
  headers: {
    'Authorization': `Bearer ${session?.access_token}`,
  },
  credentials: 'include',
})
const result = await response.json()
console.log('API Response:', result)
```

## 常見錯誤和解決方法

### 錯誤: "Unauthorized. Please login first."

**原因**: API 路由無法讀取 session

**解決方法**:
1. 確認請求中包含 `Authorization` header
2. 確認 cookie 正確設置
3. 檢查 Supabase 環境變數是否正確

### 錯誤: 角色顯示為「業務」但資料庫中是「管理員」

**原因**: Navbar 查詢 `user_profiles` 失敗或緩存問題

**解決方法**:
1. 檢查資料庫中的角色是否正確
2. 清除瀏覽器緩存
3. 檢查瀏覽器控制台是否有查詢錯誤

### 錯誤: 登入後立即被登出

**原因**: Session 沒有正確持久化

**解決方法**:
1. 確認 Supabase 客戶端配置了 `persistSession: true`
2. 檢查 localStorage 中是否有 session 數據
3. 清除所有數據並重新登入

## 如果問題仍然存在

1. **檢查 Vercel 環境變數**
   - 確認 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已設置
   - 確認值正確無誤

2. **檢查 Supabase Dashboard**
   - 確認 Authentication > Settings 中的配置正確
   - 確認 `user_profiles` 表存在且數據正確

3. **查看服務器日誌**
   - 在 Vercel Dashboard 中查看 Function Logs
   - 查找認證相關的錯誤

4. **聯繫支持**
   - 提供具體的錯誤訊息
   - 提供瀏覽器控制台的截圖
   - 提供 Network 標籤的截圖

