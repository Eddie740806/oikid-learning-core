-- 建立 recordings 資料表（錄音檔資訊）
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  duration_seconds INTEGER,
  uploaded_by TEXT,
  notes TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' -- pending, analyzed, archived
);

-- 建立 analyses 資料表（分析結果）
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recording_id UUID REFERENCES recordings(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  analysis_text TEXT NOT NULL, -- Gemini 分析結果的文字內容
  analysis_json JSONB, -- 結構化的分析結果（可選）
  transcript TEXT, -- 逐字稿（如果有）
  key_points TEXT[], -- 關鍵要點
  suggestions TEXT[], -- 改善建議
  score INTEGER, -- 評分（可選）
  tags TEXT[], -- 標籤
  notes TEXT, -- 備註
  analyzed_by TEXT, -- 分析者（gemini, manual等）
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立 summary_analyses 資料表（總分析結果）
CREATE TABLE IF NOT EXISTS summary_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  analysis_ids UUID[] NOT NULL, -- 關聯的 analyses id 陣列
  summary_text TEXT NOT NULL, -- Gemini 總分析的結果
  summary_json JSONB, -- 結構化的總分析結果
  key_insights TEXT[], -- 關鍵洞察
  trends TEXT[], -- 趨勢分析
  recommendations TEXT[], -- 整體建議
  analyzed_by TEXT DEFAULT 'gemini',
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_recordings_customer_id ON recordings(customer_id);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);

CREATE INDEX IF NOT EXISTS idx_analyses_recording_id ON analyses(recording_id);
CREATE INDEX IF NOT EXISTS idx_analyses_customer_id ON analyses(customer_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at);

CREATE INDEX IF NOT EXISTS idx_summary_analyses_created_at ON summary_analyses(created_at);

-- 啟用 Row Level Security
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE summary_analyses ENABLE ROW LEVEL SECURITY;

-- 建立 RLS Policies for recordings
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON recordings;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON recordings;

CREATE POLICY "Allow all operations for authenticated users" 
ON recordings 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations for anon users" 
ON recordings 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- 建立 RLS Policies for analyses
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON analyses;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON analyses;

CREATE POLICY "Allow all operations for authenticated users" 
ON analyses 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations for anon users" 
ON analyses 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- 建立 RLS Policies for summary_analyses
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON summary_analyses;
DROP POLICY IF EXISTS "Allow all operations for anon users" ON summary_analyses;

CREATE POLICY "Allow all operations for authenticated users" 
ON summary_analyses 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations for anon users" 
ON summary_analyses 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

