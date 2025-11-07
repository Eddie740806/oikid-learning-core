-- 建立 customers 資料表
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  display_name TEXT,
  phone TEXT,
  contact_key TEXT,
  source TEXT,
  grade TEXT,
  english_level TEXT,
  tags TEXT,
  confidence TEXT,
  notes TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE
);

-- 建立索引（可選，但建議）
CREATE INDEX IF NOT EXISTS idx_customers_contact_key ON customers(contact_key);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- 啟用 Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 先刪除現有政策（如果存在）
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON customers;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON customers;

-- 建立允許所有操作的 Policy（開發階段，之後可調整）
CREATE POLICY "Allow all operations for authenticated users" 
ON customers 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 允許匿名訪問（用於 API 端點）
CREATE POLICY "Allow all operations for anon users" 
ON customers 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

