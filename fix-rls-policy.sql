-- 修復 RLS 政策，確保用戶可以查詢自己的 profile
-- 在 Supabase Dashboard 的 SQL Editor 中執行

-- 1. 檢查現有的 RLS 政策
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- 2. 刪除可能衝突的政策（如果需要）
-- DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
-- DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- 3. 創建更寬鬆的查詢政策（允許所有已認證用戶查看所有 profile）
-- 這樣可以確保 Navbar 和 API 路由都能查詢到角色信息
CREATE POLICY "Authenticated users can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. 確保用戶可以更新自己的 profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. 驗證政策已創建
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

