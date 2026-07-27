import { useState, useEffect } from 'react'
import LostFoundForm from '../components/LostFoundForm'
import { API, apiRequest } from '../api'

interface LostItem {
  id: number
  type: '丢失' | '捡到'
  title: string
  location: string
  date: string
  description: string
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-16 bg-gray-200 rounded-full" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
        </div>
        <div className="h-5 w-40 bg-gray-200 rounded" />
        <div className="h-4 w-52 bg-gray-200 rounded" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

export default function LostFoundPage() {
  const [items, setItems] = useState<LostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const fetchItems = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await apiRequest<{ items: LostItem[] }>(API.lostFound, 'GET')
      setItems(res.data.items)
      setLoading(false)
    } catch {
      setError(true)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  // ---------- 表单提交成功回调 ----------
  const handleFormSuccess = () => {
    setShowForm(false)
    fetchItems()
  }

  // ---------- Loading 状态：骨架屏 ----------
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">失物招领</h1>
        <p className="text-gray-500 mb-8">发布和查找失物，互帮互助暖校园</p>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  // ---------- Error 状态：错误提示 + 重试 ----------
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">失物招领</h1>
        <p className="text-gray-500 mb-8">发布和查找失物，互帮互助暖校园</p>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-lg text-gray-600 mb-2">加载失败，请检查网络连接</p>
          <p className="text-sm text-gray-400 mb-6">无法获取失物招领数据</p>
          <button
            type="button"
            onClick={fetchItems}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重新加载
          </button>
        </div>
      </div>
    )
  }

  // ---------- Success 状态：正常显示 ----------
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* 头部：标题 + 发布按钮 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">失物招领</h1>
          <p className="text-gray-500">发布和查找失物，互帮互助暖校园</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          发布信息
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">暂无失物招领信息</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <div className="p-5">
                {/* 顶部：类型标签 + 时间 */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-medium ${
                      item.type === '丢失'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-green-50 text-green-600'
                    }`}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {item.type === '丢失' ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      )}
                    </svg>
                    {item.type}
                  </span>
                  <span className="text-xs text-gray-400">{item.date}</span>
                </div>

                {/* 标题 */}
                <h3 className="text-base font-semibold text-gray-800 mb-2">{item.title}</h3>

                {/* 地点 */}
                <p className="text-sm text-gray-500 flex items-center gap-1 mb-1">
                  <svg
                    className="w-4 h-4 text-gray-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {item.location}
                </p>

                {/* 描述 */}
                {item.description && (
                  <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ====== 发布信息模态框 ====== */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          {/* 遮罩层 */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          {/* 模态框内容 */}
          <div className="relative z-50 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-800">发布信息</h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <LostFoundForm onSuccess={handleFormSuccess} />
          </div>
        </div>
      )}
    </div>
  )
}