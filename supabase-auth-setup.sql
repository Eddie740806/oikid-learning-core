-- Supabase Auth 設置腳本
-- 這個腳本需要在 Supabase Dashboard 的 SQL Editor 中執行

-- 1. 創建用戶角色表（擴展 auth.users 表）
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'salesperson', -- 'salesperson' 或 'admin'
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 啟用 Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. 創建 RLS 政策：用戶可以查看自己的資料
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 4. 創建 RLS 政策：用戶可以更新自己的資料
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 5. 創建函數：自動創建用戶資料（當用戶註冊時）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, name)
  VALUES (
    NEW.id,
    NEW.email,
    'salesperson', -- 默認角色為業務
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 創建觸發器：當新用戶註冊時自動創建資料
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. 為 analyses 表添加 RLS（可選，如果需要基於用戶的數據隔離）
-- 如果所有業務都可以看到所有數據，可以跳過這一步
-- ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view all analyses"
--   ON analyses
--   FOR SELECT
--   USING (true);

-- 8. 創建索引以提升查詢性能
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

