import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API, apiRequest } from '../api'

// ============================================================
// Toast 提示组件
// ============================================================
function Toast({ message, type, visible }: { message: string; type: 'success' | 'error'; visible: boolean }) {
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

export default function AuthPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

  // ---------- Toast ----------
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

  // ============================================================
  // 登录表单
  // ============================================================
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginErrors, setLoginErrors] = useState({ username: '', password: '' })
  const [loginLoading, setLoginLoading] = useState(false)

  const validateLoginField = (field: 'username' | 'password', value: string): string => {
    if (!value.trim()) return field === 'username' ? '请输入用户名' : '请输入密码'
    return ''
  }

  const handleLoginBlur = (field: 'username' | 'password') => {
    setLoginErrors((prev) => ({ ...prev, [field]: validateLoginField(field, loginForm[field]) }))
  }

  const validateLogin = (): boolean => {
    const uErr = validateLoginField('username', loginForm.username)
    const pErr = validateLoginField('password', loginForm.password)
    setLoginErrors({ username: uErr, password: pErr })
    return !uErr && !pErr
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateLogin()) return

    setLoginLoading(true)
    try {
      const res = await apiRequest<{ token: string; user: { id: number; username: string; nickname: string } }>(
        API.auth.login,
        'POST',
        { username: loginForm.username.trim(), password: loginForm.password }
      )

      // 存储 token 和用户信息到 localStorage
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify({ username: res.data.user.nickname || res.data.user.username }))
      // 触发 auth 变更事件，通知 Navbar 更新
      window.dispatchEvent(new Event('auth-change'))

      showToast('登录成功！', 'success')
      setTimeout(() => navigate('/'), 1000)
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '用户名或密码错误', 'error')
    } finally {
      setLoginLoading(false)
    }
  }

  // ============================================================
  // 注册表单
  // ============================================================
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', confirmPassword: '' })
  const [registerErrors, setRegisterErrors] = useState({ username: '', password: '', confirmPassword: '' })
  const [registerLoading, setRegisterLoading] = useState(false)

  const validateRegisterField = (field: 'username' | 'password' | 'confirmPassword', value: string): string => {
    switch (field) {
      case 'username':
        if (!value.trim()) return '请输入用户名'
        if (!/^[a-zA-Z0-9]+$/.test(value.trim())) return '用户名只能包含字母和数字，3-16字'
        if (value.trim().length < 3 || value.trim().length > 16) return '用户名只能包含字母和数字，3-16字'
        return ''
      case 'password':
        if (!value) return '请输入密码'
        if (value.length < 6) return '密码至少6位'
        if (value.length > 20) return '密码不超过20位'
        return ''
      case 'confirmPassword':
        if (!value) return '请确认密码'
        if (value !== registerForm.password) return '两次输入的密码不一致'
        return ''
      default:
        return ''
    }
  }

  const handleRegisterBlur = (field: 'username' | 'password' | 'confirmPassword') => {
    setRegisterErrors((prev) => ({ ...prev, [field]: validateRegisterField(field, registerForm[field]) }))
  }

  const validateRegister = (): boolean => {
    const uErr = validateRegisterField('username', registerForm.username)
    const pErr = validateRegisterField('password', registerForm.password)
    const cErr = validateRegisterField('confirmPassword', registerForm.confirmPassword)
    setRegisterErrors({ username: uErr, password: pErr, confirmPassword: cErr })
    return !uErr && !pErr && !cErr
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateRegister()) {
      showToast('请填写完整信息', 'error')
      return
    }

    setRegisterLoading(true)

    try {
      const payload = {
        username: registerForm.username.trim(),
        password: registerForm.password,
      }

      await apiRequest<{ token: string; user: { id: number; username: string; nickname: string } }>(
        API.auth.register,
        'POST',
        payload
      )

      showToast('注册成功！', 'success')
      // 清空注册表单并切换到登录
      setRegisterForm({ username: '', password: '', confirmPassword: '' })
      setRegisterErrors({ username: '', password: '', confirmPassword: '' })
      setActiveTab('login')
    } catch (err: unknown) {
      const error = err as { message?: string }
      showToast(error.message || '注册失败，请稍后重试', 'error')
    } finally {
      setRegisterLoading(false)
    }
  }

  // ============================================================
  // 切换标签
  // ============================================================
  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab)
    setLoginErrors({ username: '', password: '' })
    setRegisterErrors({ username: '', password: '', confirmPassword: '' })
  }

  // ============================================================
  // 通用输入框样式
  // ============================================================
  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-2.5 bg-white border text-sm rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow ${
      hasError ? 'border-red-400' : 'border-gray-300'
    }`

  return (
    <>
      {/* Toast */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* 切换标签 */}
          <div className="flex border-b border-gray-100">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`flex-1 py-3.5 text-sm font-medium text-center transition-colors relative ${
                activeTab === 'login' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              登录
              {activeTab === 'login' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => switchTab('register')}
              className={`flex-1 py-3.5 text-sm font-medium text-center transition-colors relative ${
                activeTab === 'register' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              注册
              {activeTab === 'register' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          </div>

          <div className="p-8">
            {/* ========== 登录表单 ========== */}
            {activeTab === 'login' && (
              <form className="space-y-4" onSubmit={handleLogin}>
                <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">欢迎回来</h2>
                <p className="text-sm text-gray-400 text-center mb-6">登录校园生活服务平台</p>

                {/* 用户名 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">用户名</label>
                  <input
                    type="text"
                    placeholder="请输入用户名"
                    value={loginForm.username}
                    onChange={(e) => {
                      setLoginForm((prev) => ({ ...prev, username: e.target.value }))
                      if (loginErrors.username) setLoginErrors((prev) => ({ ...prev, username: '' }))
                    }}
                    onBlur={() => handleLoginBlur('username')}
                    className={inputClass(!!loginErrors.username)}
                  />
                  {loginErrors.username && (
                    <p className="mt-1 text-xs text-red-500">{loginErrors.username}</p>
                  )}
                </div>

                {/* 密码 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
                  <input
                    type="password"
                    placeholder="请输入密码"
                    value={loginForm.password}
                    onChange={(e) => {
                      setLoginForm((prev) => ({ ...prev, password: e.target.value }))
                      if (loginErrors.password) setLoginErrors((prev) => ({ ...prev, password: '' }))
                    }}
                    onBlur={() => handleLoginBlur('password')}
                    className={inputClass(!!loginErrors.password)}
                  />
                  {loginErrors.password && (
                    <p className="mt-1 text-xs text-red-500">{loginErrors.password}</p>
                  )}
                </div>

                {/* 提交按钮 */}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loginLoading && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {loginLoading ? '登录中...' : '登录'}
                </button>
              </form>
            )}

            {/* ========== 注册表单 ========== */}
            {activeTab === 'register' && (
              <form className="space-y-4" onSubmit={handleRegister}>
                <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">创建账号</h2>
                <p className="text-sm text-gray-400 text-center mb-6">注册校园生活服务平台账号</p>

                {/* 用户名 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    用户名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="字母和数字，3-16字"
                    value={registerForm.username}
                    onChange={(e) => {
                      setRegisterForm((prev) => ({ ...prev, username: e.target.value }))
                      if (registerErrors.username) setRegisterErrors((prev) => ({ ...prev, username: '' }))
                    }}
                    onBlur={() => handleRegisterBlur('username')}
                    className={inputClass(!!registerErrors.username)}
                  />
                  {registerErrors.username && (
                    <p className="mt-1 text-xs text-red-500">{registerErrors.username}</p>
                  )}
                </div>

                {/* 密码 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    密码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="6-20位密码"
                    value={registerForm.password}
                    onChange={(e) => {
                      setRegisterForm((prev) => ({ ...prev, password: e.target.value }))
                      if (registerErrors.password) setRegisterErrors((prev) => ({ ...prev, password: '' }))
                    }}
                    onBlur={() => handleRegisterBlur('password')}
                    className={inputClass(!!registerErrors.password)}
                  />
                  {registerErrors.password && (
                    <p className="mt-1 text-xs text-red-500">{registerErrors.password}</p>
                  )}
                </div>

                {/* 确认密码 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    确认密码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="再次输入密码"
                    value={registerForm.confirmPassword}
                    onChange={(e) => {
                      setRegisterForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      if (registerErrors.confirmPassword) setRegisterErrors((prev) => ({ ...prev, confirmPassword: '' }))
                    }}
                    onBlur={() => handleRegisterBlur('confirmPassword')}
                    className={inputClass(!!registerErrors.confirmPassword)}
                  />
                  {registerErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">{registerErrors.confirmPassword}</p>
                  )}
                </div>

                {/* 提交按钮 */}
                <button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {registerLoading && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {registerLoading ? '注册中...' : '注册'}
                </button>
              </form>
            )}

            {/* 底部导航 */}
            <div className="mt-6 text-center">
              <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}