# Supabase Auth 設置指南

## 第一步：在 Supabase 中執行 SQL 腳本

1. 登入 Supabase Dashboard
2. 進入 SQL Editor
3. 執行 `supabase-auth-setup.sql` 文件中的所有 SQL 語句

這個腳本會：
- 創建 `user_profiles` 表來存儲用戶角色
- 設置 Row Level Security (RLS) 政策
- 創建自動觸發器，當新用戶註冊時自動創建用戶資料

## 第二步：啟用 Supabase Auth

1. 在 Supabase Dashboard 中，進入 **Authentication** > **Settings**
2. 確保 **Enable Email Signup** 已啟用
3. 在 **Email Auth** 中，可以設置：
   - **Enable Email Confirmations**: 可選（建議關閉以便快速測試）
   - **Secure Email Change**: 可選

## 第三步：創建第一個管理員帳號

### 方法 1：通過 Supabase Dashboard

1. 進入 **Authentication** > **Users**
2. 點擊 **Add User** > **Create new user**
3. 輸入：
   - Email: 你的管理員郵箱
   - Password: 設置一個強密碼
   - Auto Confirm User: ✅ 勾選
4. 點擊 **Create User**

### 方法 2：通過應用註冊（然後手動升級為管理員）

1. 訪問 `/login` 頁面
2. 點擊「註冊」（如果有的話）或使用 Supabase Dashboard 創建用戶
3. 在 Supabase Dashboard 的 SQL Editor 中執行：

```sql
-- 將用戶升級為管理員（替換 'your-email@example.com' 為實際郵箱）
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

## 第四步：創建業務帳號

### 方法 1：通過 Supabase Dashboard

1. 進入 **Authentication** > **Users**
2. 點擊 **Add User** > **Create new user**
3. 輸入業務的郵箱和密碼
4. 點擊 **Create User**

新用戶會自動獲得 `salesperson` 角色（由觸發器自動設置）

### 方法 2：讓業務自己註冊（如果啟用了公開註冊）

如果啟用了公開註冊，業務可以：
1. 訪問 `/login` 頁面
2. 註冊新帳號
3. 自動獲得 `salesperson` 角色

## 第五步：測試登入

1. 訪問應用首頁
2. 應該會自動重定向到 `/login`
3. 使用管理員帳號登入
4. 應該能看到導航欄顯示用戶信息和「登出」按鈕

## 權限說明

### 業務 (salesperson)
- ✅ 查看所有分析結果
- ✅ 新增分析結果
- ✅ 編輯分析結果
- ✅ 查看統計資料
- ❌ 刪除分析結果（僅管理員）

### 管理員 (admin)
- ✅ 所有業務權限
- ✅ 刪除分析結果
- ✅ 批量刪除分析結果

## 常見問題

### Q: 如何重置用戶密碼？
A: 在 Supabase Dashboard > Authentication > Users 中，點擊用戶右側的「...」> Reset Password

### Q: 如何修改用戶角色？
A: 在 Supabase Dashboard 的 SQL Editor 中執行：
```sql
UPDATE user_profiles
SET role = 'admin'  -- 或 'salesperson'
WHERE email = 'user@example.com';
```

### Q: 如何刪除用戶？
A: 在 Supabase Dashboard > Authentication > Users 中刪除用戶，相關的 `user_profiles` 記錄會自動刪除（CASCADE）

### Q: 登入後還是被重定向到登入頁面？
A: 檢查：
1. Supabase 環境變數是否正確設置
2. `user_profiles` 表是否已創建
3. 瀏覽器控制台是否有錯誤

## 安全建議

1. **定期更新密碼**：建議業務每 3 個月更新一次密碼
2. **使用強密碼**：至少 8 個字符，包含大小寫字母、數字和特殊字符
3. **限制管理員數量**：只給需要的人管理員權限
4. **監控異常活動**：定期檢查 Supabase Dashboard 中的用戶活動日誌

