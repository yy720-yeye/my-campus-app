import { useState, useEffect, useCallback, useRef } from 'react'
import RatingStars from '../components/RatingStars'
import ReviewForm from '../components/ReviewForm'
import { API, apiRequest, buildUrl } from '../api'

interface Canteen {
  id: number
  name: string
  location: string
  rating: number
  tags: string[]
  image: string
}

interface Review {
  id: number
  user_id: number
  canteen_id: number
  rating: number
  content: string
  created_at: string
  username: string
}

const allTags = ['全部', '第一食堂', '第二食堂', '第三食堂', '教工食堂']

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
      <div className="h-40 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>
        <div className="h-4 w-36 bg-gray-200 rounded" />
        <div className="flex gap-1.5">
          <div className="h-5 w-14 bg-gray-200 rounded-full" />
          <div className="h-5 w-14 bg-gray-200 rounded-full" />
          <div className="h-5 w-14 bg-gray-200 rounded-full" />
        </div>
        <div className="h-3 w-20 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

// ============================================================
// Toast 提示组件
// ============================================================
interface ToastProps {
  message: string
  type: 'success' | 'error'
  visible: boolean
}

function Toast({ message, type, visible }: ToastProps) {
  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg text-white text-sm font-medium shadow-lg transition-all duration-300 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
      } ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {message}
      </div>
    </div>
  )
}

