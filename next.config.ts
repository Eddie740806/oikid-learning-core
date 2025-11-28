import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 注意：Next.js 16 App Router 中，檔案上傳大小限制由 Vercel 或部署環境控制
  // 在 API 路由中使用 export const maxDuration 來設定超時時間
};

export default nextConfig;
