-- 檢查用戶角色的 SQL 腳本
-- 在 Supabase Dashboard 的 SQL Editor 中執行

-- 1. 檢查用戶是否存在於 user_profiles 表
SELECT 
  up.id,
  up.email,
  up.role,
  up.name,
  au.email as auth_email
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE up.email = 'eddie740806@gmail.com' OR au.email = 'eddie740806@gmail.com';

-- 2. 如果角色不是 admin，更新為 admin
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'eddie740806@gmail.com'
  AND (role IS NULL OR role != 'admin');

-- 3. 如果用戶不存在於 user_profiles，需要手動創建
-- 首先找到 auth.users 中的用戶 ID
SELECT id, email FROM auth.users WHERE email = 'eddie740806@gmail.com';

-- 然後使用上面的 ID 創建 user_profiles 記錄（替換 <user-id> 為實際的 ID）
-- INSERT INTO user_profiles (id, email, role, name)
-- VALUES ('<user-id>', 'eddie740806@gmail.com', 'admin', '管理員')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 4. 驗證更新結果
SELECT * FROM user_profiles WHERE email = 'eddie740806@gmail.com';

