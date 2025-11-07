-- 新增客戶名字欄位到 analyses 資料表
ALTER TABLE analyses 
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- 新增錄音檔 URL 欄位到 analyses 資料表
ALTER TABLE analyses 
ADD COLUMN IF NOT EXISTS recording_file_url TEXT;

-- 建立索引（可選）
CREATE INDEX IF NOT EXISTS idx_analyses_customer_name ON analyses(customer_name);

