-- 新增四個新的分析欄位到 analyses 資料表
ALTER TABLE analyses 
ADD COLUMN IF NOT EXISTS performance_analysis TEXT, -- 業務表現深度分析
ADD COLUMN IF NOT EXISTS highlights_improvements TEXT, -- 亮點與改進點
ADD COLUMN IF NOT EXISTS improvement_suggestions TEXT, -- 具體改善建議
ADD COLUMN IF NOT EXISTS score_tags TEXT; -- 評分與標籤

-- 注意：原本的 analysis_text 欄位保留，但新的表單會使用新的欄位結構

