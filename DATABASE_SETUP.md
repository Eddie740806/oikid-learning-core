# 數據庫設置說明

## 重要：表結構不匹配問題

Comet 創建的表結構與我們設計的不同。我們的代碼使用的是以下表結構：

- `user_activity_logs` - 用戶活動日誌表
- `login_sessions` - 登入會話表
- `user_profiles` - 用戶資料表（需要擴展）

但 Comet 創建的是：
- `admin_activity_logs` - 這與我們的代碼不匹配
- `admin_sessions` - 這與我們的代碼不匹配
- `admin_users` - 這與我們的代碼不匹配

## 解決方案

請在 Supabase Dashboard 的 SQL Editor 中執行 `supabase-admin-tracking.sql` 腳本。

這個腳本會：
1. 擴展 `user_profiles` 表（添加 `last_login_at`, `last_activity_at`, `is_active`）
2. 創建 `user_activity_logs` 表
3. 創建 `login_sessions` 表
4. 設置 RLS 政策和索引
5. 創建自動更新觸發器

## 執行步驟

1. 登入 Supabase Dashboard
2. 進入 SQL Editor
3. 複製 `supabase-admin-tracking.sql` 文件的全部內容
4. 貼上到 SQL Editor
5. 點擊執行（Run）

## 驗證

執行完成後，你應該能在 Supabase Table Editor 中看到：
- `user_activity_logs` 表
- `login_sessions` 表
- `user_profiles` 表（應該有新的欄位：`last_login_at`, `last_activity_at`, `is_active`）

## 注意

如果 Comet 創建的表（`admin_activity_logs`, `admin_sessions`, `admin_users`）沒有被使用，你可以選擇：
1. 保留它們（不會影響功能）
2. 或者刪除它們（在 Supabase Dashboard 中手動刪除）

