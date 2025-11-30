'use client'

import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";

export default function Home() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="max-w-4xl mx-auto py-16 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-black dark:text-zinc-50 mb-4">
            Oikid Learning Core
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            AI 自學模組 + 業務通話學習系統
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/analyses"
            className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-zinc-200 dark:border-zinc-800"
          >
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
              分析結果
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              查看和管理所有錄音檔分析結果
            </p>
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              查看列表 →
            </span>
          </Link>

          <Link
            href="/analyses/new"
            className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-zinc-200 dark:border-zinc-800"
          >
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
              新增分析
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              將 Gemini 的分析結果貼上並儲存
            </p>
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              開始新增 →
            </span>
          </Link>

          <Link
            href="/analyses/stats"
            className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow hover:shadow-lg transition-shadow border border-zinc-200 dark:border-zinc-800"
          >
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
              統計儀表板
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              查看分析結果的整體統計資料
            </p>
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              查看統計 →
            </span>
          </Link>

        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
