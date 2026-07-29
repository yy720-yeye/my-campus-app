import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { API, apiRequest } from '../api'

// ============================================================
// 类型定义
// ============================================================
interface UserStats {
  activeItems: number
  soldItems: number
  lostPosts: number
  foundPosts: number
  reviews: number
}

interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar: string | null
  created_at: string
  stats: UserStats
}

interface UserItem {
  id: number
  title: string
  price: number
  category: string
  description: string
  status: string
  created_at: string
}

interface UserLostFound {
  id: number
  type: string
  title: string
  location: string
  date: string
  description: string
  status: string
  created_at: string
}

// ============================================================
// Toast 组件
// ============================================================
interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  visible: boolean
}

function Toast({ message, type, visible }: ToastProps) {
  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg text-white text-sm font-medium shadow-lg transition-all duration-300 ${
        type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
      } ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : type === 'error' ? (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {message}
      </div>
    </div>
  )
}

// ============================================================
// 确认对话框组件
// ============================================================
interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ open, title, message, confirmText = '确定', cancelText = '取消', danger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 编辑昵称对话框
// ============================================================
interface NicknameDialogProps {
  open: boolean
  current: string
  onSave: (nickname: string) => void
  onCancel: () => void
}

function NicknameDialog({ open, current, onSave, onCancel }: NicknameDialogProps) {
  const [value, setValue] = useState(current)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setValue(current)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, current])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">修改昵称</h3>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={20}
          className="w-full px-4 py-2.5 bg-white border border-gray-200 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          placeholder="请输入昵称"
        />
        <p className="text-xs text-gray-400 mt-1.5">{value.length}/20</p>
        <div className="flex gap-3 justify-end mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onSave(value.trim())}
            disabled={!value.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 主组件
// ============================================================
export default function ProfilePage() {
  const navigate = useNavigate()

  // ---------- 状态 ----------
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Tab 切换
  const [activeTab, setActiveTab] = useState<'items' | 'lostfound' | 'settings'>('items')

  // 用户发布的数据
  const [myItems, setMyItems] = useState<UserItem[]>([])
  const [myLostFound, setMyLostFound] = useState<UserLostFound[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [lfLoading, setLfLoading] = useState(false)

  // 商品筛选
  const [itemFilter, setItemFilter] = useState<string>('')

  // 对话框
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; danger?: boolean; onConfirm: () => void } | null>(null)

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({
    message: '', type: 'info', visible: false,
  })
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type, visible: true })
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }))
    }, 3000)
  }, [])

  // ---------- 检查登录态 ----------
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (!token || !savedUser) {
      navigate('/auth')
      return false
    }
    return true
  }, [navigate])

  // ---------- 获取用户信息 ----------
  const fetchUserInfo = useCallback(async () => {
    if (!checkAuth()) return
    setLoading(true)
    setError(false)
    try {
      const res = await apiRequest<UserInfo>(API.profile.info, 'GET')
      setUser(res.data)
    } catch {
      // 如果 token 已被清除（apiRequest 在 401 时会自动清除），直接跳转到登录页
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/auth')
        return
      }
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [checkAuth, navigate])

  // ---------- 获取我的商品 ----------
  const fetchMyItems = useCallback(async () => {
    setItemsLoading(true)
    try {
      const url = itemFilter ? `${API.profile.items}?status=${itemFilter}` : API.profile.items
      const res = await apiRequest<{ items: UserItem[] }>(url, 'GET')
      setMyItems(res.data.items)
    } catch {
      // 如果 token 已被清除，跳转到登录页
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/auth')
        return
      }
      showToast('获取商品列表失败', 'error')
    } finally {
      setItemsLoading(false)
    }
  }, [itemFilter, showToast, navigate])

  // ---------- 获取我的失物招领 ----------
  const fetchMyLostFound = useCallback(async () => {
    setLfLoading(true)
    try {
      const res = await apiRequest<{ items: UserLostFound[] }>(API.profile.lostFound, 'GET')
      setMyLostFound(res.data.items)
    } catch {
      // 如果 token 已被清除，跳转到登录页
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/auth')
        return
      }
      showToast('获取失物招领记录失败', 'error')
    } finally {
      setLfLoading(false)
    }
  }, [showToast, navigate])

  // ---------- 监听登出事件 ----------
  // 当其他页面触发登出（auth-change 事件）时，跳转到登录页
  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/auth')
      }
    }
    window.addEventListener('auth-change', handleAuthChange)
    return () => window.removeEventListener('auth-change', handleAuthChange)
  }, [navigate])

  // ---------- 初始加载 ----------
  useEffect(() => {
    fetchUserInfo()
  }, [fetchUserInfo])

  useEffect(() => {
    if (activeTab === 'items') fetchMyItems()
  }, [activeTab, fetchMyItems])

  useEffect(() => {
    if (activeTab === 'lostfound') fetchMyLostFound()
  }, [activeTab, fetchMyLostFound])

  // ---------- 修改昵称 ----------
  const handleSaveNickname = async (nickname: string) => {
    try {
      await apiRequest(API.profile.update, 'PUT', { nickname })
      showToast('昵称修改成功', 'success')
      setNicknameDialogOpen(false)
      fetchUserInfo()
    } catch {
      // 如果 token 已被清除，跳转到登录页
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/auth')
        return
      }
      showToast('修改失败，请重试', 'error')
    }
  }

  // ---------- 下架商品 ----------
  const handleSoldItem = async (itemId: number) => {
    const url = `${API.items}/${itemId}`
    try {
      await apiRequest(url, 'DELETE')
      showToast('已下架', 'success')
      setConfirmDialog(null)
      fetchMyItems()
      fetchUserInfo()
    } catch {
      // 如果 token 已被清除，跳转到登录页
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/auth')
        return
      }
      showToast('操作失败', 'error')
    }
  }

  // ---------- 注销账号 ----------
  const handleDeleteAccount = async () => {
    try {
      await apiRequest(API.profile.deleteAccount, 'DELETE')
      showToast('账号已注销', 'info')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth-change'))
      setTimeout(() => navigate('/'), 500)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || '注销失败，请重试'
      showToast(msg, 'error')
    } finally {
      setConfirmDialog(null)
    }
  }

  // ---------- 退出/换号 ----------
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.dispatchEvent(new Event('auth-change'))
    showToast('已退出登录', 'info')
    setTimeout(() => navigate('/auth'), 500)
  }

  // ---------- 格式化日期 ----------
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    return dateStr.slice(0, 10)
  }

  // ============================================================
  // Loading 状态
  // ============================================================
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-md p-8 animate-pulse">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gray-200 rounded-full" />
            <div className="space-y-2.5 flex-1">
              <div className="h-5 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-48 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // Error 状态
  // ============================================================
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-lg text-gray-600 mb-1">加载失败</p>
          <p className="text-sm text-gray-400 mb-6">请检查网络连接后重试</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchUserInfo}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重新加载
            </button>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              重新登录
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // 未登录
  // ============================================================
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <p className="text-gray-500 mb-4">请先登录后查看个人中心</p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            去登录
          </Link>
        </div>
      </div>
    )
  }

  // ============================================================
  // 主渲染
  // ============================================================
  const firstChar = user.nickname?.charAt(0)?.toUpperCase() || 'U'
  const avatarColors = ['#4F46E5', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#E11D48']
  const avatarColor = avatarColors[user.id % avatarColors.length]

  const tabs = [
    { key: 'items' as const, label: '我的商品', icon: '📦' },
    { key: 'lostfound' as const, label: '失物招领', icon: '🔍' },
    { key: 'settings' as const, label: '账号设置', icon: '⚙️' },
  ]

  return (
    <>
      {/* Toast */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      {/* 昵称编辑对话框 */}
      <NicknameDialog
        open={nicknameDialogOpen}
        current={user.nickname}
        onSave={handleSaveNickname}
        onCancel={() => setNicknameDialogOpen(false)}
      />

      {/* 确认对话框 */}
      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        danger={confirmDialog?.danger}
        confirmText="确定"
        cancelText="取消"
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* ============================================================ */}
        {/* 用户信息卡片 */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-8">
          {/* 顶部渐变背景 */}
          <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600" />

          <div className="px-6 pb-6">
            {/* 头像 */}
            <div className="flex items-end -mt-12 mb-4">
              <div
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white text-2xl font-bold shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {firstChar}
              </div>
            </div>

            {/* 用户名 + 昵称 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-800">{user.nickname}</h2>
                  <button
                    onClick={() => setNicknameDialogOpen(true)}
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    title="修改昵称"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">@{user.username}</p>
              </div>
            </div>

            {/* 注册时间 */}
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              注册时间：{formatDate(user.created_at)}
            </p>

            {/* 统计 */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-5">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-blue-700">{user.stats.activeItems}</p>
                <p className="text-xs text-blue-500 mt-0.5">在售商品</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-700">{user.stats.soldItems}</p>
                <p className="text-xs text-green-500 mt-0.5">已售出</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-amber-700">{user.stats.lostPosts + user.stats.foundPosts}</p>
                <p className="text-xs text-amber-500 mt-0.5">失物招领</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-purple-700">{user.stats.reviews}</p>
                <p className="text-xs text-purple-500 mt-0.5">评价</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-rose-700">{user.stats.activeItems + user.stats.soldItems + user.stats.lostPosts + user.stats.foundPosts + user.stats.reviews}</p>
                <p className="text-xs text-rose-500 mt-0.5">总动态</p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* Tab 导航 */}
        {/* ============================================================ */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl shadow-sm p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============================================================ */}
        {/* Tab 内容：我的商品 */}
        {/* ============================================================ */}
        {activeTab === 'items' && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            {/* 筛选 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800">我发布的商品</h3>
              <div className="flex gap-1.5">
                {['', 'active', 'sold'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setItemFilter(f)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      itemFilter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {f === '' ? '全部' : f === 'active' ? '在售' : '已售'}
                  </button>
                ))}
              </div>
            </div>

            {itemsLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : myItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm mb-1">暂无商品</p>
                <p className="text-gray-300 text-xs">去二手交易页面发布你的第一件商品吧</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-800 truncate">{item.title}</h4>
                        <span className={`shrink-0 px-2 py-0.5 text-xs rounded-full ${
                          item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {item.status === 'active' ? '在售' : '已售'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-red-500">¥{item.price}</span>
                        <span className="text-xs text-gray-400">|</span>
                        <span className="text-xs text-gray-400">{item.category}</span>
                        <span className="text-xs text-gray-400">|</span>
                        <span className="text-xs text-gray-400">{formatDate(item.created_at)}</span>
                      </div>
                    </div>
                    {item.status === 'active' && (
                      <button
                        onClick={() => setConfirmDialog({
                          title: '下架商品',
                          message: `确定要将「${item.title}」下架吗？`,
                          danger: false,
                          onConfirm: () => handleSoldItem(item.id),
                        })}
                        className="ml-3 shrink-0 px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-red-500 transition-colors"
                      >
                        下架
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* Tab 内容：失物招领 */}
        {/* ============================================================ */}
        {activeTab === 'lostfound' && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4">我发布的失物招领</h3>

            {lfLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : myLostFound.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">暂无失物招领记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myLostFound.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`shrink-0 px-2 py-0.5 text-xs rounded-full font-medium ${
                        item.type === '丢失' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {item.type}
                      </span>
                      <h4 className="text-sm font-medium text-gray-800">{item.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      {item.location && <span>📍 {item.location}</span>}
                      {item.date && <span>📅 {item.date}</span>}
                      <span>🕐 {formatDate(item.created_at)}</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{item.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* Tab 内容：账号设置 */}
        {/* ============================================================ */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-base font-bold text-gray-800 mb-4">账号信息</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">用户名</span>
                  <span className="text-sm font-medium text-gray-800">{user.username}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">昵称</span>
                  <span className="text-sm font-medium text-gray-800">{user.nickname}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">注册时间</span>
                  <span className="text-sm text-gray-600">{formatDate(user.created_at)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">用户 ID</span>
                  <span className="text-sm text-gray-600">#{user.id}</span>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-base font-bold text-gray-800 mb-4">账号操作</h3>
              <div className="space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">退出登录</p>
                    <p className="text-xs text-gray-400 mt-0.5">退出当前账号，可以重新登录其他账号</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>

                <button
                  onClick={() => {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    window.dispatchEvent(new Event('auth-change'))
                    showToast('已退出，请重新登录', 'info')
                    setTimeout(() => navigate('/auth'), 500)
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">切换账号</p>
                    <p className="text-xs text-gray-400 mt-0.5">退出当前账号，登录其他账号</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>

                <button
                  onClick={() => setConfirmDialog({
                    title: '注销账号',
                    message: '确定要注销账号吗？此操作不可恢复，所有数据将被永久删除。',
                    danger: true,
                    onConfirm: handleDeleteAccount,
                  })}
                  className="w-full flex items-center justify-between px-4 py-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-red-700">注销账号</p>
                    <p className="text-xs text-red-400 mt-0.5">永久删除账号及所有相关数据，不可恢复</p>
                  </div>
                  <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}