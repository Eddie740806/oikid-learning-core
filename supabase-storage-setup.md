# Supabase Storage 設定指南

## 步驟 1：建立 Storage Bucket

1. 前往 Supabase Dashboard：https://supabase.com/dashboard
2. 選擇你的專案（oikid-learning-core）
3. 點擊左側選單的 **Storage**
4. 點擊 **New bucket**
5. 填寫：
   - **Name**: `recordings`
   - **Public bucket**: ✅ 勾選（讓檔案可以公開訪問）
6. 點擊 **Create bucket**

## 步驟 2：設定 Bucket 政策（允許上傳）

1. 在 Storage 頁面，點擊 `recordings` bucket
2. 點擊 **Policies** 標籤
3. 點擊 **New Policy**
4. 選擇 **Create a policy from scratch**
5. 設定如下：

### Policy 1: 允許上傳（INSERT）
- **Policy name**: `Allow public uploads`
- **Allowed operation**: `INSERT`
- **Policy definition**:
  ```sql
  (bucket_id = 'recordings'::text)
  ```
- **Target roles**: `anon` 和 `authenticated`

### Policy 2: 允許讀取（SELECT）
- **Policy name**: `Allow public read`
- **Allowed operation**: `SELECT`
- **Policy definition**:
  ```sql
  (bucket_id = 'recordings'::text)
  ```
- **Target roles**: `anon` 和 `authenticated`

## 快速設定（使用 SQL）

或者，你可以在 SQL Editor 執行以下 SQL：

```sql
-- 建立 bucket（如果不存在）
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

-- 允許所有人上傳檔案
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'recordings');

-- 允許所有人讀取檔案
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'recordings');
```

## 完成後

設定完成後，檔案上傳功能就可以正常使用了！