export default function CanteenPage() {
  const [canteens, setCanteens] = useState<Canteen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('全部')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  // ---------- AI 总结状态 ----------
  const [aiLoadingId, setAiLoadingId] = useState<number | null>(null)
  const [aiSummaries, setAiSummaries] = useState<Record<number, string>>({})
  const [aiErrors, setAiErrors] = useState<Record<number, string>>({})

  // ---------- Toast 状态 ----------
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type, visible: true })
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 3000)
  }

  // ---------- 获取食堂列表 ----------
  const fetchCanteens = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await apiRequest<Canteen[]>(API.canteens, 'GET')
      setCanteens(res.data)
      setLoading(false)
    } catch {
      setError(true)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCanteens()
  }, [fetchCanteens])

  // ---------- 获取评价列表 ----------
  const fetchReviews = useCallback(async (canteenId: number) => {
    setReviewsLoading(true)
    try {
      const url = buildUrl(API.reviews, { canteen_id: canteenId })
      const res = await apiRequest<{ reviews: Review[] }>(url, 'GET')
      setReviews(res.data.reviews)
    } catch {
      setReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }, [])

  // ---------- 展开卡片时加载评价 ----------
  const handleCardClick = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null)
      setReviews([])
    } else {
      setExpandedId(id)
      fetchReviews(id)
    }
  }

  // ---------- 评价提交成功 ----------
  const handleReviewSuccess = (canteenId: number) => {
    fetchReviews(canteenId)
  }

  // ---------- AI 总结 ----------
  const handleAISummary = async (canteenId: number) => {
    // 检查是否已缓存
    if (aiSummaries[canteenId]) return
    // 防止重复请求
    if (aiLoadingId === canteenId) return

    // 检查登录状态
    const token = localStorage.getItem('token')
    if (!token) {
      showToast('请先登录', 'error')
      return
    }

    setAiLoadingId(canteenId)
    setAiErrors((prev) => ({ ...prev, [canteenId]: '' }))

    try {
      const res = await apiRequest<{ summary: string }>(API.ai.summarizeReviews, 'POST', { canteen_id: canteenId })
      setAiSummaries((prev) => ({ ...prev, [canteenId]: res.data.summary }))
    } catch {
      showToast('AI总结失败，请稍后重试', 'error')
    } finally {
      setAiLoadingId(null)
    }
  }

  // ---------- 搜索筛选 ----------
  const filtered = canteens.filter((canteen) => {
    const keyword = search.trim().toLowerCase()
    const matchKeyword =
      !keyword ||
      canteen.name.toLowerCase().includes(keyword) ||
      canteen.location.toLowerCase().includes(keyword)

    const matchTag = activeTag === '全部' || canteen.name === activeTag

    return matchKeyword && matchTag
  })

  // ---------- Loading 状态：骨架屏 ----------
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">食堂点评</h1>
        <p className="text-gray-500 mb-8">看看同学们都在吃什么</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">食堂点评</h1>
        <p className="text-gray-500 mb-8">看看同学们都在吃什么</p>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-lg text-gray-600 mb-2">加载失败，请检查网络连接</p>
          <p className="text-sm text-gray-400 mb-6">无法获取食堂数据</p>
          <button
            type="button"
            onClick={fetchCanteens}
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
    <>
      {/* Toast */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">食堂点评</h1>
        <p className="text-gray-500 mb-8">看看同学们都在吃什么</p>

        {/* 搜索框 */}
        <div className="relative mb-6">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="搜索食堂名称或位置"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow"
          />
        </div>

        {/* 分类标签 */}
        <div className="flex flex-wrap gap-2 mb-8">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTag === tag
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* 食堂卡片列表 */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">没有找到匹配的食堂</p>
            <p className="text-sm mt-1">试试其他关键词或标签</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((canteen) => {
              const isExpanded = expandedId === canteen.id
              const hasCachedSummary = !!aiSummaries[canteen.id]

              return (
                <div
                  key={canteen.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  {/* 点击区域：卡片主体 */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCardClick(canteen.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(canteen.id) }}
                    className="w-full text-left cursor-pointer"
                  >
                    {/* 图片占位 */}
                    <div className="h-40 bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                      <span className="text-5xl">🍽️</span>
                    </div>
                    <div className="p-5">
                      {/* 名称 + 评分 */}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-800">{canteen.name}</h3>
                        <RatingStars rating={canteen.rating} readonly />
                      </div>
                      {/* 位置 */}
                      <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
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
                        {canteen.location}
                      </p>
                      {/* 标签 */}
                      <div className="flex flex-wrap gap-1.5">
                        {canteen.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {/* 展开提示 */}
                      <div className="mt-3 flex items-center text-xs text-gray-400">
                        <span>{isExpanded ? '收起评价' : '查看评价'}</span>
                        <svg
                          className={`w-3.5 h-3.5 ml-1 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* 展开的评价区域 */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                      {/* ====== AI 评价总结 ====== */}
                      <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                        {/* 顶部标题 + 按钮 */}
                        <div className="flex items-center justify-between mb-2">
                          {hasCachedSummary ? (
                            <span className="text-sm font-semibold text-purple-800">📊 AI评价总结</span>
                          ) : (
                            <span className="text-xs text-purple-500">让AI帮你分析评价</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAISummary(canteen.id)}
                            disabled={aiLoadingId === canteen.id || hasCachedSummary}
                            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                              aiLoadingId === canteen.id
                                ? 'bg-purple-300 text-white cursor-not-allowed'
                                : hasCachedSummary
                                  ? 'bg-purple-200 text-purple-500 cursor-default'
                                  : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 shadow-sm'
                            }`}
                          >
                            {aiLoadingId === canteen.id ? (
                              <>
                                <svg
                                  className="animate-spin w-4 h-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                分析中...
                              </>
                            ) : (
                              <>🤖 AI总结</>
                            )}
                          </button>
                        </div>

                        {/* 加载骨架屏 */}
                        {aiLoadingId === canteen.id && (
                          <div className="space-y-2.5 mt-3">
                            <div className="h-3 w-full bg-purple-200/70 rounded animate-pulse" />
                            <div className="h-3 w-5/6 bg-purple-200/70 rounded animate-pulse" />
                            <div className="h-3 w-4/6 bg-purple-200/70 rounded animate-pulse" />
                          </div>
                        )}

                        {/* 结果展示 */}
                        {hasCachedSummary && (
                          <div className="mt-3 space-y-3">
                            {/* 三行总结 */}
                            {(() => {
                              const lines = aiSummaries[canteen.id].split('\n').filter(Boolean)
                              const labels = ['整体口碑', '推荐菜品', '价格水平']
                              return (
                                <div className="space-y-2">
                                  {lines.map((line, i) => {
                                    const label = labels[i] || `要点${i + 1}`
                                    // 尝试从行中提取冒号后的内容
                                    const colonIdx = line.indexOf('：')
                                    const displayText = colonIdx !== -1 ? line.slice(colonIdx + 1).trim() : line
                                    return (
                                      <div key={i} className="flex items-start gap-2">
                                        <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded shrink-0 mt-0.5">
                                          {label}
                                        </span>
                                        <span className="text-sm text-gray-700 leading-relaxed">{displayText}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })()}
                            {/* 底部提示 */}
                            <p className="text-[10px] text-gray-400 text-right mt-2">由AI生成，仅供参考</p>
                          </div>
                        )}
                      </div>

                      {/* ====== ReviewForm 集成 ====== */}
                      <ReviewForm
                        canteenId={canteen.id}
                        onSubmitSuccess={() => handleReviewSuccess(canteen.id)}
                      />

                      {/* 历史评价列表 */}
                      {reviewsLoading ? (
                        <div className="space-y-3 pt-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            历史评价
                          </p>
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-3 animate-pulse">
                              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                              <div className="h-3 w-full bg-gray-200 rounded" />
                            </div>
                          ))}
                        </div>
                      ) : reviews.length > 0 ? (
                        <div className="space-y-3 pt-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            历史评价
                          </p>
                          {reviews.map((review) => (
                            <div key={review.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">
                                  {review.username}
                                </span>
                                <span className="text-xs text-gray-400">{review.created_at?.slice(0, 10)}</span>
                              </div>
                              <RatingStars rating={review.rating} readonly />
                              <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                                {review.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-3">暂无评价</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}