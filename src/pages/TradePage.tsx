import { useState, useEffect, useRef } from 'react'
import PostItemForm from '../components/PostItemForm'
import { API, apiRequest, buildUrl } from '../api'

interface Item {
  id: number
  title: string
  price: number
  category: string
  username: string
  image: string
}

const categories = ['全部', '教材', '电子', '生活', '其他']

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-14 bg-gray-200 rounded-full" />
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
        <div className="flex items-center justify-between">
          <div className="h-5 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-14 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}

export default function TradePage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [searchKeyword, setSearchKeyword] = useState('')
  const [activeCategory, setActiveCategory] = useState('全部')
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [animatingId, setAnimatingId] = useState<number | null>(null)

  // ---------- Modal 状态 ----------
  const [showForm, setShowForm] = useState(false)

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

  const fetchItems = async () => {
    setLoading(true)
    setError(false)
    try {
      // 传递搜索关键词和分类筛选参数到后端
      const params: Record<string, string | number> = { status: 'active' }
      if (searchKeyword.trim()) {
        params.keyword = searchKeyword.trim()
      }
      if (activeCategory !== '全部') {
        params.category = activeCategory
      }
      const url = buildUrl(API.items, params)
      const res = await apiRequest<{ items: Item[] }>(url, 'GET')
      setItems(res.data.items)
      setLoading(false)
    } catch {
      setError(true)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [activeCategory, searchKeyword])

  // 前端本地搜索过滤（仅当后端不支持下，保留前端搜索能力）
  // 当前已通过 category 参数交给后端处理

  const toggleFavorite = (id: number) => {
    setAnimatingId(id)
    setTimeout(() => setAnimatingId(null), 300)

    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // ---------- 发布商品成功回调 ----------
  const handlePostSuccess = () => {
    setShowForm(false)
    showToast('发布成功！', 'success')
    // 重新从后端获取最新商品列表
    fetchItems()
  }

  // ---------- Loading 状态：骨架屏 ----------
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">二手交易</h1>
        <p className="text-gray-500 mb-8">校园闲置物品，绿色环保省钱</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">二手交易</h1>
        <p className="text-gray-500 mb-8">校园闲置物品，绿色环保省钱</p>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-lg text-gray-600 mb-2">加载失败，请检查网络连接</p>
          <p className="text-sm text-gray-400 mb-6">无法获取商品数据</p>
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
    <>
      {/* Toast */}
      <div
        className={`fixed top-5 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-lg text-white text-sm font-medium shadow-lg transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } ${
          toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">二手交易</h1>
        <p className="text-gray-500 mb-8">校园闲置物品，绿色环保省钱</p>

        {/* 搜索框 */}
        <div className="relative mb-4">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索商品名称..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 text-sm rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow"
          />
          {searchKeyword && (
            <button
              type="button"
              onClick={() => setSearchKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 分类筛选 + 发布商品按钮 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            发布商品
          </button>
        </div>

        {/* 商品列表 */}
        {items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">该分类下暂无商品</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => {
              const isFav = favorites.has(item.id)
              const isAnimating = animatingId === item.id

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 relative"
                >
                  {/* 收藏按钮 */}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item.id)}
                    className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-all duration-200 ${
                      isAnimating ? 'scale-125' : 'scale-100'
                    }`}
                  >
                    {isFav ? (
                      <svg
                        className="w-5 h-5 text-red-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    )}
                  </button>

                  {/* 商品图片 */}
                  <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                    <span className="text-5xl opacity-60">
                      {item.category === '教材' ? '📚' : item.category === '电子' ? '💡' : item.category === '生活' ? '🏸' : '🔒'}
                    </span>
                  </div>

                  {/* 商品信息 */}
                  <div className="p-4">
                    {/* 分类标签 */}
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full mb-2">
                      {item.category}
                    </span>

                    {/* 标题 */}
                    <div className="flex items-start gap-1">
                      <h3 className="text-sm font-semibold text-gray-800 mb-2 line-clamp-2 min-h-[2.5rem] flex-1">
                        {item.title}
                      </h3>
                    </div>

                    {/* 价格 + 卖家 */}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-red-500">¥{item.price}</span>
                      <span className="text-xs text-gray-400">{item.username}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ====== Modal 弹窗 ====== */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />

          {/* Modal 内容 */}
          <div className="relative z-10 w-full max-w-[680px] mx-4 my-8 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* Modal 头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">发布二手商品</h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal 主体 */}
              <div className="px-6 py-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
                <PostItemForm
                  onSuccess={handlePostSuccess}
                  onCancel={() => setShowForm(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}