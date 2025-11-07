-- 新增客戶畫像欄位到 analyses 資料表
ALTER TABLE analyses 
ADD COLUMN IF NOT EXISTS customer_profile TEXT;

