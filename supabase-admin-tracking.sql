-- 後台管理系統與活動追蹤數據庫設置
-- 這個腳本需要在 Supabase Dashboard 的 SQL Editor 中執行

-- 1. 擴展 user_profiles 表
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. 創建用戶活動日誌表
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'login', 'logout', 'page_view', 'action'
  page_path TEXT, -- 訪問的頁面路徑
  action TEXT, -- 具體操作（如 'view_analysis', 'edit_analysis', 'delete_analysis'）
  metadata JSONB, -- 額外資訊（如分析ID、停留時間等）
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 創建登入會話表
CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true
);

-- 4. 創建索引以提升查詢性能
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_page_path ON user_activity_logs(page_path);

CREATE INDEX IF NOT EXISTS idx_login_sessions_user_id ON login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_login_at ON login_sessions(login_at);
CREATE INDEX IF NOT EXISTS idx_login_sessions_is_active ON login_sessions(is_active);

-- 5. 啟用 Row Level Security (RLS)
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

-- 6. 創建 RLS 政策：只有管理員可以查看所有活動記錄
CREATE POLICY "Admins can view all activity logs"
  ON user_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- 7. 創建 RLS 政策：用戶可以查看自己的活動記錄
CREATE POLICY "Users can view own activity logs"
  ON user_activity_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 8. 創建 RLS 政策：所有已登入用戶都可以插入自己的活動記錄
CREATE POLICY "Users can insert own activity logs"
  ON user_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 9. 創建 RLS 政策：只有管理員可以查看所有登入會話
CREATE POLICY "Admins can view all login sessions"
  ON login_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- 10. 創建 RLS 政策：用戶可以查看自己的登入會話
CREATE POLICY "Users can view own login sessions"
  ON login_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 11. 創建 RLS 政策：所有已登入用戶都可以插入自己的登入會話
CREATE POLICY "Users can insert own login sessions"
  ON login_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 12. 創建 RLS 政策：用戶可以更新自己的登入會話（用於登出）
CREATE POLICY "Users can update own login sessions"
  ON login_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 13. 創建函數：更新用戶最後活動時間
CREATE OR REPLACE FUNCTION update_user_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET last_activity_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. 創建觸發器：當有活動記錄時自動更新用戶最後活動時間
CREATE TRIGGER on_activity_log_created
  AFTER INSERT ON user_activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_activity();

-- 15. 創建函數：更新用戶最後登入時間
CREATE OR REPLACE FUNCTION update_user_last_login()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activity_type = 'login' THEN
    UPDATE user_profiles
    SET last_login_at = NEW.created_at,
        last_activity_at = NEW.created_at
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. 創建觸發器：當有登入活動時自動更新用戶最後登入時間
CREATE TRIGGER on_login_activity
  AFTER INSERT ON user_activity_logs
  FOR EACH ROW
  WHEN (NEW.activity_type = 'login')
  EXECUTE FUNCTION update_user_last_login();

