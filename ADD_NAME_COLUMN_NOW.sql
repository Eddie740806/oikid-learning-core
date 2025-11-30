-- 立即添加 name 欄位到 user_profiles 表
-- 在 Supabase Dashboard 的 SQL Editor 中執行此腳本

-- 添加 name 欄位（如果不存在）
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS name TEXT;

-- 更新現有用戶的 name（如果為空，使用 email）
UPDATE user_profiles
SET name = COALESCE(name, email)
WHERE name IS NULL OR name = '';

-- 驗證
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'name';

