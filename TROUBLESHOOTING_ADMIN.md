# 後台管理系統故障排除

## 問題：Cannot GET /admin/dashboard

### 解決方案

1. **停止開發服務器**
   - 在終端中按 `Ctrl+C` 停止當前運行的開發服務器

2. **清除 Next.js 緩存**
   ```bash
   rm -rf .next
   ```

3. **重新啟動開發服務器**
   ```bash
   npm run dev
   ```

4. **等待編譯完成**
   - 等待終端顯示 "Ready" 或 "compiled successfully"
   - 通常會顯示類似：`○ /admin/dashboard` 的路由列表

5. **重新訪問頁面**
   - 訪問：`http://localhost:3000/admin/dashboard`
   - 確保你已經以管理員身份登入

### 如果問題仍然存在

1. **檢查是否已登入**
   - 確保你已經登入系統
   - 確保你的帳號角色是 `admin`

2. **檢查瀏覽器控制台**
   - 按 `F12` 打開開發者工具
   - 查看 Console 標籤是否有錯誤訊息

3. **檢查終端輸出**
   - 查看開發服務器的終端輸出
   - 確認是否有編譯錯誤或警告

4. **驗證文件結構**
   ```bash
   ls -la src/app/admin/dashboard/
   ```
   - 應該看到 `page.tsx` 文件

5. **重新構建項目**
   ```bash
   npm run build
   ```
   - 檢查構建是否成功
   - 確認路由列表中包含 `/admin/dashboard`

### 常見問題

**Q: 為什麼會出現 "Cannot GET" 錯誤？**
A: 通常是因為：
- 開發服務器沒有檢測到新文件
- Next.js 緩存問題
- 路由文件有語法錯誤（但我們已經檢查過，沒有錯誤）

**Q: 路由已註冊但還是無法訪問？**
A: 可能是：
- 需要清除瀏覽器緩存（Cmd+Shift+R 或 Ctrl+Shift+R）
- 需要確保已登入且為管理員角色

