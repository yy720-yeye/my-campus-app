import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const navLinks = [
  { label: '首页', path: '/' },
  { label: '课表', path: '/schedule' },
  { label: '食堂', path: '/canteen' },
  { label: '二手', path: '/trade' },
  { label: '失物招领', path: '/lost-found' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<{ username: string } | null>(null)

  // 从 localStorage 读取用户信息
  const loadUser = () => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        setUser(null)
      }
    } else {
      setUser(null)
    }
  }

  useEffect(() => {
    loadUser()
    // 监听 auth 变更事件（登录/登出后触发）
    const handleAuthChange = () => loadUser()
    window.addEventListener('auth-change', handleAuthChange)
    return () => window.removeEventListener('auth-change', handleAuthChange)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    window.dispatchEvent(new Event('auth-change'))
    navigate('/')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a5f] shadow-md" style={{ height: '64px' }}>
      <div className="h-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-full">
          {/* 左侧：平台名称 */}
          <Link to="/" className="text-lg sm:text-xl font-bold text-white shrink-0">
            校园生活服务平台
          </Link>

          {/* 右侧：导航链接 + 用户信息 */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  pathname === link.path
                    ? 'text-white font-medium'
                    : 'text-white hover:text-blue-200'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <div className="flex items-center gap-2 ml-3">
                <span className="text-sm text-white font-medium">
                  {user.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 border border-white/60 rounded-lg text-xs text-white/80 hover:bg-white hover:text-[#1e3a5f] transition-colors"
                >
                  退出
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="ml-3 px-4 py-1.5 border border-white rounded-lg text-sm text-white hover:bg-white hover:text-[#1e3a5f] transition-colors"
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}