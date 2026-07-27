import { useState } from 'react'
import { API, apiRequest } from '../api'

interface AISummaryProps {
  canteenId: number
}

export default function AISummary({ canteenId }: AISummaryProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setSummary(null)

    try {
      const res = await apiRequest<{ summary: string }>(API.ai.summarizeReviews, 'POST', { canteen_id: canteenId })
      setSummary(res.data.summary)
    } catch (err: any) {
      setError(err?.message || '生成失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-t border-gray-100 pt-4">
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
          loading
            ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
            : summary
              ? 'bg-purple-50 text-purple-600 hover:bg-purple-100'
              : 'bg-purple-50 text-purple-600 hover:bg-purple-100 active:bg-purple-200'
        }`}
      >
        {/* AI 图标 */}
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
        {loading ? 'AI 总结中...' : summary ? '重新生成 AI 总结' : 'AI 总结'}
      </button>

      {/* 加载中状态 */}
      {loading && (
        <div className="mt-3 bg-purple-50/80 rounded-lg p-4 animate-pulse">
          <div className="h-3 w-3/4 bg-purple-200 rounded mb-2" />
          <div className="h-3 w-1/2 bg-purple-200 rounded" />
        </div>
      )}

      {/* 错误提示 */}
      {error && !loading && (
        <div className="mt-3 bg-red-50 rounded-lg p-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* 结果展示 */}
      {summary && !loading && (
        <div className="mt-3 bg-purple-50/60 rounded-lg p-4 border border-purple-100">
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="text-xs font-semibold text-purple-700">AI 总结</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  )
}