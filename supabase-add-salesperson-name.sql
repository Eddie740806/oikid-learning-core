-- 新增業務名欄位到 analyses 資料表
ALTER TABLE analyses 
ADD COLUMN IF NOT EXISTS salesperson_name TEXT;

-- 建立索引（可選）
CREATE INDEX IF NOT EXISTS idx_analyses_salesperson_name ON analyses(salesperson_name);

