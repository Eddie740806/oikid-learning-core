-- 修復所有缺失的欄位
-- 在 Supabase Dashboard 的 SQL Editor 中執行此腳本

-- 1. 添加 name 欄位到 user_profiles（如果不存在）
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. 確保 user_activity_logs 表有所有必要的欄位
DO $$ 
BEGIN
    -- 添加 action 欄位（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_activity_logs' AND column_name = 'action'
    ) THEN
        ALTER TABLE user_activity_logs ADD COLUMN action TEXT;
    END IF;
    
    -- 添加 page_path 欄位（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_activity_logs' AND column_name = 'page_path'
    ) THEN
        ALTER TABLE user_activity_logs ADD COLUMN page_path TEXT;
    END IF;
    
    -- 添加 metadata 欄位（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_activity_logs' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE user_activity_logs ADD COLUMN metadata JSONB;
    END IF;
    
    -- 添加 ip_address 欄位（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_activity_logs' AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE user_activity_logs ADD COLUMN ip_address TEXT;
    END IF;
    
    -- 添加 user_agent 欄位（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_activity_logs' AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE user_activity_logs ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- 3. 更新現有用戶的 name（如果為空，使用 email）
UPDATE user_profiles
SET name = COALESCE(name, email)
WHERE name IS NULL OR name = '';

-- 4. 驗證所有欄位
SELECT 
    'user_profiles' as table_name,
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
    AND column_name IN ('name', 'last_login_at', 'last_activity_at', 'is_active')
ORDER BY column_name;

SELECT 
    'user_activity_logs' as table_name,
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'user_activity_logs' 
    AND column_name IN ('action', 'page_path', 'activity_type', 'metadata', 'ip_address', 'user_agent')
ORDER BY column_name;

